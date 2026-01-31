/**
 * Jest Configuration for School Management API Tests
 */

module.exports = {
  // Test environment
  testEnvironment: "node",

  // Test files location
  testMatch: ["**/tests/**/*.test.js"],

  // Setup files
  setupFilesAfterEnv: [],

  // Test timeout (30 seconds for API calls)
  testTimeout: 30000,

  // Verbose output
  verbose: true,

  // Force exit after tests complete
  forceExit: true,

  // Detect open handles
  detectOpenHandles: true,

  // Coverage configuration
  collectCoverageFrom: [
    "managers/**/*.js",
    "!managers/_common/**",
    "!**/node_modules/**",
  ],

  // Reporter configuration (default only)
  reporters: ["default"],

  // Module paths
  moduleDirectories: ["node_modules", "tests"],

  // Global teardown
  globalTeardown: undefined,
};
