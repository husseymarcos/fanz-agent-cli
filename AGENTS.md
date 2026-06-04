<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This repo runs **Next.js 16.2.6** and **React 19**. APIs, conventions, and file structure differ from older versions. Before writing any Next.js code, read the relevant guide in `node_modules/next/dist/docs/` and heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Fanz Agent CLI — Agent Notes

## Project type
Browser-based mock CLI for a ticketing platform. The web UI renders a terminal via xterm.js; the actual CLI engine is pure TypeScript with no React or xterm dependency.

## Package manager
Use **Bun**. Lockfile is `bun.lock`.

## Developer commands
- `bun install`
- `bun run generate:commands` — **codegen required before build/test when `lib/commands/` changes**. See Codegen below.
- `bun run dev` — Next.js dev server on `http://localhost:3000`
- `bun run build` — runs codegen then production build
- `bun run lint` — ESLint (flat config in `eslint.config.mjs`)
- `bun run test` — runs codegen then all tests

## Testing
- Tests use **Bun's built-in test runner** (`bun:test`) with `expect`-style assertions.
- Run all: `bun test` or `bun run test`.
- Run single file: `bun test tests/engine.test.ts`.
- Test files live in `tests/` and import the CLI engine directly from `lib/`.
- No compilation step needed; Bun runs TypeScript directly.

## Codegen
- `scripts/generate-command-registry.ts` scans `lib/commands/` and auto-generates `lib/commands/generated.ts`.
- **Every command file** must export a class whose name matches the filename (e.g., `export class CreateEvent` in `events/CreateEvent.ts`).
- The script maps routes from directory + class name (`events/CreateEvent.ts` → `events.create`).
- `bun run build` and `bun run test` both run codegen first. If you add or rename a command, run `bun run generate:commands` before testing or building.

## Architecture
- **App Router**: entrypoints are `app/layout.tsx` and `app/page.tsx`.
- **CLI engine**: framework-agnostic TypeScript in `lib/*.ts` and `lib/commands/**/*.ts`. Key files:
  - `engine.ts` — `runCli(input, state)` clones state, dispatches parsed commands via `lib/commands/generated.ts`, records audit entries, and returns `{ state, response }`.
  - `parser.ts` — command parsing and `CliError`.
  - `data.ts` — domain types, seed data, `STORAGE_KEY`, `nextId()`, and `createInitialState()`.
  - `lib/commands/<namespace>/<ActionName>.ts` — per-namespace command classes implementing `CliAction`.
  - `format.ts` — CLI response formatting for terminal text and `--json` output.
- **Web UI**: `app/page.tsx` composes the terminal screen from `app/components/QuickStartSidebar.tsx` and `app/components/TerminalPanel.tsx`.
  - `QuickStartSidebar.tsx` renders the logo, token notes, and clickable quick-start commands.
  - `TerminalPanel.tsx` wires xterm.js to `runCli`, manages command history, exposes `runCommand()` to the sidebar, colorizes output, supports `clear`/reset, and persists state to `localStorage` under `STORAGE_KEY`.
- **No external APIs**: all data is mock/seeded; nothing hits the network.

## Style & toolchain
- **Tailwind CSS v4** via `@tailwindcss/postcss`. Globals import with `@import "tailwindcss";` in `app/globals.css`.
- **ESLint 9** flat config. `eslint.config.mjs` uses `defineConfig` from `eslint/config` and extends `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`.
- TypeScript `strict: true`, `noEmit: true` in `tsconfig.json`.
- Path alias `@/*` maps to `./*`.

## Domain conventions
- CLI commands follow the pattern `fanz <namespace> <action> [subject] --flags [--json]`.
- Authentication uses mock tokens: `mock_admin` (full), `mock_ops` (read/write/export/resend), `mock_viewer` (read only).
- Destructive operations require `--yes`. Use `--dry-run` to preview effects without mutating state.
- Events with paid orders cannot be deleted even with `--yes`.
- `--json` flag switches output to parseable JSON.
