"use client";

import { useEffect, useImperativeHandle, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { createInitialState, STORAGE_KEY } from "@/lib/data";
import { CliSession } from "@/lib/engine";
import { formatResponse } from "@/lib/format";

type CliState = ReturnType<typeof createInitialState>;

const PROMPT = "\x1b[38;2;45;212;191mfanz\x1b[0m $ ";
const TERMINAL_FONT_SIZE = 13;
const TERMINAL_LINE_HEIGHT = 1.35;
const TERMINAL_CELL_WIDTH = 8;
const TERMINAL_SCROLLBAR_WIDTH = 16;
const TERMINAL_ROW_SAFETY_MARGIN = 2;

export type TerminalPanelRef = {
  reset: () => void;
  runCommand: (command: string) => void;
};

const TERMINAL_OPTIONS = {
  cursorBlink: true,
  convertEol: true,
  fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
  fontSize: TERMINAL_FONT_SIZE,
  lineHeight: TERMINAL_LINE_HEIGHT,
  scrollback: 5000,
  scrollOnEraseInDisplay: true,
  scrollOnUserInput: true,
  scrollSensitivity: 1.6,
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
    reset: () => resetRef.current(),
    runCommand: (command: string) => runCommandRef.current(command),
  }), []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || didInitRef.current) return;
    didInitRef.current = true;

    const terminal = new Terminal(TERMINAL_OPTIONS);
    let cli = CliSession.withState(loadState());
    const history: string[] = [];
    let historyIndex = 0;
    let line = "";

    const keepTerminalReady = () => {
      window.requestAnimationFrame(() => {
        terminal.scrollToBottom();
        terminal.focus();
        window.requestAnimationFrame(() => terminal.scrollToBottom());
      });
    };
    const writePrompt = () => terminal.write(PROMPT, keepTerminalReady);
    const resetTerminalView = () => {
      terminal.write("\x1b[H\x1b[2J");
    };

    const execute = (rawCommand: string) => {
      const command = rawCommand.trim();
      if (!command) return;

      if (command === "clear") {
        resetTerminalView();
        return;
      }

      resetTerminalView();
      terminal.write(PROMPT);
      terminal.writeln(command);
      history.push(command);
      historyIndex = history.length;

      const response = cli.run(command);
      saveState(cli.snapshot());
      terminal.writeln(colorize(formatResponse(response, command.includes("--json"))), keepTerminalReady);
    };

    const runCommand = (command: string) => {
      execute(command);
      writePrompt();
    };

    const reset = () => {
      cli = CliSession.start();
      saveState(cli.snapshot());
      terminal.clear();
      terminal.writeln("Mock account reset.", keepTerminalReady);
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
    keepTerminalReady();

    host.addEventListener("pointerdown", () => terminal.focus());

    terminal.onData((data) => {
      if (data === "\u001b[A") return recallHistory(-1);
      if (data === "\u001b[B") return recallHistory(1);
      for (const char of data) handleInput(char);
    });

    const resize = () => {
      if (host.clientWidth === 0 || host.clientHeight === 0) return;
      const width = host.getBoundingClientRect().width;
      const height = host.getBoundingClientRect().height;
      const lineHeight = TERMINAL_FONT_SIZE * TERMINAL_LINE_HEIGHT;
      const cols = Math.max(40, Math.floor((width - TERMINAL_SCROLLBAR_WIDTH) / TERMINAL_CELL_WIDTH));
      const rows = Math.max(8, Math.floor(height / lineHeight) - TERMINAL_ROW_SAFETY_MARGIN);
      terminal.resize(cols, rows);
      keepTerminalReady();
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    window.addEventListener("resize", resize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", resize);
      terminal.dispose();
    };
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-135 flex-1 overflow-hidden rounded-lg border border-(--color-border) bg-(--color-dark-card) p-3 shadow-(--shadow-hero) lg:min-h-0">
        <div className="h-full min-h-0 overflow-hidden rounded-md" ref={hostRef} />
      </div>
    </div>
  );
}

function colorize(text: string) {
  return text
    .replaceAll("{", "\x1b[38;2;45;212;191m{\x1b[0m")
    .replaceAll("}", "\x1b[38;2;45;212;191m}\x1b[0m")
    .replaceAll('"ok"', '\x1b[32m"ok"\x1b[0m')
    .replaceAll('"error"', '\x1b[31m"error"\x1b[0m');
}

function loadState(): CliState {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return createInitialState();
    const parsed = JSON.parse(stored) as CliState;
    return parsed.version === 1 ? parsed : createInitialState();
  } catch {
    return createInitialState();
  }
}

function saveState(state: CliState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
