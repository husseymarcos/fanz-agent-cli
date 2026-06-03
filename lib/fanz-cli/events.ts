import { requirePermission } from "./auth";
import { nextId } from "./data";
import { CliError, flagString, requireFlag } from "./parser";
import type { Command } from "./parser";
import type { FanzState } from "./data";
import type { CliResponse } from "./engine";
import type { TicketType } from "./tickets";

export type EventStatus = "draft" | "on_sale" | "paused" | "ended";

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

export type EventDate = {
  id: string;
  eventId: string;
  startsAt: string;
  doorsAt?: string;
  venue: string;
  status: EventStatus;
};

export function events(state: FanzState, command: Command): CliResponse {
  switch (command.action) {
    case "list": {
      requirePermission(state, "read");
      return {
        status: "ok",
        message: "Events",
        data: state.events.map((event) => eventView(state, event)),
        exitCode: 0,
      };
    }
    case "create": {
      requirePermission(state, "write");
      if (command.dryRun) {
        const snapshot = structuredClone(state);
        const preview = createEventFlow(state, command);
        Object.assign(state, snapshot);
        return {
          status: "dry-run",
          message: "Create event preview; no changes applied.",
          data: preview,
          exitCode: 0,
        };
      }
      return {
        status: "ok",
        message: "Create event completed",
        data: createEventFlow(state, command),
        exitCode: 0,
      };
    }
    case "update": {
      requirePermission(state, "write");
      if (command.dryRun) {
        const snapshot = structuredClone(state);
        const event = findEvent(state, command.subject);
        applyEventFlags(event, command.flags);
        event.updatedAt = new Date().toISOString();
        const preview = eventView(state, event);
        Object.assign(state, snapshot);
        return {
          status: "dry-run",
          message: "Update event preview; no changes applied.",
          data: preview,
          exitCode: 0,
        };
      }
      const event = findEvent(state, command.subject);
      applyEventFlags(event, command.flags);
      event.updatedAt = new Date().toISOString();
      return {
        status: "ok",
        message: "Update event completed",
        data: eventView(state, event),
        exitCode: 0,
      };
    }
    case "pause":
    case "resume": {
      requirePermission(state, "write");
      const label = command.action === "pause" ? "Pause" : "Resume";
      if (command.dryRun) {
        const snapshot = structuredClone(state);
        const event = findEvent(state, command.subject);
        event.status = command.action === "pause" ? "paused" : "on_sale";
        event.updatedAt = new Date().toISOString();
        const preview = eventView(state, event);
        Object.assign(state, snapshot);
        return {
          status: "dry-run",
          message: `${label} event preview; no changes applied.`,
          data: preview,
          exitCode: 0,
        };
      }
      const event = findEvent(state, command.subject);
      event.status = command.action === "pause" ? "paused" : "on_sale";
      event.updatedAt = new Date().toISOString();
      return {
        status: "ok",
        message: `${label} event completed`,
        data: eventView(state, event),
        exitCode: 0,
      };
    }
    case "duplicate": {
      requirePermission(state, "write");
      if (command.dryRun) {
        const snapshot = structuredClone(state);
        const preview = duplicateEvent(state, command);
        Object.assign(state, snapshot);
        return {
          status: "dry-run",
          message: "Duplicate event preview; no changes applied.",
          data: preview,
          exitCode: 0,
        };
      }
      return {
        status: "ok",
        message: "Duplicate event completed",
        data: duplicateEvent(state, command),
        exitCode: 0,
      };
    }
    case "delete": {
      requirePermission(state, "delete");
      if (!command.dryRun && !command.yes) {
        throw new CliError(
          "Delete event is destructive. Re-run with --dry-run or --yes.",
          "confirmation_required",
        );
      }
      if (command.dryRun) {
        const snapshot = structuredClone(state);
        const preview = deleteEvent(state, command);
        Object.assign(state, snapshot);
        return {
          status: "dry-run",
          message: "Delete event preview; no changes applied.",
          data: preview,
          exitCode: 0,
        };
      }
      return {
        status: "ok",
        message: "Delete event completed",
        data: deleteEvent(state, command),
        exitCode: 0,
      };
    }
    default:
      throw new CliError(
        "Use: fanz events list|create|update|pause|resume|duplicate|delete",
      );
  }
}

export function findEvent(state: FanzState, eventId?: string): Event {
  if (!eventId) throw new CliError("Missing event id", "validation_error");
  const event = state.events.find((item) => item.id === eventId);
  if (!event) throw new CliError(`Event ${eventId} was not found.`, "not_found");
  return event;
}

export function ensureNoPaidOrders(state: FanzState, eventId: string) {
  const paid = state.orders.filter(
    (order) => order.eventId === eventId && order.status === "paid",
  );
  if (paid.length > 0) {
    throw new CliError(
      `Event ${eventId} has ${paid.length} paid orders; pause it instead of deleting.`,
      "business_rule",
    );
  }
}

