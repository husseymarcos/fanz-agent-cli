import { nextId } from "../../data";
import { CliError, flagString, requireFlag } from "../../parser";
import type {
  DateStore,
  EventStore,
  IdStore,
  OrderStore,
  TicketStore,
} from "../../data";
import type { TicketData } from "../tickets";

export type EventStatus = "draft" | "on_sale" | "paused" | "ended";

export type EventData = {
  id: string;
  accountId: string;
  name: string;
  description: string;
  location: string;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
};

export type EventDateData = {
  id: string;
  eventId: string;
  startsAt: string;
  doorsAt?: string;
  venue: string;
  status: EventStatus;
};

type EventReadStore = DateStore & EventStore & OrderStore & TicketStore;
type EventSummaryStore = EventStore & OrderStore & TicketStore;

export function findEvent(store: EventStore, eventId?: string): EventData {
  if (!eventId) throw new CliError("Missing event id", "validation_error");
  const event = store.events.find((item) => item.id === eventId);
  if (!event) throw new CliError(`Event ${eventId} was not found.`, "not_found");
  return event;
}

export function eventView(store: EventReadStore, event: EventData) {
  return {
    id: event.id,
    name: event.name,
    status: event.status,
    location: event.location,
    dates: store.dates.filter((date) => date.eventId === event.id).length,
    ticketTypes: store.tickets.filter((ticket) => ticket.eventId === event.id).length,
    revenueARS: buildEventSummaryForRecord(store, event).revenueARS,
    updatedAt: event.updatedAt,
  };
}

export function buildEventSummary(store: EventSummaryStore, eventId: string) {
  return buildEventSummaryForRecord(store, findEvent(store, eventId));
}

function sumOrders(orders: { status: string; total: { amount: number } }[]): number {
  return orders
    .filter((order) => order.status === "paid")
    .reduce((total, order) => total + order.total.amount, 0);
}

function remainingStock(ticket: TicketData): number {
  return Math.max(0, ticket.stock - ticket.sold);
}

export function createEvent(
  store: IdStore,
  accountId: string,
  flags: Record<string, string | boolean>,
): EventData {
  const at = new Date().toISOString();
  return {
    id: nextId(store, "EVT"),
    accountId,
    name: requireFlag(flags, "name"),
    description: flagString(flags, "description", "Evento mock creado desde Fanz CLI.") ?? "",
    location: requireFlag(flags, "location"),
    status: parseEventStatus(flagString(flags, "status", "draft")),
    createdAt: at,
    updatedAt: at,
  };
}

export function applyEventFlags(
  event: EventData,
  flags: Record<string, string | boolean>,
) {
  event.name = flagString(flags, "name", event.name) ?? event.name;
  event.description = flagString(flags, "description", event.description) ?? event.description;
  event.location = flagString(flags, "location", event.location) ?? event.location;
  event.status = parseEventStatus(flagString(flags, "status", event.status));
}

function buildEventSummaryForRecord(store: OrderStore & TicketStore, event: EventData) {
  const tickets = store.tickets.filter((ticket) => ticket.eventId === event.id);
  const orders = store.orders.filter((order) => order.eventId === event.id);
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
    eventId: event.id,
    orders: orders.length,
    issuedTickets: orders.reduce((total, order) => total + order.ticketIds.length, 0),
    revenueARS: revenue,
    stockTotal: stock.total,
    stockSold: stock.sold,
    stockRemaining: stock.remaining,
  };
}

export function createDate(
  store: IdStore,
  eventId: string,
  flags: Record<string, string | boolean>,
): EventDateData {
  return {
    id: nextId(store, "DAT"),
    eventId,
    startsAt: toIso(requireFlag(flags, "starts")),
    doorsAt: flagString(flags, "doors") ? toIso(requireFlag(flags, "doors")) : undefined,
    venue: flagString(flags, "venue", flagString(flags, "location", "Venue mock")) ?? "Venue mock",
    status: parseEventStatus(flagString(flags, "status", "draft")),
  };
}

export function applyDateFlags(
  date: EventDateData,
  flags: Record<string, string | boolean>,
) {
  date.startsAt = flagString(flags, "starts") ? toIso(requireFlag(flags, "starts")) : date.startsAt;
  date.doorsAt = flagString(flags, "doors") ? toIso(requireFlag(flags, "doors")) : date.doorsAt;
  date.venue = flagString(flags, "venue", date.venue) ?? date.venue;
  date.status = parseEventStatus(flagString(flags, "status", date.status));
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
