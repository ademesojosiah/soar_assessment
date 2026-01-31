// Classroom tests

const { api, clearRateLimits, extractData } = require("./setup");

let superToken, schoolAdminToken;
let schoolId, classroomId;

beforeAll(async () => {
  await clearRateLimits();

  // login both users
  const superLogin = await api.post("/api/user/login").send({
    email: "josiah@gmail.com",
    password: "superadmin123",
  });
  superToken = extractData(superLogin).token;

  const adminLogin = await api.post("/api/user/login").send({
    email: "admin@school.com",
    password: "Password123",
  });
  schoolAdminToken = extractData(adminLogin).token;

  // grab a school id for later
  const schools = await api
    .get("/api/school/getAllSchools")
    .set("Authorization", `Bearer ${superToken}`);
  schoolId = extractData(schools).schools[0]?._id;
});

describe("Classroom operations", () => {
  it("school admin can create classroom", async () => {
    const res = await api
      .post("/api/classroom/createClassroom")
      .set("Authorization", `Bearer ${schoolAdminToken}`)
      .send({
        name: "Room 101",
        grade: "9",
        capacity: 30,
        classTeacher: "Mrs. Johnson",
        resources: { projector: true, whiteboard: true, computers: 10 },
      });

    expect(res.status).toBe(201);
    const room = extractData(res);
    expect(room.name).toBe("Room 101");
    expect(room.status).toBe("ACTIVE");
    classroomId = room._id;
  });

  it("lists classrooms for school admin", async () => {
    const res = await api
      .get("/api/classroom/getAllClassrooms")
      .set("Authorization", `Bearer ${schoolAdminToken}`);

    expect(res.status).toBe(200);
    const { classrooms, pagination } = extractData(res);
    expect(Array.isArray(classrooms)).toBe(true);
    expect(pagination).toBeDefined();
  });

  it("super admin can get classrooms by school", async () => {
    const res = await api
      .get(`/api/classroom/getSchoolClassrooms/${schoolId}`)
      .set("Authorization", `Bearer ${superToken}`);

    expect(res.status).toBe(200);
    expect(extractData(res).classrooms).toBeDefined();
  });

  it("gets classroom by id", async () => {
    const res = await api
      .get(`/api/classroom/getById/${classroomId}`)
      .set("Authorization", `Bearer ${schoolAdminToken}`);

    expect(res.status).toBe(200);
    expect(extractData(res)._id).toBe(classroomId);
  });

  it("updates classroom", async () => {
    const res = await api
      .put(`/api/classroom/updateClassroom/${classroomId}`)
      .set("Authorization", `Bearer ${schoolAdminToken}`)
      .send({ name: "Room 101 (Updated)", capacity: 35 });

    expect(res.status).toBe(200);
    expect(extractData(res).capacity).toBe(35);
  });

  it("gets classroom roster", async () => {
    const res = await api
      .get(`/api/classroom/getClassroomRoster/${classroomId}`)
      .set("Authorization", `Bearer ${schoolAdminToken}`);

    expect(res.status).toBe(200);
    expect(extractData(res).students).toBeDefined();
  });

  it("archives classroom", async () => {
    const res = await api
      .patch(`/api/classroom/archiveClassroom/${classroomId}`)
      .set("Authorization", `Bearer ${schoolAdminToken}`);

    expect(res.status).toBe(200);
    expect(extractData(res).status).toBe("ARCHIVED");
  });
});
