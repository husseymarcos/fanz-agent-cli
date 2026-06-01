"use client";

import { useEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import { Terminal } from "@xterm/xterm";
import { createInitialState, STORAGE_KEY } from "@/lib/fanz-cli/data";
import { runCli } from "@/lib/fanz-cli/engine";
import { formatResponse } from "@/lib/fanz-cli/format";
import type { FanzState } from "@/lib/fanz-cli/types";

const PROMPT = "\x1b[38;2;45;212;191mfanz\x1b[0m $ ";

const STARTUP_COMMANDS = [
  "fanz login --token mock_admin",
  'fanz events create --name "Fiesta Demo" --description "Evento creado desde la prueba" --location "C Complejo Art Media" --date 2026-07-20T23:00:00Z --ticket "General:10000:500" --status on_sale --json',
  "fanz sales summary --event EVT_100 --json",
  "fanz orders resend ORD_100 --email comprador@example.test --json",
];

export default function FanzTerminal() {
  const hostRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<FanzState>(createInitialState());
  const lineRef = useRef("");
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(0);
  const terminalRef = useRef<Terminal | null>(null);

  useEffect(() => {
    if (!hostRef.current || terminalRef.current) return;

    const terminal = new Terminal({
      cursorBlink: true,
      convertEol: true,
      fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
      fontSize: 13,
      lineHeight: 1.35,
      theme: {
        background: "#080b0d",
        foreground: "#d8f3ee",
        cursor: "#2dd4bf",
        selectionBackground: "#134e4a",
      },
      allowProposedApi: false,
    });

    stateRef.current = loadState();
    bindRefs(lineRef, historyRef, historyIndexRef, stateRef);
    terminalRef.current = terminal;
    terminal.open(hostRef.current);
    terminal.writeln("\x1b[1;38;2;255;255;255mFanz CLI mock\x1b[0m");
    terminal.writeln("Token admin: mock_admin | ops: mock_ops | viewer: mock_viewer");
    terminal.writeln("Run \x1b[36mfanz help\x1b[0m for copyable end-to-end commands.");
    terminal.writeln("");
    writePrompt(terminal);

    terminal.onData((data) => {
      if (data === "\u001b[A") {
        recallHistory(-1, terminal);
        return;
      }
      if (data === "\u001b[B") {
        recallHistory(1, terminal);
        return;
      }
      for (const char of data) handleInput(char, terminal);
    });

    const resize = () => {
      const parent = hostRef.current;
      if (!parent) return;
      const cols = Math.max(64, Math.floor(parent.clientWidth / 8));
      const rows = Math.max(18, Math.floor(parent.clientHeight / 18));
      terminal.resize(cols, rows);
    };

    resize();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      terminal.dispose();
      terminalRef.current = null;
    };
  }, []);

  return (
    <section className="grid min-h-dvh bg-[#f5f7f6] text-[#0a1614] lg:grid-cols-[360px_1fr]">
      <aside className="border-b border-[#d9e2df] bg-white px-6 py-6 lg:border-b-0 lg:border-r">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0f766e]">Fanz Agent CLI</p>
          <h1 className="mt-2 text-2xl font-semibold leading-tight">Ticketing mock desde una web terminal</h1>
        </div>

        <div className="space-y-5 text-sm leading-6 text-[#42514e]">
          <p>
            Demo autocontenida para probar una cuenta mock sin instalar nada. El estado se guarda en este navegador y
            los comandos aceptan `--json` para agentes.
          </p>
          <div>
            <h2 className="mb-2 text-sm font-semibold text-[#0a1614]">Tokens</h2>
            <ul className="space-y-1">
              <li><code>mock_admin</code>: read, write, delete, export, resend</li>
              <li><code>mock_ops</code>: read, write, export, resend</li>
              <li><code>mock_viewer</code>: read only</li>
            </ul>
          </div>
          <div>
            <h2 className="mb-2 text-sm font-semibold text-[#0a1614]">Flujo rapido</h2>
            <div className="space-y-2">
              {STARTUP_COMMANDS.map((command) => (
                <button
                  className="block w-full rounded border border-[#c9d7d3] bg-[#f8fbfa] px-3 py-2 text-left font-mono text-xs text-[#12211f] transition hover:border-[#0f766e] hover:bg-[#eef8f6]"
                  key={command}
                  onClick={() => runFromButton(command, terminalRef.current, stateRef)}
                  type="button"
                >
                  {command}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      <main className="flex min-h-[68dvh] flex-col p-4 sm:p-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[#0a1614]">Terminal</p>
            <p className="text-xs text-[#5f706c]">Escribi comandos o pegá ejemplos del panel.</p>
          </div>
          <button
            className="rounded border border-[#c9d7d3] bg-white px-3 py-2 text-sm font-medium text-[#0a1614] transition hover:border-[#0f766e]"
            onClick={() => resetTerminal(terminalRef.current, stateRef)}
            type="button"
          >
            Reset mock
          </button>
        </div>
        <div
          className="min-h-[540px] flex-1 overflow-hidden rounded-lg border border-[#152522] bg-[#080b0d] p-3 shadow-[0_16px_50px_rgba(10,22,20,0.16)]"
          ref={hostRef}
        />
      </main>
    </section>
  );
}

function handleInput(char: string, terminal: Terminal) {
  if (char === "\r") {
    const command = lineRefValue();
    terminal.writeln("");
    executeLine(command, terminal);
    setLine("");
    writePrompt(terminal);
    return;
  }

  if (char === "\u007F") {
    if (!lineRefValue()) return;
    setLine(lineRefValue().slice(0, -1));
    terminal.write("\b \b");
    return;
  }

  if (char >= " " && char !== "\u007F") {
    setLine(lineRefValue() + char);
    terminal.write(char);
  }
}

let activeLineRef = { current: "" };
let activeHistoryRef = { current: [] as string[] };
let activeHistoryIndexRef = { current: 0 };
let activeStateRef = { current: createInitialState() };

function lineRefValue() {
  return activeLineRef.current;
}

function setLine(value: string) {
  activeLineRef.current = value;
}

function executeLine(command: string, terminal: Terminal) {
  const trimmed = command.trim();
  if (!trimmed) return;
  if (trimmed === "clear") {
    terminal.clear();
    return;
  }

  activeHistoryRef.current.push(trimmed);
  activeHistoryIndexRef.current = activeHistoryRef.current.length;

  const { state, response } = runCli(trimmed, activeStateRef.current);
  activeStateRef.current = state;
  saveState(state);
  terminal.writeln(colorize(formatResponse(response, trimmed.includes("--json"))));
}

function recallHistory(direction: -1 | 1, terminal: Terminal) {
  const history = activeHistoryRef.current;
  if (history.length === 0) return;
  activeHistoryIndexRef.current = Math.min(
    history.length,
    Math.max(0, activeHistoryIndexRef.current + direction),
  );
  const next = history[activeHistoryIndexRef.current] ?? "";
  replaceCurrentLine(next, terminal);
}

function replaceCurrentLine(value: string, terminal: Terminal) {
  terminal.write("\r\x1b[2K");
  writePrompt(terminal);
  terminal.write(value);
  setLine(value);
}

function writePrompt(terminal: Terminal) {
  terminal.write(PROMPT);
}

function loadState(): FanzState {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return createInitialState();
    const parsed = JSON.parse(stored) as FanzState;
    return parsed.version === 1 ? parsed : createInitialState();
  } catch {
    return createInitialState();
  }
}

function saveState(state: FanzState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function resetTerminal(terminal: Terminal | null, stateRef: MutableRefObject<FanzState>) {
  if (!terminal) return;
  const state = createInitialState();
  stateRef.current = state;
  activeStateRef.current = state;
  saveState(state);
  terminal.clear();
  terminal.writeln("Mock account reset.");
  writePrompt(terminal);
}

function runFromButton(
  command: string,
  terminal: Terminal | null,
  stateRef: MutableRefObject<FanzState>,
) {
  if (!terminal) return;
  terminal.writeln(command);
  activeStateRef.current = stateRef.current;
  executeLine(command, terminal);
  stateRef.current = activeStateRef.current;
  writePrompt(terminal);
}

function colorize(output: string) {
  if (output.startsWith("Error:")) return `\x1b[31m${output}\x1b[0m`;
  if (output.startsWith("Dry run:")) return `\x1b[33m${output}\x1b[0m`;
  return output;
}

function bindRefs(
  lineRef: MutableRefObject<string>,
  historyRef: MutableRefObject<string[]>,
  historyIndexRef: MutableRefObject<number>,
  stateRef: MutableRefObject<FanzState>,
) {
  activeLineRef = lineRef;
  activeHistoryRef = historyRef;
  activeHistoryIndexRef = historyIndexRef;
  activeStateRef = stateRef;
}
