import { CliError } from "./parser";
import type { DiscountStatus, EventStatus, TicketStatus } from "../types";

export function parseEventStatus(value?: string): EventStatus {
  return parseEnum(value, ["draft", "on_sale", "paused", "ended"], "status");
}

export function parseTicketStatus(value?: string): TicketStatus {
  return parseEnum(value, ["active", "paused", "sold_out"], "ticket status");
}

export function parseDiscountStatus(value?: string): DiscountStatus {
  return parseEnum(value, ["active", "paused", "expired"], "discount status");
}

export function toIso(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new CliError(`Invalid date "${value}". Use ISO format like 2026-07-20T23:00:00Z.`, "validation_error");
  }
  return date.toISOString();
}

function parseEnum<T extends string>(value: string | undefined, allowed: T[], label: string): T {
  if (allowed.includes(value as T)) return value as T;
  throw new CliError(`Invalid ${label} "${value}". Allowed: ${allowed.join(", ")}`, "validation_error");
}
