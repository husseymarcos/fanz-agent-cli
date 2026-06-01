import { createInitialState } from "./data";
import { buildEventSummary, remainingStock } from "./format";
import { CliError, flagNumber, flagString, parseCommand, requireFlag } from "./parser";
import type {
  AuthToken,
  CliResponse,
  Discount,
  DiscountStatus,
  Event,
  EventDate,
  EventStatus,
  FanzState,
  Order,
  Permission,
  TicketStatus,
  TicketType,
} from "./types";

type Mutation = () => unknown;

export type RunResult = {
  state: FanzState;
  response: CliResponse;
};

export function runCli(input: string, state: FanzState = createInitialState()): RunResult {
  let response: CliResponse;
  let nextState = cloneState(state);

  try {
    const command = parseCommand(input);
    response = dispatch(command, nextState);
  } catch (error) {
    response = toErrorResponse(error);
  }

  nextState = withAudit(nextState, input, response);
  return { state: nextState, response };
}

function dispatch(command: ReturnType<typeof parseCommand>, state: FanzState): CliResponse {
  switch (command.namespace) {
    case "help":
      return ok("Available commands", helpText());
    case "login":
      return login(state, command.flags);
    case "auth":
      return auth(state, command.action);
    case "events":
      return events(state, command);
    case "dates":
      return dates(state, command);
    case "tickets":
      return tickets(state, command);
    case "discounts":
      return discounts(state, command);
    case "sales":
      return sales(state, command);
    case "orders":
      return orders(state, command);
    case "audit":
      return audit(state, command.action);
    case "reset":
      return reset(state, command);
    default:
      throw new CliError(`Unknown command "${command.namespace}". Run: fanz help`);
  }
}

function login(state: FanzState, flags: Record<string, string | boolean>): CliResponse {
  const tokenValue = requireFlag(flags, "token");
  const token = state.tokens.find((candidate) => candidate.token === tokenValue);
  if (!token) throw new CliError(`Invalid mock token "${tokenValue}". Try mock_admin, mock_ops or mock_viewer.`, "auth_error");

  state.activeToken = token.token;
  return ok("Logged in", publicToken(token));
}

function auth(state: FanzState, action?: string): CliResponse {
  if (action !== "whoami") throw new CliError("Use: fanz auth whoami");
  const token = requireSession(state);
  const account = state.accounts.find((item) => item.id === token.accountId);
  return ok("Active session", { token: publicToken(token), account });
}

