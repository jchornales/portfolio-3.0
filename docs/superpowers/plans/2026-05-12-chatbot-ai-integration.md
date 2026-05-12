# Chatbot AI Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the portfolio chatbot's hardcoded regex responses with OpenAI gpt-4o-mini, served through a Cloudflare Pages Function with KV caching and multi-turn conversation support.

**Architecture:** The Astro site stays fully static (no SSR). A single file — `functions/api/chat.ts` — runs as a Cloudflare Pages Function at `POST /api/chat`. It checks a Cloudflare KV namespace for cached responses (SHA-256 hash of the user message), calls OpenAI on a cache miss, stores the result, and returns it. The React component replaces its regex matcher with a fetch to this endpoint and maintains conversation history for multi-turn context.

**Tech Stack:** Astro (static), React, TypeScript, Cloudflare Pages, Cloudflare KV, OpenAI SDK (`openai`), Vitest, Wrangler CLI

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `functions/api/chat.ts` | POST handler: KV cache lookup, OpenAI call, KV store |
| Create | `functions/api/_lib/messages.ts` | Convert `Message[]` chat history to OpenAI message format |
| Create | `functions/api/_lib/messages.test.ts` | Unit tests for the message formatter |
| Create | `functions/api/_lib/system-prompt.ts` | Justine's assistant system prompt string |
| Create | `wrangler.toml` | Cloudflare Pages local dev config + KV binding |
| Create | `.env.example` | Documents required env vars (no real values) |
| Modify | `src/components/AiChat.tsx` | Replace regex with API call + message queuing + error handling |
| Modify | `package.json` | Add `openai`, `@cloudflare/workers-types`, `wrangler`, `vitest`; add `test` and `dev:cf` scripts |
| Modify | `astro.config.mjs` | Remove GitHub Pages `base` — Cloudflare Pages serves from root |
| Modify | `.env` | Add `OPENAI_API_KEY` |

---

## Task 1: Install Dependencies and Configure Test Runner

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Install runtime and dev dependencies**

```bash
npm install openai
npm install --save-dev @cloudflare/workers-types wrangler vitest
```

Expected: no errors, packages appear in `package.json`.

- [ ] **Step 2: Add scripts to `package.json`**

Open `package.json` and add these two entries inside the `"scripts"` object:

```json
"test": "vitest run",
"dev:cf": "wrangler pages dev dist"
```

After this change, the scripts section should look like:

```json
"scripts": {
  "dev": "astro dev",
  "dev:cf": "wrangler pages dev dist",
  "build": "astro build",
  "preview": "astro preview",
  "check": "astro check",
  "test": "vitest run",
  "lint": "eslint .",
  "lint:fix": "eslint . --fix",
  "format": "prettier --write .",
  "format:check": "prettier --check ."
}
```

- [ ] **Step 3: Create `vitest.config.ts` at the project root**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
  },
});
```

- [ ] **Step 4: Verify vitest runs (no tests yet, just wiring)**

```bash
npm test
```

Expected output: `No test files found` or similar — no crash, exit 0.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add openai, wrangler, vitest dependencies"
```

---

## Task 2: Config Files

**Files:**
- Create: `wrangler.toml`
- Create: `.env.example`
- Modify: `.env`
- Modify: `astro.config.mjs`

- [ ] **Step 1: Create `wrangler.toml` at the project root**

```toml
name = "jh-portfolio"
compatibility_date = "2024-09-23"
pages_build_output_dir = "dist"

[[kv_namespaces]]
binding = "CHAT_CACHE"
id = "placeholder-replace-with-real-id"
preview_id = "placeholder-replace-with-real-id"
```

> **Note:** Replace `placeholder-replace-with-real-id` values with your actual KV namespace IDs from the Cloudflare dashboard (Workers & Pages → KV → Create namespace named `jh-portfolio-chat-cache`). The `id` is for production, `preview_id` is for local dev.

- [ ] **Step 2: Create `.env.example` at the project root**

```env
OPENAI_API_KEY=
```

- [ ] **Step 3: Add `OPENAI_API_KEY` to `.env`**

