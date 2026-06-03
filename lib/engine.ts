import { parseCommand, CliError } from "./parser";
import { nextId, createInitialState } from "./data";
import { login, auth } from "./auth";
import { events } from "./events";
import { dates } from "./dates";
import { tickets } from "./tickets";
import { discounts } from "./discounts";
import { sales } from "./sales";
import { orders } from "./orders";
import { audit, reset } from "./admin";
import type { FanzState } from "./data";
import type { Command } from "./parser";

export type CliStatus = "ok" | "error" | "dry-run";

export type CliResponse = {
  status: CliStatus;
  message: string;
  data?: unknown;
  exitCode: number;
};

export type RunResult = {
  state: FanzState;
  response: CliResponse;
};

export function runCli(input: string, state: FanzState = createInitialState()): RunResult {
  const nextState = structuredClone(state);
  let response: CliResponse;

  try {
    response = dispatch(parseCommand(input), nextState);
  } catch (error) {
    response = toErrorResponse(error);
  }

  nextState.auditLog.push({
    id: nextId(nextState, "AUD"),
    at: new Date().toISOString(),
    token: nextState.activeToken,
    command: input,
    status: response.status,
    message: response.message,
  });

  return { state: nextState, response };
}

function dispatch(command: Command, state: FanzState): CliResponse {
  switch (command.namespace) {
    case "help":
      return { status: "ok", message: "Available commands", data: helpText(), exitCode: 0 };
    case "login":
      return login(state, command.flags);
    case "auth":
      return auth(state, command.action);
    case "events":
      return events(state, command);
    case "dates":
      return dates(state, command);
    case "tickets":
      return tickets(state, command);
    case "discounts":
      return discounts(state, command);
    case "sales":
      return sales(state, command);
    case "orders":
      return orders(state, command);
    case "audit":
      return audit(state, command.action);
    case "reset":
      return reset(state, command);
    default:
      throw new CliError(`Unknown command "${command.namespace}". Run: fanz help`);
  }
}

function toErrorResponse(error: unknown): CliResponse {
  if (error instanceof CliError) {
    return {
      status: "error",
      message: error.message,
      data: { code: error.code, details: error.details ?? null },
      exitCode: 1,
    };
  }
  return {
    status: "error",
    message: error instanceof Error ? error.message : "Unknown error",
    exitCode: 1,
  };
}

function helpText() {
  return [
    { flow: "auth", command: "fanz login --token mock_admin" },
    { flow: "auth", command: "fanz auth whoami --json" },
    {
      flow: "events",
      command:
        'fanz events create --name "Fiesta Demo" --description "CLI smoke test" --location "C Complejo Art Media" --date 2026-07-20T23:00:00Z --ticket "General:10000:500" --status on_sale --json',
    },
    { flow: "events", command: "fanz events list --json" },
    {
      flow: "dates",
      command: "fanz dates create --event EVT_101 --starts 2026-07-21T23:00:00Z --venue Art Media --json",
    },
    { flow: "tickets", command: "fanz tickets update TCK_102 --price 12000 --stock 450 --json" },
    {
      flow: "discounts",
      command: "fanz discounts create --event EVT_101 --code DEMO20 --percent 20 --max-uses 100 --json",
    },
    { flow: "sales", command: "fanz sales summary --event EVT_100 --json" },
    { flow: "sales", command: "fanz sales export --event EVT_100 --json" },
    { flow: "orders", command: "fanz orders resend ORD_100 --email buyer@example.test --json" },
    { flow: "guardrails", command: "fanz events delete EVT_101 --dry-run --json" },
    { flow: "guardrails", command: "fanz audit list --json" },
  ];
}