export function eventView(state: FanzState, event: Event) {
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

export function buildEventSummary(state: FanzState, eventId: string) {
  const tickets = state.tickets.filter((ticket) => ticket.eventId === eventId);
  const orders = state.orders.filter((order) => order.eventId === eventId);
  const revenue = sumOrders(orders);
  const stock = tickets.reduce(
    (acc, ticket) => ({
      total: acc.total + ticket.stock,
      sold: acc.sold + ticket.sold,
      remaining: acc.remaining + remainingStock(ticket),
    }),
    { total: 0, sold: 0, remaining: 0 },
  );

  return {
    eventId,
    orders: orders.length,
    issuedTickets: orders.reduce((total, order) => total + order.ticketIds.length, 0),
    revenueARS: revenue,
    stockTotal: stock.total,
    stockSold: stock.sold,
    stockRemaining: stock.remaining,
  };
}

function sumOrders(orders: { status: string; total: { amount: number } }[]): number {
  return orders
    .filter((order) => order.status === "paid")
    .reduce((total, order) => total + order.total.amount, 0);
}

function remainingStock(ticket: TicketType): number {
  return Math.max(0, ticket.stock - ticket.sold);
}

export function createEvent(
  state: FanzState,
  flags: Record<string, string | boolean>,
): Event {
  const at = new Date().toISOString();
  return {
    id: nextId(state, "EVT"),
    accountId: requirePermission(state, "write").accountId,
    name: requireFlag(flags, "name"),
    description: flagString(flags, "description", "Evento mock creado desde Fanz CLI.") ?? "",
    location: requireFlag(flags, "location"),
    status: parseEventStatus(flagString(flags, "status", "draft")),
    createdAt: at,
    updatedAt: at,
  };
}

export function applyEventFlags(
  event: Event,
  flags: Record<string, string | boolean>,
) {
  event.name = flagString(flags, "name", event.name) ?? event.name;
  event.description = flagString(flags, "description", event.description) ?? event.description;
  event.location = flagString(flags, "location", event.location) ?? event.location;
  event.status = parseEventStatus(flagString(flags, "status", event.status));
}

export function createDate(
  state: FanzState,
  eventId: string,
  flags: Record<string, string | boolean>,
): EventDate {
  return {
    id: nextId(state, "DAT"),
    eventId,
    startsAt: toIso(requireFlag(flags, "starts")),
    doorsAt: flagString(flags, "doors") ? toIso(requireFlag(flags, "doors")) : undefined,
    venue: flagString(flags, "venue", flagString(flags, "location", "Venue mock")) ?? "Venue mock",
    status: parseEventStatus(flagString(flags, "status", "draft")),
  };
}

export function applyDateFlags(
  date: EventDate,
  flags: Record<string, string | boolean>,
) {
  date.startsAt = flagString(flags, "starts") ? toIso(requireFlag(flags, "starts")) : date.startsAt;
  date.doorsAt = flagString(flags, "doors") ? toIso(requireFlag(flags, "doors")) : date.doorsAt;
  date.venue = flagString(flags, "venue", date.venue) ?? date.venue;
  date.status = parseEventStatus(flagString(flags, "status", date.status));
}

export function createTicketFromSpec(
  state: FanzState,
  eventId: string,
  spec: string,
): TicketType {
  const [name, rawPrice, rawStock] = spec.split(":");
  const price = Number(rawPrice);
  const stock = Number(rawStock);
  if (!name || !Number.isFinite(price) || !Number.isInteger(stock)) {
    throw new CliError(
      '--ticket must use "Name:price:stock", for example "General:10000:500"',
      "validation_error",
    );
  }
  return createTicket(state, eventId, { name, price: String(price), stock: String(stock) });
}

function createEventFlow(state: FanzState, command: Command) {
  const event = createEvent(state, command.flags);
  const firstDate = flagString(command.flags, "date");
  const ticket = flagString(command.flags, "ticket");
  state.events.push(event);
  if (firstDate) state.dates.push(createDate(state, event.id, { ...command.flags, starts: firstDate }));
  if (ticket) state.tickets.push(createTicketFromSpec(state, event.id, ticket));
  return eventView(state, event);
}

function duplicateEvent(state: FanzState, command: Command) {
  const source = findEvent(state, command.subject);
  const newId = nextId(state, "EVT");
  const name = flagString(command.flags, "name", `${source.name} copia`) ?? `${source.name} copia`;
  const copy: Event = {
    ...source,
    id: newId,
    name,
    status: "draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  state.events.push(copy);
  state.dates
    .filter((date) => date.eventId === source.id)
    .forEach((date) =>
      state.dates.push({ ...date, id: nextId(state, "DAT"), eventId: newId, status: "draft" }),
    );
  state.tickets
    .filter((ticket) => ticket.eventId === source.id)
    .forEach((ticket) =>
      state.tickets.push({
        ...ticket,
        id: nextId(state, "TCK"),
        eventId: newId,
        sold: 0,
        status: "active",
      }),
    );
  state.discounts
    .filter((discount) => discount.eventId === source.id)
    .forEach((discount) =>
      state.discounts.push({
        ...discount,
        id: nextId(state, "DSC"),
        eventId: newId,
        uses: 0,
        status: "paused",
      }),
    );
  return eventView(state, copy);
}

function deleteEvent(state: FanzState, command: Command) {
  const event = findEvent(state, command.subject);
  ensureNoPaidOrders(state, event.id);
  state.events = state.events.filter((item) => item.id !== event.id);
  state.dates = state.dates.filter((item) => item.eventId !== event.id);
  state.tickets = state.tickets.filter((item) => item.eventId !== event.id);
  state.discounts = state.discounts.filter((item) => item.eventId !== event.id);
  return { deleted: event.id };
}

function parseEventStatus(value?: string): EventStatus {
  const allowed: EventStatus[] = ["draft", "on_sale", "paused", "ended"];
  if (allowed.includes(value as EventStatus)) return value as EventStatus;
  throw new CliError(
    `Invalid status "${value}". Allowed: ${allowed.join(", ")}`,
    "validation_error",
  );
}

function toIso(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new CliError(
      `Invalid date "${value}". Use ISO format like 2026-07-20T23:00:00Z.`,
      "validation_error",
    );
  }
  return date.toISOString();
}

// Forward-declare createTicket to avoid circular import with tickets.ts
import { createTicket } from "./tickets";
