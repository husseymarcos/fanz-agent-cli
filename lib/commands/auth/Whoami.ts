import { requireSession } from "../../auth";
import type { CliAction, CliResponse, CommandContext } from "../../engine";

export class Whoami implements CliAction {
  constructor(private context: CommandContext) {}

  run(): CliResponse {
    const { state } = this.context;
    const token = requireSession(state);
    const account = state.accounts.find((item) => item.id === token.accountId);
    return {
      status: "ok",
      message: "Active session",
      data: {
        token: {
          token: token.token,
          label: token.label,
          accountId: token.accountId,
          permissions: token.permissions,
        },
        account,
      },
      exitCode: 0,
    };
  }
}