Open `.env` and add:

```env
OPENAI_API_KEY=your-openai-api-key-here
```

Replace `your-openai-api-key-here` with the actual key from platform.openai.com → API keys.

- [ ] **Step 4: Update `astro.config.mjs` — remove GitHub Pages base path**

Cloudflare Pages serves from the root `/`, not `/portfolio-3.0`. Remove the `base` field and update `site`:

```javascript
import { defineConfig } from "astro/config";

import icon from "astro-icon";

import react from "@astrojs/react";

export default defineConfig({
  site: "https://justinehornales.dev",
  server: { host: true, port: 4321 },
  integrations: [icon(), react()],
});
```

- [ ] **Step 5: Verify Astro still builds**

```bash
npm run build
```

Expected: `dist/` is generated, no errors.

- [ ] **Step 6: Commit**

```bash
git add wrangler.toml .env.example astro.config.mjs
git commit -m "chore: add wrangler config and update astro base for Cloudflare Pages"
```

---

## Task 3: Message Formatter (TDD)

**Files:**
- Create: `functions/api/_lib/messages.ts`
- Create: `functions/api/_lib/messages.test.ts`

- [ ] **Step 1: Create the test file first**

Create `functions/api/_lib/messages.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { buildOpenAIMessages } from "./messages";

describe("buildOpenAIMessages", () => {
  it("maps user messages to role user", () => {
    expect(buildOpenAIMessages([{ from: "user", text: "hello" }])).toEqual([
      { role: "user", content: "hello" },
    ]);
  });

  it("maps bot messages to role assistant", () => {
    expect(buildOpenAIMessages([{ from: "bot", text: "hi there" }])).toEqual([
      { role: "assistant", content: "hi there" },
    ]);
  });

  it("returns empty array for empty history", () => {
    expect(buildOpenAIMessages([])).toEqual([]);
  });

  it("preserves conversation order and maps all roles correctly", () => {
    const result = buildOpenAIMessages([
      { from: "bot", text: "How can I help?" },
      { from: "user", text: "What do you build?" },
      { from: "bot", text: "Web apps and automations." },
    ]);
    expect(result).toEqual([
      { role: "assistant", content: "How can I help?" },
      { role: "user", content: "What do you build?" },
      { role: "assistant", content: "Web apps and automations." },
    ]);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test
```

Expected: test file found, tests fail with `Cannot find module './messages'`.

- [ ] **Step 3: Create `functions/api/_lib/messages.ts`**

```typescript
export interface ChatMessage {
  from: "bot" | "user";
  text: string;
}

export interface OpenAIMessage {
  role: "user" | "assistant";
  content: string;
}

export function buildOpenAIMessages(history: ChatMessage[]): OpenAIMessage[] {
  return history.map((msg) => ({
    role: msg.from === "user" ? "user" : "assistant",
    content: msg.text,
  }));
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm test
```

Expected output:
```
✓ functions/api/_lib/messages.test.ts (4)
  ✓ buildOpenAIMessages > maps user messages to role user
  ✓ buildOpenAIMessages > maps bot messages to role assistant
  ✓ buildOpenAIMessages > returns empty array for empty history
  ✓ buildOpenAIMessages > preserves conversation order and maps all roles correctly

Test Files  1 passed (1)
Tests       4 passed (4)
```

- [ ] **Step 5: Commit**

```bash
git add functions/api/_lib/messages.ts functions/api/_lib/messages.test.ts
git commit -m "feat: add OpenAI message formatter with tests"
```

---

## Task 4: System Prompt

**Files:**
- Create: `functions/api/_lib/system-prompt.ts`

- [ ] **Step 1: Create `functions/api/_lib/system-prompt.ts`**

```typescript
export const SYSTEM_PROMPT = `You are the AI assistant on Justine Hornales's personal portfolio website. Your only purpose is to help visitors learn about Justine's professional work — his services, past projects, tech stack, pricing, availability, and how to contact him. You must not answer questions outside this scope. When a visitor asks something off-topic, politely decline and offer to answer something relevant instead.

