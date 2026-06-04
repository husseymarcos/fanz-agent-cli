import type { CliAction, CliResponse, CommandContext } from "../../engine";

export class Help implements CliAction {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  run(_: CommandContext): CliResponse {
    return { status: "ok", message: "Available commands", data: helpText(), exitCode: 0 };
  }
}

function helpText() {
  return [
    { flow: "auth", command: "fanz login --token mock_admin" },
    { flow: "auth", command: "fanz auth whoami --json" },
    {
      flow: "events",
      command:
        'fanz events create --name "Demo Party" --description "CLI smoke test" --location "Art Media Complex" --date 2026-07-20T23:00:00Z --ticket "General:10000:500" --status on_sale --json',
    },
    { flow: "events", command: "fanz events list --json" },
    {
      flow: "dates",
      command: "fanz dates create --event EVT_101 --starts 2026-07-21T23:00:00Z --venue Art Media --json",
    },
    { flow: "tickets", command: "fanz tickets update TCK_102 --price 12000 --stock 450 --json" },
    {
      flow: "discounts",
      command: "fanz discounts create --event EVT_101 --code DEMO20 --percent 20 --max-uses 100 --json",
    },
    { flow: "sales", command: "fanz sales summary --event EVT_100 --json" },
    { flow: "sales", command: "fanz sales export --event EVT_100 --json" },
    { flow: "orders", command: "fanz orders resend ORD_100 --email buyer@example.test --json" },
    { flow: "guardrails", command: "fanz events delete EVT_101 --dry-run --json" },
    { flow: "guardrails", command: "fanz audit list --json" },
  ];
}
