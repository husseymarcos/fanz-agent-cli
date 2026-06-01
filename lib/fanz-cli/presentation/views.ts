import { buildEventSummary, remainingStock } from "./format";
import type { Event, FanzState, Order, TicketType } from "../types";

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

export function ticketView(ticket: TicketType) {
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

export function orderView(state: FanzState, order: Order, includeTickets = false) {
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

export function toCsv(rows: Record<string, unknown>[]): string {
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