## Who Is Justine?

Justine Hornales is a freelance frontend and full-stack developer based in the Philippines (UTC+8). He builds websites, automates business workflows, and integrates AI so businesses run smarter. He is fully remote-ready and has worked with clients worldwide. He is open to both freelance projects and full-time remote roles.

Contact email: jchornales.dev@gmail.com
Response time: typically within one business day.

## Services

Justine specialises in four areas:

1. **Web Applications** — Custom web apps built with React, Next.js, TypeScript, and Tailwind CSS. Full-stack capable: polished frontends, Node.js APIs, and database integrations with Supabase, Firebase, or PostgreSQL.

2. **Business Automation** — Workflow automation using n8n, Zapier, and Make (formerly Integromat). Connects CRMs, email tools, Slack, spreadsheets, and any app with an API to eliminate repetitive manual work.

3. **Booking & Scheduling Systems** — End-to-end booking systems with Google Calendar sync, availability management, automated email confirmations, and client-facing scheduling pages.

4. **AI Chatbots** — Intelligent chatbots for business platforms such as Messenger, Instagram, and WhatsApp that qualify leads, answer FAQs, and automatically book calls using the OpenAI API.

## Tech Stack

- **Frontend:** React, Next.js, TypeScript, Tailwind CSS, Astro
- **Backend:** Node.js, Supabase, Firebase, PostgreSQL
- **Automation:** n8n, Zapier, Make (Integromat)
- **AI/ML:** OpenAI API
- **This portfolio** is built with Astro and deployed on Cloudflare Pages

## Recent Projects

- **CRM to Slack Automation:** A workflow that syncs CRM deal updates directly to Slack channels, saving the client 10+ hours per week of manual status updates.
- **Facebook Lead Qualifier Bot:** An AI chatbot connected to a Facebook page that qualifies incoming leads with a conversation flow and automatically books discovery calls on the client's calendar.
- **Custom Booking System:** A full-featured scheduling platform with Google Calendar sync, automated email confirmations, buffer times, and a client-facing booking page — built as a SaaS subscription replacement.
- **Production Web Apps:** Multiple web applications for business clients including dashboards, customer portals, and marketing sites.

## Pricing

Justine prices by project scope rather than hourly rate. Starting rates are published in the Pricing section of this portfolio page. For custom or larger projects, visitors should use the Contact section or email jchornales.dev@gmail.com for a quote. He typically responds within one business day.

## Availability

Justine is currently open to:
- Freelance projects of any size — one-off builds, ongoing retainers, or consultation
- Full-time remote roles — preferably frontend or full-stack positions
- Timezone: Philippines (UTC+8). Experienced with async collaboration across time zones.

## How to Reach Justine

- Contact form: Scroll to the Contact section on this portfolio page
- Email: jchornales.dev@gmail.com
- Response time: usually within one business day

## Your Behaviour Rules

- Answer only questions about Justine's services, projects, stack, pricing, availability, and how to contact him. Politely decline anything off-topic.
- If you do not have a specific fact, say so and suggest the visitor email jchornales.dev@gmail.com directly.
- Keep responses concise: one to three short paragraphs.
- You may use simple HTML in responses — for example <b>bold</b> — since the chat widget renders HTML.
- Never invent details not listed above.
- Be warm, direct, and professional — as if you are Justine's knowledgeable colleague answering on his behalf.`;
```

- [ ] **Step 2: Commit**

```bash
git add functions/api/_lib/system-prompt.ts
git commit -m "feat: add chatbot system prompt"
```

---

## Task 5: Cloudflare Pages Function

**Files:**
- Create: `functions/api/chat.ts`

- [ ] **Step 1: Create `functions/api/chat.ts`**

```typescript
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

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...buildOpenAIMessages(messages),
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
```

- [ ] **Step 2: Verify TypeScript has no errors**

```bash
npm run check
```

Expected: no TypeScript errors. If you see "Cannot find name 'KVNamespace'" or similar, the `/// <reference types="@cloudflare/workers-types" />` directive at the top of `chat.ts` should resolve it. If it doesn't, open `tsconfig.json` and add `"@cloudflare/workers-types"` to the `"types"` array under `compilerOptions`:

