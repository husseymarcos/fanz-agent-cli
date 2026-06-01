import { requirePermission } from "../core/auth";
import { applyEventFlags, createDate, createEvent, createTicketFromSpec } from "../catalog/builders";
import { nextId } from "../core/ids";
import { mutate } from "../core/mutations";
import { CliError, flagString } from "../core/parser";
import { ok } from "../core/responses";
import { ensureNoPaidOrders, findEvent } from "../core/selectors";
import { eventView } from "../presentation/views";
import type { Command } from "../core/command";
import type { CliResponse, Event, FanzState } from "../types";

export function events(state: FanzState, command: Command): CliResponse {
  switch (command.action) {
    case "list":
      requirePermission(state, "read");
      return ok("Events", state.events.map((event) => eventView(state, event)));
    case "create":
      return mutate(state, command, "write", "Create event", () => createEventFlow(state, command));
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
      return mutate(state, command, "write", "Duplicate event", () => duplicateEvent(state, command));
    case "delete":
      return mutate(state, command, "delete", "Delete event", () => deleteEvent(state, command));
    default:
      throw new CliError("Use: fanz events list|create|update|pause|resume|duplicate|delete");
  }
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
    .forEach((date) => state.dates.push({ ...date, id: nextId(state, "DAT"), eventId: newId, status: "draft" }));
  state.tickets
    .filter((ticket) => ticket.eventId === source.id)
    .forEach((ticket) => state.tickets.push({ ...ticket, id: nextId(state, "TCK"), eventId: newId, sold: 0, status: "active" }));
  state.discounts
    .filter((discount) => discount.eventId === source.id)
    .forEach((discount) => state.discounts.push({ ...discount, id: nextId(state, "DSC"), eventId: newId, uses: 0, status: "paused" }));
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
