/// <reference types="@cloudflare/workers-types" />

import OpenAI from "openai";
import { buildOpenAIMessages, type ChatMessage } from "./_lib/messages";
import { SYSTEM_PROMPT } from "./_lib/system-prompt";

interface Env {
  OPENAI_API_KEY: string;
  CHAT_CACHE: KVNamespace;
}

interface RequestBody {
  messages: ChatMessage[];
  userMessage: string;
}

async function hashMessage(msg: string): Promise<string> {
  const data = new TextEncoder().encode(msg.toLowerCase().trim());
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = await context.request.json<RequestBody>();
    const { messages, userMessage } = body;

    if (!userMessage?.trim()) {
      return Response.json({ error: "userMessage is required" }, { status: 400 });
    }

    const cacheKey = await hashMessage(userMessage);

    const cached = await context.env.CHAT_CACHE.get(cacheKey);
    if (cached) {
      return Response.json({ response: cached });
    }

    const openai = new OpenAI({ apiKey: context.env.OPENAI_API_KEY });

    const recentHistory = messages.slice(-10);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...buildOpenAIMessages(recentHistory),
        { role: "user", content: userMessage },
      ],
    });

    const response =
      completion.choices[0]?.message?.content ??
      "I couldn't generate a response — please try again.";

    await context.env.CHAT_CACHE.put(cacheKey, response, {
      expirationTtl: 7 * 24 * 60 * 60,
    });

    return Response.json({ response });
  } catch (err) {
    console.error("chat function error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
};
