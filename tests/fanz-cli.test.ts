import assert from "node:assert/strict";
import test from "node:test";
import { createInitialState } from "../lib/fanz-cli/data";
import { runCli } from "../lib/fanz-cli/engine";
import type { CliResponse, FanzState } from "../lib/fanz-cli/types";

type CliSession = {
  state: FanzState;
  run: (command: string) => CliResponse;
};

function session(): CliSession {
  const cli = {
    state: createInitialState(),
    run(command: string) {
      const result = runCli(command, cli.state);
      cli.state = result.state;
      return result.response;
    },
  };
  return cli;
}

test("admin can create an event with a first date and ticket inventory", () => {
  const cli = session();
  assert.equal(cli.run("fanz login --token mock_admin").status, "ok");

  const response = cli.run(
    'fanz events create --name "Fiesta Demo" --location "C Complejo Art Media" --date 2026-07-20T23:00:00Z --ticket "General:10000:500" --status on_sale',
  );

  assert.equal(response.status, "ok");
  assert.equal(response.message, "Create event completed");

  const event = cli.state.events.find((item) => item.name === "Fiesta Demo");
  assert.ok(event);
  assert.equal(event.status, "on_sale");
  assert.equal(cli.state.dates.filter((date) => date.eventId === event.id).length, 1);
  assert.equal(cli.state.tickets.filter((ticket) => ticket.eventId === event.id).length, 1);
});

test("viewer can inspect sales but cannot create catalog content", () => {
  const cli = session();
  assert.equal(cli.run("fanz login --token mock_viewer").status, "ok");

  const summary = cli.run("fanz sales summary --event EVT_100");
  assert.equal(summary.status, "ok");
  assert.deepEqual(summary.data, {
    eventId: "EVT_100",
    orders: 2,
    issuedTickets: 3,
    revenueARS: 41000,
    stockTotal: 580,
    stockSold: 164,
    stockRemaining: 416,
  });

  const create = cli.run('fanz events create --name "Nope" --location "Backstage"');
  assert.equal(create.status, "error");
  assert.match(create.message, /lacks write permission/);
  assert.equal(cli.state.events.some((event) => event.name === "Nope"), false);
});

test("paid events are protected from destructive deletion", () => {
  const cli = session();
  assert.equal(cli.run("fanz login --token mock_admin").status, "ok");

  const response = cli.run("fanz events delete EVT_100 --yes");

  assert.equal(response.status, "error");
  assert.match(response.message, /paid orders/);
  assert.ok(cli.state.events.find((event) => event.id === "EVT_100"));
});

test("dry-run previews destructive deletion without changing catalog state", () => {
  const cli = session();
  assert.equal(cli.run("fanz login --token mock_admin").status, "ok");
  const create = cli.run('fanz events create --name "Dry Run Event" --location "Fanz Lab"');
  assert.equal(create.status, "ok");

  const event = cli.state.events.find((item) => item.name === "Dry Run Event");
  assert.ok(event);
  const preview = cli.run(`fanz events delete ${event.id} --dry-run`);

  assert.equal(preview.status, "dry-run");
  assert.ok(cli.state.events.find((item) => item.id === event.id));
});

test("ops can resend tickets to a buyer email", () => {
  const cli = session();
  assert.equal(cli.run("fanz login --token mock_ops").status, "ok");

  const response = cli.run("fanz orders resend ORD_100 --email comprador@example.test");

  assert.equal(response.status, "ok");
  assert.deepEqual(response.data, {
    orderId: "ORD_100",
    sentTo: "comprador@example.test",
    ticketCount: 2,
    delivery: "mock_email",
  });
  assert.ok(cli.state.orders.find((order) => order.id === "ORD_100")?.lastDeliveryAt);
});
