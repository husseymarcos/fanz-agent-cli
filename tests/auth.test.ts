import { beforeEach, describe, expect, test } from "bun:test";
import { session } from "./helpers";

describe("auth", () => {
  let cli: ReturnType<typeof session>;

  beforeEach(() => {
    cli = session();
  });

  describe("login", () => {
    test("admin login succeeds", () => {
      const res = cli.run("fanz login --token mock_admin");
      expect(res.status).toBe("ok");
      expect(res.data).toMatchObject({ token: "mock_admin", permissions: expect.arrayContaining(["read", "write", "delete"]) });
    });

    test("ops login succeeds", () => {
      const res = cli.run("fanz login --token mock_ops");
      expect(res.status).toBe("ok");
      expect(res.data).toMatchObject({ token: "mock_ops", permissions: expect.arrayContaining(["read", "write"]) });
    });

    test("viewer login succeeds", () => {
      const res = cli.run("fanz login --token mock_viewer");
      expect(res.status).toBe("ok");
      expect(res.data).toMatchObject({ token: "mock_viewer", permissions: ["read"] });
    });

    test("unknown login token fails", () => {
      const res = cli.run("fanz login --token bad_token");
      expect(res.status).toBe("error");
      expect(res.message).toMatch(/Invalid mock token/);
      expect((res.data as Record<string, unknown>)?.code).toBe("auth_error");
    });

    test("login fails when the token is missing", () => {
      const res = cli.run("fanz login");
      expect(res.status).toBe("error");
      expect(res.message).toMatch(/Missing required flag --token/);
    });
  });

  describe("current login", () => {
    test("shows the current login after signing in", () => {
      cli.loginAs("mock_admin");
      const res = cli.run("fanz auth whoami");
      expect(res.status).toBe("ok");
      expect(res.data).toMatchObject({ token: expect.objectContaining({ token: "mock_admin" }) });
    });

    test("shows an error when no one is logged in", () => {
      const res = cli.run("fanz auth whoami");
      expect(res.status).toBe("error");
      expect(res.message).toMatch(/Not logged in/);
      expect((res.data as Record<string, unknown>)?.code).toBe("auth_required");
    });
  });

  describe("permissions", () => {
    test("viewer cannot write", () => {
      cli.loginAs("mock_viewer");
      const res = cli.run('fanz events create --name "Nope" --location "X"');
      expect(res.status).toBe("error");
      expect(res.message).toMatch(/lacks write permission/);
      expect((res.data as Record<string, unknown>)?.code).toBe("forbidden");
    });

    test("viewer cannot delete", () => {
      cli.loginAs("mock_viewer");
      const res = cli.run("fanz events delete EVT_100 --yes");
      expect(res.status).toBe("error");
      expect(res.message).toMatch(/lacks delete permission/);
    });

    test("viewer cannot export", () => {
      cli.loginAs("mock_viewer");
      const res = cli.run("fanz sales export --event EVT_100");
      expect(res.status).toBe("error");
      expect(res.message).toMatch(/lacks export permission/);
    });

    test("viewer cannot resend", () => {
      cli.loginAs("mock_viewer");
      const res = cli.run("fanz orders resend ORD_100");
      expect(res.status).toBe("error");
      expect(res.message).toMatch(/lacks resend permission/);
    });

    test("ops can read, write, export and resend but not delete", () => {
      cli.loginAs("mock_ops");
      expect(cli.run("fanz sales summary --event EVT_100").status).toBe("ok");
      expect(cli.run("fanz sales export --event EVT_100").status).toBe("ok");
      expect(cli.run("fanz orders resend ORD_100 --email a@test").status).toBe("ok");
      expect(cli.run('fanz events create --name "X" --location "Y"').status).toBe("ok");
      expect(cli.run("fanz events delete EVT_100 --yes").status).toBe("error");
      expect(cli.run("fanz events delete EVT_100 --yes").message).toMatch(/lacks delete permission/);
    });

    test("admin can do everything", () => {
      cli.loginAs("mock_admin");
      expect(cli.run("fanz sales summary --event EVT_100").status).toBe("ok");
      expect(cli.run("fanz sales export --event EVT_100").status).toBe("ok");
      expect(cli.run("fanz orders resend ORD_100 --email a@test").status).toBe("ok");
      expect(cli.run('fanz events create --name "X" --location "Y"').status).toBe("ok");
      expect(cli.run("fanz events delete EVT_100 --yes").status).toBe("error"); // business rule, not permission
    });
  });
});
