import { requirePermission } from "./auth";
import { createDate, applyDateFlags, findEvent } from "./events";
import { CliError, requireFlag, findById, resourceId } from "./parser";
import type { Command } from "./parser";
import type { FanzState } from "./data";
import type { CliResponse } from "./engine";

export function dates(state: FanzState, command: Command): CliResponse {
  switch (command.action) {
    case "list": {
      requirePermission(state, "read");
      const eventId = requireEventFlagOrSubject(command);
      findEvent(state, eventId);
      return {
        status: "ok",
        message: "Dates",
        data: state.dates.filter((date) => date.eventId === eventId),
        exitCode: 0,
      };
    }
    case "create": {
      requirePermission(state, "write");
      if (command.dryRun) {
        const snapshot = structuredClone(state);
        const eventId = requireFlag(command.flags, "event");
        findEvent(state, eventId);
        const date = createDate(state, eventId, command.flags);
        state.dates.push(date);
        const preview = date;
        Object.assign(state, snapshot);
        return {
          status: "dry-run",
          message: "Create date preview; no changes applied.",
          data: preview,
          exitCode: 0,
        };
      }
      const eventId = requireFlag(command.flags, "event");
      findEvent(state, eventId);
      const date = createDate(state, eventId, command.flags);
      state.dates.push(date);
      return {
        status: "ok",
        message: "Create date completed",
        data: date,
        exitCode: 0,
      };
    }
    case "update": {
      requirePermission(state, "write");
      if (command.dryRun) {
        const snapshot = structuredClone(state);
        const date = findById(state.dates, resourceId(command), "date");
        applyDateFlags(date, command.flags);
        const preview = date;
        Object.assign(state, snapshot);
        return {
          status: "dry-run",
          message: "Update date preview; no changes applied.",
          data: preview,
          exitCode: 0,
        };
      }
      const date = findById(state.dates, resourceId(command), "date");
      applyDateFlags(date, command.flags);
      return {
        status: "ok",
        message: "Update date completed",
        data: date,
        exitCode: 0,
      };
    }
    case "delete": {
      requirePermission(state, "delete");
      if (!command.dryRun && !command.yes) {
        throw new CliError(
          "Delete date is destructive. Re-run with --dry-run or --yes.",
          "confirmation_required",
        );
      }
      if (command.dryRun) {
        const snapshot = structuredClone(state);
        const date = findById(state.dates, resourceId(command), "date");
        state.dates = state.dates.filter((item) => item.id !== date.id);
        const preview = { deleted: date.id };
        Object.assign(state, snapshot);
        return {
          status: "dry-run",
          message: "Delete date preview; no changes applied.",
          data: preview,
          exitCode: 0,
        };
      }
      const date = findById(state.dates, resourceId(command), "date");
      state.dates = state.dates.filter((item) => item.id !== date.id);
      return {
        status: "ok",
        message: "Delete date completed",
        data: { deleted: date.id },
        exitCode: 0,
      };
    }
    default:
      throw new CliError(
        "Use: fanz dates list --event EVT_100 | create | update | delete",
      );
  }
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

function flagString(
  flags: Record<string, string | boolean>,
  name: string,
  fallback?: string,
): string | undefined {
  const value = flags[name];
  if (typeof value === "string" && value.trim()) return value.trim();
  return fallback;
}
