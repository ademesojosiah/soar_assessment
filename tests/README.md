# Tests

API tests using Jest + Supertest.

## Setup

Make sure the server is running first:

```bash
npm run dev
```

## Run tests

```bash
npm test
```

Or with verbose output:

```bash
npx jest --runInBand --verbose
```

Run a single file:

```bash
npx jest tests/auth.test.js
```

## Test files

| File               | Tests | What it covers                                                                       |
| ------------------ | ----- | ------------------------------------------------------------------------------------ |
| auth.test.js       | 3     | Login (super admin, school admin, bad creds)                                         |
| school.test.js     | 5     | Create, list, get, update, toggle status                                             |
| classroom.test.js  | 7     | Create, list, get by school, get by id, update, roster, archive                      |
| student.test.js    | 8     | Create, list, get by school, get by id, update, current classroom, history, graduate |
| enrollment.test.js | 5     | Enroll, duplicate check, transfer, same classroom check, end enrollment              |
| users.test.js      | 2     | Create school admin, list school admins                                              |

**Total: 30 tests**

## Credentials used

- Super Admin: `josiah@gmail.com` / `superadmin123`
- School Admin: `admin@school.com` / `Password123`

## Notes

- Tests run sequentially (`--runInBand`) to avoid race conditions
- Each file clears rate limits in `beforeAll`
- Uses shared utilities from `setup.js`
