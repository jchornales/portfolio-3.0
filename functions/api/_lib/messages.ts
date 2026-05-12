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
