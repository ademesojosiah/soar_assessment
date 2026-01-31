const mongoose = require("mongoose");
const errorHandlers = require("../../_common/errorHandlers");
const successHandlers = require("../../_common/successHandlers");

module.exports = class Classroom {
  constructor({ config, cortex, managers, validators, mongomodels } = {}) {
    this.config = config;
    this.cortex = cortex;
    this.validators = validators;
    this.mongomodels = mongomodels;
    this.Classroom = mongomodels.Classroom;
    this.StudentClassroom = mongomodels.StudentClassroom;
    this.responseDispatcher = managers.responseDispatcher;
    this.managers = managers;

    // Http exposed methods
    this.httpExposed = [
      "createClassroom",
      "get=getAllClassrooms",
      "get=getSchoolClassrooms",
      "get=getById",
      "put=updateClassroom",
      "patch=archiveClassroom",
      "get=getClassroomRoster",
    ];

    // Role-based authorization
    this.roles = {
      createClassroom: ["SCHOOL_ADMIN"],
      getAllClassrooms: ["SCHOOL_ADMIN"],
      getSchoolClassrooms: ["SUPER_ADMIN"],
      getById: ["SCHOOL_ADMIN", "SUPER_ADMIN"],
      updateClassroom: ["SCHOOL_ADMIN", "SUPER_ADMIN"],
      archiveClassroom: ["SCHOOL_ADMIN", "SUPER_ADMIN"],
      getClassroomRoster: ["SCHOOL_ADMIN", "SUPER_ADMIN"],
    };
  }

  /**
   * Create a new classroom
   *
   * @route POST /api/classroom/createClassroom
   * @access SCHOOL_ADMIN only
   * @param {Object} __authenticate - Authentication context with user ID
   * @param {Object} __authorize - Authorization context
   * @param {string} name - Classroom name (required)
   * @param {string} grade - Grade level (required)
   * @param {number} capacity - Maximum student capacity (required)
   * @param {string} classTeacher - Teacher name (optional)
   * @param {Object} resources - Classroom resources (optional)
   * @returns {Object} Created classroom object
   * @throws {400} If validation fails
   * @throws {404} If school not found
   */
  async createClassroom({
    __authenticate,
    __authorize,
    name,
    grade,
    capacity,
    classTeacher,
    resources,
  }) {
    try {
      const userId = __authenticate.userId;

      console.log("Creating classroom by user:", userId);

      const validation = await this.validators.classroom.createClassroom({
        name,
        grade,
        capacity,
        classTeacher,
        resources,
      });

      if (!validation.ok) {
        return errorHandlers.validationError(validation);
      }

      //get school of the admin
      const school = await this.getSchoolByAdminId(__authenticate);
      if (!school) {
        return errorHandlers.notFoundError(
          "School not found for the authenticated user",
        );
      }

      const classroomData = {
        ...validation.data,
        schoolId: school.id,
        createdBy: userId,
        updatedBy: userId,
      };

      const classroom = await this.Classroom.create(classroomData);

      return successHandlers.created(
        classroom,
        "Classroom created successfully",
      );
    } catch (error) {
      return errorHandlers.serverError(
        `Failed to create classroom: ${error.message}`,
      );
    }
  }

  async getSchoolByAdminId(__authenticate) {
    let school = null;
    const user = await this.managers.user.getUserById(__authenticate.userId);
    if (!user) {
      console.error("User not found for ID:", __authenticate.userId);
      return null;
    }
    school = await this.managers.school.getSchoolById(user.schoolId);
    if (!school) {
      console.error("School not found for ID:", user.schoolId);
      return null;
    }
    return school;
  }

  /**
   * Get all classrooms for authenticated admin's school with pagination
   *
   * @route GET /api/classroom/getAllClassrooms?page=1&size=10&status=ACTIVE&search=keyword
   * @access SCHOOL_ADMIN only
   * @param {Object} __authenticate - Authentication context
   * @param {Object} __authorize - Authorization context
   * @param {Object} __query - Query parameters from URL
   * @param {number} __query.page - Page number (default: 1)
   * @param {number} __query.size - Items per page (default: 10)
   * @param {string} __query.status - Filter by status (optional)
   * @param {string} __query.search - Search by classroom name (optional)
   * @returns {Object} Object containing classrooms array and pagination metadata
   * @throws {404} If school not found for admin
   */
  async getAllClassrooms({ __authenticate, __authorize, __query }) {
    try {
      //get school of the admin
      const school = await this.getSchoolByAdminId(__authenticate);

      if (!school) {
        return errorHandlers.notFoundError("School not found for this admin");
      }

      const page = parseInt(__query.page) || 1;
      const size = parseInt(__query.size) || 10;
      const skip = (page - 1) * size;
      const status = __query.status;
      const search = __query.search || "";

      // Build query filter
      const filter = { schoolId: school.id };

      if (status) {
        filter.status = status;
      }

      // Add search filter if search query is provided
      if (search) {
        filter.$or = [{ name: { $regex: search, $options: "i" } }];
      }
      const [classrooms, total] = await Promise.all([
        this.Classroom.find(filter).sort({ name: 1 }).skip(skip).limit(size),
        this.Classroom.countDocuments(filter),
      ]);

      const totalPages = Math.ceil(total / size);

      return successHandlers.success(
        {
          classrooms,
          pagination: {
            page,
            size,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          },
        },
        "Classrooms retrieved successfully",
      );
    } catch (error) {
      return errorHandlers.serverError(
        `Failed to retrieve classrooms: ${error.message}`,
      );
    }
  }

  /**
   * Get all classrooms for a specific school with pagination
   *
   * @route GET /api/classroom/getSchoolClassrooms/:id?page=1&size=10&status=ACTIVE&search=keyword
   * @access SUPER_ADMIN only
   * @param {Object} __authenticate - Authentication context
   * @param {Object} __authorize - Authorization context
   * @param {Object} __params - URL parameters
   * @param {string} __params.id - School MongoDB ObjectId
   * @param {Object} __query - Query parameters from URL
   * @param {number} __query.page - Page number (default: 1)
   * @param {number} __query.size - Items per page (default: 10)
   * @param {string} __query.status - Filter by status (optional)
   * @param {string} __query.search - Search by classroom name (optional)
   * @returns {Object} Object containing classrooms array and pagination metadata
   * @throws {404} If school not found
   */
  async getSchoolClassrooms({
    __authenticate,
    __authorize,
    __params,
    __query,
  }) {
    try {
      //get school
      const school = await this.managers.school.getSchoolById(__params.id);

      if (!school) {
        return errorHandlers.notFoundError("School not found");
      }

      const page = parseInt(__query.page) || 1;
      const size = parseInt(__query.size) || 10;
      const skip = (page - 1) * size;
      const status = __query.status;
      const search = __query.search || "";

      // Build query filter
      const filter = { schoolId: school.id };

      if (status) {
        filter.status = status;
      }

      // Add search filter if search query is provided
      if (search) {
        filter.$or = [{ name: { $regex: search, $options: "i" } }];
      }
      const [classrooms, total] = await Promise.all([
        this.Classroom.find(filter).sort({ name: 1 }).skip(skip).limit(size),
        this.Classroom.countDocuments(filter),
      ]);

      const totalPages = Math.ceil(total / size);

      return successHandlers.success(
        {
          classrooms,
          pagination: {
            page,
            size,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          },
        },
        "Classrooms retrieved successfully",
      );
    } catch (error) {
      return errorHandlers.serverError(
        `Failed to retrieve classrooms: ${error.message}`,
      );
    }
  }

  /**
   * Get classroom by ID with role-based access control
   *
   * @route GET /api/classroom/getById/:id
   * @access SCHOOL_ADMIN, SUPER_ADMIN
   * @param {Object} __authenticate - Authentication context
   * @param {Object} __authorize - Authorization context
   * @param {Object} __params - URL parameters
   * @param {string} __params.id - Classroom MongoDB ObjectId
   * @returns {Object} Classroom object
   * @throws {400} If classroom ID is missing
   * @throws {404} If classroom not found
   */
  async getById({ __authenticate, __authorize, __params }) {
    try {
      const classroomId = __params.id;

      if (!classroomId) {
        return errorHandlers.badRequestError("Classroom ID is required");
      }

      const classroom = await this.getClassroomByIdWithRoleCheck(
        classroomId,
        __authenticate,
        __authorize,
      );

      if (!classroom) {
        return errorHandlers.notFoundError("Classroom not found");
      }

      return successHandlers.success(
        classroom,
        "Classroom retrieved successfully",
      );
    } catch (error) {
      return errorHandlers.serverError(
        `Failed to retrieve classroom: ${error.message}`,
      );
    }
  }

  /**
   * Update classroom information
   *
   * @route PUT /api/classroom/updateClassroom/:id
   * @access SCHOOL_ADMIN, SUPER_ADMIN
   * @param {Object} __authenticate - Authentication context with user ID
   * @param {Object} __authorize - Authorization context
   * @param {Object} __params - URL parameters
   * @param {string} __params.id - Classroom MongoDB ObjectId
   * @param {string} name - Updated classroom name (optional)
   * @param {string} grade - Updated grade level (optional)
   * @param {number} capacity - Updated capacity (optional)
   * @param {string} classTeacher - Updated teacher name (optional)
   * @param {Object} resources - Updated resources (optional)
   * @returns {Object} Updated classroom object
   * @throws {400} If validation fails or classroom ID is missing
   * @throws {404} If classroom not found
   */
  async updateClassroom({
    __authenticate,
    __authorize,
    __params,
    name,
    grade,
    capacity,
    classTeacher,
    resources,
  }) {
    try {
      const classroomId = __params.id;
      const userId = __authenticate.userId;

      if (!classroomId) {
        return errorHandlers.badRequestError("Classroom ID is required");
      }

      const validation = await this.validators.classroom.updateClassroom({
        name,
        grade,
        capacity,
        classTeacher,
        resources,
      });

      if (!validation.ok) {
        return errorHandlers.validationError(validation);
      }

      const classroom = await this.getClassroomByIdWithRoleCheck(
        classroomId,
        __authenticate,
        __authorize,
      );

      if (!classroom) {
        return errorHandlers.notFoundError("Classroom not found");
      }

      const updateData = {
        ...validation.data,
        updatedBy: userId,
      };

      const updatedClassroom = await this.Classroom.findOneAndUpdate(
        { _id: classroomId },
        updateData,
        { new: true, runValidators: true },
      );

      return successHandlers.updated(
        updatedClassroom,
        "Classroom updated successfully",
      );
    } catch (error) {
      return errorHandlers.serverError(
        `Failed to update classroom: ${error.message}`,
      );
    }
  }

  /**
   * Archive a classroom
   * Prevents archiving if classroom has active students
   *
   * @route PATCH /api/classroom/archiveClassroom/:id
   * @access SCHOOL_ADMIN, SUPER_ADMIN
   * @param {Object} __authenticate - Authentication context with user ID
   * @param {Object} __authorize - Authorization context
   * @param {Object} __params - URL parameters
   * @param {string} __params.id - Classroom MongoDB ObjectId
   * @returns {Object} Updated classroom object with ARCHIVED status
   * @throws {400} If classroom ID is missing
   * @throws {404} If classroom not found
   * @throws {409} If classroom is already archived or has active students
   */
  async archiveClassroom({ __authenticate, __authorize, __params }) {
    try {
      const classroomId = __params.id;

      const classroom = await this.getClassroomByIdWithRoleCheck(
        classroomId,
        __authenticate,
        __authorize,
      );

      if (!classroom) {
        return errorHandlers.notFoundError("Classroom not found");
      }

      if (classroom.status === "ARCHIVED") {
        return errorHandlers.conflictError("Classroom is already archived");
      }

      // Check if classroom has active students
      const activeStudentsCount =
        await this.managers.studentClassroom.activeStudentCount(
          classroomId,
          classroom.schoolId,
        );

      if (activeStudentsCount > 0) {
        return errorHandlers.conflictError(
          `Cannot archive classroom with ${activeStudentsCount} active student(s)`,
        );
      }

      const userId = __authenticate.userId;
      const updatedClassroom = await this.Classroom.findOneAndUpdate(
        { _id: classroomId, schoolId: classroom.schoolId },
        {
          status: "ARCHIVED",
          updatedBy: userId,
          updatedAt: new Date(),
        },
        { new: true },
      );

      if (!updatedClassroom) {
        return errorHandlers.notFoundError("Classroom not found");
      }

      return successHandlers.updated(
        updatedClassroom,
        "Classroom archived successfully",
      );
    } catch (error) {
      return errorHandlers.serverError(
        `Failed to archive classroom: ${error.message}`,
      );
    }
  }

  /**
   * Helper method: Check if classroom has active students
   * @param {string} classroomId - Classroom ID
   * @returns {boolean} True if classroom has active students
   */
  async hasActiveStudents(classroomId) {
    return await this.managers.studentClassroom.hasActiveStudents(classroomId);
  }

  /**
   * Get classroom roster - all active students in a classroom
   *
   * @route GET /api/classroom/getClassroomRoster/:id
   * @access SCHOOL_ADMIN, SUPER_ADMIN
   * @param {Object} __authenticate - Authentication context
   * @param {Object} __authorize - Authorization context
   * @param {Object} __params - URL parameters
   * @param {string} __params.id - Classroom MongoDB ObjectId
   * @returns {Object} Roster object with classroom details and students array
   * @throws {400} If classroom ID is missing
   * @throws {404} If classroom not found
   */
  async getClassroomRoster({ __authenticate, __authorize, __params }) {
    try {
      const classroomId = __params.id;

      if (!classroomId) {
        return errorHandlers.badRequestError("Classroom ID is required");
      }

      const classroom = await this.getClassroomByIdWithRoleCheck(
        classroomId,
        __authenticate,
        __authorize,
      );

      if (!classroom) {
        return errorHandlers.notFoundError("Classroom not found");
      }

      // Get all active students in this classroom using manager
      const studentClassrooms =
        await this.managers.studentClassroom.getClassroomStudents(
          classroomId,
          classroom.schoolId,
        );

      const roster = {
        classroomId: classroom._id,
        classroomName: classroom.name,
        capacity: classroom.capacity,
        totalStudents: studentClassrooms.length,
        students: studentClassrooms.map((sc) => ({
          studentId: sc.studentId._id,
          firstName: sc.studentId.firstName,
          lastName: sc.studentId.lastName,
          email: sc.studentId.email,
          enrolledDate: sc.enrolledDate,
          status: sc.isActive ? "ACTIVE" : "INACTIVE",
        })),
      };

      return successHandlers.success(
        roster,
        "Classroom roster retrieved successfully",
      );
    } catch (error) {
      return errorHandlers.serverError(
        `Failed to retrieve classroom roster: ${error.message}`,
      );
    }
  }

  /**
   * Helper method: Get classroom by ID
   * @param {string} classroomId - Classroom ID
   * @returns {Object|null} Classroom object or null if not found
   */
  async getClassroomById(classroomId) {
    let classroom = null;

    if (!classroomId) {
      console.error("classroom ID is required to fetch classroom");
      return null;
    }

    classroom = await this.Classroom.findById(classroomId);
    return classroom;
  }

  /**
   * Helper method: Get classroom by ID with role-based access control
   * @param {string} classroomId - Classroom ID
   * @param {Object} __authenticate - Authentication context
   * @param {Object} __authorize - Authorization context
   * @returns {Object|null} Classroom object or null if not found
   */
  async getClassroomByIdWithRoleCheck(
    classroomId,
    __authenticate,
    __authorize,
  ) {
    let classroom = null;

    if (!classroomId) {
      console.error("Classroom ID is required");
      return null;
    }

    if (__authorize.role === "SCHOOL_ADMIN") {
      const school = await this.getSchoolByAdminId(__authenticate);

      if (!school) {
        console.error("School not found for this admin");
        return null;
      }

      classroom = await this.Classroom.findOne({
        _id: classroomId,
        schoolId: school.id,
      });
    } else {
      classroom = await this.getClassroomById(classroomId);
    }

    return classroom;
  }
};
