import { describe, expect, test } from "bun:test";
import { session, loginAs } from "./helpers";

describe("discounts", () => {
  test("list discounts by event", () => {
    const cli = session();
    loginAs(cli, "mock_viewer");
    const res = cli.run("fanz discounts list --event EVT_100");
    expect(res.status).toBe("ok");
    const rows = res.data as unknown[];
    expect(rows.length).toBe(1);
    expect((rows[0] as Record<string, unknown>).code).toBe("DEMO20");
  });

  test("create discount", () => {
    const cli = session();
    loginAs(cli, "mock_admin");
    const res = cli.run('fanz discounts create --event EVT_100 --code SAVE10 --percent 10 --max-uses 50');
    expect(res.status).toBe("ok");
    const discount = cli.state.discounts.find((d) => d.code === "SAVE10");
    expect(discount).toBeTruthy();
    expect(discount?.percent).toBe(10);
    expect(discount?.maxUses).toBe(50);
    expect(discount?.uses).toBe(0);
  });

  test("create discount code is uppercased", () => {
    const cli = session();
    loginAs(cli, "mock_admin");
    const res = cli.run('fanz discounts create --event EVT_100 --code lower --percent 5');
    expect(res.status).toBe("ok");
    const discount = cli.state.discounts.find((d) => d.code === "LOWER");
    expect(discount).toBeTruthy();
  });

  test("create discount rejects duplicate code for same event", () => {
    const cli = session();
    loginAs(cli, "mock_admin");
    const res = cli.run('fanz discounts create --event EVT_100 --code DEMO20 --percent 10');
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/already exists/);
  });

  test("create discount rejects percent <= 0", () => {
    const cli = session();
    loginAs(cli, "mock_admin");
    const res = cli.run('fanz discounts create --event EVT_100 --code BAD --percent 0');
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/percent must be between 1 and 100/);
  });

  test("create discount rejects percent > 100", () => {
    const cli = session();
    loginAs(cli, "mock_admin");
    const res = cli.run('fanz discounts create --event EVT_100 --code BAD --percent 101');
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/percent must be between 1 and 100/);
  });

  test("create discount dry-run does not mutate", () => {
    const cli = session();
    loginAs(cli, "mock_admin");
    const before = cli.state.discounts.length;
    const res = cli.run('fanz discounts create --event EVT_100 --code GHOST --percent 5 --dry-run');
    expect(res.status).toBe("dry-run");
    expect(cli.state.discounts.length).toBe(before);
  });

  test("update discount percent and max-uses", () => {
    const cli = session();
    loginAs(cli, "mock_admin");
    const res = cli.run("fanz discounts update DSC_100 --percent 25 --max-uses 200");
    expect(res.status).toBe("ok");
    const discount = cli.state.discounts.find((d) => d.id === "DSC_100");
    expect(discount?.percent).toBe(25);
    expect(discount?.maxUses).toBe(200);
  });

  test("update discount dry-run does not mutate", () => {
    const cli = session();
    loginAs(cli, "mock_admin");
    const original = cli.state.discounts.find((d) => d.id === "DSC_100")!.percent;
    const res = cli.run("fanz discounts update DSC_100 --percent 99 --dry-run");
    expect(res.status).toBe("dry-run");
    expect(cli.state.discounts.find((d) => d.id === "DSC_100")!.percent).toBe(original);
  });

  test("update non-existent discount throws", () => {
    const cli = session();
    loginAs(cli, "mock_admin");
    const res = cli.run("fanz discounts update DSC_999 --percent 10");
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/Discount DSC_999 was not found/);
  });

  test("delete discount with uses is blocked", () => {
    const cli = session();
    loginAs(cli, "mock_admin");
    const res = cli.run("fanz discounts delete DSC_100 --yes");
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/uses; pause it instead/);
  });

  test("delete discount with zero uses succeeds", () => {
    const cli = session();
    loginAs(cli, "mock_admin");
    cli.run('fanz discounts create --event EVT_100 --code UNUSED --percent 5');
    const discount = cli.state.discounts.find((d) => d.code === "UNUSED")!;
    const res = cli.run(`fanz discounts delete ${discount.id} --yes`);
    expect(res.status).toBe("ok");
    expect(cli.state.discounts.find((d) => d.id === discount.id)).toBeFalsy();
  });

  test("delete discount requires confirmation", () => {
    const cli = session();
    loginAs(cli, "mock_admin");
    cli.run('fanz discounts create --event EVT_100 --code UNUSED2 --percent 5');
    const discount = cli.state.discounts.find((d) => d.code === "UNUSED2")!;
    const res = cli.run(`fanz discounts delete ${discount.id}`);
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/destructive/);
  });

  test("delete discount dry-run previews without mutating", () => {
    const cli = session();
    loginAs(cli, "mock_admin");
    cli.run('fanz discounts create --event EVT_100 --code UNUSED3 --percent 5');
    const discount = cli.state.discounts.find((d) => d.code === "UNUSED3")!;
    const before = cli.state.discounts.length;
    const res = cli.run(`fanz discounts delete ${discount.id} --dry-run`);
    expect(res.status).toBe("dry-run");
    expect(cli.state.discounts.length).toBe(before);
  });

  test("invalid discount status throws", () => {
    const cli = session();
    loginAs(cli, "mock_admin");
    const res = cli.run('fanz discounts create --event EVT_100 --code BAD --percent 10 --status invalid');
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/Invalid discount status/);
  });
});
