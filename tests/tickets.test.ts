import { beforeEach, describe, expect, test } from "bun:test";
import { session } from "./helpers";

describe("tickets", () => {
  let cli: ReturnType<typeof session>;

  beforeEach(() => {
    cli = session();
  });

  test("list tickets by event", () => {
    cli.loginAs("mock_viewer");
    const res = cli.run("fanz tickets list --event EVT_100");
    expect(res.status).toBe("ok");
    const rows = res.data as unknown[];
    expect(rows.length).toBe(2);
  });

  test("create ticket", () => {
    cli.loginAs("mock_admin");
    const res = cli.run('fanz tickets create --event EVT_100 --name "Platea" --price 15000 --stock 200');
    expect(res.status).toBe("ok");
    const ticket = cli.state.tickets.find((t) => t.name === "Platea");
    expect(ticket).toBeTruthy();
    expect(ticket?.price.amount).toBe(15000);
    expect(ticket?.stock).toBe(200);
    expect(ticket?.sold).toBe(0);
  });

  test("create ticket with status", () => {
    cli.loginAs("mock_admin");
    const res = cli.run('fanz tickets create --event EVT_100 --name "Early" --price 5000 --stock 50 --status paused');
    expect(res.status).toBe("ok");
    const ticket = cli.state.tickets.find((t) => t.name === "Early");
    expect(ticket?.status).toBe("paused");
  });

  test("create ticket preview leaves tickets unchanged", () => {
    cli.loginAs("mock_admin");
    const before = cli.state.tickets.length;
    const res = cli.run('fanz tickets create --event EVT_100 --name "Ghost" --price 1 --stock 1 --dry-run');
    expect(res.status).toBe("dry-run");
    expect(cli.state.tickets.length).toBe(before);
  });

  test("create ticket refuses a negative price", () => {
    cli.loginAs("mock_admin");
    const res = cli.run('fanz tickets create --event EVT_100 --name "Bad" --price -1 --stock 10');
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/price must be 0 or greater/);
  });

  test("create ticket refuses negative stock", () => {
    cli.loginAs("mock_admin");
    const res = cli.run('fanz tickets create --event EVT_100 --name "Bad" --price 1000 --stock -5');
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/stock must be a non-negative integer/);
  });

  test("create ticket warns when the name is missing", () => {
    cli.loginAs("mock_admin");
    const res = cli.run("fanz tickets create --event EVT_100 --price 1000 --stock 10");
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/Missing required flag --name/);
  });

  test("create ticket warns when the price is missing", () => {
    cli.loginAs("mock_admin");
    const res = cli.run('fanz tickets create --event EVT_100 --name "Bad" --stock 10');
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/Missing required flag --price/);
  });

  test("create ticket warns when the stock is missing", () => {
    cli.loginAs("mock_admin");
    const res = cli.run('fanz tickets create --event EVT_100 --name "Bad" --price 1000');
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/Missing required flag --stock/);
  });

  test("update ticket price and stock", () => {
    cli.loginAs("mock_admin");
    const res = cli.run("fanz tickets update TCK_100 --price 12000 --stock 450");
    expect(res.status).toBe("ok");
    const ticket = cli.state.tickets.find((t) => t.id === "TCK_100");
    expect(ticket?.price.amount).toBe(12000);
    expect(ticket?.stock).toBe(450);
  });

  test("update ticket refuses stock below sold tickets", () => {
    cli.loginAs("mock_admin");
    const res = cli.run("fanz tickets update TCK_100 --stock 10");
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/stock must be an integer >= sold/);
  });

  test("update ticket refuses a negative price", () => {
    cli.loginAs("mock_admin");
    const res = cli.run("fanz tickets update TCK_100 --price -5");
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/price must be 0 or greater/);
  });

  test("failed update ticket preview leaves state unchanged", () => {
    cli.loginAs("mock_admin");
    const original = cli.state.tickets.find((t) => t.id === "TCK_100")!.name;
    const res = cli.run('fanz tickets update TCK_100 --name "Mutated" --price -5 --dry-run');
    expect(res.status).toBe("error");
    expect(cli.state.tickets.find((t) => t.id === "TCK_100")!.name).toBe(original);
  });

  test("update ticket preview leaves the ticket unchanged", () => {
    cli.loginAs("mock_admin");
    const original = cli.state.tickets.find((t) => t.id === "TCK_100")!.price.amount;
    const res = cli.run("fanz tickets update TCK_100 --price 99999 --dry-run");
    expect(res.status).toBe("dry-run");
    expect(cli.state.tickets.find((t) => t.id === "TCK_100")!.price.amount).toBe(original);
  });

  test("unknown ticket shows an error when updating", () => {
    cli.loginAs("mock_admin");
    const res = cli.run("fanz tickets update TCK_999 --price 100");
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/Ticket TCK_999 was not found/);
  });

  test("delete ticket with sold units is blocked", () => {
    cli.loginAs("mock_admin");
    const res = cli.run("fanz tickets delete TCK_100 --yes");
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/sold units/);
  });

  test("delete ticket with zero sold succeeds", () => {
    cli.loginAs("mock_admin");
    cli.run('fanz tickets create --event EVT_100 --name "Fresh" --price 1000 --stock 10');
    const ticket = cli.state.tickets.find((t) => t.name === "Fresh")!;
    const res = cli.run(`fanz tickets delete ${ticket.id} --yes`);
    expect(res.status).toBe("ok");
    expect(cli.state.tickets.find((t) => t.id === ticket.id)).toBeFalsy();
  });

  test("delete ticket requires confirmation", () => {
    cli.loginAs("mock_admin");
    cli.run('fanz tickets create --event EVT_100 --name "Fresh2" --price 1000 --stock 10');
    const ticket = cli.state.tickets.find((t) => t.name === "Fresh2")!;
    const res = cli.run(`fanz tickets delete ${ticket.id}`);
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/destructive/);
  });

  test("delete ticket preview leaves tickets unchanged", () => {
    cli.loginAs("mock_admin");
    cli.run('fanz tickets create --event EVT_100 --name "Fresh3" --price 1000 --stock 10');
    const ticket = cli.state.tickets.find((t) => t.name === "Fresh3")!;
    const before = cli.state.tickets.length;
    const res = cli.run(`fanz tickets delete ${ticket.id} --dry-run`);
    expect(res.status).toBe("dry-run");
    expect(cli.state.tickets.length).toBe(before);
  });

  test("ticket list shows remaining stock", () => {
    cli.loginAs("mock_viewer");
    const res = cli.run("fanz tickets list --event EVT_100");
    expect(res.status).toBe("ok");
    const rows = res.data as Record<string, unknown>[];
    const general = rows.find((r) => r.name === "General")!;
    expect(general.stock).toBe(500);
    expect(general.sold).toBe(143);
    expect(general.remaining).toBe(357);
  });

  test("invalid ticket status shows an error", () => {
    cli.loginAs("mock_admin");
    const res = cli.run('fanz tickets create --event EVT_100 --name "Bad" --price 1000 --stock 10 --status invalid');
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/Invalid ticket status/);
  });
});