```json
"compilerOptions": {
  "jsx": "react-jsx",
  "jsxImportSource": "react",
  "types": ["@cloudflare/workers-types"]
}
```

- [ ] **Step 3: Commit**

```bash
git add functions/api/chat.ts
git commit -m "feat: add Cloudflare Pages Function for OpenAI chat"
```

---

## Task 6: Update AiChat.tsx

**Files:**
- Modify: `src/components/AiChat.tsx`

Replace the entire file contents. Key changes: remove `RESPONSES`, `FALLBACK`, `getBotResponse`; replace `onSubmit` body with API call; add `pendingRef` for message queuing; add error handling.

- [ ] **Step 1: Replace `src/components/AiChat.tsx` with the updated version**

```typescript
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const messageSchema = z.object({
  message: z.string().min(1).max(500),
});
type MessageForm = z.infer<typeof messageSchema>;

interface Message {
  id: number;
  from: "bot" | "user";
  text: string;
  time: string;
}

const ERROR_TEXT =
  "Something went wrong — try again or email <b>jchornales.dev@gmail.com</b> directly.";

function timeNow() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

let _id = 1;
const uid = () => _id++;

const INITIAL_MESSAGES: Message[] = [
  {
    id: uid(),
    from: "bot",
    text: "Hey! I'm Justine's AI assistant. Ask me about his work, services, or how to get in touch. 👋",
    time: "Just now",
  },
];

export default function AiChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);

  const bottomRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);
  const pendingRef = useRef<string | null>(null);
  const isProcessingRef = useRef(false);

  const {
    register,
    handleSubmit,
    reset,
    setFocus,
    watch,
    formState: { isSubmitting },
  } = useForm<MessageForm>({
    resolver: zodResolver(messageSchema),
    defaultValues: { message: "" },
  });

  const messageValue = watch("message");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSubmitting]);

  useEffect(() => {
    if (isOpen) requestAnimationFrame(() => setFocus("message"));
  }, [isOpen, setFocus]);

  useEffect(() => {
    const handle = () => {
      triggerRef.current = document.activeElement;
      setIsOpen(true);
    };
    window.addEventListener("ai-chat-open", handle);
    return () => window.removeEventListener("ai-chat-open", handle);
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
    (triggerRef.current as HTMLElement | null)?.focus?.();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") closeChat();
    },
    [closeChat],
  );

  const processMessage = useCallback(
    async (text: string, history: Message[]): Promise<void> => {
      const userMsg: Message = { id: uid(), from: "user", text, time: timeNow() };
      setMessages((prev) => [...prev, userMsg]);

      let botText: string;
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history.map(({ from, text: t }) => ({ from, text: t })),
            userMessage: text,
          }),
        });
        botText = res.ok
          ? ((await res.json()) as { response: string }).response
          : ERROR_TEXT;
      } catch {
        botText = ERROR_TEXT;
      }

      const botMsg: Message = { id: uid(), from: "bot", text: botText, time: timeNow() };
      setMessages((prev) => [...prev, botMsg]);

      // If a message was submitted while this request was in-flight, process it now
      if (pendingRef.current) {
        const queued = pendingRef.current;
        pendingRef.current = null;
        await processMessage(queued, [...history, userMsg, botMsg]);
      }
    },
    [],
  );

  const onSubmit = async (data: MessageForm) => {
    const text = data.message.trim();
    reset();

    // Safety net: if already processing (input is disabled, but just in case), queue and exit
    if (isProcessingRef.current) {
      pendingRef.current = text;
      return;
    }

    isProcessingRef.current = true;
    try {
      await processMessage(text, messages);
      requestAnimationFrame(() => setFocus("message"));
    } finally {
      isProcessingRef.current = false;
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`aichat-backdrop${isOpen ? " open" : ""}`}
        aria-hidden="true"
        onClick={closeChat}
      />

      {/* Panel */}
      <div
        className={`aichat${isOpen ? " open" : ""}`}
        role="dialog"
        aria-modal={true}
        aria-label="Chat with Justine's AI assistant"
        aria-hidden={!isOpen}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <header className="aichat-header">
          <div className="aichat-header-left">
            <span className="aichat-pulse" aria-hidden="true" />
            <div>
              <span className="aichat-name">Justine's Assistant</span>
              <span className="aichat-status">Online · replies instantly</span>
            </div>
          </div>
          <button className="aichat-close" onClick={closeChat} aria-label="Close chat">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        {/* Messages */}
        <div className="aichat-messages" aria-live="polite" aria-atomic="false">
          {messages.map((msg) => (
            <div key={msg.id} className={`aichat-msg ${msg.from}`}>
              <div className="aichat-bubble" dangerouslySetInnerHTML={{ __html: msg.text }} />
              <span className="aichat-time">{msg.time}</span>
            </div>
          ))}

          {isSubmitting && (
            <div className="aichat-msg bot" aria-label="Assistant is typing">
              <div className="aichat-bubble aichat-typing-bubble">
                <span />
                <span />
                <span />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form className="aichat-form" onSubmit={handleSubmit(onSubmit)} autoComplete="off">
          <input
            {...register("message")}
            className="aichat-input"
            type="text"
            placeholder="Ask me anything…"
            disabled={isSubmitting}
            autoComplete="off"
          />
          <button
            className="aichat-send"
            type="submit"
            aria-label="Send message"
            disabled={isSubmitting || !messageValue?.trim()}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
          </button>
        </form>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript — no errors**

```bash
npm run check
```

Expected: 0 errors.

- [ ] **Step 3: Run tests — all pass**

```bash
npm test
```

Expected: 4 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/AiChat.tsx
git commit -m "feat: replace regex chatbot with OpenAI API integration"
```

