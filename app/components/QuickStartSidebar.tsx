"use client";

import Image from "next/image";

const FLOW_STEPS = [
  {
    eyebrow: "Setup",
    title: "Prepare mock account",
    description: "Reset the browser state and confirm admin permissions.",
    expected: "You should see the admin token active with full permissions.",
    commands: [
      "fanz login --token mock_admin",
      "fanz reset --yes",
      "fanz login --token mock_admin",
      "fanz auth whoami --json",
    ],
  },
  {
    eyebrow: "Events",
    title: "Create and publish event",
    description: "Create event EVT_101 with one date and one initial ticket.",
    expected: "The list should show Demo Party with status on_sale.",
    commands: [
      'fanz events create --name "Demo Party" --description "Event created from the test flow" --location "Art Media Complex" --date 2026-07-20T23:00:00Z --ticket "General:10000:500" --status on_sale --json',
      "fanz events list --json",
      'fanz dates create --event EVT_101 --starts 2026-07-21T23:00:00Z --doors 2026-07-21T22:00:00Z --venue "Art Media" --status on_sale --json',
      "fanz dates list --event EVT_101 --json",
    ],
  },
  {
    eyebrow: "Tickets",
    title: "Configure sales",
    description: "Add ticket types, adjust pricing, and create a discount.",
    expected: "The new event should have General, VIP, and the DEMO20 code.",
    commands: [
      "fanz tickets create --event EVT_101 --name VIP --price 25000 --stock 80 --json",
      "fanz tickets update TCK_102 --price 12000 --stock 450 --json",
      "fanz tickets list --event EVT_101 --json",
      "fanz discounts create --event EVT_101 --code DEMO20 --percent 20 --max-uses 100 --json",
      "fanz discounts list --event EVT_101 --json",
    ],
  },
  {
    eyebrow: "Ops",
    title: "Review operations",
    description: "Create a mock order for the new event, then review sales and resend tickets.",
    expected: "EVT_101 should now show one paid mock order and updated stock.",
    commands: [
      "fanz orders create --event EVT_101 --ticket TCK_102 --buyer-email buyer@example.test --quantity 2 --json",
      "fanz sales summary --event EVT_101 --json",
      "fanz sales list --event EVT_101 --json",
      "fanz sales summary --event EVT_100 --json",
      "fanz sales export --event EVT_100 --json",
      "fanz orders show ORD_102 --json",
      "fanz orders resend ORD_102 --email buyer@example.test --json",
    ],
  },
  {
    eyebrow: "Agents",
    title: "Inspect command contracts",
    description: "Discover stable routes, permissions, required flags, examples, and JSON response shape.",
    expected: "These commands do not require login and are meant for agent planning.",
    commands: [
      "fanz commands list --json",
      "fanz commands describe orders.create --json",
      "fanz commands describe events.delete --json",
    ],
  },
  {
    eyebrow: "Guardrails",
    title: "Test guardrails",
    description: "Validate dry-run, confirmed deletion, business rules, and permissions.",
    expected: "You should see previews, expected errors, and the full audit log.",
    commands: [
      'fanz events duplicate EVT_101 --name "Demo Party copy" --json',
      "fanz events delete EVT_102 --dry-run --json",
      "fanz events delete EVT_102 --yes --json",
      "fanz events delete EVT_100 --yes --json",
      "fanz login --token mock_viewer",
      "fanz tickets create --event EVT_100 --name Floor --price 9000 --stock 100 --json",
      "fanz login --token mock_admin",
      "fanz audit list --json",
    ],
  },
];

const TOKENS = [
  { name: "mock_admin", permissions: "read, write, delete, export, resend" },
  { name: "mock_ops", permissions: "read, write, export, resend" },
  { name: "mock_viewer", permissions: "read only" },
];

