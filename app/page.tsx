"use client";

import { useCallback, useRef } from "react";
import { QuickStartSidebar } from "./components/QuickStartSidebar";
import { TerminalPanel } from "./components/TerminalPanel";
import type { TerminalPanelHandle } from "./components/TerminalPanel";

export default function Home() {
  const terminal = useRef<TerminalPanelHandle>(null);
  const runTerminalCommand = useCallback((command: string) => {
    terminal.current?.runCommand(command);
  }, []);
  const rememberTerminal = useCallback((readyTerminal: TerminalPanelHandle | null) => {
    terminal.current = readyTerminal;
  }, []);

  return (
    <section className="grid min-h-dvh bg-background text-foreground lg:grid-cols-[360px_1fr]">
      <QuickStartSidebar onRunCommand={runTerminalCommand} />
      <TerminalPanel onReady={rememberTerminal} />
    </section>
  );
}