---

## Task 7: Local Test and Final Commit

**Files:** none new — this is verification only.

- [ ] **Step 1: Build the Astro site**

```bash
npm run build
```

Expected: `dist/` generated, no errors.

- [ ] **Step 2: Create a KV namespace in Cloudflare dashboard (one-time)**

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → Workers & Pages → KV
2. Click **Create namespace**, name it `jh-portfolio-chat-cache`
3. Copy the namespace ID
4. Open `wrangler.toml` and replace both `placeholder-replace-with-real-id` values with the real ID

- [ ] **Step 3: Start local dev server**

```bash
npm run dev:cf
```

Expected: server starts on `http://localhost:8788` (or the port Wrangler picks).

> **Note:** Wrangler will prompt you to log in on first run: `wrangler login`. Complete the browser auth flow.

- [ ] **Step 4: Smoke test the chat**

Open `http://localhost:8788` in a browser. Open the chat widget. Send a message like `"what services do you offer?"`.

Expected:
- Typing indicator appears
- Bot responds with an OpenAI-generated answer about Justine's services
- No console errors

Send the same message a second time.
Expected:
- Response appears faster (KV cache hit — no OpenAI call)

- [ ] **Step 5: Test error fallback**

Temporarily set `OPENAI_API_KEY=invalid` in `.env`, rebuild + restart.

Expected: bot responds with `"Something went wrong — try again or email jchornales.dev@gmail.com directly."`

Restore the real API key.

- [ ] **Step 6: Final commit**

```bash
git add wrangler.toml
git commit -m "chore: update wrangler.toml with real KV namespace IDs"
```

---

## Cloudflare Pages Production Setup (Manual Steps)

These are one-time dashboard steps — not automated:

1. **Create a Cloudflare Pages project** connected to the GitHub repo
2. **Set build command:** `npm run build`
3. **Set output directory:** `dist`
4. **Add environment variable:** `OPENAI_API_KEY` (encrypted secret) in Pages → Settings → Environment Variables
5. **Bind the KV namespace:** Pages → Settings → Functions → KV namespace bindings → add `CHAT_CACHE` → select `jh-portfolio-chat-cache`
6. Deploy — the function will be live at `https://<your-pages-domain>/api/chat`
