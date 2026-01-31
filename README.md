# School Management System API

REST API for managing schools, classrooms, students, and enrollments with role-based access control.

**Production:** https://soar-assessment.onrender.com  
**Local:** http://localhost:5111

---

## Setup

```bash
git clone <repo-url>
cd <project-folder>
npm install
```

Create a `.env` file (see `.env.example`):

```env
LONG_TOKEN_SECRET="long_random_string_value"
SHORT_TOKEN_SECRET="short_random_string"
NACL_SECRET="another_random_string"
REDIS_URI=redis://default:your_password@your-redis-host:14799
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/soar
# Test-only seeded super admin credentials (non-production)
SUPER_ADMIN_EMAIL=admin@test.com
SUPER_ADMIN_PASSWORD=superadmin123

```

Start the server:

```bash
node app.js
# or
npm run dev
```

---

## Deployment (Render)

1. Push your code to GitHub
2. Create a new **Web Service** on [Render](https://render.com)
3. Connect your repository
4. Configure:
   - **Build Command:** `npm install`
   - **Start Command:** `node app.js`
5. Add environment variables (use remote URIs for Redis and MongoDB)
6. Deploy

The app will be live at your Render URL.

---

## Postman Collection

Import `postman_collection.json` into Postman for ready-to-use endpoints.

---

## Running Tests

Server must be running first.

```bash
npm test                           # all tests
npx jest tests/auth.test.js        # single file
npx jest --runInBand --verbose     # detailed output
```

30 tests: auth (3), school (5), classroom (7), student (8), enrollment (5), users (2).

---

## Authentication

### POST /api/user/login

**Request:**
```json
{
  "email": "josiah@gmail.com",
  "password": "superadmin123"
}
```

**Response (200):**
```json
{
  "ok": true,
  "data": {
    "ok": true,
    "code": 200,
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIs...",
      "data": {
        "id": "697d05048ab47fb14be500bb",
        "email": "josiah@gmail.com",
        "role": "SUPER_ADMIN"
      }
    },
    "message": "Login successful"
  },
  "errors": [],
  "message": ""
}
```

**Error (401):**
```json
{
  "ok": false,
  "data": {},
  "errors": ["Invalid email or password"],
  "message": ""
}
```

Use the token in all other requests:
```
Authorization: Bearer <token>
```

**Test Credentials:**

| Environment | Role | Email | Password |
|-------------|------|-------|----------|
| Production (Render) | Super Admin | `josiah@gmail.com` | `superadmin123` |
| Local | Super Admin | Value from `SUPER_ADMIN_EMAIL` in `.env` | Value from `SUPER_ADMIN_PASSWORD` in `.env` |
| Any | School Admin | Created via API | Set during creation |

> **Note:** The production instance at https://soar-assessment.onrender.com has a pre-seeded Super Admin account. Use the credentials above to authenticate.

---

## Users

> Super Admin only

### GET /api/user/getSchoolAdmins

**Response (200):**
```json
{
  "ok": true,
  "data": {
    "ok": true,
    "code": 200,
    "data": [
      {
        "email": "ade@gmail.com",
        "role": "SCHOOL_ADMIN",
        "schoolId": "697d0a91d4d0d9a8006aef3f",
        "id": "697d05218ab47fb14be500c1"
      }
    ],
    "message": "School admins retrieved successfully"
  },
  "errors": [],
  "message": ""
}
```

**Error (403):**
```json
{
  "ok": false,
  "data": {},
  "errors": ["Only SUPER_ADMIN can access this resource"],
  "message": "Insufficient permissions"
}
```

### POST /api/user/createSchoolAdmin/:schoolId

**Request:**
```json
{
  "email": "admin@school.com",
  "password": "Password123"
}
```

**Response (201):**
```json
{
  "ok": true,
  "data": {
    "ok": true,
    "code": 201,
    "data": {
      "email": "admin@school.com",
      "role": "SCHOOL_ADMIN",
      "schoolId": "697dcdd127610d231f934d8b",
      "id": "697dcfe527610d231f934d9a"
    },
    "message": "School admin created successfully"
  },
  "errors": [],
  "message": ""
}
```

**Error (404):**
```json
{
  "ok": false,
  "data": {},
  "errors": ["School not found"],
  "message": ""
}
```

**Error (409):**
```json
{
  "ok": false,
  "data": {},
  "errors": ["User with this email already exists"],
  "message": ""
}
```

---

## Schools

> Super Admin only

### POST /api/school/createSchool

**Request:**
```json
{
  "name": "Soar High School",
  "email": "contact@soar.edu",
  "phone": "1234567890",
  "address": "123 Main Street",
  "city": "Springfield",
  "state": "Illinois",
  "country": "USA"
}
```

**Response (201):**
```json
{
  "ok": true,
  "data": {
    "ok": true,
    "code": 201,
    "data": {
      "name": "Soar High School",
      "email": "contact@soar.edu",
      "phone": "1234567890",
      "status": "ACTIVE",
      "_id": "697dcdd127610d231f934d8b"
    },
    "message": "School created successfully"
  },
  "errors": [],
  "message": ""
}
```

**Error (400):**
```json
{
  "ok": false,
  "data": {},
  "errors": [[{"label": "name", "message": "name is required"}]],
  "message": ""
}
```

**Error (403):**
```json
{
  "ok": false,
  "data": {},
  "errors": ["Only SUPER_ADMIN can access this resource"],
  "message": "Insufficient permissions"
}
```

### GET /api/school/getAllSchools

Supports `?page=1&size=10&search=soar`

**Response (200):**
```json
{
  "ok": true,
  "data": {
    "ok": true,
    "code": 200,
    "data": {
      "schools": [
        {
          "_id": "697dcdd127610d231f934d8b",
          "name": "Soar High School",
          "email": "contact@soar.edu",
          "status": "ACTIVE"
        }
      ],
      "pagination": {
        "page": 1,
        "size": 10,
        "total": 1,
        "totalPages": 1,
        "hasNext": false,
        "hasPrev": false
      }
    },
    "message": "Schools retrieved successfully"
  },
  "errors": [],
  "message": ""
}
```

**Error (401):**
```json
{
  "ok": false,
  "data": {},
  "errors": ["Missing or invalid Authorization header"],
  "message": "Authorization token required"
}
```

### GET /api/school/getById/:schoolId

**Response (200):** Returns full school object.

**Error (404):**
```json
{
  "ok": false,
  "data": {},
  "errors": ["School not found"],
  "message": ""
}
```

### PUT /api/school/updateSchool/:schoolId

**Request:**
```json
{
  "name": "Soar School - Updated",
  "phone": "0987654321"
}
```

Partial updates allowed.

**Response (200):** Returns updated school.

**Error (404):**
```json
{
  "ok": false,
  "data": {},
  "errors": ["School not found"],
  "message": ""
}
```

### PATCH /api/school/toggleSchoolStatus/:schoolId

Flips between `ACTIVE` and `INACTIVE`.

**Response (200):**
```json
{
  "ok": true,
  "data": {
    "ok": true,
    "code": 200,
    "data": {
      "_id": "697dcdd127610d231f934d8b",
      "name": "Soar School",
      "status": "INACTIVE"
    },
    "message": "School deactivated successfully"
  },
  "errors": [],
  "message": ""
}
```

**Error (404):**
```json
{
  "ok": false,
  "data": {},
  "errors": ["School not found"],
  "message": ""
}
```

---

## Classrooms

### POST /api/classroom/createClassroom
> School Admin only

**Request:**
```json
{
  "name": "Room 101",
  "grade": "Grade 5",
  "capacity": 30,
  "classTeacher": "Mrs. Johnson",
  "resources": {
    "projector": true,
    "whiteboard": true,
    "computers": 10
  }
}
```

`name` and `grade` required. `resources` optional.

**Response (201):**
```json
{
  "ok": true,
  "data": {
    "ok": true,
    "code": 201,
    "data": {
      "schoolId": "697dcdd127610d231f934d8b",
      "name": "Room 101",
      "grade": "Grade 5",
      "capacity": 30,
      "status": "ACTIVE",
      "_id": "697dd3ec287348757f9779e7"
    },
    "message": "Classroom created successfully"
  },
  "errors": [],
  "message": ""
}
```

**Error (400):**
```json
{
  "ok": false,
  "data": {},
  "errors": [[{"label": "grade", "message": "grade is required"}]],
  "message": ""
}
```

**Error (403):**
```json
{
  "ok": false,
  "data": {},
  "errors": ["Only SCHOOL_ADMIN can access this resource"],
  "message": "Insufficient permissions"
}
```

### GET /api/classroom/getAllClassrooms
> School Admin only — returns classrooms for admin's school

Supports `?page=1&size=10&search=room`

**Response (200):**
```json
{
  "ok": true,
  "data": {
    "ok": true,
    "code": 200,
    "data": {
      "classrooms": [...],
      "pagination": {...}
    },
    "message": "Classrooms retrieved successfully"
  },
  "errors": [],
  "message": ""
}
```

### GET /api/classroom/getSchoolClassrooms/:schoolId
> Super Admin only — view any school's classrooms

**Error (404):**
```json
{
  "ok": false,
  "data": {},
  "errors": ["School not found"],
  "message": ""
}
```

### GET /api/classroom/getById/:classroomId

**Response (200):** Returns full classroom object.

**Error (404):**
```json
{
  "ok": false,
  "data": {},
  "errors": ["Classroom not found"],
  "message": ""
}
```

### PUT /api/classroom/updateClassroom/:classroomId

**Request:**
```json
{
  "name": "Room 101 - Updated",
  "capacity": 35
}
```

**Response (200):** Returns updated classroom.

**Error (404):**
```json
{
  "ok": false,
  "data": {},
  "errors": ["Classroom not found"],
  "message": ""
}
```

### PATCH /api/classroom/archiveClassroom/:classroomId

Sets status to `ARCHIVED`. Fails if students are enrolled.

**Response (200):**
```json
{
  "ok": true,
  "data": {
    "ok": true,
    "code": 200,
    "data": {
      "_id": "697dd3ec287348757f9779e7",
      "name": "Room 101",
      "status": "ARCHIVED"
    },
    "message": "Classroom archived successfully"
  },
  "errors": [],
  "message": ""
}
```

**Error (409):**
```json
{
  "ok": false,
  "data": {},
  "errors": ["Cannot archive classroom with 3 active student(s)"],
  "message": ""
}
```

**Error (404):**
```json
{
  "ok": false,
  "data": {},
  "errors": ["Classroom not found"],
  "message": ""
}
```

### GET /api/classroom/getClassroomRoster/:classroomId

**Response (200):**
```json
{
  "ok": true,
  "data": {
    "ok": true,
    "code": 200,
    "data": {
      "classroomId": "697d0f987b360a5b2a995940",
      "classroomName": "Grade 10-A",
      "capacity": 40,
      "totalStudents": 2,
      "students": [
        {
          "studentId": "697d36195419c56c16d518b2",
          "firstName": "John",
          "lastName": "Doe",
          "email": "john.doe@example.com",
          "startDate": "2026-01-31T04:09:57.208Z",
          "status": "ACTIVE"
        }
      ]
    },
    "message": "Classroom roster retrieved successfully"
  },
  "errors": [],
  "message": ""
}
```

**Error (404):**
```json
{
  "ok": false,
  "data": {},
  "errors": ["Classroom not found"],
  "message": ""
}
```

---

## Students

### POST /api/student/createStudent
> School Admin only

**Request:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@student.com",
  "dateOfBirth": "2015-05-15",
  "phone": "1234567890",
  "address": "789 Student Lane"
}
```

**Response (201):**
```json
{
  "ok": true,
  "data": {
    "ok": true,
    "code": 201,
    "data": {
      "schoolId": "697dcdd127610d231f934d8b",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@student.com",
      "registrationNumber": "STU-4D8B-2026-000001",
      "status": "ACTIVE",
      "_id": "697dddf9470c11562693047d"
    },
    "message": "Student created successfully"
  },
  "errors": [],
  "message": ""
}
```

**Error (409):**
```json
{
  "ok": false,
  "data": {},
  "errors": ["Student with this email already exists"],
  "message": ""
}
```

**Error (400):**
```json
{
  "ok": false,
  "data": {},
  "errors": [[{"label": "email", "message": "email is required"}]],
  "message": ""
}
```

### GET /api/student/getAllStudents
> School Admin only — students for admin's school

Supports `?page=1&size=10`

**Response (200):**
```json
{
  "ok": true,
  "data": {
    "ok": true,
    "code": 200,
    "data": {
      "students": [...],
      "pagination": {...}
    },
    "message": "Students retrieved successfully"
  },
  "errors": [],
  "message": ""
}
```

### GET /api/student/getSchoolStudents/:schoolId
> Super Admin only

**Error (404):**
```json
{
  "ok": false,
  "data": {},
  "errors": ["School not found"],
  "message": ""
}
```

### GET /api/student/getById/:studentId

**Response (200):** Returns full student record.

**Error (404):**
```json
{
  "ok": false,
  "data": {},
  "errors": ["Student not found"],
  "message": ""
}
```

### PUT /api/student/updateStudent/:studentId

**Request:**
```json
{
  "firstName": "John",
  "lastName": "Doe Updated",
  "phone": "0987654321"
}
```

**Response (200):** Returns updated student.

**Error (404):**
```json
{
  "ok": false,
  "data": {},
  "errors": ["Student not found"],
  "message": ""
}
```

### GET /api/student/getCurrentStudentClassroom/:studentId

**Response (200):**
```json
{
  "ok": true,
  "data": {
    "ok": true,
    "code": 200,
    "data": {
      "classroomId": "697dd3ec287348757f9779e7",
      "classroomName": "Room 101",
      "capacity": 30,
      "startDate": "2026-01-31T11:19:08.857Z"
    },
    "message": "Current classroom retrieved successfully"
  },
  "errors": [],
  "message": ""
}
```

**Error (404):**
```json
{
  "ok": false,
  "data": {},
  "errors": ["Student is not currently enrolled in any classroom"],
  "message": ""
}
```

### GET /api/student/getEnrollmentHistory/:studentId

**Response (200):**
```json
{
  "ok": true,
  "data": {
    "ok": true,
    "code": 200,
    "data": [
      {
        "classroomId": "697dd5dc287348757f977a05",
        "classroomName": "Room 102",
        "startDate": "2026-01-31T11:26:37.954Z",
        "endDate": null,
        "reason": "TRANSFER",
        "isActive": true
      }
    ],
    "message": "Enrollment history retrieved successfully"
  },
  "errors": [],
  "message": ""
}
```

**Error (404):**
```json
{
  "ok": false,
  "data": {},
  "errors": ["Student not found"],
  "message": ""
}
```

### PATCH /api/student/graduateStudent/:studentId

Sets status to `GRADUATED` and ends any active enrollment.

**Response (200):**
```json
{
  "ok": true,
  "data": {
    "ok": true,
    "code": 200,
    "data": {
      "_id": "697d36195419c56c16d518b2",
      "firstName": "John",
      "lastName": "Doe",
      "status": "GRADUATED"
    },
    "message": "Student graduated successfully"
  },
  "errors": [],
  "message": ""
}
```

**Error (404):**
```json
{
  "ok": false,
  "data": {},
  "errors": ["Student not found"],
  "message": ""
}
```

---

## Enrollments

> School Admin only

### POST /api/studentClassroom/enrollStudent/:studentId

**Request:**
```json
{
  "classroomId": "697dd3ec287348757f9779e7"
}
```

**Response (201):**
```json
{
  "ok": true,
  "data": {
    "ok": true,
    "code": 201,
    "data": {
      "studentId": "697dddf9470c11562693047d",
      "classroomId": "697dd3ec287348757f9779e7",
      "schoolId": "697dcdd127610d231f934d8b",
      "isActive": true,
      "reason": "ENROLLMENT",
      "_id": "697de52c470c1156269304c9"
    },
    "message": "Student enrolled successfully"
  },
  "errors": [],
  "message": ""
}
```

**Error (404):**
```json
{
  "ok": false,
  "data": {},
  "errors": ["Student not found in this school"],
  "message": ""
}
```

**Error (404):**
```json
{
  "ok": false,
  "data": {},
  "errors": ["Classroom not found in this school"],
  "message": ""
}
```

**Error (409):**
```json
{
  "ok": false,
  "data": {},
  "errors": ["Student is already enrolled in this classroom"],
  "message": ""
}
```

### PUT /api/studentClassroom/transferStudent/:studentId

**Request:**
```json
{
  "newClassroomId": "697dd5dc287348757f977a05"
}
```

**Response (200):**
```json
{
  "ok": true,
  "data": {
    "ok": true,
    "code": 200,
    "data": {
      "studentId": "697dddf9470c11562693047d",
      "classroomId": "697dd5dc287348757f977a05",
      "isActive": true,
      "reason": "TRANSFER"
    },
    "message": "Student transferred successfully"
  },
  "errors": [],
  "message": ""
}
```

**Error (409):**
```json
{
  "ok": false,
  "data": {},
  "errors": ["Student is already in this classroom"],
  "message": ""
}
```

**Error (404):**
```json
{
  "ok": false,
  "data": {},
  "errors": ["Student is not currently enrolled in any classroom"],
  "message": ""
}
```

### PATCH /api/studentClassroom/endEnrollment/:enrollmentId

**Response (200):**
```json
{
  "ok": true,
  "data": {
    "ok": true,
    "code": 200,
    "data": {
      "_id": "697de6ed470c1156269304e6",
      "isActive": false,
      "reason": "WITHDRAWAL",
      "endDate": "2026-01-31T11:34:14.232Z"
    },
    "message": "Enrollment ended successfully"
  },
  "errors": [],
  "message": ""
}
```

**Error (404):**
```json
{
  "ok": false,
  "data": {},
  "errors": ["Enrollment not found or already ended"],
  "message": ""
}
```

---

## Error Codes

| Code | When |
|------|------|
| 200 | Success (GET, PUT, PATCH) |
| 201 | Created (POST) |
| 400 | Validation failed |
| 401 | Missing or invalid token |
| 403 | Wrong role for endpoint |
| 404 | Resource not found |
| 409 | Conflict (duplicate, already enrolled) |
| 500 | Server error |

---

## Pagination

All list endpoints accept `?page=1&size=10&search=term`

```json
{
  "pagination": {
    "page": 1,
    "size": 10,
    "total": 25,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## Database Schema

```
┌──────────────────┐
│      School      │
├──────────────────┤
│ _id              │
│ name             │
│ email            │
│ phone            │
│ address/city/    │
│ state/country    │
│ status           │
│ createdBy        │
│ updatedBy        │
└────────┬─────────┘
         │
         │ 1
         │
         ├─────────────────────┬─────────────────────┐
         │                     │                     │
         ▼ *                   ▼ *                   ▼ *
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│    Classroom     │  │     Student      │  │       User       │
├──────────────────┤  ├──────────────────┤  ├──────────────────┤
│ _id              │  │ _id              │  │ _id              │
│ schoolId ────────┼──│ schoolId ────────┼──│ schoolId?        │
│ name             │  │ firstName        │  │ email            │
│ grade            │  │ lastName         │  │ password (hash)  │
│ capacity         │  │ email            │  │ role             │
│ classTeacher     │  │ phone            │  └──────────────────┘
│ resources {}     │  │ address          │
│ status           │  │ dateOfBirth      │
└────────┬─────────┘  │ registrationNum  │
         │            │ status           │
         │            └────────┬─────────┘
         │                     │
         │ 1                   │ 1
         │                     │
         └──────────┬──────────┘
                    │
                    ▼ *
         ┌──────────────────────┐
         │  StudentClassroom    │
         │    (join table)      │
         ├──────────────────────┤
         │ _id                  │
         │ studentId ───────────│──► Student
         │ classroomId ─────────│──► Classroom
         │ schoolId ────────────│──► School
         │ startDate            │
         │ endDate              │
         │ isActive             │
         │ reason               │
         │ createdBy            │
         └──────────────────────┘
```

**Relationships:**
- School → Classroom (1:many)
- School → Student (1:many)
- School → User (1:many for school admins)
- StudentClassroom links Student, Classroom, and School
- A student can have multiple enrollment records (history)

**Status values:**
- School: `ACTIVE`, `INACTIVE`
- Classroom: `ACTIVE`, `ARCHIVED`
- Student: `ACTIVE`, `GRADUATED`, `TRANSFERRED`, `WITHDRAWN`
- Enrollment reason: `ENROLLMENT`, `TRANSFER`, `WITHDRAWAL`, `GRADUATION`

---

## Role Permissions

| What | SUPER_ADMIN | SCHOOL_ADMIN |
|------|:-----------:|:------------:|
| Schools CRUD | ✅ | ❌ |
| Create school admins | ✅ | ❌ |
| View all schools' data | ✅ | ❌ |
| Manage own school classrooms | ✅ | ✅ |
| Manage own school students | ✅ | ✅ |
| Enroll/transfer students | ❌ | ✅ |

---

MIT License
