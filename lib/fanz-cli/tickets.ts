import { requirePermission } from "./auth";
import { nextId } from "./data";
import { CliError, flagNumber, flagString, requireFlag, findById, resourceId } from "./parser";
import type { Command } from "./parser";
import type { FanzState } from "./data";
import type { CliResponse } from "./engine";

export type TicketStatus = "active" | "paused" | "sold_out";

export type TicketType = {
  id: string;
  eventId: string;
  name: string;
  price: { amount: number; currency: "ARS" };
  stock: number;
  sold: number;
  status: TicketStatus;
};

export function tickets(state: FanzState, command: Command): CliResponse {
  switch (command.action) {
    case "list": {
      requirePermission(state, "read");
      const eventId = requireEventFlagOrSubject(command);
      findEvent(state, eventId);
      return {
        status: "ok",
        message: "Tickets",
        data: state.tickets
          .filter((ticket) => ticket.eventId === eventId)
          .map(ticketView),
        exitCode: 0,
      };
    }
    case "create": {
      requirePermission(state, "write");
      if (command.dryRun) {
        const snapshot = structuredClone(state);
        const eventId = requireFlag(command.flags, "event");
        findEvent(state, eventId);
        const ticket = createTicket(state, eventId, command.flags);
        state.tickets.push(ticket);
        const preview = ticketView(ticket);
        Object.assign(state, snapshot);
        return {
          status: "dry-run",
          message: "Create ticket preview; no changes applied.",
          data: preview,
          exitCode: 0,
        };
      }
      const eventId = requireFlag(command.flags, "event");
      findEvent(state, eventId);
      const ticket = createTicket(state, eventId, command.flags);
      state.tickets.push(ticket);
      return {
        status: "ok",
        message: "Create ticket completed",
        data: ticketView(ticket),
        exitCode: 0,
      };
    }
    case "update": {
      requirePermission(state, "write");
      if (command.dryRun) {
        const snapshot = structuredClone(state);
        const ticket = findById(state.tickets, resourceId(command), "ticket");
        applyTicketFlags(ticket, command.flags);
        const preview = ticketView(ticket);
        Object.assign(state, snapshot);
        return {
          status: "dry-run",
          message: "Update ticket preview; no changes applied.",
          data: preview,
          exitCode: 0,
        };
      }
      const ticket = findById(state.tickets, resourceId(command), "ticket");
      applyTicketFlags(ticket, command.flags);
      return {
        status: "ok",
        message: "Update ticket completed",
        data: ticketView(ticket),
        exitCode: 0,
      };
    }
    case "delete": {
      requirePermission(state, "delete");
      if (!command.dryRun && !command.yes) {
        throw new CliError(
          "Delete ticket is destructive. Re-run with --dry-run or --yes.",
          "confirmation_required",
        );
      }
      if (command.dryRun) {
        const snapshot = structuredClone(state);
        const ticket = findById(state.tickets, resourceId(command), "ticket");
        if (ticket.sold > 0) {
          throw new CliError(
            `Ticket ${ticket.id} has ${ticket.sold} sold units; pause it instead.`,
            "business_rule",
          );
        }
        state.tickets = state.tickets.filter((item) => item.id !== ticket.id);
        const preview = { deleted: ticket.id };
        Object.assign(state, snapshot);
        return {
          status: "dry-run",
          message: "Delete ticket preview; no changes applied.",
          data: preview,
          exitCode: 0,
        };
      }
      const ticket = findById(state.tickets, resourceId(command), "ticket");
      if (ticket.sold > 0) {
        throw new CliError(
          `Ticket ${ticket.id} has ${ticket.sold} sold units; pause it instead.`,
          "business_rule",
        );
      }
      state.tickets = state.tickets.filter((item) => item.id !== ticket.id);
      return {
        status: "ok",
        message: "Delete ticket completed",
        data: { deleted: ticket.id },
        exitCode: 0,
      };
    }
    default:
      throw new CliError(
        "Use: fanz tickets list --event EVT_100 | create | update | delete",
      );
  }
}

export function createTicket(
  state: FanzState,
  eventId: string,
  flags: Record<string, string | boolean>,
): TicketType {
  const price = flagNumber(flags, "price");
  const stock = flagNumber(flags, "stock");
  if (price === undefined) throw new CliError("Missing required flag --price", "validation_error");
  if (stock === undefined) throw new CliError("Missing required flag --stock", "validation_error");
  if (price < 0) throw new CliError("--price must be 0 or greater", "validation_error");
  if (!Number.isInteger(stock) || stock < 0)
    throw new CliError("--stock must be a non-negative integer", "validation_error");

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

export function applyTicketFlags(
  ticket: TicketType,
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

function remainingStock(ticket: TicketType): number {
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

function requireEventFlagOrSubject(command: Command): string {
  return (
    flagString(command.flags, "event", command.subject) ??
    (() => {
      throw new CliError(
        "Missing event id. Use --event EVT_100 or pass it after the action.",
        "validation_error",
      );
    })()
  );
}

// Avoid circular import; declare locally
function findEvent(state: FanzState, eventId: string) {
  const event = state.events.find((item) => item.id === eventId);
  if (!event) throw new CliError(`Event ${eventId} was not found.`, "not_found");
  return event;
}
