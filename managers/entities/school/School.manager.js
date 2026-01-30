const errorHandlers = require("../../_common/errorHandlers");
const successHandlers = require("../../_common/successHandlers");

module.exports = class School {
  constructor({ config, cortex, managers, validators, mongomodels } = {}) {
    this.config = config;
    this.cortex = cortex;
    this.validators = validators;
    this.mongomodels = mongomodels;
    this.School = mongomodels.School;

    // Http exposed methods
    this.httpExposed = [
      "createSchool",
      "get=getAllSchools",
      "get=getById",
      "put=updateSchool",
      "patch=toggleSchoolStatus",
    ];

    // Role-based authorization
    this.roles = {
      createSchool: ["SUPER_ADMIN"],
      getAllSchools: ["SUPER_ADMIN"],
      getById: ["SUPER_ADMIN"],
      updateSchool: ["SUPER_ADMIN"],
      toggleSchoolStatus: ["SUPER_ADMIN"],
    };
  }

  /**
   * Create a new school in the system
   *
   * @route POST /api/school/createSchool
   * @access SUPER_ADMIN only
   * @param {Object} __authenticate - Authentication context with user ID
   * @param {Object} __authorize - Authorization context
   * @param {string} name - School name (required)
   * @param {string} email - School contact email (required, unique)
   * @param {string} phone - School phone number (required)
   * @param {string} address - School physical address (required)
   * @param {string} city - City where school is located (optional)
   * @param {string} state - State/Province (optional)
   * @param {string} country - Country (optional)
   * @returns {Object} Created school object with success message
   * @throws {409} If email already exists
   * @throws {400} If validation fails
   */
  async createSchool({
    __authenticate,
    __authorize,
    name,
    email,
    phone,
    address,
    city,
    state,
    country,
  }) {
    try {
      const validation = await this.validators.school.createSchool({
        name,
        email,
        phone,
        address,
        city,
        state,
        country,
      });

      if (!validation.ok) {
        return errorHandlers.validationError(validation);
      }

      const userId = __authenticate.id;
      console.log("Creating school by user:", validation.data, userId);
      const schoolData = {
        ...validation.data,
        createdBy: userId,
        updatedBy: userId,
      };

      const school = await this.School.create(schoolData);
      return successHandlers.created(school, "School created successfully");
    } catch (error) {
      if (error.code === 11000) {
        return errorHandlers.conflictError(
          "School with this email already exists",
        );
      }

      return errorHandlers.serverError(
        `Failed to create school: ${error.message}`,
      );
    }
  }

  /**
   * Retrieve all schools with pagination and filtering
   *
   * @route GET /api/school/getAllSchools?page=1&size=10&status=ACTIVE&search=keyword
   * @access SUPER_ADMIN only
   * @param {Object} __authenticate - Authentication context
   * @param {Object} __authorize - Authorization context
   * @param {Object} __query - Query parameters from URL
   * @param {number} __query.page - Page number (default: 1)
   * @param {number} __query.size - Items per page (default: 10)
   * @param {string} __query.status - Filter by status: ACTIVE or INACTIVE (default: ACTIVE)
   * @param {string} __query.search - Search by school name, email, or address (optional)
   * @returns {Object} Object containing schools array and pagination metadata
   */
  async getAllSchools({ __authenticate, __authorize, __query }) {
    try {
      const page = parseInt(__query.page) || 1;
      const size = parseInt(__query.size) || 10;
      const skip = (page - 1) * size;
      const status = __query.status || "ACTIVE";
      const search = __query.search || "";

      // Build query filter
      const filter = { status };

      // Add search filter if search query is provided
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { address: { $regex: search, $options: "i" } },
          { city: { $regex: search, $options: "i" } },
        ];
      }

      const [schools, total] = await Promise.all([
        this.School.find(filter).sort({ createdAt: -1 }).skip(skip).limit(size),
        this.School.countDocuments(filter),
      ]);

      const totalPages = Math.ceil(total / size);

      return successHandlers.success(
        {
          schools,
          pagination: {
            page,
            size,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          },
        },
        "Schools retrieved successfully",
      );
    } catch (error) {
      return errorHandlers.serverError(
        `Failed to retrieve schools: ${error.message}`,
      );
    }
  }

  /**
   * Retrieve a single school by ID
   *
   * @route GET /api/school/getById/:id
   * @access SUPER_ADMIN only
   * @param {Object} __authenticate - Authentication context
   * @param {Object} __authorize - Authorization context
   * @param {Object} __params - URL parameters
   * @param {string} __params.id - School MongoDB ObjectId
   * @returns {Object} School object with all details
   * @throws {404} If school not found
   * @throws {400} If school ID is missing
   */
  async getById({ __authenticate, __authorize, __params }) {
    try {
      const schoolId = __params.id;
      if (!schoolId) {
        return errorHandlers.badRequestError("School ID is required");
      }

      const school = await this.School.findById(schoolId);

      if (!school) {
        return errorHandlers.notFoundError("School not found");
      }

      return successHandlers.success(school, "School retrieved successfully");
    } catch (error) {
      return errorHandlers.serverError(
        `Failed to retrieve school: ${error.message}`,
      );
    }
  }

  /**
   * Update school information
   *
   * @route PUT /api/school/updateSchool/:id
   * @access SUPER_ADMIN only
   * @param {Object} __authenticate - Authentication context with user ID
   * @param {Object} __authorize - Authorization context
   * @param {Object} __params - URL parameters
   * @param {string} __params.id - School MongoDB ObjectId
   * @param {string} name - Updated school name (optional)
   * @param {string} email - Updated email (optional, must be unique)
   * @param {string} phone - Updated phone number (optional)
   * @param {string} address - Updated address (optional)
   * @param {string} city - Updated city (optional)
   * @param {string} state - Updated state (optional)
   * @param {string} country - Updated country (optional)
   * @returns {Object} Updated school object
   * @throws {404} If school not found
   * @throws {409} If email already exists
   * @throws {400} If validation fails
   */
  async updateSchool({
    __authenticate,
    __authorize,
    __params,
    name,
    email,
    phone,
    address,
    city,
    state,
    country,
  }) {
    try {
      const schoolId = __params.id;
      if (!schoolId) {
        return errorHandlers.badRequestError("School ID is required");
      }

      const validation = await this.validators.school.updateSchool({
        name,
        email,
        phone,
        address,
        city,
        state,
        country,
      });

      if (!validation.ok) {
        return errorHandlers.validationError(validation);
      }

      const userId = __authenticate.userId;
      const updateData = {
        ...validation.data,
        updatedBy: userId,
      };

      const school = await this.School.findByIdAndUpdate(schoolId, updateData, {
        new: true,
        runValidators: true,
      });

      if (!school) {
        return errorHandlers.notFoundError("School not found");
      }

      return successHandlers.updated(school, "School updated successfully");
    } catch (error) {
      if (error.code === 11000) {
        return errorHandlers.conflictError("Email already exists");
      }

      return errorHandlers.serverError(
        `Failed to update school: ${error.message}`,
      );
    }
  }

  /**
   * Toggle school status between ACTIVE and INACTIVE
   *
   * @route PATCH /api/school/toggleSchoolStatus/:id
   * @access SUPER_ADMIN only
   * @param {Object} __authenticate - Authentication context with user ID
   * @param {Object} __authorize - Authorization context
   * @param {Object} __params - URL parameters
   * @param {string} __params.id - School MongoDB ObjectId
   * @returns {Object} Updated school object with new status
   * @throws {404} If school not found
   * @throws {400} If school ID is missing
   */
  async toggleSchoolStatus({ __authenticate, __authorize, __params }) {
    try {
      const schoolId = __params.id;
      if (!schoolId) {
        return errorHandlers.badRequestError("School ID is required");
      }

      const school = await this.School.findById(schoolId);

      if (!school) {
        return errorHandlers.notFoundError("School not found");
      }

      const userId = __authenticate.userId;
      const newStatus = school.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

      school.status = newStatus;
      school.updatedBy = userId;
      await school.save();

      const action = newStatus === "ACTIVE" ? "activated" : "deactivated";
      return successHandlers.updated(school, `School ${action} successfully`);
    } catch (error) {
      return errorHandlers.serverError(
        `Failed to toggle school status: ${error.message}`,
      );
    }
  }
};
