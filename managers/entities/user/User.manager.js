const errorHandlers = require("../../_common/errorHandlers");
const successHandlers = require("../../_common/successHandlers");
const bcrypt = require("bcrypt");

module.exports = class User {
  constructor({ config, cortex, managers, validators, mongomodels } = {}) {
    this.config = config;
    this.cortex = cortex;
    this.validators = validators;
    this.mongomodels = mongomodels;
    this.User = mongomodels.User;
    this.tokenManager = managers.token;
    this.responseDispatcher = managers.responseDispatcher;
    this.usersCollection = "users";

    // Http exposed methods
    this.httpExposed = ["createSchoolAdmin", "get=getSchoolAdmins", "login"];

    // Role-based authorization

    this.roles = {
      createSchoolAdmin: ["SUPER_ADMIN"],
      getSchoolAdmins: ["SUPER_ADMIN"],
    };
  }

  /**
   * Get school admins for a specific school
   * Only SUPER_ADMIN can access
   *
   * @route GET /api/user/getSchoolAdmins/:id
   * @access SUPER_ADMIN only
   * @param {Object} __authenticate - Authentication context
   * @param {Object} __authorize - Authorization context
   * @param {Object} __rateLimitGeneral - Rate limiting for general endpoints
   * @param {Object} __params - URL parameters
   * @param {string} __params.id - School ID
   * @returns {Array} Array of school admin users
   */
  async getSchoolAdmins({
    __authenticate,
    __authorize,
    __rateLimitGeneral,
    __params,
    id,
  }) {
    try {
      const schoolId = __params.id;
      if (!schoolId) {
        return errorHandlers.badRequestError("schoolId is required");
      }
      const admins = await this.User.find({
        role: "SCHOOL_ADMIN",
        schoolId,
      });

      return successHandlers.success(
        admins,
        "School admins retrieved successfully",
      );
    } catch (error) {
      return errorHandlers.serverError(error);
    }
  }

  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Object} User object
   */
  async findByEmail(email) {
    try {
      if (!email) {
        return errorHandlers.badRequestError("email is required");
      }

      const user = await this.User.findOne({ email });

      if (!user) {
        return errorHandlers.notFoundError("User not found");
      }

      return user;
    } catch (error) {
      return errorHandlers.serverError(error);
    }
  }

  /**
   * User login - authenticate with email and password
   *
   * @route POST /api/user/login
   * @access Public
   * @param {Object} __rateLimitAuth - Rate limiting for auth endpoints
   * @param {string} email - User email
   * @param {string} password - Plain text password
   * @returns {Object} User and tokens if authentication succeeds
   * @throws {400} If validation fails
   * @throws {401} If invalid credentials
   */
  async login({ __rateLimitAuth, email, password }) {
    try {
      const validation = await this.validators.user.login({ email, password });
      if (!validation.ok) {
        return errorHandlers.validationError(validation);
      }

      // Find user by email
      const user = await this.User.findOne({ email });
      if (!user) {
        return errorHandlers.unAuthorizedError("Invalid email or password");
      }

      // Compare password using model method
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return errorHandlers.unAuthorizedError("Invalid email or password");
      }

      // Generate long token
      const token = this.tokenManager.genJwt({
        userId: user._id,
        role: user.role,
      });

      const data = { id: user._id, email: user.email, role: user.role };

      return successHandlers.success({ token, data }, "Login successful");
    } catch (error) {
      return errorHandlers.serverError(error);
    }
  }

  /**
   * Create a school admin user with plain password
   * Password will be automatically hashed by pre-save hook
   * Only SUPER_ADMIN can create school admins
   *
   * @route POST /api/user/createSchoolAdmin/:id
   * @access SUPER_ADMIN only
   * @param {Object} __authenticate - Authentication context
   * @param {Object} __authorize - Authorization context
   * @param {Object} __rateLimitCreate - Rate limiting for create endpoints
   * @param {Object} __params - URL parameters
   * @param {string} __params.id - School ID to assign admin to
   * @param {string} email - Admin email
   * @param {string} password - Plain text password (min 8 chars)
   * @returns {Object} Created user
   * @throws {400} If validation fails or schoolId missing
   * @throws {409} If email already in use
   */
  async createSchoolAdmin({
    __authenticate,
    __authorize,
    __rateLimitCreate,
    __params,
    email,
    password,
  }) {
    try {
      const validation = await this.validators.user.createSchoolAdmin({
        email,
        password,
      });
      if (!validation.ok) {
        return errorHandlers.validationError(validation);
      }

      const schoolId = __params.id;
      if (!schoolId) {
        return errorHandlers.badRequestError("schoolId is required");
      }

      // Check if user already exists
      const existingUser = await this.User.findOne({ email });
      if (existingUser) {
        return errorHandlers.conflictError("Email already in use");
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const user = await this.User.create({
        email,
        passwordHash,
        role: "SCHOOL_ADMIN",
        schoolId,
      });

      return successHandlers.created(user, "School admin created successfully");
    } catch (error) {
      return errorHandlers.serverError(error);
    }
  }

  /**
   * Find user by email
   * @param {string} userId - User ID
   * @returns {Object} User object
   */
  async getUserById(userId) {
    let user = null;
    if (!userId) {
      console.error("User ID is required to fetch user");
      return null;
    }

    user = await this.User.findById(userId);
    return user;
  }
};
