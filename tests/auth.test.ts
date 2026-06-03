import { describe, expect, test } from "bun:test";
import { session, loginAs } from "./helpers";

describe("auth", () => {
  describe("login", () => {
    test("admin token succeeds", () => {
      const cli = session();
      const res = cli.run("fanz login --token mock_admin");
      expect(res.status).toBe("ok");
      expect(res.data).toMatchObject({ token: "mock_admin", permissions: expect.arrayContaining(["read", "write", "delete"]) });
    });

    test("ops token succeeds", () => {
      const cli = session();
      const res = cli.run("fanz login --token mock_ops");
      expect(res.status).toBe("ok");
      expect(res.data).toMatchObject({ token: "mock_ops", permissions: expect.arrayContaining(["read", "write"]) });
    });

    test("viewer token succeeds", () => {
      const cli = session();
      const res = cli.run("fanz login --token mock_viewer");
      expect(res.status).toBe("ok");
      expect(res.data).toMatchObject({ token: "mock_viewer", permissions: ["read"] });
    });

    test("invalid token fails", () => {
      const cli = session();
      const res = cli.run("fanz login --token bad_token");
      expect(res.status).toBe("error");
      expect(res.message).toMatch(/Invalid mock token/);
      expect((res.data as Record<string, unknown>)?.code).toBe("auth_error");
    });

    test("missing token flag fails", () => {
      const cli = session();
      const res = cli.run("fanz login");
      expect(res.status).toBe("error");
      expect(res.message).toMatch(/Missing required flag --token/);
    });
  });

  describe("whoami", () => {
    test("returns active session after login", () => {
      const cli = session();
      loginAs(cli, "mock_admin");
      const res = cli.run("fanz auth whoami");
      expect(res.status).toBe("ok");
      expect(res.data).toMatchObject({ token: expect.objectContaining({ token: "mock_admin" }) });
    });

    test("fails when not logged in", () => {
      const cli = session();
      const res = cli.run("fanz auth whoami");
      expect(res.status).toBe("error");
      expect(res.message).toMatch(/Not logged in/);
      expect((res.data as Record<string, unknown>)?.code).toBe("auth_required");
    });
  });

  describe("permissions", () => {
    test("viewer cannot write", () => {
      const cli = session();
      loginAs(cli, "mock_viewer");
      const res = cli.run('fanz events create --name "Nope" --location "X"');
      expect(res.status).toBe("error");
      expect(res.message).toMatch(/lacks write permission/);
      expect((res.data as Record<string, unknown>)?.code).toBe("forbidden");
    });

    test("viewer cannot delete", () => {
      const cli = session();
      loginAs(cli, "mock_viewer");
      const res = cli.run("fanz events delete EVT_100 --yes");
      expect(res.status).toBe("error");
      expect(res.message).toMatch(/lacks delete permission/);
    });

    test("viewer cannot export", () => {
      const cli = session();
      loginAs(cli, "mock_viewer");
      const res = cli.run("fanz sales export --event EVT_100");
      expect(res.status).toBe("error");
      expect(res.message).toMatch(/lacks export permission/);
    });

    test("viewer cannot resend", () => {
      const cli = session();
      loginAs(cli, "mock_viewer");
      const res = cli.run("fanz orders resend ORD_100");
      expect(res.status).toBe("error");
      expect(res.message).toMatch(/lacks resend permission/);
    });

    test("ops can read, write, export and resend but not delete", () => {
      const cli = session();
      loginAs(cli, "mock_ops");
      expect(cli.run("fanz sales summary --event EVT_100").status).toBe("ok");
      expect(cli.run("fanz sales export --event EVT_100").status).toBe("ok");
      expect(cli.run("fanz orders resend ORD_100 --email a@test").status).toBe("ok");
      expect(cli.run('fanz events create --name "X" --location "Y"').status).toBe("ok");
      expect(cli.run("fanz events delete EVT_100 --yes").status).toBe("error");
      expect(cli.run("fanz events delete EVT_100 --yes").message).toMatch(/lacks delete permission/);
    });

    test("admin can do everything", () => {
      const cli = session();
      loginAs(cli, "mock_admin");
      expect(cli.run("fanz sales summary --event EVT_100").status).toBe("ok");
      expect(cli.run("fanz sales export --event EVT_100").status).toBe("ok");
      expect(cli.run("fanz orders resend ORD_100 --email a@test").status).toBe("ok");
      expect(cli.run('fanz events create --name "X" --location "Y"').status).toBe("ok");
      expect(cli.run("fanz events delete EVT_100 --yes").status).toBe("error"); // business rule, not permission
    });
  });
});
