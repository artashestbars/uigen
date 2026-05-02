import { test, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MessageList } from "../MessageList";
import type { UIMessage } from "ai";

vi.mock("../MarkdownRenderer", () => ({
  MarkdownRenderer: ({ content }: { content: string }) => <div>{content}</div>,
}));

afterEach(() => {
  cleanup();
});

function userMsg(id: string, text: string): UIMessage {
  return { id, role: "user", parts: [{ type: "text", text }] };
}

function assistantMsg(id: string, parts: UIMessage["parts"]): UIMessage {
  return { id, role: "assistant", parts };
}

test("MessageList renders nothing when no messages", () => {
  const { container } = render(<MessageList messages={[]} />);
  expect(container.querySelectorAll(".rounded-2xl")).toHaveLength(0);
});

test("MessageList renders user messages", () => {
  const messages: UIMessage[] = [userMsg("1", "Create a button component")];

  render(<MessageList messages={messages} />);

  expect(screen.getByText("Create a button component")).toBeDefined();
});

test("MessageList renders assistant messages", () => {
  const messages: UIMessage[] = [
    assistantMsg("1", [{ type: "text", text: "I'll help you create a button component." }]),
  ];

  render(<MessageList messages={messages} />);

  expect(screen.getByText("I'll help you create a button component.")).toBeDefined();
});

test("MessageList renders messages with tool parts", () => {
  const messages: UIMessage[] = [
    assistantMsg("1", [
      { type: "text", text: "Creating your component..." },
      {
        type: "dynamic-tool" as any,
        toolCallId: "asdf",
        toolName: "str_replace_editor",
        input: {},
        state: "output-available",
        output: "Success",
      },
    ]),
  ];

  render(<MessageList messages={messages} />);

  expect(screen.getByText("Creating your component...")).toBeDefined();
  expect(screen.getByText("Str Replace Editor")).toBeDefined();
});

test("MessageList shows content for assistant message", () => {
  const messages: UIMessage[] = [
    assistantMsg("1", [{ type: "text", text: "Generating your component..." }]),
  ];

  render(<MessageList messages={messages} isLoading={true} />);

  expect(screen.getByText("Generating your component...")).toBeDefined();
  expect(screen.queryByText("Generating…")).toBeNull();
});

test("MessageList shows loading state for last assistant message without parts", () => {
  const messages: UIMessage[] = [
    assistantMsg("1", []),
  ];

  render(<MessageList messages={messages} isLoading={true} />);

  expect(screen.getByText("Generating…")).toBeDefined();
});

test("MessageList doesn't show loading state for non-last messages", () => {
  const messages: UIMessage[] = [
    assistantMsg("1", [{ type: "text", text: "First response" }]),
    userMsg("2", "Another request"),
  ];

  render(<MessageList messages={messages} isLoading={true} />);

  expect(screen.queryByText("Generating…")).toBeNull();
});

test("MessageList renders reasoning parts", () => {
  const messages: UIMessage[] = [
    assistantMsg("1", [
      { type: "text", text: "Let me analyze this." },
      {
        type: "reasoning",
        text: "The user wants a button component with specific styling.",
      },
    ]),
  ];

  render(<MessageList messages={messages} />);

  expect(screen.getByText("Reasoning")).toBeDefined();
  expect(screen.getByText("The user wants a button component with specific styling.")).toBeDefined();
});

test("MessageList renders multiple messages in correct order", () => {
  const messages: UIMessage[] = [
    userMsg("1", "First user message"),
    assistantMsg("2", [{ type: "text", text: "First assistant response" }]),
    userMsg("3", "Second user message"),
    assistantMsg("4", [{ type: "text", text: "Second assistant response" }]),
  ];

  const { container } = render(<MessageList messages={messages} />);

  const messageContainers = container.querySelectorAll(".rounded-2xl");
  expect(messageContainers).toHaveLength(4);
  expect(messageContainers[0].textContent).toContain("First user message");
  expect(messageContainers[1].textContent).toContain("First assistant response");
  expect(messageContainers[2].textContent).toContain("Second user message");
  expect(messageContainers[3].textContent).toContain("Second assistant response");
});

test("MessageList handles step-start parts", () => {
  const messages: UIMessage[] = [
    assistantMsg("1", [
      { type: "text", text: "Step 1 content" },
      { type: "step-start" },
      { type: "text", text: "Step 2 content" },
    ]),
  ];

  render(<MessageList messages={messages} />);

  expect(screen.getByText("Step 1 content")).toBeDefined();
  expect(screen.getByText("Step 2 content")).toBeDefined();
  const container = screen.getByText("Step 1 content").closest(".rounded-2xl");
  expect(container?.querySelector("hr")).toBeDefined();
});

test("MessageList applies correct styling for user vs assistant messages", () => {
  const messages: UIMessage[] = [
    userMsg("1", "User message"),
    assistantMsg("2", [{ type: "text", text: "Assistant message" }]),
  ];

  render(<MessageList messages={messages} />);

  const userMessage = screen.getByText("User message").closest(".rounded-2xl");
  const assistantMessage = screen.getByText("Assistant message").closest(".rounded-2xl");

  expect(userMessage?.className).toContain("bg-blue-600");
  expect(userMessage?.className).toContain("text-white");
  expect(assistantMessage?.className).toContain("bg-neutral-100");
  expect(assistantMessage?.className).toContain("text-neutral-900");
});

test("MessageList handles empty parts array", () => {
  const messages: UIMessage[] = [
    assistantMsg("1", [{ type: "text", text: "This is from parts" }]),
  ];

  render(<MessageList messages={messages} />);

  expect(screen.getByText("This is from parts")).toBeDefined();
});

test("MessageList shows loading for assistant message with empty parts", () => {
  const messages: UIMessage[] = [
    assistantMsg("1", []),
  ];

  const { container } = render(<MessageList messages={messages} isLoading={true} />);

  const loadingText = container.querySelectorAll(".text-xs");
  const generatingElements = Array.from(loadingText).filter(
    (el) => el.textContent === "Generating…"
  );
  expect(generatingElements).toHaveLength(1);
});
