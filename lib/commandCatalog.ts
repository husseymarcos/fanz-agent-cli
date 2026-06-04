import type { Permission } from "./data";

export type CommandMeta = {
  route: string;
  command: string;
  summary: string;
  permission?: Permission;
  mutates: boolean;
  destructive?: boolean;
  dryRun?: boolean;
  requiredFlags?: string[];
  optionalFlags?: string[];
  example: string;
};

export const commandCatalog: CommandMeta[] = [
  {
    route: "login",
    command: "fanz login --token <token>",
    summary: "Activate one mock token.",
    mutates: true,
    requiredFlags: ["token"],
    example: "fanz login --token mock_admin --json",
  },
  {
    route: "auth.whoami",
    command: "fanz auth whoami",
    summary: "Show the active token, account and permissions.",
    mutates: false,
    example: "fanz auth whoami --json",
  },
  {
    route: "events.create",
    command: "fanz events create --name <name> --location <location>",
    summary: "Create a mock event, optionally with one initial date and ticket.",
    permission: "write",
    mutates: true,
    dryRun: true,
    requiredFlags: ["name", "location"],
    optionalFlags: ["description", "status", "date", "ticket"],
    example:
      'fanz events create --name "Demo Party" --location "Art Media" --date 2026-07-20T23:00:00Z --ticket "General:10000:500" --status on_sale --json',
  },
  {
    route: "events.list",
    command: "fanz events list",
    summary: "List mock events with revenue and stock totals.",
    permission: "read",
    mutates: false,
    example: "fanz events list --json",
  },
  {
    route: "events.update",
    command: "fanz events update <eventId>",
    summary: "Update basic event fields.",
    permission: "write",
    mutates: true,
    dryRun: true,
    optionalFlags: ["name", "description", "location", "status"],
    example: 'fanz events update EVT_101 --name "Demo Party 2" --json',
  },
  {
    route: "events.delete",
    command: "fanz events delete <eventId> --yes",
    summary: "Delete an event without paid orders.",
    permission: "delete",
    mutates: true,
    destructive: true,
    dryRun: true,
    requiredFlags: ["yes"],
    example: "fanz events delete EVT_101 --dry-run --json",
  },
  {
    route: "dates.create",
    command: "fanz dates create --event <eventId> --starts <isoDate>",
    summary: "Create one event date.",
    permission: "write",
    mutates: true,
    dryRun: true,
    requiredFlags: ["event", "starts"],
    optionalFlags: ["doors", "venue", "status"],
    example: "fanz dates create --event EVT_101 --starts 2026-07-21T23:00:00Z --venue Art --json",
  },
  {
    route: "tickets.create",
    command: "fanz tickets create --event <eventId> --name <name> --price <amount> --stock <count>",
    summary: "Create one ticket type.",
    permission: "write",
    mutates: true,
    dryRun: true,
    requiredFlags: ["event", "name", "price", "stock"],
    optionalFlags: ["status"],
    example: "fanz tickets create --event EVT_101 --name VIP --price 25000 --stock 80 --json",
  },
  {
    route: "discounts.create",
    command: "fanz discounts create --event <eventId> --code <code> --percent <percent>",
    summary: "Create a simple percentage discount.",
    permission: "write",
    mutates: true,
    dryRun: true,
    requiredFlags: ["event", "code", "percent"],
    optionalFlags: ["max-uses", "status"],
    example: "fanz discounts create --event EVT_101 --code DEMO20 --percent 20 --json",
  },
  {
    route: "orders.create",
    command: "fanz orders create --event <eventId> --ticket <ticketId> --buyer-email <email>",
    summary: "Create a paid mock order and issued tickets for an event.",
    permission: "write",
    mutates: true,
    dryRun: true,
    requiredFlags: ["event", "ticket", "buyer-email"],
    optionalFlags: ["buyer-name", "quantity"],
    example: "fanz orders create --event EVT_101 --ticket TCK_102 --buyer-email buyer@example.test --quantity 2 --json",
  },
  {
    route: "orders.show",
    command: "fanz orders show <orderId>",
    summary: "Show buyer, order state and issued tickets.",
    permission: "read",
    mutates: false,
    example: "fanz orders show ORD_100 --json",
  },
  {
    route: "orders.resend",
    command: "fanz orders resend <orderId>",
    summary: "Send a mock ticket delivery email for a paid order.",
    permission: "resend",
    mutates: true,
    dryRun: true,
    optionalFlags: ["email"],
    example: "fanz orders resend ORD_100 --email buyer@example.test --json",
  },
  {
    route: "sales.summary",
    command: "fanz sales summary --event <eventId>",
    summary: "Show order count, revenue and stock totals.",
    permission: "read",
    mutates: false,
    requiredFlags: ["event"],
    example: "fanz sales summary --event EVT_100 --json",
  },
  {
    route: "sales.list",
    command: "fanz sales list --event <eventId>",
    summary: "List orders for one event.",
    permission: "read",
    mutates: false,
    requiredFlags: ["event"],
    example: "fanz sales list --event EVT_100 --json",
  },
  {
    route: "sales.export",
    command: "fanz sales export --event <eventId>",
    summary: "Return a mock CSV export payload.",
    permission: "export",
    mutates: false,
    requiredFlags: ["event"],
    example: "fanz sales export --event EVT_100 --json",
  },
  {
    route: "commands.list",
    command: "fanz commands list",
    summary: "List command metadata for agents.",
    mutates: false,
    example: "fanz commands list --json",
  },
  {
    route: "commands.describe",
    command: "fanz commands describe <route>",
    summary: "Describe one command contract for agents.",
    mutates: false,
    example: "fanz commands describe orders.create --json",
  },
];
