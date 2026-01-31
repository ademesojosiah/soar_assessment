/**
 * Test Setup and Configuration
 * Provides utilities for API testing with Jest + Supertest
 */

require("dotenv").config();
const request = require("supertest");
const Redis = require("ioredis");

// Base URL for API testing
const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5111";

// Create a configured supertest instance
const api = request(BASE_URL);

/**
 * Clear rate limit keys from Redis before running tests
 */
const clearRateLimits = async () => {
  const redis = new Redis(process.env.REDIS_URI);
  try {
    const keys = await redis.keys("*ratelimit*");
    if (keys.length > 0) {
      await Promise.all(keys.map((key) => redis.del(key)));
      console.log(`Cleared ${keys.length} rate limit keys`);
    }
  } catch (error) {
    console.log("Could not clear rate limits:", error.message);
  } finally {
    await redis.quit();
  }
};

// Test data storage for sharing between tests
const testData = {
  superAdminToken: null,
  schoolAdminToken: null,
  schoolId: null,
  classroomId: null,
  studentId: null,
  enrollmentId: null,
  userId: null,
};

// Super Admin credentials (from .env)
const superAdminCredentials = {
  email: process.env.SUPER_ADMIN_EMAIL || "josiah@gmail.com",
  password: process.env.SUPER_ADMIN_PASSWORD || "superadmin123",
};

/**
 * Helper to generate unique test data
 */
const generateUniqueEmail = () =>
  `test${Date.now()}${Math.random().toString(36).substring(7)}@example.com`;
const generateUniqueName = (prefix) => `${prefix}_${Date.now()}`;

/**
 * Helper to extract data from double-nested API response
 * API response structure: { ok, data: { ok, code, data: {...}, message }, errors, message }
 */
const extractData = (response) => {
  if (response.body.data?.data !== undefined) {
    return response.body.data.data;
  }
  return response.body.data;
};

/**
 * Helper to authenticate and get token
 * Note: API response is double-nested: { ok, data: { ok, code, data: { token, data }, message } }
 */
const login = async (email, password) => {
  const response = await api.post("/api/user/login").send({ email, password });

  // Handle double-nested response structure
  if (response.body.ok && response.body.data && response.body.data.data) {
    return response.body.data.data.token;
  }
  return null;
};

/**
 * Setup function to get Super Admin token
 */
const getSuperAdminToken = async () => {
  if (!testData.superAdminToken) {
    testData.superAdminToken = await login(
      superAdminCredentials.email,
      superAdminCredentials.password,
    );
  }
  return testData.superAdminToken;
};

/**
 * Create a school and school admin, return the admin token
 * Note: API response is double-nested: { ok, data: { ok, code, data: {...}, message } }
 */
const createSchoolAdminWithToken = async (superAdminToken) => {
  // Create a school first
  const schoolRes = await api
    .post("/api/school/createSchool")
    .set("Authorization", `Bearer ${superAdminToken}`)
    .send({
      name: generateUniqueName("Test School"),
      address: "123 Test Street",
      email: generateUniqueEmail(),
      phone: "1234567890",
    });

  if (!schoolRes.body.ok || !schoolRes.body.data) {
    console.error("Failed to create school:", schoolRes.body);
    return { schoolId: null, adminToken: null };
  }

  // Handle double-nested response - actual data is in body.data.data or body.data._id
  const schoolData = schoolRes.body.data.data || schoolRes.body.data;
  const schoolId = schoolData._id;

  // Create a school admin using URL param for schoolId
  const adminEmail = generateUniqueEmail();
  const adminPassword = "password123";

  const adminRes = await api
    .post(`/api/user/createSchoolAdmin/${schoolId}`)
    .set("Authorization", `Bearer ${superAdminToken}`)
    .send({
      email: adminEmail,
      password: adminPassword,
    });

  if (!adminRes.body.ok) {
    console.error("Failed to create school admin:", adminRes.body);
    return { schoolId, adminToken: null };
  }

  // Login as school admin
  const adminToken = await login(adminEmail, adminPassword);

  return { schoolId, adminToken, adminEmail };
};

module.exports = {
  api,
  testData,
  superAdminCredentials,
  generateUniqueEmail,
  generateUniqueName,
  login,
  getSuperAdminToken,
  createSchoolAdminWithToken,
  clearRateLimits,
  extractData,
  BASE_URL,
};
