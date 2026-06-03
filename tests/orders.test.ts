import { describe, expect, test } from "bun:test";
import { session, loginAs } from "./helpers";

describe("orders", () => {
  test("show returns order with issued tickets", () => {
    const cli = session();
    loginAs(cli, "mock_viewer");
    const res = cli.run("fanz orders show ORD_100");
    expect(res.status).toBe("ok");
    const data = res.data as Record<string, unknown>;
    expect(data.id).toBe("ORD_100");
    expect(data.buyerName).toBe("Luna Perez");
    expect(data.tickets).toBe(2);
    expect(Array.isArray(data.issuedTickets)).toBe(true);
    expect((data.issuedTickets as unknown[]).length).toBe(2);
  });

  test("show non-existent order throws", () => {
    const cli = session();
    loginAs(cli, "mock_viewer");
    const res = cli.run("fanz orders show ORD_999");
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/Order ORD_999 was not found/);
  });

  test("resend paid order updates lastDeliveryAt", () => {
    const cli = session();
    loginAs(cli, "mock_ops");
    const before = cli.state.orders.find((o) => o.id === "ORD_100")?.lastDeliveryAt;
    const res = cli.run("fanz orders resend ORD_100 --email comprador@example.test");
    expect(res.status).toBe("ok");
    expect(res.data).toEqual({
      orderId: "ORD_100",
      sentTo: "comprador@example.test",
      ticketCount: 2,
      delivery: "mock_email",
    });
    const after = cli.state.orders.find((o) => o.id === "ORD_100")?.lastDeliveryAt;
    expect(after).toBeTruthy();
    expect(after).not.toBe(before);
  });

  test("resend without --email uses buyer email", () => {
    const cli = session();
    loginAs(cli, "mock_ops");
    const res = cli.run("fanz orders resend ORD_101");
    expect(res.status).toBe("ok");
    expect((res.data as Record<string, unknown>).sentTo).toBe("mateo@example.test");
  });

  test("resend non-paid order is blocked", () => {
    const cli = session();
    loginAs(cli, "mock_ops");
    // Mutate an order to pending (since we can't create orders via CLI)
    const order = cli.state.orders.find((o) => o.id === "ORD_101")!;
    order.status = "pending";
    const res = cli.run("fanz orders resend ORD_101");
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/Only paid orders can be resent/);
    // restore
    order.status = "paid";
  });

  test("resend dry-run does not mutate", () => {
    const cli = session();
    loginAs(cli, "mock_ops");
    const before = cli.state.orders.find((o) => o.id === "ORD_100")?.lastDeliveryAt;
    const res = cli.run("fanz orders resend ORD_100 --dry-run");
    expect(res.status).toBe("dry-run");
    const after = cli.state.orders.find((o) => o.id === "ORD_100")?.lastDeliveryAt;
    expect(after).toBe(before);
  });

  test("resend non-existent order throws", () => {
    const cli = session();
    loginAs(cli, "mock_ops");
    const res = cli.run("fanz orders resend ORD_999");
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/Order ORD_999 was not found/);
  });
});
