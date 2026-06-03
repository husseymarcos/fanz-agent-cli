import { createInitialState } from "../lib/data";
import { runCli } from "../lib/engine";
import type { FanzState } from "../lib/data";
import type { CliResponse } from "../lib/engine";

export type CliSession = {
  state: FanzState;
  run: (command: string) => CliResponse;
  loginAs: (token: string) => void;
};

export function session(): CliSession {
  const cli: CliSession = {
    state: createInitialState(),
    run(command: string) {
      const result = runCli(command, cli.state);
      cli.state = result.state;
      return result.response;
    },
    loginAs(token: string) {
      const res = cli.run(`fanz login --token ${token}`);
      if (res.status !== "ok") {
        throw new Error(`Login failed for ${token}: ${res.message}`);
      }
    },
  };
  return cli;
}
