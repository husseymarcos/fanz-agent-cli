import { createInitialState } from "../lib/fanz-cli/data";
import { runCli } from "../lib/fanz-cli/engine";
import type { FanzState } from "../lib/fanz-cli/data";
import type { CliResponse } from "../lib/fanz-cli/engine";

export type CliSession = {
  state: FanzState;
  run: (command: string) => CliResponse;
};

export function session(): CliSession {
  const cli: CliSession = {
    state: createInitialState(),
    run(command: string) {
      const result = runCli(command, cli.state);
      cli.state = result.state;
      return result.response;
    },
  };
  return cli;
}

export function loginAs(cli: CliSession, token: string): void {
  const res = cli.run(`fanz login --token ${token}`);
  if (res.status !== "ok") {
    throw new Error(`Login failed for ${token}: ${res.message}`);
  }
}
