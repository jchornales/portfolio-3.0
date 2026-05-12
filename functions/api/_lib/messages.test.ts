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
