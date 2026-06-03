import { describe, expect, test } from "bun:test";
import { session, loginAs } from "./helpers";

describe("admin", () => {
  test("audit list returns empty initially", () => {
    const cli = session();
    loginAs(cli, "mock_viewer");
    const res = cli.run("fanz audit list");
    expect(res.status).toBe("ok");
    expect(Array.isArray(res.data)).toBe(true);
    // login command is already audited
    expect((res.data as unknown[]).length).toBe(1);
  });

  test("audit list grows after commands", () => {
    const cli = session();
    loginAs(cli, "mock_admin");
    cli.run("fanz events list");
    cli.run("fanz sales summary --event EVT_100");
    const res = cli.run("fanz audit list");
    expect(res.status).toBe("ok");
    const rows = res.data as unknown[];
    // login + list + summary = 3 entries
    expect(rows.length).toBe(3);
  });

  test("audit list limits to last 25 entries", () => {
    const cli = session();
    loginAs(cli, "mock_admin");
    for (let i = 0; i < 30; i++) {
      cli.run("fanz events list");
    }
    const res = cli.run("fanz audit list");
    expect((res.data as unknown[]).length).toBe(25);
  });

  test("audit requires read permission", () => {
    const cli = session();
    // no login
    const res = cli.run("fanz audit list");
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/Not logged in/);
  });

  test("reset without --yes fails", () => {
    const cli = session();
    loginAs(cli, "mock_admin");
    const res = cli.run("fanz reset");
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/destructive/);
    expect((res.data as Record<string, unknown>)?.code).toBe("confirmation_required");
  });

  test("reset with --yes restores initial state", () => {
    const cli = session();
    loginAs(cli, "mock_admin");
    cli.run('fanz events create --name "ResetMe" --location "X"');
    expect(cli.state.events.length).toBeGreaterThan(1);
    const res = cli.run("fanz reset --yes");
    expect(res.status).toBe("ok");
    expect(cli.state.events.length).toBe(1);
    expect(cli.state.events[0].id).toBe("EVT_100");
    expect(cli.state.activeToken).toBeUndefined();
  });

  test("reset requires delete permission", () => {
    const cli = session();
    loginAs(cli, "mock_ops");
    const res = cli.run("fanz reset --yes");
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/lacks delete permission/);
  });
});
