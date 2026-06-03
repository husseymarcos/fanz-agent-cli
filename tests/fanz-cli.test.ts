import { describe, expect, test } from "bun:test";
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

describe("fanz cli", () => {
  test("admin can create an event with a first date and ticket inventory", () => {
    const cli = session();
    expect(cli.run("fanz login --token mock_admin").status).toBe("ok");

    const response = cli.run(
      'fanz events create --name "Fiesta Demo" --location "C Complejo Art Media" --date 2026-07-20T23:00:00Z --ticket "General:10000:500" --status on_sale',
    );

    expect(response.status).toBe("ok");
    expect(response.message).toBe("Create event completed");

    const event = cli.state.events.find((item) => item.name === "Fiesta Demo");
    expect(event).toBeTruthy();
    expect(event!.status).toBe("on_sale");
    expect(cli.state.dates.filter((date) => date.eventId === event!.id).length).toBe(1);
    expect(cli.state.tickets.filter((ticket) => ticket.eventId === event!.id).length).toBe(1);
  });

  test("viewer can inspect sales but cannot create catalog content", () => {
    const cli = session();
    expect(cli.run("fanz login --token mock_viewer").status).toBe("ok");

    const summary = cli.run("fanz sales summary --event EVT_100");
    expect(summary.status).toBe("ok");
    expect(summary.data).toEqual({
      eventId: "EVT_100",
      orders: 2,
      issuedTickets: 3,
      revenueARS: 41000,
      stockTotal: 580,
      stockSold: 164,
      stockRemaining: 416,
    });

    const create = cli.run('fanz events create --name "Nope" --location "Backstage"');
    expect(create.status).toBe("error");
    expect(create.message).toMatch(/lacks write permission/);
    expect(cli.state.events.some((event) => event.name === "Nope")).toBe(false);
  });

  test("paid events are protected from destructive deletion", () => {
    const cli = session();
    expect(cli.run("fanz login --token mock_admin").status).toBe("ok");

    const response = cli.run("fanz events delete EVT_100 --yes");

    expect(response.status).toBe("error");
    expect(response.message).toMatch(/paid orders/);
    expect(cli.state.events.find((event) => event.id === "EVT_100")).toBeTruthy();
  });

  test("dry-run previews destructive deletion without changing catalog state", () => {
    const cli = session();
    expect(cli.run("fanz login --token mock_admin").status).toBe("ok");
    const create = cli.run('fanz events create --name "Dry Run Event" --location "Fanz Lab"');
    expect(create.status).toBe("ok");

    const event = cli.state.events.find((item) => item.name === "Dry Run Event");
    expect(event).toBeTruthy();
    const preview = cli.run(`fanz events delete ${event!.id} --dry-run`);

    expect(preview.status).toBe("dry-run");
    expect(cli.state.events.find((item) => item.id === event!.id)).toBeTruthy();
  });

  test("ops can resend tickets to a buyer email", () => {
    const cli = session();
    expect(cli.run("fanz login --token mock_ops").status).toBe("ok");

    const response = cli.run("fanz orders resend ORD_100 --email comprador@example.test");

    expect(response.status).toBe("ok");
    expect(response.data).toEqual({
      orderId: "ORD_100",
      sentTo: "comprador@example.test",
      ticketCount: 2,
      delivery: "mock_email",
    });
    expect(cli.state.orders.find((order) => order.id === "ORD_100")?.lastDeliveryAt).toBeTruthy();
  });
});
