import { commandCatalog } from "../../commandCatalog";
import type { CliAction, CliResponse } from "../../engine";

export class ListCommands implements CliAction {

  run(): CliResponse {
    return {
      status: "ok",
      message: "Command catalog",
      data: commandCatalog.map((command) => ({
        route: command.route,
        command: command.command,
        summary: command.summary,
        permission: command.permission ?? "",
        mutates: command.mutates,
        destructive: command.destructive ?? false,
        dryRun: command.dryRun ?? false,
      })),
      exitCode: 0,
    };
  }
}
