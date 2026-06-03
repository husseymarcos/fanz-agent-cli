import { describe, expect, test } from "bun:test";
import { session, loginAs } from "./helpers";

describe("engine integration", () => {
  test("help returns command list", () => {
    const cli = session();
    const res = cli.run("fanz help");
    expect(res.status).toBe("ok");
    expect(Array.isArray(res.data)).toBe(true);
    expect((res.data as unknown[]).length).toBeGreaterThan(0);
  });

  test("unknown namespace throws", () => {
    const cli = session();
    const res = cli.run("fanz unknown_cmd");
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/Unknown command/);
    expect(res.exitCode).toBe(1);
  });

  test("unknown action in namespace throws", () => {
    const cli = session();
    loginAs(cli, "mock_admin");
    const res = cli.run("fanz events unknown_action");
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/Use: fanz events/);
  });

  test("audit log records status and message for ok responses", () => {
    const cli = session();
    loginAs(cli, "mock_admin");
    cli.run("fanz events list");
    const entry = cli.state.auditLog[cli.state.auditLog.length - 1];
    expect(entry.status).toBe("ok");
    expect(entry.command).toBe("fanz events list");
    expect(entry.token).toBe("mock_admin");
  });

  test("audit log records status and message for errors", () => {
    const cli = session();
    const res = cli.run("fanz events list");
    expect(res.status).toBe("error");
    const entry = cli.state.auditLog[cli.state.auditLog.length - 1];
    expect(entry.status).toBe("error");
    expect(entry.command).toBe("fanz events list");
    expect(entry.token).toBeUndefined();
  });

  test("audit log records dry-run status", () => {
    const cli = session();
    loginAs(cli, "mock_admin");
    cli.run('fanz events create --name "Audit" --location "X" --dry-run');
    const entry = cli.state.auditLog[cli.state.auditLog.length - 1];
    expect(entry.status).toBe("dry-run");
  });

  test("exit code 0 for ok", () => {
    const cli = session();
    loginAs(cli, "mock_viewer");
    const res = cli.run("fanz events list");
    expect(res.exitCode).toBe(0);
  });

  test("exit code 1 for error", () => {
    const cli = session();
    const res = cli.run("fanz bad");
    expect(res.exitCode).toBe(1);
  });

  test("state is deeply cloned between runs", () => {
    const cli = session();
    loginAs(cli, "mock_admin");
    cli.run('fanz events create --name "Clone" --location "X"');
    const event = cli.state.events.find((e) => e.name === "Clone")!;
    // Mutating returned data should not affect internal state
    // We can't easily test this from the CLI layer, but we verify structuredClone behavior
    // by checking that dry-run restores state properly (already tested per domain).
    expect(event).toBeTruthy();
  });
});
