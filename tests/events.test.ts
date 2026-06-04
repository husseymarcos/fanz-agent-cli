import { beforeEach, describe, expect, test } from "bun:test";
import { session } from "./helpers";

describe("events", () => {
  let cli: ReturnType<typeof session>;

  beforeEach(() => {
    cli = session();
  });

  test("list shows the starting event", () => {
    cli.loginAs("mock_viewer");
    const res = cli.run("fanz events list");
    expect(res.status).toBe("ok");
    expect(Array.isArray(res.data)).toBe(true);
    expect((res.data as unknown[]).length).toBe(1);
  });

  test("create event with the required details", () => {
    cli.loginAs("mock_admin");
    const res = cli.run('fanz events create --name "Fiesta" --location "Club"');
    expect(res.status).toBe("ok");
    const event = cli.state.events.find((e) => e.name === "Fiesta");
    expect(event).toBeTruthy();
    expect(event?.status).toBe("draft");
  });

  test("create event with date and ticket", () => {
    cli.loginAs("mock_admin");
    const res = cli.run(
      'fanz events create --name "Combo" --location "Arena" --date 2026-08-01T20:00:00Z --ticket "VIP:20000:100" --status on_sale',
    );
    expect(res.status).toBe("ok");
    const event = cli.state.events.find((e) => e.name === "Combo");
    expect(event).toBeTruthy();
    expect(cli.state.dates.filter((d) => d.eventId === event!.id).length).toBe(1);
    expect(cli.state.tickets.filter((t) => t.eventId === event!.id).length).toBe(1);
  });

  test("create event warns when ticket details are incomplete", () => {
    cli.loginAs("mock_admin");
    const res = cli.run('fanz events create --name "Bad" --location "X" --ticket "Oops"');
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/Name:price:stock/);
  });

  test("failed create event preview leaves state unchanged", () => {
    cli.loginAs("mock_admin");
    const before = cli.state.events.length;
    const res = cli.run('fanz events create --name "Bad" --location "X" --date nope --dry-run');
    expect(res.status).toBe("error");
    expect(cli.state.events.length).toBe(before);
    expect(cli.state.events.some((e) => e.name === "Bad")).toBe(false);
  });

  test("create event preview leaves events unchanged", () => {
    cli.loginAs("mock_admin");
    const before = cli.state.events.length;
    const res = cli.run('fanz events create --name "Ghost" --location "Void" --dry-run');
    expect(res.status).toBe("dry-run");
    expect(cli.state.events.length).toBe(before);
  });

  test("update event name and status", () => {
    cli.loginAs("mock_admin");
    const res = cli.run('fanz events update EVT_100 --name "Updated" --status paused');
    expect(res.status).toBe("ok");
    const event = cli.state.events.find((e) => e.id === "EVT_100");
    expect(event?.name).toBe("Updated");
    expect(event?.status).toBe("paused");
  });

  test("update event preview leaves the event unchanged", () => {
    cli.loginAs("mock_admin");
    const original = cli.state.events.find((e) => e.id === "EVT_100")!.name;
    const res = cli.run('fanz events update EVT_100 --name "Ghost" --dry-run');
    expect(res.status).toBe("dry-run");
    expect(cli.state.events.find((e) => e.id === "EVT_100")!.name).toBe(original);
  });

  test("pause event", () => {
    cli.loginAs("mock_admin");
    const res = cli.run("fanz events pause EVT_100");
    expect(res.status).toBe("ok");
    expect(cli.state.events.find((e) => e.id === "EVT_100")?.status).toBe("paused");
  });

  test("resume event", () => {
    cli.loginAs("mock_admin");
    cli.run("fanz events pause EVT_100");
    const res = cli.run("fanz events resume EVT_100");
    expect(res.status).toBe("ok");
    expect(cli.state.events.find((e) => e.id === "EVT_100")?.status).toBe("on_sale");
  });

  test("duplicate event starts a fresh copy of dates, tickets and discounts", () => {
    cli.loginAs("mock_admin");
    const res = cli.run("fanz events duplicate EVT_100");
    expect(res.status).toBe("ok");
    const copy = cli.state.events.find((e) => e.name === "Demo Night copy");
    expect(copy).toBeTruthy();
    expect(copy?.status).toBe("draft");
    expect(cli.state.dates.filter((d) => d.eventId === copy!.id).length).toBe(2);
    expect(cli.state.tickets.filter((t) => t.eventId === copy!.id).length).toBe(2);
    const copiedTickets = cli.state.tickets.filter((t) => t.eventId === copy!.id);
    expect(copiedTickets.every((t) => t.sold === 0)).toBe(true);
    const copiedDiscounts = cli.state.discounts.filter((d) => d.eventId === copy!.id);
    expect(copiedDiscounts.length).toBe(1);
    expect(copiedDiscounts[0].uses).toBe(0);
    expect(copiedDiscounts[0].status).toBe("paused");
  });

  test("duplicate event with custom name", () => {
    cli.loginAs("mock_admin");
    const res = cli.run('fanz events duplicate EVT_100 --name "Custom Copy"');
    expect(res.status).toBe("ok");
    expect(cli.state.events.some((e) => e.name === "Custom Copy")).toBe(true);
  });

  test("duplicate event preview leaves events unchanged", () => {
    cli.loginAs("mock_admin");
    const before = cli.state.events.length;
    const res = cli.run("fanz events duplicate EVT_100 --dry-run");
    expect(res.status).toBe("dry-run");
    expect(cli.state.events.length).toBe(before);
  });

  test("delete event requires confirmation", () => {
    cli.loginAs("mock_admin");
    const res = cli.run('fanz events create --name "Del" --location "X"');
    expect(res.status).toBe("ok");
    const event = cli.state.events.find((e) => e.name === "Del")!;
    const del = cli.run(`fanz events delete ${event.id}`);
    expect(del.status).toBe("error");
    expect(del.message).toMatch(/destructive/);
    expect(cli.state.events.find((e) => e.id === event.id)).toBeTruthy();
  });

  test("confirmed event deletion removes related dates, tickets and discounts", () => {
    cli.loginAs("mock_admin");
    cli.run('fanz events create --name "DelYes" --location "X"');
    const event = cli.state.events.find((e) => e.name === "DelYes")!;
    cli.run(`fanz dates create --event ${event.id} --starts 2026-09-01T20:00:00Z`);
    cli.run(`fanz tickets create --event ${event.id} --name "T" --price 1000 --stock 10`);
    cli.run(`fanz discounts create --event ${event.id} --code DEL10 --percent 10`);

    const del = cli.run(`fanz events delete ${event.id} --yes`);
    expect(del.status).toBe("ok");
    expect(cli.state.events.find((e) => e.id === event.id)).toBeFalsy();
    expect(cli.state.dates.some((d) => d.eventId === event.id)).toBe(false);
    expect(cli.state.tickets.some((t) => t.eventId === event.id)).toBe(false);
    expect(cli.state.discounts.some((d) => d.eventId === event.id)).toBe(false);
  });

  test("delete event with paid orders is blocked", () => {
    cli.loginAs("mock_admin");
    const res = cli.run("fanz events delete EVT_100 --yes");
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/paid orders/);
    expect(cli.state.events.find((e) => e.id === "EVT_100")).toBeTruthy();
  });

  test("delete event preview leaves events unchanged", () => {
    cli.loginAs("mock_admin");
    cli.run('fanz events create --name "Dry" --location "X"');
    const event = cli.state.events.find((e) => e.name === "Dry")!;
    const before = cli.state.events.length;
    const del = cli.run(`fanz events delete ${event.id} --dry-run`);
    expect(del.status).toBe("dry-run");
    expect(cli.state.events.length).toBe(before);
  });

  test("event list shows revenue and totals", () => {
    cli.loginAs("mock_viewer");
    const res = cli.run("fanz events list");
    expect(res.status).toBe("ok");
    const view = (res.data as unknown[])[0] as Record<string, unknown>;
    expect(view.revenueARS).toBe(41000);
    expect(view.dates).toBe(2);
    expect(view.ticketTypes).toBe(2);
  });

  test("invalid event status shows an error", () => {
    cli.loginAs("mock_admin");
    const res = cli.run('fanz events update EVT_100 --status invalid_status');
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/Invalid status/);
  });

  test("missing event id shows an error", () => {
    cli.loginAs("mock_admin");
    const res = cli.run('fanz events update --name "X"');
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/Missing event id/);
  });

  test("unknown event shows an error", () => {
    cli.loginAs("mock_admin");
    const res = cli.run("fanz events update EVT_999 --name X");
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/Event EVT_999 was not found/);
  });
});
