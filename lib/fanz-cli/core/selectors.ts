import { CliError, flagString } from "./parser";
import type { Command } from "./command";
import type { Event, FanzState } from "../types";

export function findEvent(state: FanzState, eventId?: string): Event {
  if (!eventId) throw new CliError("Missing event id", "validation_error");
  const event = state.events.find((item) => item.id === eventId);
  if (!event) throw new CliError(`Event ${eventId} was not found.`, "not_found");
  return event;
}

export function findById<T extends { id: string }>(items: T[], id: string | undefined, label: string): T {
  if (!id) throw new CliError(`Missing ${label} id`, "validation_error");
  const item = items.find((candidate) => candidate.id === id);
  if (!item) throw new CliError(`${capitalize(label)} ${id} was not found.`, "not_found");
  return item;
}

export function ensureNoPaidOrders(state: FanzState, eventId: string) {
  const paid = state.orders.filter((order) => order.eventId === eventId && order.status === "paid");
  if (paid.length > 0) {
    throw new CliError(`Event ${eventId} has ${paid.length} paid orders; pause it instead of deleting.`, "business_rule");
  }
}

export function requireEventFlagOrSubject(command: Command): string {
  return flagString(command.flags, "event", command.subject) ?? (() => {
    throw new CliError("Missing event id. Use --event EVT_100 or pass it after the action.", "validation_error");
  })();
}

export function resourceId(command: Command): string | undefined {
  if (command.subject?.startsWith("EVT_")) return command.positionals[0];
  return command.subject;
}

function capitalize(value: string): string {
  return `${value[0]?.toUpperCase() ?? ""}${value.slice(1)}`;
}
