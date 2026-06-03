import type { IssuedTicketStore } from "./data";

export type OrderStatus = "paid" | "pending" | "refunded" | "cancelled";

export type OrderData = {
  id: string;
  eventId: string;
  buyerName: string;
  buyerEmail: string;
  status: OrderStatus;
  ticketIds: string[];
  subtotal: { amount: number; currency: "ARS" };
  discountCode?: string;
  discountAmount: { amount: number; currency: "ARS" };
  total: { amount: number; currency: "ARS" };
  createdAt: string;
  lastDeliveryAt?: string;
};

export type IssuedTicket = {
  id: string;
  ticketTypeId: string;
  ticketName: string;
  holderEmail: string;
  checkedIn: boolean;
};

export function orderView(store: IssuedTicketStore, order: OrderData, includeTickets = false) {
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
    issuedTickets: order.ticketIds
      .map((id) => store.issuedTickets.find((ticket) => ticket.id === id))
      .filter(Boolean),
  };
}
