// Student tests

const {
  api,
  clearRateLimits,
  extractData,
  generateUniqueEmail,
} = require("./setup");

let superToken, adminToken, schoolId, studentId;

beforeAll(async () => {
  await clearRateLimits();

  const superLogin = await api.post("/api/user/login").send({
    email: "josiah@gmail.com",
    password: "superadmin123",
  });
  superToken = extractData(superLogin).token;

  const adminLogin = await api.post("/api/user/login").send({
    email: "admin@school.com",
    password: "Password123",
  });
  adminToken = extractData(adminLogin).token;

  const schools = await api
    .get("/api/school/getAllSchools")
    .set("Authorization", `Bearer ${superToken}`);
  schoolId = extractData(schools).schools[0]?._id;
});

describe("Student management", () => {
  it("creates new student", async () => {
    const res = await api
      .post("/api/student/createStudent")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        firstName: "John",
        lastName: "Doe",
        email: generateUniqueEmail(),
        dateOfBirth: "2015-05-15",
        phone: "1234567890",
        address: "789 Student Lane",
      });

    expect(res.status).toBe(201);
    const student = extractData(res);
    expect(student.firstName).toBe("John");
    expect(student.status).toBe("ACTIVE");
    expect(student.registrationNumber).toBeTruthy();
    studentId = student._id;
  });

  it("gets all students", async () => {
    const res = await api
      .get("/api/student/getAllStudents")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const { students, pagination } = extractData(res);
    expect(Array.isArray(students)).toBe(true);
    expect(pagination.total).toBeGreaterThan(0);
  });

  it("super admin gets students by school", async () => {
    const res = await api
      .get(`/api/student/getSchoolStudents/${schoolId}`)
      .set("Authorization", `Bearer ${superToken}`);

    expect(res.status).toBe(200);
  });

  it("fetches student by id", async () => {
    const res = await api
      .get(`/api/student/getById/${studentId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(extractData(res).firstName).toBe("John");
  });

  it("updates student info", async () => {
    const res = await api
      .put(`/api/student/updateStudent/${studentId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ lastName: "Smith", phone: "5559876543" });

    expect(res.status).toBe(200);
    expect(extractData(res).lastName).toBe("Smith");
  });

  it("handles unenrolled student classroom check", async () => {
    const res = await api
      .get(`/api/student/getCurrentStudentClassroom/${studentId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    // 404 is ok if not enrolled yet
    expect([200, 404]).toContain(res.status);
  });

  it("gets enrollment history", async () => {
    const res = await api
      .get(`/api/student/getEnrollmentHistory/${studentId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(extractData(res))).toBe(true);
  });

  it("graduates student", async () => {
    const res = await api
      .patch(`/api/student/graduateStudent/${studentId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(extractData(res).status).toBe("GRADUATED");
  });
});
