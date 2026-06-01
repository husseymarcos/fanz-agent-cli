import { audit, reset } from "./commands/admin";
import { auth, login } from "./core/auth";
import { dates, discounts, events, tickets } from "./commands/index";
import { createInitialState } from "./data";
import { helpText } from "./commands/help";
import { orders } from "./commands/orders";
import { CliError, parseCommand } from "./core/parser";
import { ok, toErrorResponse, withAudit } from "./core/responses";
import { sales } from "./commands/sales";
import type { Command } from "./core/command";
import type { CliResponse, FanzState } from "./types";

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

  return { state: withAudit(nextState, input, response), response };
}

function dispatch(command: Command, state: FanzState): CliResponse {
  switch (command.namespace) {
    case "help":
      return ok("Available commands", helpText());
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
