/// <reference types="@cloudflare/workers-types" />

import { z } from "zod";
import { contactSchema } from "../../src/lib/contactSchema";

interface Env {
  RESEND_API_KEY: string;
  // Optional override for the "from" address. Must be a domain verified in
  // Resend. Defaults to Resend's shared onboarding sender for quick testing.
  CONTACT_FROM?: string;
}

const TO_EMAIL = "jchornales.dev@gmail.com";
const DEFAULT_FROM = "Portfolio Contact <onboarding@resend.dev>";

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const json = await context.request.json();

    // Re-validate on the server — never trust the client.
    const parsed = contactSchema.safeParse(json);
    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", issues: z.flattenError(parsed.error).fieldErrors },
        { status: 400 },
      );
    }

    const { name, email, service, message } = parsed.data;

    const subject = `Portfolio Inquiry${service ? ` — ${service}` : ""}`;
    const text = [
      `Name: ${name}`,
      `Email: ${email}`,
      `Service: ${service || "—"}`,
      "",
      message,
    ].join("\n");

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${context.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: context.env.CONTACT_FROM ?? DEFAULT_FROM,
        to: [TO_EMAIL],
        reply_to: email,
        subject,
        text,
      }),
    });

    if (!res.ok) {
      console.error("Resend error:", res.status, await res.text());
      return Response.json({ error: "Failed to send message" }, { status: 502 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("contact function error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
};
