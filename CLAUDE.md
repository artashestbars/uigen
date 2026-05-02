# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**UIGen** is an AI-powered React component generator with live preview. Users describe components in natural language, and Claude (via the Anthropic API) generates React code in real-time. The app includes optional user authentication, project persistence via Prisma/SQLite, and a virtual file system that doesn't write files to disk.

## Quick Commands

```bash
# Setup
npm run setup                    # Install dependencies, generate Prisma client, run migrations

# Development
npm run dev                      # Start dev server with Turbopack (Unix/Linux/Mac)
npm run dev:win                  # Start dev server on Windows
npm run dev:daemon              # Run dev server in background, logs to logs.txt

# Building & Running
npm run build                    # Build for production
npm run start                    # Start production server

# Code Quality
npm run lint                     # Run ESLint
npm run test                     # Run all tests with Vitest
npm run test -- path/to/test    # Run specific test file

# Database
npm run db:reset                 # Reset Prisma database (destructive)
```

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 15 with App Router
- **UI**: React 19, Tailwind CSS v4, Radix UI components
- **Styling**: shadcn/ui components (New York style)
- **AI**: Anthropic Claude (via @ai-sdk/anthropic) with optional mock fallback
- **Database**: Prisma ORM with SQLite
- **Code Editor**: Monaco Editor (@monaco-editor/react)
- **Testing**: Vitest with React Testing Library
- **Build**: Turbopack for dev, Next.js build for production

### Core Architecture Layers

#### 1. Virtual File System (src/lib/file-system.ts)

A critical innovation—components are generated in a virtual file system (VFS) that exists only in memory during a session. This system:
- Provides createFile(), updateFile(), deleteFile(), renameFile() methods
- Supports directory structures with parent-child relationships
- Can serialize/deserialize to/from JSON for persistence
- Is shared across all components via React Context

#### 2. AI Backend (src/app/api/chat/route.ts)

The /api/chat POST endpoint handles component generation:
- Uses streamText() from Vercel AI SDK for streaming responses
- Implements prompt caching with ephemeral cache control (Anthropic feature)
- Provides two AI tools that Claude uses to modify the VFS:
  - str_replace_editor: Create/edit files with string replacement
  - file_manager: Rename/delete files
- Falls back to MockLanguageModel when ANTHROPIC_API_KEY is not set (generates static component code)
- Saves generation history and file snapshots to the database for authenticated users
- Set to 40 max steps (4 for mock), 10k max tokens

#### 3. Frontend Layout (src/app/main-content.tsx)

The primary UI uses resizable panels:
- Left (35%): Chat interface for user prompts
- Right (65%): Toggleable preview/code views
  - Preview: PreviewFrame renders the generated React code
  - Code: Split into FileTree (30%) and CodeEditor (70%)

#### 4. Data Persistence (prisma/schema.prisma)

Two Prisma models:
- User: Email (unique), bcrypt-hashed password, timestamps
- Project: Associated with User, stores serialized messages and VFS state as JSON strings
- Anonymous users can generate components without saving

#### 5. Authentication (src/lib/auth.ts)

JWT-based session management:
- 7-day token expiration, stored as httpOnly cookie
- signUp() and signIn() validate and hash passwords with bcrypt
- Anonymous users can use the app without signup
- getSession() validates JWT from cookies (server-only function)

#### 6. React Contexts (src/lib/contexts/)

State management without Redux:
- FileSystemContext: Provides VFS instance, file selection, and refresh signals
- ChatProvider: Wraps Vercel AI SDK's useChat() hook, passes serialized VFS to /api/chat, processes tool calls to update VFS

### Key Data Flows

**Component Generation Flow**:
1. User types prompt in ChatInterface
2. ChatProvider calls /api/chat with messages + serialized VFS
3. API deserializes VFS, calls Claude with tools available
4. Claude streams text + tool calls (str_replace_editor, file_manager)
5. chat-context processes tool calls via handleToolCall() -> updates VFS
6. FileSystemContext triggers refresh, components re-render
7. PreviewFrame executes generated code in hidden iframe
8. Authenticated: project saved to DB with messages + VFS snapshot

**File Editing in Code View**:
1. User selects file in FileTree
2. FileSystemContext updates selectedFile state
3. CodeEditor displays content from VFS
4. User edits, updateFile() modifies VFS
5. PreviewFrame re-renders with changes

### System Prompt

Claude's generation behavior is controlled by src/lib/prompts/generation.tsx. Key constraints:
- Always create /App.jsx as the entry point
- Use Tailwind CSS only (no hardcoded styles)
- Import non-library files via @/ alias (e.g., @/components/Calculator)
- Virtual file system is rooted at / (not traditional filesystem)
- Keep responses brief unless summarization is requested

### Component Organization

- src/components/ui/: shadcn/ui primitives (button, dialog, input, tabs, resizable, etc.)
- src/components/auth/: SignUpForm, SignInForm, AuthDialog
- src/components/chat/: ChatInterface, MessageList, MessageInput, MarkdownRenderer
- src/components/editor/: CodeEditor (Monaco), FileTree
- src/components/preview/: PreviewFrame (renders code in iframe)
- src/lib/tools/: AI tools (str_replace_editor, file_manager) used by Claude
- src/actions/: Server actions (signUp, signIn, getUser, createProject, getProject, getProjects)
- src/hooks/: Custom React hooks (useFileSystem, useChat)

### Testing

- Uses Vitest for unit tests
- Tests located in __tests__ directories alongside source files
- Configured via vitest.config.mts with jsdom environment and tsconfig paths
- Example test files: chat-context.test.tsx, file-system.test.ts, jsx-transformer.test.ts

### Configuration Files

- tsconfig.json: Path alias @/* -> ./src/*, strict mode enabled
- components.json: shadcn/ui setup (New York style, Lucide icons)
- .eslintrc.json: Extends Next.js ESLint config
- next.config.ts: Minimal config, disables dev indicators
- postcss.config.mjs: Tailwind CSS v4 via @tailwindcss/postcss
- .env: ANTHROPIC_API_KEY (optional, required for real Claude API)

### Environment & Dependencies

- Node.js 18+ required
- npm for package management
- Optional: Anthropic API key in .env (fallback to mock provider if omitted)
- Database: SQLite at prisma/dev.db (created automatically on setup)

### Important Implementation Details

**Mock Provider Fallback** (src/lib/provider.ts):
- If ANTHROPIC_API_KEY is missing or empty, a MockLanguageModel generates static component code
- Useful for demos without API credentials
- Mock respects the same tool interface as real Claude

**Anonymous Work Tracking** (src/lib/anon-work-tracker.ts):
- Tracks whether an anonymous user has performed generation
- Used to show auth prompt before leaving the page

**JSX Transformer** (src/lib/transform/jsx-transformer.ts):
- Likely used for parsing/transforming React code, test coverage exists

**Babel Standalone** (@babel/standalone):
- Allows runtime JSX compilation for PreviewFrame iframe

## Code Style

Use comments sparingly. Only comment complex or non-obvious code.

## Development Notes

- The codebase uses Node 18+ compatibility shim (node-compat.cjs) required for Turbopack
- Database runs locally during development; migrations auto-create schema
- All file modifications in the app happen in the virtual file system, not on disk
- Preview rendering uses an iframe for sandboxing generated code
- The AI system is designed to be iterative—users can refine components through multiple turns

