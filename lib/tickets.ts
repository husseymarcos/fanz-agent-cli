import { nextId } from "./data";
import { CliError, flagNumber, flagString, requireFlag } from "./parser";
import type { EventStore, IdStore } from "./data";

export type TicketStatus = "active" | "paused" | "sold_out";

export type TicketData = {
  id: string;
  eventId: string;
  name: string;
  price: { amount: number; currency: "ARS" };
  stock: number;
  sold: number;
  status: TicketStatus;
};

export function createTicket(
  store: IdStore,
  eventId: string,
  flags: Record<string, string | boolean>,
): TicketData {
  const price = flagNumber(flags, "price");
  const stock = flagNumber(flags, "stock");
  if (price === undefined) throw new CliError("Missing required flag --price", "validation_error");
  if (stock === undefined) throw new CliError("Missing required flag --stock", "validation_error");
  if (price < 0) throw new CliError("--price must be 0 or greater", "validation_error");
  if (!Number.isInteger(stock) || stock < 0)
    throw new CliError("--stock must be a non-negative integer", "validation_error");

  return {
    id: nextId(store, "TCK"),
    eventId,
    name: requireFlag(flags, "name"),
    price: { amount: price, currency: "ARS" },
    stock,
    sold: 0,
    status: parseTicketStatus(flagString(flags, "status", "active")),
  };
}

export function applyTicketFlags(
  ticket: TicketData,
  flags: Record<string, string | boolean>,
) {
  ticket.name = flagString(flags, "name", ticket.name) ?? ticket.name;
  const price = flagNumber(flags, "price", ticket.price.amount);
  const stock = flagNumber(flags, "stock", ticket.stock);
  if (price === undefined || price < 0) throw new CliError("--price must be 0 or greater", "validation_error");
  if (stock === undefined || !Number.isInteger(stock) || stock < ticket.sold) {
    throw new CliError(
      `--stock must be an integer >= sold (${ticket.sold})`,
      "validation_error",
    );
  }
  ticket.price.amount = price;
  ticket.stock = stock;
  ticket.status = parseTicketStatus(flagString(flags, "status", ticket.status));
}

export function ticketView(ticket: TicketData) {
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

function remainingStock(ticket: TicketData): number {
  return Math.max(0, ticket.stock - ticket.sold);
}

function parseTicketStatus(value?: string): TicketStatus {
  const allowed: TicketStatus[] = ["active", "paused", "sold_out"];
  if (allowed.includes(value as TicketStatus)) return value as TicketStatus;
  throw new CliError(
    `Invalid ticket status "${value}". Allowed: ${allowed.join(", ")}`,
    "validation_error",
  );
}

// Avoid circular import; declare locally
export function findEvent(store: EventStore, eventId: string) {
  const event = store.events.find((item) => item.id === eventId);
  if (!event) throw new CliError(`Event ${eventId} was not found.`, "not_found");
  return event;
}