function events(state: FanzState, command: ReturnType<typeof parseCommand>): CliResponse {
  switch (command.action) {
    case "list":
      requirePermission(state, "read");
      return ok("Events", state.events.map((event) => eventView(state, event)));
    case "create":
      return mutate(state, command, "write", "Create event", () => {
        const event = createEvent(state, command.flags);
        const firstDate = flagString(command.flags, "date");
        const ticket = flagString(command.flags, "ticket");
        state.events.push(event);
        if (firstDate) state.dates.push(createDate(state, event.id, { ...command.flags, starts: firstDate }));
        if (ticket) state.tickets.push(createTicketFromSpec(state, event.id, ticket));
        return eventView(state, event);
      });
    case "update":
      return mutate(state, command, "write", "Update event", () => {
        const event = findEvent(state, command.subject);
        applyEventFlags(event, command.flags);
        event.updatedAt = new Date().toISOString();
        return eventView(state, event);
      });
    case "pause":
    case "resume":
      return mutate(state, command, "write", `${command.action === "pause" ? "Pause" : "Resume"} event`, () => {
        const event = findEvent(state, command.subject);
        event.status = command.action === "pause" ? "paused" : "on_sale";
        event.updatedAt = new Date().toISOString();
        return eventView(state, event);
      });
    case "duplicate":
      return mutate(state, command, "write", "Duplicate event", () => {
        const source = findEvent(state, command.subject);
        const newId = nextId(state, "EVT");
        const name = flagString(command.flags, "name", `${source.name} copia`) ?? `${source.name} copia`;
        const copy: Event = { ...source, id: newId, name, status: "draft", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        state.events.push(copy);
        state.dates
          .filter((date) => date.eventId === source.id)
          .forEach((date) => state.dates.push({ ...date, id: nextId(state, "DAT"), eventId: newId, status: "draft" }));
        state.tickets
          .filter((ticket) => ticket.eventId === source.id)
          .forEach((ticket) => state.tickets.push({ ...ticket, id: nextId(state, "TCK"), eventId: newId, sold: 0, status: "active" }));
        state.discounts
          .filter((discount) => discount.eventId === source.id)
          .forEach((discount) => state.discounts.push({ ...discount, id: nextId(state, "DSC"), eventId: newId, uses: 0, status: "paused" }));
        return eventView(state, copy);
      });
    case "delete":
      return mutate(state, command, "delete", "Delete event", () => {
        const event = findEvent(state, command.subject);
        ensureNoPaidOrders(state, event.id);
        state.events = state.events.filter((item) => item.id !== event.id);
        state.dates = state.dates.filter((item) => item.eventId !== event.id);
        state.tickets = state.tickets.filter((item) => item.eventId !== event.id);
        state.discounts = state.discounts.filter((item) => item.eventId !== event.id);
        return { deleted: event.id };
      });
    default:
      throw new CliError("Use: fanz events list|create|update|pause|resume|duplicate|delete");
  }
}

function dates(state: FanzState, command: ReturnType<typeof parseCommand>): CliResponse {
  switch (command.action) {
    case "list": {
      requirePermission(state, "read");
      const eventId = requireEventFlagOrSubject(command);
      findEvent(state, eventId);
      return ok("Dates", state.dates.filter((date) => date.eventId === eventId));
    }
    case "create":
      return mutate(state, command, "write", "Create date", () => {
        const eventId = requireFlag(command.flags, "event");
        findEvent(state, eventId);
        const date = createDate(state, eventId, command.flags);
        state.dates.push(date);
        return date;
      });
    case "update":
      return mutate(state, command, "write", "Update date", () => {
        const date = findById(state.dates, resourceId(command), "date");
        applyDateFlags(date, command.flags);
        return date;
      });
    case "delete":
      return mutate(state, command, "delete", "Delete date", () => {
        const date = findById(state.dates, resourceId(command), "date");
        state.dates = state.dates.filter((item) => item.id !== date.id);
        return { deleted: date.id };
      });
    default:
      throw new CliError("Use: fanz dates list --event EVT_100 | create | update | delete");
  }
}

function tickets(state: FanzState, command: ReturnType<typeof parseCommand>): CliResponse {
  switch (command.action) {
    case "list": {
      requirePermission(state, "read");
      const eventId = requireEventFlagOrSubject(command);
      findEvent(state, eventId);
      return ok("Tickets", state.tickets.filter((ticket) => ticket.eventId === eventId).map(ticketView));
    }
    case "create":
      return mutate(state, command, "write", "Create ticket", () => {
        const eventId = requireFlag(command.flags, "event");
        findEvent(state, eventId);
        const ticket = createTicket(state, eventId, command.flags);
        state.tickets.push(ticket);
        return ticketView(ticket);
      });
    case "update":
      return mutate(state, command, "write", "Update ticket", () => {
        const ticket = findById(state.tickets, resourceId(command), "ticket");
        applyTicketFlags(ticket, command.flags);
        return ticketView(ticket);
      });
    case "delete":
      return mutate(state, command, "delete", "Delete ticket", () => {
        const ticket = findById(state.tickets, resourceId(command), "ticket");
        if (ticket.sold > 0) throw new CliError(`Ticket ${ticket.id} has ${ticket.sold} sold units; pause it instead.`, "business_rule");
        state.tickets = state.tickets.filter((item) => item.id !== ticket.id);
        return { deleted: ticket.id };
      });
    default:
      throw new CliError("Use: fanz tickets list --event EVT_100 | create | update | delete");
  }
}

function discounts(state: FanzState, command: ReturnType<typeof parseCommand>): CliResponse {
  switch (command.action) {
    case "list": {
      requirePermission(state, "read");
      const eventId = requireEventFlagOrSubject(command);
      findEvent(state, eventId);
      return ok("Discounts", state.discounts.filter((discount) => discount.eventId === eventId));
    }
    case "create":
      return mutate(state, command, "write", "Create discount", () => {
        const eventId = requireFlag(command.flags, "event");
        findEvent(state, eventId);
        const discount = createDiscount(state, eventId, command.flags);
        state.discounts.push(discount);
        return discount;
      });
    case "update":
      return mutate(state, command, "write", "Update discount", () => {
        const discount = findById(state.discounts, resourceId(command), "discount");
        applyDiscountFlags(discount, command.flags);
        return discount;
      });
    case "delete":
      return mutate(state, command, "delete", "Delete discount", () => {
        const discount = findById(state.discounts, resourceId(command), "discount");
        if (discount.uses > 0) throw new CliError(`Discount ${discount.id} has ${discount.uses} uses; pause it instead.`, "business_rule");
        state.discounts = state.discounts.filter((item) => item.id !== discount.id);
        return { deleted: discount.id };
      });
    default:
      throw new CliError("Use: fanz discounts list --event EVT_100 | create | update | delete");
  }
}

function sales(state: FanzState, command: ReturnType<typeof parseCommand>): CliResponse {
  requirePermission(state, command.action === "export" ? "export" : "read");
  const eventId = requireEventFlagOrSubject(command);
  findEvent(state, eventId);
  const rows = state.orders.filter((order) => order.eventId === eventId).map((order) => orderView(state, order));

  switch (command.action) {
    case "list":
      return ok("Sales", rows);
    case "summary":
      return ok("Sales summary", buildEventSummary(state, eventId));
    case "export":
      return ok("CSV export", {
        filename: `sales-${eventId}.csv`,
        content: toCsv(rows),
      });
    default:
      throw new CliError("Use: fanz sales list|summary|export --event EVT_100");
  }
}

function orders(state: FanzState, command: ReturnType<typeof parseCommand>): CliResponse {
  switch (command.action) {
    case "show": {
      requirePermission(state, "read");
      const order = findById(state.orders, command.subject, "order");
      return ok("Order", orderView(state, order, true));
    }
    case "resend":
      return mutate(state, command, "resend", "Resend tickets", () => {
        const order = findById(state.orders, command.subject, "order");
        if (order.status !== "paid") throw new CliError(`Only paid orders can be resent. ${order.id} is ${order.status}.`, "business_rule");
        const email = flagString(command.flags, "email", order.buyerEmail) ?? order.buyerEmail;
        order.lastDeliveryAt = new Date().toISOString();
        return { orderId: order.id, sentTo: email, ticketCount: order.ticketIds.length, delivery: "mock_email" };
      });
    default:
      throw new CliError("Use: fanz orders show ORD_100 | resend ORD_100 --email test@example.test");
  }
}

function audit(state: FanzState, action?: string): CliResponse {
  requirePermission(state, "read");
  if (action !== "list") throw new CliError("Use: fanz audit list");
  return ok("Audit log", state.auditLog.slice(-25));
}

function reset(state: FanzState, command: ReturnType<typeof parseCommand>): CliResponse {
  requirePermission(state, "delete");
  if (!command.yes) throw new CliError("Reset is destructive. Re-run with --yes.", "confirmation_required");
  const fresh = createInitialState();
  Object.assign(state, fresh);
  return ok("Mock account reset", { version: state.version });
}

function mutate(
  state: FanzState,
  command: ReturnType<typeof parseCommand>,
  permission: Permission,
  label: string,
  mutation: Mutation,
): CliResponse {
  requirePermission(state, permission);
  if (permission === "delete" && !command.dryRun && !command.yes) {
    throw new CliError(`${label} is destructive. Re-run with --dry-run or --yes.`, "confirmation_required");
  }

  if (command.dryRun) {
    const snapshot = cloneState(state);
    const preview = mutation();
    Object.assign(state, snapshot);
    return { status: "dry-run", message: `${label} preview; no changes applied.`, data: preview, exitCode: 0 };
  }

  const data = mutation(state);
  return ok(`${label} completed`, data);
}

function createEvent(state: FanzState, flags: Record<string, string | boolean>): Event {
  const name = requireFlag(flags, "name");
  const description = flagString(flags, "description", "Evento mock creado desde Fanz CLI.") ?? "";
  const location = requireFlag(flags, "location");
  const status = parseEventStatus(flagString(flags, "status", "draft"));
  const at = new Date().toISOString();

  return {
    id: nextId(state, "EVT"),
    accountId: requireSession(state).accountId,
    name,
    description,
    location,
    status,
    createdAt: at,
    updatedAt: at,
  };
}

function createDate(state: FanzState, eventId: string, flags: Record<string, string | boolean>): EventDate {
  return {
    id: nextId(state, "DAT"),
    eventId,
    startsAt: toIso(requireFlag(flags, "starts")),
    doorsAt: flagString(flags, "doors") ? toIso(requireFlag(flags, "doors")) : undefined,
    venue: flagString(flags, "venue", flagString(flags, "location", "Venue mock")) ?? "Venue mock",
    status: parseEventStatus(flagString(flags, "status", "draft")),
  };
}

function createTicket(state: FanzState, eventId: string, flags: Record<string, string | boolean>): TicketType {
  const price = flagNumber(flags, "price");
  const stock = flagNumber(flags, "stock");
  if (price === undefined) throw new CliError("Missing required flag --price", "validation_error");
  if (stock === undefined) throw new CliError("Missing required flag --stock", "validation_error");
  if (price < 0) throw new CliError("--price must be 0 or greater", "validation_error");
  if (!Number.isInteger(stock) || stock < 0) throw new CliError("--stock must be a non-negative integer", "validation_error");

  return {
    id: nextId(state, "TCK"),
    eventId,
    name: requireFlag(flags, "name"),
    price: { amount: price, currency: "ARS" },
    stock,
    sold: 0,
    status: parseTicketStatus(flagString(flags, "status", "active")),
  };
}

function createTicketFromSpec(state: FanzState, eventId: string, spec: string): TicketType {
  const [name, rawPrice, rawStock] = spec.split(":");
  const price = Number(rawPrice);
  const stock = Number(rawStock);
  if (!name || !Number.isFinite(price) || !Number.isInteger(stock)) {
    throw new CliError('--ticket must use "Name:price:stock", for example "General:10000:500"', "validation_error");
  }
  return createTicket(state, eventId, { name, price: String(price), stock: String(stock) });
}

function createDiscount(state: FanzState, eventId: string, flags: Record<string, string | boolean>): Discount {
  const code = requireFlag(flags, "code").toUpperCase();
  if (state.discounts.some((discount) => discount.eventId === eventId && discount.code === code)) {
    throw new CliError(`Discount code ${code} already exists for ${eventId}.`, "business_rule");
  }
  const percent = flagNumber(flags, "percent");
  if (percent === undefined || percent <= 0 || percent > 100) throw new CliError("--percent must be between 1 and 100", "validation_error");
  const maxUses = flagNumber(flags, "max-uses");

  return {
    id: nextId(state, "DSC"),
    eventId,
    code,
    percent,
    maxUses,
    uses: 0,
    status: parseDiscountStatus(flagString(flags, "status", "active")),
  };
}

function applyEventFlags(event: Event, flags: Record<string, string | boolean>) {
  event.name = flagString(flags, "name", event.name) ?? event.name;
  event.description = flagString(flags, "description", event.description) ?? event.description;
  event.location = flagString(flags, "location", event.location) ?? event.location;
  event.status = parseEventStatus(flagString(flags, "status", event.status));
}

function applyDateFlags(date: EventDate, flags: Record<string, string | boolean>) {
  date.startsAt = flagString(flags, "starts") ? toIso(requireFlag(flags, "starts")) : date.startsAt;
  date.doorsAt = flagString(flags, "doors") ? toIso(requireFlag(flags, "doors")) : date.doorsAt;
  date.venue = flagString(flags, "venue", date.venue) ?? date.venue;
  date.status = parseEventStatus(flagString(flags, "status", date.status));
}

function applyTicketFlags(ticket: TicketType, flags: Record<string, string | boolean>) {
  ticket.name = flagString(flags, "name", ticket.name) ?? ticket.name;
  const price = flagNumber(flags, "price", ticket.price.amount);
  const stock = flagNumber(flags, "stock", ticket.stock);
  if (price === undefined || price < 0) throw new CliError("--price must be 0 or greater", "validation_error");
  if (stock === undefined || !Number.isInteger(stock) || stock < ticket.sold) {
    throw new CliError(`--stock must be an integer >= sold (${ticket.sold})`, "validation_error");
  }
  ticket.price.amount = price;
  ticket.stock = stock;
  ticket.status = parseTicketStatus(flagString(flags, "status", ticket.status));
}

function applyDiscountFlags(discount: Discount, flags: Record<string, string | boolean>) {
  discount.code = flagString(flags, "code", discount.code)?.toUpperCase() ?? discount.code;
  const percent = flagNumber(flags, "percent", discount.percent);
  if (percent === undefined || percent <= 0 || percent > 100) throw new CliError("--percent must be between 1 and 100", "validation_error");
  discount.percent = percent;
  discount.maxUses = flagNumber(flags, "max-uses", discount.maxUses);
  discount.status = parseDiscountStatus(flagString(flags, "status", discount.status));
}

function requireSession(state: FanzState): AuthToken {
  const token = state.tokens.find((item) => item.token === state.activeToken);
  if (!token) throw new CliError("Not logged in. Run: fanz login --token mock_admin", "auth_required");
  return token;
}

function requirePermission(state: FanzState, permission: Permission): AuthToken {
  const token = requireSession(state);
  if (!token.permissions.includes(permission)) {
    throw new CliError(`Token ${token.token} lacks ${permission} permission.`, "forbidden");
  }
  return token;
}

function findEvent(state: FanzState, eventId?: string): Event {
  if (!eventId) throw new CliError("Missing event id", "validation_error");
  const event = state.events.find((item) => item.id === eventId);
  if (!event) throw new CliError(`Event ${eventId} was not found.`, "not_found");
  return event;
}

function findById<T extends { id: string }>(items: T[], id: string | undefined, label: string): T {
  if (!id) throw new CliError(`Missing ${label} id`, "validation_error");
  const item = items.find((candidate) => candidate.id === id);
  if (!item) throw new CliError(`${capitalize(label)} ${id} was not found.`, "not_found");
  return item;
}

function ensureNoPaidOrders(state: FanzState, eventId: string) {
  const paid = state.orders.filter((order) => order.eventId === eventId && order.status === "paid");
  if (paid.length > 0) {
    throw new CliError(`Event ${eventId} has ${paid.length} paid orders; pause it instead of deleting.`, "business_rule");
  }
}

function requireEventFlagOrSubject(command: ReturnType<typeof parseCommand>): string {
  return flagString(command.flags, "event", command.subject) ?? (() => {
    throw new CliError("Missing event id. Use --event EVT_100 or pass it after the action.", "validation_error");
  })();
}

function resourceId(command: ReturnType<typeof parseCommand>): string | undefined {
  if (command.subject?.startsWith("EVT_")) return command.positionals[0];
  return command.subject;
}

function eventView(state: FanzState, event: Event) {
  return {
    id: event.id,
    name: event.name,
    status: event.status,
    location: event.location,
    dates: state.dates.filter((date) => date.eventId === event.id).length,
    ticketTypes: state.tickets.filter((ticket) => ticket.eventId === event.id).length,
    revenueARS: buildEventSummary(state, event.id).revenueARS,
    updatedAt: event.updatedAt,
  };
}

function ticketView(ticket: TicketType) {
  return {
    id: ticket.id,
    eventId: ticket.eventId,
    name: ticket.name,
    priceARS: ticket.price.amount,
    stock: ticket.stock,
    sold: ticket.sold,
    remaining: remainingStock(ticket),
    status: ticket.status,
  };
}

function orderView(state: FanzState, order: Order, includeTickets = false) {
  const base = {
    id: order.id,
    eventId: order.eventId,
    buyerName: order.buyerName,
    buyerEmail: order.buyerEmail,
    status: order.status,
    tickets: order.ticketIds.length,
    subtotalARS: order.subtotal.amount,
    discountCode: order.discountCode ?? "",
    discountARS: order.discountAmount.amount,
    totalARS: order.total.amount,
    createdAt: order.createdAt,
    lastDeliveryAt: order.lastDeliveryAt ?? "",
  };

  if (!includeTickets) return base;
  return {
    ...base,
    issuedTickets: order.ticketIds.map((id) => state.issuedTickets.find((ticket) => ticket.id === id)).filter(Boolean),
  };
}

function publicToken(token: AuthToken) {
  return {
    token: token.token,
    label: token.label,
    accountId: token.accountId,
    permissions: token.permissions,
  };
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = rows.map((row) => headers.map((key) => csvCell(row[key])).join(","));
  return [headers.join(","), ...lines].join("\n");
}

function csvCell(value: unknown): string {
  const text = value === undefined || value === null ? "" : String(value);
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}

function nextId(state: FanzState, prefix: "EVT" | "DAT" | "TCK" | "DSC" | "ORD" | "ISS" | "AUD"): string {
  state.counters[prefix] = (state.counters[prefix] ?? 0) + 1;
  return `${prefix}_${state.counters[prefix]}`;
}

function parseEventStatus(value?: string): EventStatus {
  return parseEnum(value, ["draft", "on_sale", "paused", "ended"], "status");
}

function parseTicketStatus(value?: string): TicketStatus {
  return parseEnum(value, ["active", "paused", "sold_out"], "ticket status");
}

function parseDiscountStatus(value?: string): DiscountStatus {
  return parseEnum(value, ["active", "paused", "expired"], "discount status");
}

function parseEnum<T extends string>(value: string | undefined, allowed: T[], label: string): T {
  if (allowed.includes(value as T)) return value as T;
  throw new CliError(`Invalid ${label} "${value}". Allowed: ${allowed.join(", ")}`, "validation_error");
}

function toIso(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new CliError(`Invalid date "${value}". Use ISO format like 2026-07-20T23:00:00Z.`, "validation_error");
  return date.toISOString();
}

function ok(message: string, data?: unknown): CliResponse {
  return { status: "ok", message, data, exitCode: 0 };
}

function toErrorResponse(error: unknown): CliResponse {
  if (error instanceof CliError) {
    return { status: "error", message: error.message, data: { code: error.code, details: error.details ?? null }, exitCode: 1 };
  }
  return { status: "error", message: error instanceof Error ? error.message : "Unknown error", exitCode: 1 };
}

function withAudit(state: FanzState, command: string, response: CliResponse): FanzState {
  const token = state.activeToken;
  state.auditLog.push({
    id: nextId(state, "AUD"),
    at: new Date().toISOString(),
    token,
    command,
    status: response.status,
    message: response.message,
  });
  return state;
}

function cloneState(state: FanzState): FanzState {
  return structuredClone(state);
}

function capitalize(value: string): string {
  return `${value[0]?.toUpperCase() ?? ""}${value.slice(1)}`;
}

function helpText() {
  return [
    { flow: "auth", command: "fanz login --token mock_admin" },
    { flow: "auth", command: "fanz auth whoami --json" },
    { flow: "events", command: 'fanz events create --name "Fiesta Demo" --description "CLI smoke test" --location "C Complejo Art Media" --date 2026-07-20T23:00:00Z --ticket "General:10000:500" --status on_sale --json' },
    { flow: "events", command: "fanz events list --json" },
    { flow: "dates", command: "fanz dates create --event EVT_101 --starts 2026-07-21T23:00:00Z --venue Art Media --json" },
    { flow: "tickets", command: "fanz tickets update TCK_102 --price 12000 --stock 450 --json" },
    { flow: "discounts", command: "fanz discounts create --event EVT_101 --code DEMO20 --percent 20 --max-uses 100 --json" },
    { flow: "sales", command: "fanz sales summary --event EVT_100 --json" },
    { flow: "sales", command: "fanz sales export --event EVT_100 --json" },
    { flow: "orders", command: "fanz orders resend ORD_100 --email buyer@example.test --json" },
    { flow: "guardrails", command: "fanz events delete EVT_101 --dry-run --json" },
    { flow: "guardrails", command: "fanz audit list --json" },
  ];
}
