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
        const data = res.ok ? ((await res.json()) as { response?: string }) : null;
        botText = data?.response ?? ERROR_TEXT;
      } catch {
        botText = ERROR_TEXT;
      }

      const botMsg: Message = { id: uid(), from: "bot", text: botText, time: timeNow() };
      setMessages((prev) => [...prev, botMsg]);

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
