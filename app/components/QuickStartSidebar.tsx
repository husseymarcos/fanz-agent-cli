import Image from "next/image";

const QUICK_START_COMMANDS = [
  "fanz login --token mock_admin",
  'fanz events create --name "Fiesta Demo" --description "Evento creado desde la prueba" --location "C Complejo Art Media" --date 2026-07-20T23:00:00Z --ticket "General:10000:500" --status on_sale --json',
  "fanz sales summary --event EVT_100 --json",
  "fanz orders resend ORD_100 --email comprador@example.test --json",
];

type QuickStartSidebarProps = {
  onRunCommand: (command: string) => void;
};

export function QuickStartSidebar({ onRunCommand }: QuickStartSidebarProps) {
  return (
    <aside className="border-b border-(--color-border) bg-(--color-dark) px-6 py-6 lg:border-b-0 lg:border-r">
      <div className="mb-6">
        <Image alt="Fanz" className="mb-5" height={40} src="/fanz-logo.png" width={40} />
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-(--color-accent-light)">Fanz Agent CLI</p>
        <h1 className="mt-2 text-2xl font-extrabold leading-tight text-white">Ticketing mock desde una web terminal</h1>
      </div>

      <div className="space-y-5 text-sm leading-6 text-(--color-light)">
        <p>
          Demo autocontenida para probar una cuenta mock sin instalar nada. El estado se guarda en este navegador y
          los comandos aceptan `--json` para agentes.
        </p>
        <div>
          <h2 className="mb-2 text-sm font-semibold text-white">Tokens</h2>
          <ul className="space-y-1">
            <li><code>mock_admin</code>: read, write, delete, export, resend</li>
            <li><code>mock_ops</code>: read, write, export, resend</li>
            <li><code>mock_viewer</code>: read only</li>
          </ul>
        </div>
        <div>
          <h2 className="mb-2 text-sm font-semibold text-white">Flujo rapido</h2>
          <div className="space-y-2">
            {QUICK_START_COMMANDS.map((command) => (
              <button
                className="block w-full rounded-lg border border-(--color-border) bg-(--color-dark-card) px-3 py-2 text-left font-mono text-xs text-white transition hover:border-(--color-accent) hover:bg-(--color-accent-dim)"
                key={command}
                onClick={() => onRunCommand(command)}
                type="button"
              >
                {command}
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
