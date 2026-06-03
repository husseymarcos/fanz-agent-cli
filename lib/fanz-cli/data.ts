import type { Event, EventDate } from "./events";
import type { TicketType } from "./tickets";
import type { Discount } from "./discounts";
import type { Order, IssuedTicket } from "./orders";

export type Money = {
  amount: number;
  currency: "ARS";
};

export type Account = {
  id: string;
  name: string;
  slug: string;
};

export type Permission = "read" | "write" | "delete" | "export" | "resend";

export type AuthToken = {
  token: string;
  label: string;
  accountId: string;
  permissions: Permission[];
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

export const STORAGE_KEY = "fanz-cli-state-v1";

export type IdPrefix = "EVT" | "DAT" | "TCK" | "DSC" | "ORD" | "ISS" | "AUD";

export function nextId(state: FanzState, prefix: IdPrefix): string {
  state.counters[prefix] = (state.counters[prefix] ?? 0) + 1;
  return `${prefix}_${state.counters[prefix]}`;
}

const now = "2026-05-29T18:00:00.000Z";

export function createInitialState(): FanzState {
  return {
    version: 1,
    activeToken: undefined,
    accounts: [
      { id: "ACC_DEMO", name: "Fanz Demo Arena", slug: "fanz-demo" },
    ],
    tokens: [
      {
        token: "mock_admin",
        label: "Admin mock",
        accountId: "ACC_DEMO",
        permissions: ["read", "write", "delete", "export", "resend"],
      },
      {
        token: "mock_ops",
        label: "Operaciones mock",
        accountId: "ACC_DEMO",
        permissions: ["read", "write", "export", "resend"],
      },
      {
        token: "mock_viewer",
        label: "Solo lectura mock",
        accountId: "ACC_DEMO",
        permissions: ["read"],
      },
    ],
    events: [
      {
        id: "EVT_100",
        accountId: "ACC_DEMO",
        name: "Noche Demo",
        description: "Evento mock inicial para probar ventas y tickets.",
        location: "Club Fanz, Buenos Aires",
        status: "on_sale",
        createdAt: now,
        updatedAt: now,
      },
    ],
    dates: [
      {
        id: "DAT_100",
        eventId: "EVT_100",
        startsAt: "2026-07-20T23:00:00.000Z",
        doorsAt: "2026-07-20T22:00:00.000Z",
        venue: "Club Fanz",
        status: "on_sale",
      },
      {
        id: "DAT_101",
        eventId: "EVT_100",
        startsAt: "2026-07-21T23:00:00.000Z",
        doorsAt: "2026-07-21T22:00:00.000Z",
        venue: "Club Fanz",
        status: "paused",
      },
    ],
    tickets: [
      {
        id: "TCK_100",
        eventId: "EVT_100",
        name: "General",
        price: { amount: 10000, currency: "ARS" },
        stock: 500,
        sold: 143,
        status: "active",
      },
      {
        id: "TCK_101",
        eventId: "EVT_100",
        name: "VIP",
        price: { amount: 25000, currency: "ARS" },
        stock: 80,
        sold: 21,
        status: "active",
      },
    ],
    discounts: [
      {
        id: "DSC_100",
        eventId: "EVT_100",
        code: "DEMO20",
        percent: 20,
        maxUses: 100,
        uses: 17,
        status: "active",
      },
    ],
    orders: [
      {
        id: "ORD_100",
        eventId: "EVT_100",
        buyerName: "Luna Perez",
        buyerEmail: "luna@example.test",
        status: "paid",
        ticketIds: ["ISS_100", "ISS_101"],
        subtotal: { amount: 20000, currency: "ARS" },
        discountCode: "DEMO20",
        discountAmount: { amount: 4000, currency: "ARS" },
        total: { amount: 16000, currency: "ARS" },
        createdAt: "2026-05-20T14:35:00.000Z",
        lastDeliveryAt: "2026-05-20T14:36:00.000Z",
      },
      {
        id: "ORD_101",
        eventId: "EVT_100",
        buyerName: "Mateo Silva",
        buyerEmail: "mateo@example.test",
        status: "paid",
        ticketIds: ["ISS_102"],
        subtotal: { amount: 25000, currency: "ARS" },
        discountAmount: { amount: 0, currency: "ARS" },
        total: { amount: 25000, currency: "ARS" },
        createdAt: "2026-05-22T19:10:00.000Z",
      },
    ],
    issuedTickets: [
      {
        id: "ISS_100",
        ticketTypeId: "TCK_100",
        ticketName: "General",
        holderEmail: "luna@example.test",
        checkedIn: false,
      },
      {
        id: "ISS_101",
        ticketTypeId: "TCK_100",
        ticketName: "General",
        holderEmail: "luna@example.test",
        checkedIn: false,
      },
      {
        id: "ISS_102",
        ticketTypeId: "TCK_101",
        ticketName: "VIP",
        holderEmail: "mateo@example.test",
        checkedIn: true,
      },
    ],
    auditLog: [],
    counters: { EVT: 100, DAT: 101, TCK: 101, DSC: 100, ORD: 101, ISS: 102, AUD: 0 },
  };
}
