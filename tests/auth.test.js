// Auth endpoint tests

const { api, clearRateLimits, extractData } = require("./setup");

describe("Authentication", () => {
  beforeAll(async () => {
    await clearRateLimits();
  });

  it("logs in super admin with valid creds", async () => {
    const res = await api.post("/api/user/login").send({
      email: "josiah@gmail.com",
      password: "superadmin123",
    });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(extractData(res).token).toBeDefined();
  });

  it("logs in school admin", async () => {
    const res = await api.post("/api/user/login").send({
      email: "admin@school.com",
      password: "Password123",
    });

    expect(res.status).toBe(200);
    const { token } = extractData(res);
    expect(token).toBeTruthy();
  });

  it("rejects bad credentials", async () => {
    const res = await api.post("/api/user/login").send({
      email: "nobody@fake.com",
      password: "nope",
    });

    expect(res.body.ok).toBe(false);
  });
});
