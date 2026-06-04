import { CliError } from "../parser";
import { flagString } from "../flags";
import type { Command } from "../parser";

export function findById<T extends { id: string }>(
  items: T[],
  id: string | undefined,
  label: string,
): T {
  if (!id) throw new CliError(`Missing ${label} id`, "validation_error");
  const item = items.find((candidate) => candidate.id === id);
  if (!item) {
    const capitalized = `${label[0]?.toUpperCase() ?? ""}${label.slice(1)}`;
    throw new CliError(`${capitalized} ${id} was not found.`, "not_found");
  }
  return item;
}

export function requireEventFlagOrSubject(command: Command): string {
  const eventId = flagString(command.flags, "event", command.subject);
  if (!eventId) {
    throw new CliError(
      "Missing event id. Use --event EVT_100 or pass it after the action.",
      "validation_error",
    );
  }
  return eventId;
}
