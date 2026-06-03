import { beforeEach, describe, expect, test } from "bun:test";
import { createInitialState } from "../lib/data";
import { CliSession } from "../lib/engine";
import { session } from "./helpers";

describe("orders", () => {
  let cli: ReturnType<typeof session>;

  beforeEach(() => {
    cli = session();
  });

  test("show order includes the buyer and issued tickets", () => {
    cli.loginAs("mock_viewer");
    const res = cli.run("fanz orders show ORD_100");
    expect(res.status).toBe("ok");
    const data = res.data as Record<string, unknown>;
    expect(data.id).toBe("ORD_100");
    expect(data.buyerName).toBe("Luna Perez");
    expect(data.tickets).toBe(2);
    expect(Array.isArray(data.issuedTickets)).toBe(true);
    expect((data.issuedTickets as unknown[]).length).toBe(2);
  });

  test("unknown order shows an error", () => {
    cli.loginAs("mock_viewer");
    const res = cli.run("fanz orders show ORD_999");
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/Order ORD_999 was not found/);
  });

  test("resend paid order records the latest delivery time", () => {
    cli.loginAs("mock_ops");
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

  test("resend uses the buyer email when no email is provided", () => {
    cli.loginAs("mock_ops");
    const res = cli.run("fanz orders resend ORD_101");
    expect(res.status).toBe("ok");
    expect((res.data as Record<string, unknown>).sentTo).toBe("mateo@example.test");
  });

  test("resend non-paid order is blocked", () => {
    const state = createInitialState();
    state.activeToken = "mock_ops";
    const order = state.orders.find((o) => o.id === "ORD_101")!;
    order.status = "pending";
    const engine = CliSession.withState(state);
    const res = engine.run("fanz orders resend ORD_101");
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/Only paid orders can be resent/);
  });

  test("resend preview leaves the delivery time unchanged", () => {
    cli.loginAs("mock_ops");
    const before = cli.state.orders.find((o) => o.id === "ORD_100")?.lastDeliveryAt;
    const res = cli.run("fanz orders resend ORD_100 --dry-run");
    expect(res.status).toBe("dry-run");
    const after = cli.state.orders.find((o) => o.id === "ORD_100")?.lastDeliveryAt;
    expect(after).toBe(before);
  });

  test("unknown order shows an error when resending", () => {
    cli.loginAs("mock_ops");
    const res = cli.run("fanz orders resend ORD_999");
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/Order ORD_999 was not found/);
  });
});
