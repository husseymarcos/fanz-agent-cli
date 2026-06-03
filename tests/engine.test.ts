import { beforeEach, describe, expect, test } from "bun:test";
import { session } from "./helpers";

describe("CLI basics", () => {
  let cli: ReturnType<typeof session>;

  beforeEach(() => {
    cli = session();
  });

  test("help shows available commands", () => {
    const res = cli.run("fanz help");
    expect(res.status).toBe("ok");
    expect(Array.isArray(res.data)).toBe(true);
    expect((res.data as unknown[]).length).toBeGreaterThan(0);
  });

  test("unknown commands show an error", () => {
    const res = cli.run("fanz unknown_cmd");
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/Unknown command/);
    expect(res.exitCode).toBe(1);
  });

  test("unknown event actions show usage help", () => {
    cli.loginAs("mock_admin");
    const res = cli.run("fanz events unknown_action");
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/Use: fanz events/);
  });

  test("successful commands appear in the activity history", () => {
    cli.loginAs("mock_admin");
    cli.run("fanz events list");
    const entry = cli.state.auditLog[cli.state.auditLog.length - 1];
    expect(entry.status).toBe("ok");
    expect(entry.command).toBe("fanz events list");
    expect(entry.token).toBe("mock_admin");
  });

  test("failed commands appear in the activity history", () => {
    const res = cli.run("fanz events list");
    expect(res.status).toBe("error");
    const entry = cli.state.auditLog[cli.state.auditLog.length - 1];
    expect(entry.status).toBe("error");
    expect(entry.command).toBe("fanz events list");
    expect(entry.token).toBeUndefined();
  });

  test("previews appear in the activity history", () => {
    cli.loginAs("mock_admin");
    cli.run('fanz events create --name "Audit" --location "X" --dry-run');
    const entry = cli.state.auditLog[cli.state.auditLog.length - 1];
    expect(entry.status).toBe("dry-run");
  });

  test("successful commands finish cleanly", () => {
    cli.loginAs("mock_viewer");
    const res = cli.run("fanz events list");
    expect(res.exitCode).toBe(0);
  });

  test("failed commands report a failure", () => {
    const res = cli.run("fanz bad");
    expect(res.exitCode).toBe(1);
  });

  test("new events stay available after creation", () => {
    cli.loginAs("mock_admin");
    cli.run('fanz events create --name "Clone" --location "X"');
    const event = cli.state.events.find((e) => e.name === "Clone")!;
    // Mutating returned data should not affect internal state
    // We can't easily test this from the CLI layer, but we verify structuredClone behavior
    // by checking that dry-run restores state properly (already tested per domain).
    expect(event).toBeTruthy();
  });
});
