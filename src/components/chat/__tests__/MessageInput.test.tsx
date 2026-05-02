import { test, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MessageInput } from "../MessageInput";

afterEach(() => {
  cleanup();
});

test("renders with placeholder text", () => {
  render(<MessageInput onSend={vi.fn()} isLoading={false} />);

  const textarea = screen.getByPlaceholderText("Describe the React component you want to create...");
  expect(textarea).toBeDefined();
});

test("allows typing in textarea", async () => {
  render(<MessageInput onSend={vi.fn()} isLoading={false} />);

  const textarea = screen.getByRole("textbox");
  await userEvent.type(textarea, "Hello");

  expect(screen.getByDisplayValue("Hello")).toBeDefined();
});

test("calls onSend when form is submitted with text", async () => {
  const onSend = vi.fn();
  render(<MessageInput onSend={onSend} isLoading={false} />);

  const textarea = screen.getByRole("textbox");
  await userEvent.type(textarea, "Test input");

  const form = textarea.closest("form")!;
  fireEvent.submit(form);

  expect(onSend).toHaveBeenCalledWith("Test input");
});

test("submits form when Enter is pressed without shift", async () => {
  const onSend = vi.fn();
  render(<MessageInput onSend={onSend} isLoading={false} />);

  const textarea = screen.getByRole("textbox");
  await userEvent.type(textarea, "Test input");
  fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

  expect(onSend).toHaveBeenCalled();
});

test("does not submit form when Enter is pressed with shift", async () => {
  const onSend = vi.fn();
  render(<MessageInput onSend={onSend} isLoading={false} />);

  const textarea = screen.getByRole("textbox");
  await userEvent.type(textarea, "Test input");
  fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });

  expect(onSend).not.toHaveBeenCalled();
});

test("disables textarea when isLoading is true", () => {
  render(<MessageInput onSend={vi.fn()} isLoading={true} />);

  const textarea = screen.getByRole("textbox");
  expect(textarea).toHaveProperty("disabled", true);
});

test("disables submit button when isLoading is true", async () => {
  render(<MessageInput onSend={vi.fn()} isLoading={true} />);

  const submitButton = screen.getByRole("button");
  expect(submitButton).toHaveProperty("disabled", true);
});

test("disables submit button when input is empty", () => {
  render(<MessageInput onSend={vi.fn()} isLoading={false} />);

  const submitButton = screen.getByRole("button");
  expect(submitButton).toHaveProperty("disabled", true);
});

test("enables submit button when input has content and not loading", async () => {
  render(<MessageInput onSend={vi.fn()} isLoading={false} />);

  const textarea = screen.getByRole("textbox");
  await userEvent.type(textarea, "Valid content");

  const submitButton = screen.getByRole("button");
  expect(submitButton).toHaveProperty("disabled", false);
});

test("applies correct CSS classes based on loading state", () => {
  const { rerender } = render(<MessageInput onSend={vi.fn()} isLoading={false} />);

  let submitButton = screen.getByRole("button");
  expect(submitButton.className).toContain("disabled:opacity-40");
  expect(submitButton.className).toContain("hover:bg-blue-50");

  rerender(<MessageInput onSend={vi.fn()} isLoading={true} />);

  submitButton = screen.getByRole("button");
  expect(submitButton.className).toContain("disabled:cursor-not-allowed");
  expect(submitButton.className).toContain("disabled:opacity-40");
});

test("applies correct icon color based on loading/empty state", async () => {
  const { rerender } = render(<MessageInput onSend={vi.fn()} isLoading={false} />);

  // With empty input - icon should be neutral
  let sendIcon = screen.getByRole("button").querySelector("svg");
  expect(sendIcon?.getAttribute("class")).toContain("text-neutral-300");

  // Type something
  const textarea = screen.getByRole("textbox");
  await userEvent.type(textarea, "Test");
  sendIcon = screen.getByRole("button").querySelector("svg");
  expect(sendIcon?.getAttribute("class")).toContain("text-blue-600");

  rerender(<MessageInput onSend={vi.fn()} isLoading={true} />);
  sendIcon = screen.getByRole("button").querySelector("svg");
  expect(sendIcon?.getAttribute("class")).toContain("text-neutral-300");
});

test("textarea has correct styling classes", () => {
  render(<MessageInput onSend={vi.fn()} isLoading={false} />);

  const textarea = screen.getByRole("textbox");
  expect(textarea.className).toContain("min-h-[80px]");
  expect(textarea.className).toContain("max-h-[200px]");
  expect(textarea.className).toContain("resize-none");
  expect(textarea.className).toContain("focus:ring-2");
  expect(textarea.className).toContain("focus:ring-blue-500/10");
});

test("submit button click triggers onSend", async () => {
  const onSend = vi.fn();
  render(<MessageInput onSend={onSend} isLoading={false} />);

  const textarea = screen.getByRole("textbox");
  await userEvent.type(textarea, "Test input");

  const submitButton = screen.getByRole("button");
  await userEvent.click(submitButton);

  expect(onSend).toHaveBeenCalledWith("Test input");
});

test("clears input after submission", async () => {
  render(<MessageInput onSend={vi.fn()} isLoading={false} />);

  const textarea = screen.getByRole("textbox");
  await userEvent.type(textarea, "Test input");
  expect(screen.getByDisplayValue("Test input")).toBeDefined();

  const form = textarea.closest("form")!;
  fireEvent.submit(form);

  expect(screen.getByDisplayValue("")).toBeDefined();
});
