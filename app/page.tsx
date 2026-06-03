"use client";

import { useRef } from "react";
import { QuickStartSidebar } from "./components/QuickStartSidebar";
import { TerminalPanel } from "./components/TerminalPanel";
import type { TerminalPanelRef } from "./components/TerminalPanel";

export default function Home() {
  const terminal = useRef<TerminalPanelRef>(null);

  return (
    <section className="grid min-h-dvh bg-background text-foreground lg:grid-cols-[360px_1fr]">
      <QuickStartSidebar onRunCommand={(command) => terminal.current?.runCommand(command)} />
      <TerminalPanel ref={terminal} />
    </section>
  );
}
