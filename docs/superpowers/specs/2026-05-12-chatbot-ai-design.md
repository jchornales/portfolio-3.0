# Chatbot AI Integration — Design Spec

**Date:** 2026-05-12
**Status:** Approved

## Overview

Replace the portfolio chatbot's hardcoded regex responses with OpenAI-powered multi-turn conversation, deployed as a Cloudflare Pages Function. The Astro site remains fully static; only the API endpoint requires server logic.

## Architecture

```text
AiChat.tsx → POST /api/chat → KV lookup (SHA-256 hash of user message)
                                   ↓ cache miss
                              OpenAI gpt-4o-mini (system prompt + history)
                                   ↓
                              Store in KV (7-day TTL) → return response
```

**New files:**

- `functions/api/chat.ts` — Cloudflare Pages Function (serverless API endpoint)
- `wrangler.toml` — local dev configuration for Wrangler Pages
- `.env.example` — documents required env vars (no real values)

**Changed files:**

- `src/components/AiChat.tsx` — replace regex with API call + message queuing
- `.env` — add `OPENAI_API_KEY`

## API Function (`functions/api/chat.ts`)

Accepts: `POST { messages: Message[], userMessage: string }`

**Request handling:**

1. Lowercase + trim `userMessage`, compute SHA-256 hash
2. Look up hash in Cloudflare KV (`CHAT_CACHE` binding)
3. Cache hit → return cached response immediately (no OpenAI call)
4. Cache miss → call OpenAI with system prompt + full `messages` history
5. Store `hash → response` in KV with 7-day TTL
6. Return response

**OpenAI configuration:**

- Model: `gpt-4o-mini`
- System prompt: detailed (>1024 tokens) — scoped to Justine's portfolio topics. OpenAI automatically caches the system prompt after the first call (~50% token discount on repeated calls).
- Conversation history: full `messages` array passed on every request (multi-turn)

**System prompt scope:** The assistant answers only questions about Justine's services, projects, tech stack, pricing, availability, and how to get in touch. Off-topic questions are politely declined and redirected to relevant portfolio topics.

**Environment bindings:**

- `OPENAI_API_KEY` — secret (Cloudflare Pages dashboard + local `.env`)
- `CHAT_CACHE` — KV namespace binding (declared in `wrangler.toml`)

## Frontend Changes (`AiChat.tsx`)

### Replace regex matcher

`onSubmit` calls `POST /api/chat` with `{ messages, userMessage }`. The existing `messages` state already tracks full conversation history — multi-turn works by passing it on every request.

### Message queuing (batching)

If the user submits a new message while a response is in flight, queue it. On response arrival, immediately dispatch the queued message as a single combined API call (e.g., two rapid messages merged as one user turn). Prevents parallel requests and reduces token waste.

### Error handling

On network error or non-200 response, append a fallback bot message:
> "Something went wrong — try again or email <jchornales.dev@gmail.com> directly."

No silent failures.

### Unchanged

- Typing indicator (`isSubmitting`) — no change
- Message state shape (`Message[]`) — no change
- UI/styling — no change

## Caching Strategy

**KV exact-match cache:**

- Key: SHA-256 hex hash of lowercase-trimmed user message
- Value: AI response string
- TTL: 7 days
- Scope: per-message (not per-conversation), so common questions like "how much do you charge?" always hit cache regardless of conversation history

**OpenAI prompt caching:**

- Automatic for `gpt-4o-mini` when system prompt exceeds 1024 tokens
- System prompt is static — cached after the first call, ~50% discount on system prompt tokens for all subsequent calls

## Deployment

**Local dev:**

- Run `wrangler pages dev` (instead of `astro dev`) to load Pages Functions locally
- `.env` provides `OPENAI_API_KEY`
- `wrangler.toml` declares the `CHAT_CACHE` KV binding pointed at a local KV namespace

**Production (Cloudflare Pages):**

- Build command: `npm run build` (unchanged)
- Output directory: `dist` (unchanged)
- `OPENAI_API_KEY` set as encrypted secret in Cloudflare Pages dashboard
- `CHAT_CACHE` KV namespace created in Cloudflare dashboard, bound to the Pages project

**`.env.example`** committed to repo:

```env
OPENAI_API_KEY=
```

## Out of Scope

- Rate limiting (traffic is low for a portfolio site)
- Streaming responses (standard JSON response is sufficient)
- Conversation persistence across page reloads
- Analytics on chat usage