const DOC_NAV_ITEMS = [
  { id: "overview", label: "Resumen" },
  { id: "approach", label: "Enfoque" },
  { id: "architecture", label: "Experiencia" },
  { id: "commands", label: "Modelo de comandos" },
  { id: "agent-contract", label: "Contrato agente" },
  { id: "state", label: "Estado y datos" },
  { id: "guardrails", label: "Guardrails" },
  { id: "testing", label: "Testing" },
  { id: "assumptions", label: "Supuestos" },
  { id: "limitations", label: "Limitaciones" },
];

type QuickStartSidebarProps = {
  activeView: "terminal" | "docs";
  onOpenDocSection: (sectionId: string) => void;
  onRunCommand: (command: string) => void;
};

export function QuickStartSidebar({ activeView, onOpenDocSection, onRunCommand }: QuickStartSidebarProps) {
  return (
    <aside className="border-b border-(--color-border) bg-(--color-dark) lg:h-dvh lg:overflow-y-auto lg:border-b-0 lg:border-r">
      <div className="space-y-5 px-5 py-5">
        <div className="flex items-start gap-3">
          <Image alt="Fanz" className="mt-1" height={36} src="/fanz-logo.png" width={36} />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-(--color-accent-light)">
              FANZ
            </p>
            <h1 className="mt-1 text-xl font-extrabold leading-tight text-white">
              FANZ agent CLI
            </h1>
          </div>
        </div>

      </div>

      {activeView === "terminal" ? (
        <div className="space-y-4 px-5 pb-5">
          <section className="rounded-lg border border-(--color-border) bg-(--color-dark-card) p-4">
            <h2 className="text-sm font-semibold text-white">Mock tokens</h2>
            <div className="mt-3 space-y-2">
              {TOKENS.map((token) => (
                <div className="flex items-start justify-between gap-3 text-xs" key={token.name}>
                  <code className="text-white">{token.name}</code>
                  <span className="text-right text-(--color-light)">{token.permissions}</span>
                </div>
              ))}
            </div>
          </section>

          {FLOW_STEPS.map((step, stepIndex) => (
            <details
              className="group rounded-lg border border-(--color-border) bg-(--color-dark-card) p-4 open:border-(--color-border-light)"
              key={step.title}
            >
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
                <span>
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-(--color-accent-light)">
                    {String(stepIndex + 1).padStart(2, "0")} / {step.eyebrow}
                  </span>
                  <span className="mt-1 block text-sm font-bold text-white">{step.title}</span>
                  <span className="mt-1 block text-xs leading-5 text-(--color-light)">{step.description}</span>
                </span>
                <span className="rounded-md border border-(--color-border) px-2 py-1 text-xs text-white group-open:bg-white/8">
                  View
                </span>
              </summary>

              <div className="mt-4 space-y-3">
                <p className="rounded-md border border-(--color-border) bg-black/20 px-3 py-2 text-xs leading-5 text-(--color-light)">
                  {step.expected}
                </p>
                <div className="space-y-2">
                  {step.commands.map((command, commandIndex) => (
                    <button
                      className="block w-full rounded-lg border border-(--color-border) bg-black/25 px-3 py-2 text-left font-mono text-xs leading-5 text-white transition hover:border-(--color-accent) hover:bg-(--color-accent-dim)"
                      key={`${step.title}-${commandIndex}`}
                      onClick={() => onRunCommand(command)}
                      title="Run command"
                      type="button"
                    >
                      {command}
                    </button>
                  ))}
                </div>
              </div>
            </details>
          ))}
        </div>
      ) : (
        <nav className="px-5 pb-5" aria-label="Documentation sections">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-(--color-accent-light)">
            Documentation
          </p>
          <div className="space-y-1">
            {DOC_NAV_ITEMS.map((item) => (
              <button
                className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-(--color-light) transition hover:bg-(--color-dark-card) hover:text-white"
                key={item.id}
                onClick={() => onOpenDocSection(item.id)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
        </nav>
      )}
    </aside>
  );
}
