"use client";

import { useEffect, useImperativeHandle, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { createInitialState, STORAGE_KEY } from "@/lib/data";
import { runCli } from "@/lib/engine";
import { formatResponse } from "@/lib/format";
import type { FanzState } from "@/lib/data";

const PROMPT = "\x1b[38;2;45;212;191mfanz\x1b[0m $ ";

export type TerminalPanelRef = {
  runCommand: (command: string) => void;
};

const TERMINAL_OPTIONS = {
  cursorBlink: true,
  convertEol: true,
  fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
  fontSize: 13,
  lineHeight: 1.35,
  theme: {
    background: "#111827",
    foreground: "#f1f5f9",
    cursor: "#3b82f6",
    selectionBackground: "#1e293b",
  },
  allowProposedApi: false,
};

export function TerminalPanel({ ref }: { ref: React.Ref<TerminalPanelRef> }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const runCommandRef = useRef<(command: string) => void>(() => {});
  const resetRef = useRef<() => void>(() => {});
  const didInitRef = useRef(false);

  useImperativeHandle(ref, () => ({
    runCommand: (command: string) => runCommandRef.current(command),
  }), []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || didInitRef.current) return;
    didInitRef.current = true;

    const terminal = new Terminal(TERMINAL_OPTIONS);
    let state: FanzState = loadState();
    const history: string[] = [];
    let historyIndex = 0;
    let line = "";

    const writePrompt = () => terminal.write(PROMPT);

    const execute = (rawCommand: string) => {
      const command = rawCommand.trim();
      if (!command) return;

      if (command === "clear") {
        terminal.clear();
        return;
      }

      history.push(command);
      historyIndex = history.length;

      const { state: newState, response } = runCli(command, state);
      state = newState;
      saveState(newState);
      terminal.writeln(colorize(formatResponse(response, command.includes("--json"))));
    };

    const runCommand = (command: string) => {
      terminal.writeln(command);
      execute(command);
      writePrompt();
    };

    const reset = () => {
      state = createInitialState();
      saveState(state);
      terminal.clear();
      terminal.writeln("Mock account reset.");
      writePrompt();
    };

    const replaceCurrentLine = (value: string) => {
      terminal.write("\r\x1b[2K");
      writePrompt();
      terminal.write(value);
      line = value;
    };

    const recallHistory = (direction: -1 | 1) => {
      if (history.length === 0) return;
      historyIndex = Math.min(history.length, Math.max(0, historyIndex + direction));
      replaceCurrentLine(history[historyIndex] ?? "");
    };

    const handleInput = (char: string) => {
      if (char === "\r") {
        terminal.writeln("");
        execute(line);
        line = "";
        writePrompt();
        return;
      }

      if (char === "\u007F") {
        if (!line) return;
        line = line.slice(0, -1);
        terminal.write("\b \b");
        return;
      }

      if (char >= " " && char !== "\u007F") {
        line += char;
        terminal.write(char);
      }
    };

    runCommandRef.current = runCommand;
    resetRef.current = reset;

    terminal.open(host);
    terminal.writeln("\x1b[1;38;2;255;255;255mFanz CLI mock\x1b[0m");
    terminal.writeln("Token admin: mock_admin | ops: mock_ops | viewer: mock_viewer");
    terminal.writeln("Run \x1b[36mfanz help\x1b[0m for copyable end-to-end commands.");
    terminal.writeln("");
    terminal.write(PROMPT);

    terminal.onData((data) => {
      if (data === "\u001b[A") return recallHistory(-1);
      if (data === "\u001b[B") return recallHistory(1);
      for (const char of data) handleInput(char);
    });

    const resize = () => {
      const cols = Math.max(64, Math.floor(host.clientWidth / 8));
      const rows = Math.max(18, Math.floor(host.clientHeight / 18));
      terminal.resize(cols, rows);
    };

    resize();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      terminal.dispose();
    };
  }, []);

  return (
    <main className="flex min-h-[68dvh] flex-col bg-black p-4 sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">Terminal</p>
          <p className="text-xs text-(--color-light)">Escribi comandos o pegá ejemplos del panel.</p>
        </div>
        <button
          className="rounded-lg border border-white/10 bg-white/6 px-3 py-2 text-sm font-semibold text-white transition hover:border-white/15 hover:bg-white/10"
          onClick={() => resetRef.current()}
          type="button"
        >
          Reset mock
        </button>
      </div>
      <div
        className="min-h-135 flex-1 overflow-hidden rounded-2xl border border-(--color-border) bg-(--color-dark-card) p-3 shadow-(--shadow-hero)"
        ref={hostRef}
      />
    </main>
  );
}

function colorize(text: string) {
  return text
    .replaceAll("{", "\x1b[38;2;45;212;191m{\x1b[0m")
    .replaceAll("}", "\x1b[38;2;45;212;191m}\x1b[0m")
    .replaceAll('"ok"', '\x1b[32m"ok"\x1b[0m')
    .replaceAll('"error"', '\x1b[31m"error"\x1b[0m');
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
