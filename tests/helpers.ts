import { CliSession as EngineCliSession } from "../lib/engine";
import type { CliResponse, CliState } from "../lib/engine";

export type CliSession = {
  state: CliState;
  run: (command: string) => CliResponse;
  loginAs: (token: string) => void;
};

export function session(): CliSession {
  const engine = EngineCliSession.start();
  const cli: CliSession = {
    state: engine.snapshot(),
    run(command: string) {
      const response = engine.run(command);
      cli.state = engine.snapshot();
      return response;
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
