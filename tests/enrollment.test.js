// Enrollment tests

const {
  api,
  clearRateLimits,
  extractData,
  generateUniqueEmail,
} = require("./setup");

let token, studentId, classroomId, newClassroomId;

beforeAll(async () => {
  await clearRateLimits();

  const login = await api
    .post("/api/user/login")
    .send({ email: "admin@school.com", password: "Password123" });
  token = extractData(login).token;

  // need a student
  const student = await api
    .post("/api/student/createStudent")
    .set("Authorization", `Bearer ${token}`)
    .send({
      firstName: "Enroll",
      lastName: "Test",
      email: generateUniqueEmail(),
      dateOfBirth: "2015-05-15",
      phone: "1234567890",
    });
  studentId = extractData(student)._id;

  // need two classrooms for transfer test
  const room1 = await api
    .post("/api/classroom/createClassroom")
    .set("Authorization", `Bearer ${token}`)
    .send({
      name: "Room A",
      grade: "10",
      capacity: 30,
      classTeacher: "Teacher A",
    });
  classroomId = extractData(room1)._id;

  const room2 = await api
    .post("/api/classroom/createClassroom")
    .set("Authorization", `Bearer ${token}`)
    .send({
      name: "Room B",
      grade: "11",
      capacity: 25,
      classTeacher: "Teacher B",
    });
  newClassroomId = extractData(room2)._id;
});

describe("Enrollment operations", () => {
  it("enrolls student in classroom", async () => {
    const res = await api
      .post(`/api/studentClassroom/enrollStudent/${studentId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ classroomId });

    expect(res.status).toBe(201);
    const data = extractData(res);
    expect(data.studentId).toBe(studentId);
    expect(data.classroomId).toBe(classroomId);
    expect(data.isActive).toBe(true);
  });

  it("rejects duplicate enrollment", async () => {
    const res = await api
      .post(`/api/studentClassroom/enrollStudent/${studentId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ classroomId });

    expect(res.status).toBe(409);
  });

  it("transfers student to new classroom", async () => {
    const res = await api
      .put(`/api/studentClassroom/transferStudent/${studentId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ newClassroomId });

    expect(res.status).toBe(200);
    expect(extractData(res).classroomId).toBe(newClassroomId);
    expect(extractData(res).reason).toBe("TRANSFER");
  });

  it("rejects transfer to same classroom", async () => {
    const res = await api
      .put(`/api/studentClassroom/transferStudent/${studentId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ newClassroomId });

    expect(res.status).toBe(409);
  });

  it("returns 404 for fake enrollment id", async () => {
    const fakeId = "000000000000000000000000";
    const res = await api
      .patch(`/api/studentClassroom/endEnrollment/${fakeId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});
