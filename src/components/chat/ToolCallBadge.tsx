import { getToolName } from "ai";
import { Loader2 } from "lucide-react";

function friendlyToolName(name: string): string {
  return name
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function getToolCallLabel(
  toolName: string,
  input: Record<string, unknown>
): string {
  const command = typeof input.command === "string" ? input.command : undefined;
  const path = typeof input.path === "string" ? input.path : undefined;
  const newPath = typeof input.new_path === "string" ? input.new_path : undefined;

  if (toolName === "str_replace_editor") {
    if (!path) return friendlyToolName(toolName);
    switch (command) {
      case "create":
        return `Creating ${path}`;
      case "str_replace":
      case "insert":
        return `Editing ${path}`;
      case "view":
        return `Viewing ${path}`;
      case "undo_edit":
        return `Undoing edit in ${path}`;
      default:
        return `Viewing ${path}`;
    }
  }

  if (toolName === "file_manager") {
    if (!path) return friendlyToolName(toolName);
    switch (command) {
      case "rename":
        return newPath ? `Renaming ${path} → ${newPath}` : `Renaming ${path}`;
      case "delete":
        return `Deleting ${path}`;
      default:
        return friendlyToolName(toolName);
    }
  }

  return friendlyToolName(toolName);
}

interface ToolCallBadgeProps {
  toolPart: any;
}

export function ToolCallBadge({ toolPart }: ToolCallBadgeProps) {
  const toolName = getToolName(toolPart) ?? toolPart.toolName ?? "";
  const input = (toolPart.input as Record<string, unknown>) ?? {};
  const label = getToolCallLabel(toolName, input);
  const isDone = toolPart.state === "output-available" && toolPart.output !== undefined;

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isDone ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}
