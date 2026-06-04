"use client";

import { useRef, useState } from "react";
import { DocsPanel } from "./components/DocsPanel";
import { QuickStartSidebar } from "./components/QuickStartSidebar";
import { TerminalPanel } from "./components/TerminalPanel";
import type { TerminalPanelRef } from "./components/TerminalPanel";

type ActiveView = "terminal" | "docs";

export default function Home() {
  const terminal = useRef<TerminalPanelRef>(null);
  const [activeView, setActiveView] = useState<ActiveView>("terminal");

  const runCommand = (command: string) => {
    setActiveView("terminal");
    window.setTimeout(() => terminal.current?.runCommand(command), 0);
  };

  const openDocSection = (sectionId: string) => {
    setActiveView("docs");
    window.setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  return (
    <section className="grid min-h-dvh bg-background text-foreground lg:grid-cols-[420px_1fr]">
      <QuickStartSidebar activeView={activeView} onOpenDocSection={openDocSection} onRunCommand={runCommand} />
      <main className="flex min-h-[72dvh] flex-col bg-black p-4 lg:h-dvh lg:min-h-dvh lg:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              className={viewTabClassName(activeView === "terminal")}
              onClick={() => setActiveView("terminal")}
              type="button"
            >
              Terminal
            </button>
            <button
              className={viewTabClassName(activeView === "docs")}
              onClick={() => setActiveView("docs")}
              type="button"
            >
              Docs
            </button>
          </div>
          {activeView === "terminal" ? (
            <button
              className="rounded-lg border border-red-500/30 bg-red-500/15 px-3 py-2 text-sm font-semibold text-red-100 transition hover:border-red-400/60 hover:bg-red-500/25"
              onClick={() => terminal.current?.reset()}
              type="button"
            >
              Reset
            </button>
          ) : null}
        </div>

        <div className={activeView === "terminal" ? "flex min-h-0 flex-1 flex-col" : "hidden"}>
          <TerminalPanel ref={terminal} />
        </div>
        <div className={activeView === "docs" ? "flex min-h-0 flex-1 flex-col" : "hidden"}>
          <DocsPanel />
        </div>
      </main>
    </section>
  );
}

function viewTabClassName(isActive: boolean) {
  return [
    "rounded-lg px-4 py-2 text-sm font-bold transition",
    isActive
      ? "bg-white text-black"
      : "border border-(--color-border) bg-white/6 text-(--color-light) hover:border-white/15 hover:text-white",
  ].join(" ");
}
