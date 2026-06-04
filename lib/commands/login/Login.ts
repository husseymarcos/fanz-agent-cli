import { CliError } from "../../parser";
import { requireFlag } from "../../flags";
import type { CliAction, CliResponse, CommandContext } from "../../engine";

export class Login implements CliAction {

  run({ state, command }: CommandContext): CliResponse {
    const tokenValue = requireFlag(command.flags, "token");
    const token = state.tokens.find((candidate) => candidate.token === tokenValue);
    if (!token) {
      throw new CliError(
        `Invalid mock token "${tokenValue}". Try mock_admin, mock_ops or mock_viewer.`,
        "auth_error",
      );
    }

    state.activeToken = token.token;
    return {
      status: "ok",
      message: "Logged in",
      data: {
        token: token.token,
        label: token.label,
        accountId: token.accountId,
        permissions: token.permissions,
      },
      exitCode: 0,
    };
  }
}
