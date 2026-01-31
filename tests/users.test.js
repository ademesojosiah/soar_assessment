// User management tests

const {
  api,
  clearRateLimits,
  extractData,
  generateUniqueEmail,
} = require("./setup");

let token, schoolId;

beforeAll(async () => {
  await clearRateLimits();

  const login = await api
    .post("/api/user/login")
    .send({ email: "josiah@gmail.com", password: "superadmin123" });
  token = extractData(login).token;

  const schools = await api
    .get("/api/school/getAllSchools")
    .set("Authorization", `Bearer ${token}`);
  schoolId = extractData(schools).schools[0]?._id;
});

describe("User/admin operations", () => {
  it("creates school admin", async () => {
    const res = await api
      .post(`/api/user/createSchoolAdmin/${schoolId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ email: generateUniqueEmail(), password: "Password123" });

    expect(res.status).toBe(201);
    expect(extractData(res).role).toBe("SCHOOL_ADMIN");
  });

  it("lists school admins", async () => {
    const res = await api
      .get(`/api/user/getSchoolAdmins/${schoolId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
  });
});
