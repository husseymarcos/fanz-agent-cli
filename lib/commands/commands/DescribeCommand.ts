import { commandCatalog } from "../../commandCatalog";
import { CliError } from "../../parser";
import type { CliAction, CliResponse, CommandContext } from "../../engine";

export class DescribeCommand implements CliAction {

  run({ command }: CommandContext): CliResponse {
    const route = command.subject;
    if (!route) {
      throw new CliError(
        "Missing command route. Use: fanz commands describe orders.create --json",
        "validation_error",
      );
    }

    const meta = commandCatalog.find((item) => item.route === route);
    if (!meta) {
      throw new CliError(
        `Command ${route} was not found. Run: fanz commands list --json`,
        "not_found",
      );
    }

    return {
      status: "ok",
      message: "Command contract",
      data: meta,
      exitCode: 0,
    };
  }
}
