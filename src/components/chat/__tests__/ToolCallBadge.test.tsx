import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { getToolCallLabel, ToolCallBadge } from "../ToolCallBadge";

afterEach(() => {
  cleanup();
});

// --- getToolCallLabel unit tests ---

test("getToolCallLabel: str_replace_editor create", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "create", path: "/App.jsx" })).toBe("Creating /App.jsx");
});

test("getToolCallLabel: str_replace_editor str_replace", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "str_replace", path: "/App.jsx" })).toBe("Editing /App.jsx");
});

test("getToolCallLabel: str_replace_editor insert", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "insert", path: "/App.jsx" })).toBe("Editing /App.jsx");
});

test("getToolCallLabel: str_replace_editor view", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "view", path: "/App.jsx" })).toBe("Viewing /App.jsx");
});

test("getToolCallLabel: str_replace_editor undo_edit", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "undo_edit", path: "/App.jsx" })).toBe("Undoing edit in /App.jsx");
});

test("getToolCallLabel: str_replace_editor unknown command falls back to Viewing", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "unknown_cmd", path: "/App.jsx" })).toBe("Viewing /App.jsx");
});

test("getToolCallLabel: file_manager rename with new_path", () => {
  expect(getToolCallLabel("file_manager", { command: "rename", path: "/old.jsx", new_path: "/new.jsx" })).toBe("Renaming /old.jsx → /new.jsx");
});

test("getToolCallLabel: file_manager rename without new_path", () => {
  expect(getToolCallLabel("file_manager", { command: "rename", path: "/old.jsx" })).toBe("Renaming /old.jsx");
});

test("getToolCallLabel: file_manager delete", () => {
  expect(getToolCallLabel("file_manager", { command: "delete", path: "/App.jsx" })).toBe("Deleting /App.jsx");
});

test("getToolCallLabel: unknown tool name returns title-cased friendly name", () => {
  expect(getToolCallLabel("my_custom_tool", {})).toBe("My Custom Tool");
});

test("getToolCallLabel: empty args for str_replace_editor returns friendly name", () => {
  expect(getToolCallLabel("str_replace_editor", {})).toBe("Str Replace Editor");
});

test("getToolCallLabel: empty args for file_manager returns friendly name", () => {
  expect(getToolCallLabel("file_manager", {})).toBe("File Manager");
});

test("getToolCallLabel: str_replace_editor with command but no path returns friendly name", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "create" })).toBe("Str Replace Editor");
});

// --- ToolCallBadge render tests ---

test("ToolCallBadge shows label and green dot when output-available state", () => {
  const toolPart = {
    type: "dynamic-tool",
    toolCallId: "1",
    toolName: "str_replace_editor",
    input: { command: "create", path: "/App.jsx" },
    state: "output-available",
    output: "Success",
  };

  const { container } = render(<ToolCallBadge toolPart={toolPart} />);

  expect(screen.getByText("Creating /App.jsx")).toBeDefined();
  expect(container.querySelector(".bg-emerald-500")).toBeDefined();
  expect(container.querySelector(".animate-spin")).toBeNull();
});

test("ToolCallBadge shows label and spinner when input-available state", () => {
  const toolPart = {
    type: "dynamic-tool",
    toolCallId: "1",
    toolName: "str_replace_editor",
    input: { command: "create", path: "/App.jsx" },
    state: "input-available",
  };

  const { container } = render(<ToolCallBadge toolPart={toolPart} />);

  expect(screen.getByText("Creating /App.jsx")).toBeDefined();
  expect(container.querySelector(".animate-spin")).toBeDefined();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});

test("ToolCallBadge shows spinner when input-streaming state", () => {
  const toolPart = {
    type: "dynamic-tool",
    toolCallId: "1",
    toolName: "str_replace_editor",
    input: { command: "create", path: "/App.jsx" },
    state: "input-streaming",
  };

  const { container } = render(<ToolCallBadge toolPart={toolPart} />);

  expect(container.querySelector(".animate-spin")).toBeDefined();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});

test("ToolCallBadge does not crash with empty input during streaming", () => {
  const toolPart = {
    type: "dynamic-tool",
    toolCallId: "1",
    toolName: "str_replace_editor",
    input: {},
    state: "input-streaming",
  };

  render(<ToolCallBadge toolPart={toolPart} />);

  expect(screen.getByText("Str Replace Editor")).toBeDefined();
});

test("ToolCallBadge renders file_manager delete label correctly", () => {
  const toolPart = {
    type: "dynamic-tool",
    toolCallId: "2",
    toolName: "file_manager",
    input: { command: "delete", path: "/components/Old.jsx" },
    state: "output-available",
    output: { success: true },
  };

  render(<ToolCallBadge toolPart={toolPart} />);

  expect(screen.getByText("Deleting /components/Old.jsx")).toBeDefined();
});

test("ToolCallBadge renders file_manager rename label with both paths", () => {
  const toolPart = {
    type: "dynamic-tool",
    toolCallId: "3",
    toolName: "file_manager",
    input: { command: "rename", path: "/old.jsx", new_path: "/new.jsx" },
    state: "input-available",
  };

  render(<ToolCallBadge toolPart={toolPart} />);

  expect(screen.getByText("Renaming /old.jsx → /new.jsx")).toBeDefined();
});
