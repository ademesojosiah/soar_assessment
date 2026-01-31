// School CRUD tests

const {
  api,
  clearRateLimits,
  extractData,
  generateUniqueEmail,
} = require("./setup");

let token;
let schoolId;

beforeAll(async () => {
  await clearRateLimits();

  // get super admin token
  const login = await api.post("/api/user/login").send({
    email: "josiah@gmail.com",
    password: "superadmin123",
  });
  token = extractData(login).token;
});

describe("School management", () => {
  it("creates a school", async () => {
    const res = await api
      .post("/api/school/createSchool")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Springfield Elementary",
        email: generateUniqueEmail(),
        phone: "1234567890",
        address: "123 Main St",
        city: "Springfield",
        state: "Illinois",
        country: "USA",
      });

    expect(res.status).toBe(201);

    const school = extractData(res);
    expect(school.name).toBe("Springfield Elementary");
    expect(school.status).toBe("ACTIVE");
    schoolId = school._id;
  });

  it("lists all schools", async () => {
    const res = await api
      .get("/api/school/getAllSchools")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    const { schools, pagination } = extractData(res);
    expect(Array.isArray(schools)).toBe(true);
    expect(pagination.total).toBeGreaterThan(0);
  });

  it("fetches school by id", async () => {
    const res = await api
      .get(`/api/school/getById/${schoolId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(extractData(res)._id).toBe(schoolId);
  });

  it("updates school info", async () => {
    const res = await api
      .put(`/api/school/updateSchool/${schoolId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Springfield Elementary (Updated)",
        phone: "5551234567",
      });

    expect(res.status).toBe(200);
    const updated = extractData(res);
    expect(updated.name).toContain("Updated");
    expect(updated.phone).toBe("5551234567");
  });

  it("toggles school status", async () => {
    const res = await api
      .patch(`/api/school/toggleSchoolStatus/${schoolId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    const { status } = extractData(res);
    expect(["ACTIVE", "INACTIVE"]).toContain(status);
  });
});
