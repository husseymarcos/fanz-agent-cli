"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { createInitialState, STORAGE_KEY } from "@/lib/fanz-cli/data";
import { runCli } from "@/lib/fanz-cli/engine";
import { formatResponse } from "@/lib/fanz-cli/presentation/format";
import type { FanzState } from "@/lib/fanz-cli/types";

const PROMPT = "\x1b[38;2;45;212;191mfanz\x1b[0m $ ";

export type TerminalPanelHandle = {
  runCommand: (command: string) => void;
};

type TerminalPanelProps = {
  onReady: (terminal: TerminalPanelHandle | null) => void;
};

export function TerminalPanel({ onReady }: TerminalPanelProps) {
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(0);
  const hostRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef("");
  const stateRef = useRef<FanzState>(createInitialState());
  const terminalRef = useRef<Terminal | null>(null);

  const writePrompt = useCallback(() => {
    terminalRef.current?.write(PROMPT);
  }, []);

  const execute = useCallback((rawCommand: string) => {
    const terminal = terminalRef.current;
    const command = rawCommand.trim();
    if (!terminal || !command) return;

    if (command === "clear") {
      terminal.clear();
      return;
    }

    historyRef.current.push(command);
    historyIndexRef.current = historyRef.current.length;

    const currentState = stateRef.current
    const { state: newState, response } = runCli(command, currentState);
    stateRef.current = newState;
    saveState(newState);
    terminal.writeln(colorize(formatResponse(response, command.includes("--json"))));
  }, []);

  const runCommand = useCallback((command: string) => {
    const terminal = terminalRef.current;
    if (!terminal) return;

    terminal.writeln(command);
    execute(command);
    writePrompt();
  }, [execute, writePrompt]);

  const api = useMemo(() => ({ runCommand }), [runCommand]);

  useEffect(() => {
    onReady(api);
    return () => onReady(null);
  }, [api, onReady]);

  const reset = useCallback(() => {
    const terminal = terminalRef.current;
    if (!terminal) return;

    const state = createInitialState();
    stateRef.current = state;
    saveState(state);
    terminal.clear();
    terminal.writeln("Mock account reset.");
    writePrompt();
  }, [writePrompt]);

  const replaceCurrentLine = useCallback((value: string) => {
    const terminal = terminalRef.current;
    if (!terminal) return;

    terminal.write("\r\x1b[2K");
    writePrompt();
    terminal.write(value);
    lineRef.current = value;
  }, [writePrompt]);

  const recallHistory = useCallback((direction: -1 | 1) => {
    const history = historyRef.current;
    if (history.length === 0) return;

    historyIndexRef.current = Math.min(
      history.length,
      Math.max(0, historyIndexRef.current + direction),
    );
    replaceCurrentLine(history[historyIndexRef.current] ?? "");
  }, [replaceCurrentLine]);

  const handleInput = useCallback((char: string) => {
    const terminal = terminalRef.current;
    if (!terminal) return;

    if (char === "\r") {
      terminal.writeln("");
      execute(lineRef.current);
      lineRef.current = "";
      writePrompt();
      return;
    }

    if (char === "\u007F") {
      if (!lineRef.current) return;
      lineRef.current = lineRef.current.slice(0, -1);
      terminal.write("\b \b");
      return;
    }

    if (char >= " " && char !== "\u007F") {
      lineRef.current += char;
      terminal.write(char);
    }
  }, [execute, writePrompt]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || terminalRef.current) return;

    const terminal = new Terminal({
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
    });

    const resize = () => {
      const cols = Math.max(64, Math.floor(host.clientWidth / 8));
      const rows = Math.max(18, Math.floor(host.clientHeight / 18));
      terminal.resize(cols, rows);
    };

    stateRef.current = loadState();
    terminalRef.current = terminal;
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

    resize();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      terminal.dispose();
      terminalRef.current = null;
    };
  }, [handleInput, recallHistory]);

  return (
    <main className="flex min-h-[68dvh] flex-col bg-black p-4 sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">Terminal</p>
          <p className="text-xs text-(--color-light)">Escribi comandos o pegá ejemplos del panel.</p>
        </div>
        <button
          className="rounded-lg border border-white/10 bg-white/6 px-3 py-2 text-sm font-semibold text-white transition hover:border-white/15 hover:bg-white/10"
          onClick={reset}
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
