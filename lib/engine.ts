import { parseCommand, CliError } from "./parser";
import { nextId, createInitialState } from "./data";
import { commandActions } from "./commands/generated";
import { checkPermissions } from "./commands/permissions";
import type { Command } from "./parser";

export type CliState = ReturnType<typeof createInitialState>;

export type CliStatus = "ok" | "error" | "dry-run";

export type CliResponse = {
  status: CliStatus;
  message: string;
  data?: unknown;
  command?: {
    input: string;
    route: string;
  };
  code?: string;
  hint?: string;
  warnings?: string[];
  exitCode: number;
};

export type CommandContext = {
  state: CliState;
  command: Command;
};

export interface CliAction {
  run(context: CommandContext): CliResponse;
}

export type CliActionClass = {
  new (): CliAction;
};

export type CommandRegistration = {
  route: string;
  Action: CliActionClass;
};

export class CliSession {
  static start(): CliSession {
    return new CliSession(createInitialState());
  }

  static withState(state: CliState): CliSession {
    return new CliSession(state);
  }

  private state: CliState;

  private constructor(state: CliState) {
    this.state = structuredClone(state);
  }

  run(input: string): CliResponse {
    const nextState = structuredClone(this.state);
    let command: Command | undefined;
    let response: CliResponse;

    try {
      command = parseCommand(input);
      const dispatchState = command.dryRun ? structuredClone(nextState) : nextState;
      response = dispatch(command, dispatchState);
    } catch (error) {
      response = toErrorResponse(error);
    }

    if (command) {
      response.command = {
        input,
        route: routeKey(command),
      };
    }

    nextState.auditLog.push({
      id: nextId(nextState, "AUD"),
      at: new Date().toISOString(),
      token: nextState.activeToken,
      command: input,
      status: response.status,
      message: response.message,
    });

    this.state = nextState;
    return response;
  }

  snapshot(): CliState {
    return structuredClone(this.state);
  }
}

function dispatch(command: Command, state: CliState): CliResponse {
  const Action = actions[routeKey(command)];
  if (!Action) throw usageFor(command);
  checkPermissions(Action, state);
  return new Action().run({ state, command });
}

function routeKey(command: Command): string {
  if (command.namespace === "help") return "help";
  if (command.namespace === "login") return "login";
  if (command.namespace === "reset") return "reset";
  return [command.namespace, command.action].filter(Boolean).join(".");
}

function usageFor(command: Command): CliError {
  const usage = usageMessages[command.namespace];
  if (usage) return new CliError(usage);
  return new CliError(`Unknown command "${command.namespace}". Run: fanz help`);
}

function toErrorResponse(error: unknown): CliResponse {
  if (error instanceof CliError) {
    return {
      status: "error",
      message: error.message,
      code: error.code,
      hint: hintFor(error.code),
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

const actions = Object.fromEntries(
  commandActions.map(({ route, Action }) => [route, Action]),
) as Record<string, CliActionClass>;

const usageMessages: Record<string, string> = {
  auth: "Use: fanz auth whoami",
  commands: "Use: fanz commands list | describe tickets.create",
  events: "Use: fanz events list|create|update|pause|resume|duplicate|delete",
  dates: "Use: fanz dates list --event EVT_100 | create | update | delete",
  tickets: "Use: fanz tickets list --event EVT_100 | create | update | delete",
  discounts: "Use: fanz discounts list --event EVT_100 | create | update | delete",
  sales: "Use: fanz sales list|summary|export --event EVT_100",
  orders: "Use: fanz orders create --event EVT_101 --ticket TCK_102 --buyer-email test@example.test | show ORD_100 | resend ORD_100",
  audit: "Use: fanz audit list",
};

function hintFor(code: string): string | undefined {
  const hints: Record<string, string> = {
    auth_required: "Run fanz login --token mock_admin, mock_ops or mock_viewer.",
    auth_error: "Use one of the documented mock tokens.",
    forbidden: "Switch to a token with the required permission.",
    not_found: "List the resource first and retry with a returned id.",
    parse_error: "Check quotes and flag syntax, then retry.",
    validation_error: "Run fanz commands describe <route> --json to inspect required flags.",
    business_rule: "Use --dry-run to preview risky operations and adjust the command.",
    invalid_command: "Run fanz commands list --json to discover available commands.",
  };
  return hints[code];
}
