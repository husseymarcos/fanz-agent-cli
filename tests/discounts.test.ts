import { beforeEach, describe, expect, test } from "bun:test";
import { session } from "./helpers";

describe("discounts", () => {
  let cli: ReturnType<typeof session>;

  beforeEach(() => {
    cli = session();
  });

  test("list discounts by event", () => {
    cli.loginAs("mock_viewer");
    const res = cli.run("fanz discounts list --event EVT_100");
    expect(res.status).toBe("ok");
    const rows = res.data as unknown[];
    expect(rows.length).toBe(1);
    expect((rows[0] as Record<string, unknown>).code).toBe("DEMO20");
  });

  test("create discount", () => {
    cli.loginAs("mock_admin");
    const res = cli.run('fanz discounts create --event EVT_100 --code SAVE10 --percent 10 --max-uses 50');
    expect(res.status).toBe("ok");
    const discount = cli.state.discounts.find((d) => d.code === "SAVE10");
    expect(discount).toBeTruthy();
    expect(discount?.percent).toBe(10);
    expect(discount?.maxUses).toBe(50);
    expect(discount?.uses).toBe(0);
  });

  test("create discount makes the code uppercase", () => {
    cli.loginAs("mock_admin");
    const res = cli.run('fanz discounts create --event EVT_100 --code lower --percent 5');
    expect(res.status).toBe("ok");
    const discount = cli.state.discounts.find((d) => d.code === "LOWER");
    expect(discount).toBeTruthy();
  });

  test("create discount refuses a repeated code for the same event", () => {
    cli.loginAs("mock_admin");
    const res = cli.run('fanz discounts create --event EVT_100 --code DEMO20 --percent 10');
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/already exists/);
  });

  test("create discount refuses a zero percent discount", () => {
    cli.loginAs("mock_admin");
    const res = cli.run('fanz discounts create --event EVT_100 --code BAD --percent 0');
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/percent must be between 1 and 100/);
  });

  test("create discount refuses discounts over 100 percent", () => {
    cli.loginAs("mock_admin");
    const res = cli.run('fanz discounts create --event EVT_100 --code BAD --percent 101');
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/percent must be between 1 and 100/);
  });

  test("create discount preview leaves discounts unchanged", () => {
    cli.loginAs("mock_admin");
    const before = cli.state.discounts.length;
    const res = cli.run('fanz discounts create --event EVT_100 --code GHOST --percent 5 --dry-run');
    expect(res.status).toBe("dry-run");
    expect(cli.state.discounts.length).toBe(before);
  });

  test("update discount percent and maximum uses", () => {
    cli.loginAs("mock_admin");
    const res = cli.run("fanz discounts update DSC_100 --percent 25 --max-uses 200");
    expect(res.status).toBe("ok");
    const discount = cli.state.discounts.find((d) => d.id === "DSC_100");
    expect(discount?.percent).toBe(25);
    expect(discount?.maxUses).toBe(200);
  });

  test("update discount preview leaves the discount unchanged", () => {
    cli.loginAs("mock_admin");
    const original = cli.state.discounts.find((d) => d.id === "DSC_100")!.percent;
    const res = cli.run("fanz discounts update DSC_100 --percent 99 --dry-run");
    expect(res.status).toBe("dry-run");
    expect(cli.state.discounts.find((d) => d.id === "DSC_100")!.percent).toBe(original);
  });

  test("unknown discount shows an error when updating", () => {
    cli.loginAs("mock_admin");
    const res = cli.run("fanz discounts update DSC_999 --percent 10");
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/Discount DSC_999 was not found/);
  });

  test("delete discount with uses is blocked", () => {
    cli.loginAs("mock_admin");
    const res = cli.run("fanz discounts delete DSC_100 --yes");
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/uses; pause it instead/);
  });

  test("delete discount with zero uses succeeds", () => {
    cli.loginAs("mock_admin");
    cli.run('fanz discounts create --event EVT_100 --code UNUSED --percent 5');
    const discount = cli.state.discounts.find((d) => d.code === "UNUSED")!;
    const res = cli.run(`fanz discounts delete ${discount.id} --yes`);
    expect(res.status).toBe("ok");
    expect(cli.state.discounts.find((d) => d.id === discount.id)).toBeFalsy();
  });

  test("delete discount requires confirmation", () => {
    cli.loginAs("mock_admin");
    cli.run('fanz discounts create --event EVT_100 --code UNUSED2 --percent 5');
    const discount = cli.state.discounts.find((d) => d.code === "UNUSED2")!;
    const res = cli.run(`fanz discounts delete ${discount.id}`);
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/destructive/);
  });

  test("delete discount preview leaves discounts unchanged", () => {
    cli.loginAs("mock_admin");
    cli.run('fanz discounts create --event EVT_100 --code UNUSED3 --percent 5');
    const discount = cli.state.discounts.find((d) => d.code === "UNUSED3")!;
    const before = cli.state.discounts.length;
    const res = cli.run(`fanz discounts delete ${discount.id} --dry-run`);
    expect(res.status).toBe("dry-run");
    expect(cli.state.discounts.length).toBe(before);
  });

  test("invalid discount status shows an error", () => {
    cli.loginAs("mock_admin");
    const res = cli.run('fanz discounts create --event EVT_100 --code BAD --percent 10 --status invalid');
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/Invalid discount status/);
  });
});
