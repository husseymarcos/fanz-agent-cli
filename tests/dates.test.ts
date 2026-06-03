import { beforeEach, describe, expect, test } from "bun:test";
import { session } from "./helpers";

describe("dates", () => {
  let cli: ReturnType<typeof session>;

  beforeEach(() => {
    cli = session();
  });

  test("list dates by event", () => {
    cli.loginAs("mock_viewer");
    const res = cli.run("fanz dates list --event EVT_100");
    expect(res.status).toBe("ok");
    expect(Array.isArray(res.data)).toBe(true);
    expect((res.data as unknown[]).length).toBe(2);
  });

  test("list dates when the event is named after the command", () => {
    cli.loginAs("mock_viewer");
    const res = cli.run("fanz dates list EVT_100");
    expect(res.status).toBe("ok");
    expect((res.data as unknown[]).length).toBe(2);
  });

  test("list dates shows an error for an unknown event", () => {
    cli.loginAs("mock_viewer");
    const res = cli.run("fanz dates list --event EVT_999");
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/Event EVT_999 was not found/);
  });

  test("create date", () => {
    cli.loginAs("mock_admin");
    const res = cli.run("fanz dates create --event EVT_100 --starts 2026-10-01T21:00:00Z --venue ");
    expect(res.status).toBe("ok");
    expect(cli.state.dates.some((d) => d.eventId === "EVT_100" && d.startsAt === "2026-10-01T21:00:00.000Z")).toBe(true);
  });

  test("create date with doors", () => {
    cli.loginAs("mock_admin");
    const res = cli.run("fanz dates create --event EVT_100 --starts 2026-10-02T21:00:00Z --doors 2026-10-02T20:00:00Z");
    expect(res.status).toBe("ok");
    const date = cli.state.dates.find((d) => d.startsAt === "2026-10-02T21:00:00.000Z");
    expect(date?.doorsAt).toBe("2026-10-02T20:00:00.000Z");
  });

  test("create date preview leaves dates unchanged", () => {
    cli.loginAs("mock_admin");
    const before = cli.state.dates.length;
    const res = cli.run("fanz dates create --event EVT_100 --starts 2026-10-03T21:00:00Z --dry-run");
    expect(res.status).toBe("dry-run");
    expect(cli.state.dates.length).toBe(before);
  });

  test("create date shows an error for an unknown event", () => {
    cli.loginAs("mock_admin");
    const res = cli.run("fanz dates create --event EVT_999 --starts 2026-10-01T21:00:00Z");
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/Event EVT_999 was not found/);
  });

  test("create date shows an error for an invalid date", () => {
    cli.loginAs("mock_admin");
    const res = cli.run("fanz dates create --event EVT_100 --starts not-a-date");
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/Invalid date/);
  });

  test("update date venue and status", () => {
    cli.loginAs("mock_admin");
    const res = cli.run('fanz dates update DAT_100 --venue "New Venue" --status paused');
    expect(res.status).toBe("ok");
    const date = cli.state.dates.find((d) => d.id === "DAT_100");
    expect(date?.venue).toBe("New Venue");
    expect(date?.status).toBe("paused");
  });

  test("update date preview leaves the date unchanged", () => {
    cli.loginAs("mock_admin");
    const original = cli.state.dates.find((d) => d.id === "DAT_100")!.venue;
    const res = cli.run('fanz dates update DAT_100 --venue "Ghost" --dry-run');
    expect(res.status).toBe("dry-run");
    expect(cli.state.dates.find((d) => d.id === "DAT_100")!.venue).toBe(original);
  });

  test("unknown date shows an error when updating", () => {
    cli.loginAs("mock_admin");
    const res = cli.run("fanz dates update DAT_999 --venue X");
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/Date DAT_999 was not found/);
  });

  test("confirmed date deletion removes the date", () => {
    cli.loginAs("mock_admin");
    const before = cli.state.dates.length;
    const res = cli.run("fanz dates delete DAT_100 --yes");
    expect(res.status).toBe("ok");
    expect(cli.state.dates.length).toBe(before - 1);
    expect(cli.state.dates.find((d) => d.id === "DAT_100")).toBeFalsy();
  });

  test("delete date requires confirmation", () => {
    cli.loginAs("mock_admin");
    const res = cli.run("fanz dates delete DAT_101");
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/destructive/);
  });

  test("delete date preview leaves dates unchanged", () => {
    cli.loginAs("mock_admin");
    const before = cli.state.dates.length;
    const res = cli.run("fanz dates delete DAT_101 --dry-run");
    expect(res.status).toBe("dry-run");
    expect(cli.state.dates.length).toBe(before);
  });
});
