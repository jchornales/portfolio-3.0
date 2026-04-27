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

const RESPONSES: Array<[RegExp, string]> = [
  [
    /service|offer|what.*(you|he|justine).*(do|build|make)|help/i,
    "Justine builds four things: <b>web apps</b> (React, Next.js), <b>business automations</b> (n8n, Zapier, Make), <b>booking &amp; scheduling systems</b>, and <b>AI chatbots</b> for platforms like Messenger and Instagram. What are you looking for?",
  ],
  [
    /price|cost|rate|charge|fee|budget|how much/i,
    "Pricing is scoped per project. Check out the <b>Pricing section</b> on this page for starting rates, or get in touch for a custom quote — Justine usually replies within a day.",
  ],
  [
    /contact|reach|email|message|talk|hire|work together/i,
    "Best way to reach Justine is via the <b>Contact section</b> below, or email directly: <b>jchornales.dev@gmail.com</b>. He's available for freelance and full-time.",
  ],
  [
    /project|work|portfolio|example|past|built|previous/i,
    "Recent work includes a <b>CRM → Slack automation</b> saving 10 hrs/week, a <b>Facebook lead qualifier bot</b> that books calls automatically, a <b>custom booking system</b> with calendar sync, and production web apps for business clients. Scroll up to Projects for more!",
  ],
  [
    /tech|stack|use|language|framework|tool|react|next|node/i,
    "Frontend: React, Next.js, Tailwind, TypeScript. Backend: Node.js, Supabase, Firebase, PostgreSQL. Automation: n8n, Zapier, Make. AI: OpenAI API. The portfolio itself is built with Astro.",
  ],
  [
    /available|hire|open|freelance|full.?time|opportunit/i,
    "Yes — currently open to <b>freelance projects</b> and <b>full-time roles</b>. Based in the Philippines (UTC+8) and fully remote-ready.",
  ],
  [
    /location|where|timezone|remote|country|philippines/i,
    "Based in the <b>Philippines (UTC+8)</b>, fully remote-ready and comfortable working with clients worldwide.",
  ],
  [
    /who|about|justine|yourself/i,
    "Justine Hornales is a developer who builds websites, automates business workflows, and integrates AI — so businesses run smarter. He's available for freelance and full-time work.",
  ],
];

const FALLBACK =
  "Great question! For a detailed answer, reach out via the Contact section or email <b>jchornales.dev@gmail.com</b> — Justine typically replies within a day.";

function getBotResponse(msg: string): string {
  for (const [pattern, response] of RESPONSES) {
    if (pattern.test(msg)) return response;
  }
  return FALLBACK;
}

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

  // Auto-scroll when messages change or bot is typing
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSubmitting]);

  // Focus input whenever panel opens
  useEffect(() => {
    if (isOpen) requestAnimationFrame(() => setFocus("message"));
  }, [isOpen, setFocus]);

  // Listen for the FloatingMenu custom event
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

  const onSubmit = async (data: MessageForm) => {
    const text = data.message.trim();
    setMessages((prev) => [...prev, { id: uid(), from: "user", text, time: timeNow() }]);
    reset();

    await new Promise<void>((r) => setTimeout(r, 900 + Math.random() * 700));

    setMessages((prev) => [
      ...prev,
      { id: uid(), from: "bot", text: getBotResponse(text), time: timeNow() },
    ]);
    requestAnimationFrame(() => setFocus("message"));
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
