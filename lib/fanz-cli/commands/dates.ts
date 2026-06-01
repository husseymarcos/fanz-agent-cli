import { requirePermission } from "../core/auth";
import { applyDateFlags, createDate } from "../catalog/builders";
import { mutate } from "../core/mutations";
import { CliError, requireFlag } from "../core/parser";
import { ok } from "../core/responses";
import { findById, findEvent, requireEventFlagOrSubject, resourceId } from "../core/selectors";
import type { Command } from "../core/command";
import type { CliResponse, FanzState } from "../types";

export function dates(state: FanzState, command: Command): CliResponse {
  switch (command.action) {
    case "list": {
      requirePermission(state, "read");
      const eventId = requireEventFlagOrSubject(command);
      findEvent(state, eventId);
      return ok("Dates", state.dates.filter((date) => date.eventId === eventId));
    }
    case "create":
      return mutate(state, command, "write", "Create date", () => {
        const eventId = requireFlag(command.flags, "event");
        findEvent(state, eventId);
        const date = createDate(state, eventId, command.flags);
        state.dates.push(date);
        return date;
      });
    case "update":
      return mutate(state, command, "write", "Update date", () => {
        const date = findById(state.dates, resourceId(command), "date");
        applyDateFlags(date, command.flags);
        return date;
      });
    case "delete":
      return mutate(state, command, "delete", "Delete date", () => {
        const date = findById(state.dates, resourceId(command), "date");
        state.dates = state.dates.filter((item) => item.id !== date.id);
        return { deleted: date.id };
      });
    default:
      throw new CliError("Use: fanz dates list --event EVT_100 | create | update | delete");
  }
}
