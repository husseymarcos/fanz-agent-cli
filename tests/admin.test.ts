import { beforeEach, describe, expect, test } from "bun:test";
import { session } from "./helpers";

describe("admin", () => {
  let cli: ReturnType<typeof session>;

  beforeEach(() => {
    cli = session();
  });

  test("activity history starts with the login command", () => {
    cli.loginAs("mock_viewer");
    const res = cli.run("fanz audit list");
    expect(res.status).toBe("ok");
    expect(Array.isArray(res.data)).toBe(true);
    // login command is already audited
    expect((res.data as unknown[]).length).toBe(1);
  });

  test("activity history grows after commands", () => {
    cli.loginAs("mock_admin");
    cli.run("fanz events list");
    cli.run("fanz sales summary --event EVT_100");
    const res = cli.run("fanz audit list");
    expect(res.status).toBe("ok");
    const rows = res.data as unknown[];
    // login + list + summary = 3 entries
    expect(rows.length).toBe(3);
  });

  test("activity history shows the 25 most recent entries", () => {
    cli.loginAs("mock_admin");
    for (let i = 0; i < 30; i++) {
      cli.run("fanz events list");
    }
    const res = cli.run("fanz audit list");
    expect((res.data as unknown[]).length).toBe(25);
  });

  test("activity history requires a logged-in user", () => {
    // no login
    const res = cli.run("fanz audit list");
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/Not logged in/);
  });

  test("reset requires confirmation", () => {
    cli.loginAs("mock_admin");
    const res = cli.run("fanz reset");
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/destructive/);
    expect((res.data as Record<string, unknown>)?.code).toBe("confirmation_required");
  });

  test("confirmed reset restores the starting data", () => {
    cli.loginAs("mock_admin");
    cli.run('fanz events create --name "ResetMe" --location "X"');
    expect(cli.state.events.length).toBeGreaterThan(1);
    const res = cli.run("fanz reset --yes");
    expect(res.status).toBe("ok");
    expect(cli.state.events.length).toBe(1);
    expect(cli.state.events[0].id).toBe("EVT_100");
    expect(cli.state.activeToken).toBeUndefined();
  });

  test("reset requires delete permission", () => {
    cli.loginAs("mock_ops");
    const res = cli.run("fanz reset --yes");
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/lacks delete permission/);
  });
});
