export type EventStatus = "draft" | "on_sale" | "paused" | "ended";
export type TicketStatus = "active" | "paused" | "sold_out";
export type DiscountStatus = "active" | "paused" | "expired";
export type OrderStatus = "paid" | "pending" | "refunded" | "cancelled";
export type Permission = "read" | "write" | "delete" | "export" | "resend";

export type Money = {
  amount: number;
  currency: "ARS";
};

export type Account = {
  id: string;
  name: string;
  slug: string;
};

export type AuthToken = {
  token: string;
  label: string;
  accountId: string;
  permissions: Permission[];
};

export type EventDate = {
  id: string;
  eventId: string;
  startsAt: string;
  doorsAt?: string;
  venue: string;
  status: EventStatus;
};

export type TicketType = {
  id: string;
  eventId: string;
  name: string;
  price: Money;
  stock: number;
  sold: number;
  status: TicketStatus;
};

export type Discount = {
  id: string;
  eventId: string;
  code: string;
  percent: number;
  maxUses?: number;
  uses: number;
  status: DiscountStatus;
};

export type Event = {
  id: string;
  accountId: string;
  name: string;
  description: string;
  location: string;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
};

export type IssuedTicket = {
  id: string;
  ticketTypeId: string;
  ticketName: string;
  holderEmail: string;
  checkedIn: boolean;
};

export type Order = {
  id: string;
  eventId: string;
  buyerName: string;
  buyerEmail: string;
  status: OrderStatus;
  ticketIds: string[];
  subtotal: Money;
  discountCode?: string;
  discountAmount: Money;
  total: Money;
  createdAt: string;
  lastDeliveryAt?: string;
};

export type AuditEntry = {
  id: string;
  at: string;
  token?: string;
  command: string;
  status: "ok" | "error" | "dry-run";
  message: string;
};

export type FanzState = {
  version: 1;
  activeToken?: string;
  accounts: Account[];
  tokens: AuthToken[];
  events: Event[];
  dates: EventDate[];
  tickets: TicketType[];
  discounts: Discount[];
  orders: Order[];
  issuedTickets: IssuedTicket[];
  auditLog: AuditEntry[];
  counters: Record<string, number>;
};

export type CliStatus = "ok" | "error" | "dry-run";

export type CliResponse = {
  status: CliStatus;
  message: string;
  data?: unknown;
  exitCode: number;
};

export type ParsedCommand = {
  raw: string;
  namespace: string;
  action?: string;
  subject?: string;
  positionals: string[];
  flags: Record<string, string | boolean>;
  json: boolean;
  dryRun: boolean;
  yes: boolean;
};
