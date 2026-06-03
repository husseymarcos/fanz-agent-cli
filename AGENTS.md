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
- `bun run dev` — Next.js dev server on `http://localhost:3000`
- `bun run build` — production build
- `bun run lint` — ESLint (flat config in `eslint.config.mjs`)
- `bun run test` — see Test quirks below

## Testing
- Tests use **Bun's built-in test runner** (`bun:test`) with `expect`-style assertions.
- Run with `bun test` (or `bun run test`). No compilation step needed.
- Test files live in `tests/` and import the CLI engine directly from `lib/fanz-cli/`.

## Architecture
- **App Router**: entrypoints are `app/layout.tsx` and `app/page.tsx`.
- **CLI engine**: lives in `lib/fanz-cli/` and is framework-agnostic. Key files:
  - `engine.ts` — `runCli(input, state)` dispatch loop
  - `data.ts` — seed data and `createInitialState()`
  - `types.ts` — domain types (`FanzState`, `CliResponse`, etc.)
  - `core/` — parser, auth, responses, selectors, mutations
  - `commands/` — per-namespace handlers (events, tickets, orders, sales, etc.)
  - `catalog/builders.ts` — creation helpers
  - `presentation/` — text formatting and view helpers
- **Web UI**: `app/components/TerminalPanel.tsx` wires xterm.js to `runCli` and persists state to `localStorage` under key `fanz-cli-state-v1`.
- **No external APIs**: all data is mock/seeded; nothing hits the network.

## Style & toolchain
- **Tailwind CSS v4** via `@tailwindcss/postcss`. Globals import with `@import "tailwindcss";` in `app/globals.css`.
- **ESLint 9** flat config. `eslint.config.mjs` uses `defineConfig` from `eslint/config` and extends `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`.
- TypeScript `strict: true`, `noEmit: true` in `tsconfig.json` (overridden during test compilation).
- Path alias `@/*` maps to `./*`.

## Domain conventions
- CLI commands follow the pattern `fanz <namespace> <action> [subject] --flags [--json]`.
- Authentication uses mock tokens: `mock_admin` (full), `mock_ops` (read/write/export/resend), `mock_viewer` (read only).
- Destructive operations require `--yes`. Use `--dry-run` to preview effects without mutating state.
- Events with paid orders cannot be deleted even with `--yes`.
- `--json` flag switches output to parseable JSON.
