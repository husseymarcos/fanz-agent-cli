import { requireSession } from "../core/auth";
import { nextId } from "../core/ids";
import { CliError, flagNumber, flagString, requireFlag } from "../core/parser";
import { parseDiscountStatus, parseEventStatus, parseTicketStatus, toIso } from "../core/status";
import type { Discount, Event, EventDate, FanzState, TicketType } from "../types";

export function createEvent(state: FanzState, flags: Record<string, string | boolean>): Event {
  const at = new Date().toISOString();
  return {
    id: nextId(state, "EVT"),
    accountId: requireSession(state).accountId,
    name: requireFlag(flags, "name"),
    description: flagString(flags, "description", "Evento mock creado desde Fanz CLI.") ?? "",
    location: requireFlag(flags, "location"),
    status: parseEventStatus(flagString(flags, "status", "draft")),
    createdAt: at,
    updatedAt: at,
  };
}

export function createDate(state: FanzState, eventId: string, flags: Record<string, string | boolean>): EventDate {
  return {
    id: nextId(state, "DAT"),
    eventId,
    startsAt: toIso(requireFlag(flags, "starts")),
    doorsAt: flagString(flags, "doors") ? toIso(requireFlag(flags, "doors")) : undefined,
    venue: flagString(flags, "venue", flagString(flags, "location", "Venue mock")) ?? "Venue mock",
    status: parseEventStatus(flagString(flags, "status", "draft")),
  };
}

export function createTicket(state: FanzState, eventId: string, flags: Record<string, string | boolean>): TicketType {
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

export function createTicketFromSpec(state: FanzState, eventId: string, spec: string): TicketType {
  const [name, rawPrice, rawStock] = spec.split(":");
  const price = Number(rawPrice);
  const stock = Number(rawStock);
  if (!name || !Number.isFinite(price) || !Number.isInteger(stock)) {
    throw new CliError('--ticket must use "Name:price:stock", for example "General:10000:500"', "validation_error");
  }
  return createTicket(state, eventId, { name, price: String(price), stock: String(stock) });
}

export function createDiscount(state: FanzState, eventId: string, flags: Record<string, string | boolean>): Discount {
  const code = requireFlag(flags, "code").toUpperCase();
  if (state.discounts.some((discount) => discount.eventId === eventId && discount.code === code)) {
    throw new CliError(`Discount code ${code} already exists for ${eventId}.`, "business_rule");
  }

  const percent = flagNumber(flags, "percent");
  if (percent === undefined || percent <= 0 || percent > 100) {
    throw new CliError("--percent must be between 1 and 100", "validation_error");
  }

  return {
    id: nextId(state, "DSC"),
    eventId,
    code,
    percent,
    maxUses: flagNumber(flags, "max-uses"),
    uses: 0,
    status: parseDiscountStatus(flagString(flags, "status", "active")),
  };
}

export function applyEventFlags(event: Event, flags: Record<string, string | boolean>) {
  event.name = flagString(flags, "name", event.name) ?? event.name;
  event.description = flagString(flags, "description", event.description) ?? event.description;
  event.location = flagString(flags, "location", event.location) ?? event.location;
  event.status = parseEventStatus(flagString(flags, "status", event.status));
}

export function applyDateFlags(date: EventDate, flags: Record<string, string | boolean>) {
  date.startsAt = flagString(flags, "starts") ? toIso(requireFlag(flags, "starts")) : date.startsAt;
  date.doorsAt = flagString(flags, "doors") ? toIso(requireFlag(flags, "doors")) : date.doorsAt;
  date.venue = flagString(flags, "venue", date.venue) ?? date.venue;
  date.status = parseEventStatus(flagString(flags, "status", date.status));
}

export function applyTicketFlags(ticket: TicketType, flags: Record<string, string | boolean>) {
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

export function applyDiscountFlags(discount: Discount, flags: Record<string, string | boolean>) {
  discount.code = flagString(flags, "code", discount.code)?.toUpperCase() ?? discount.code;
  const percent = flagNumber(flags, "percent", discount.percent);
  if (percent === undefined || percent <= 0 || percent > 100) {
    throw new CliError("--percent must be between 1 and 100", "validation_error");
  }
  discount.percent = percent;
  discount.maxUses = flagNumber(flags, "max-uses", discount.maxUses);
  discount.status = parseDiscountStatus(flagString(flags, "status", discount.status));
}
