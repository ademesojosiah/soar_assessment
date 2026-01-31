const mongoose = require("mongoose");
const errorHandlers = require("../../_common/errorHandlers");
const successHandlers = require("../../_common/successHandlers");

module.exports = class Student {
  constructor({ config, cortex, managers, validators, mongomodels } = {}) {
    this.config = config;
    this.cortex = cortex;
    this.validators = validators;
    this.mongomodels = mongomodels;
    this.managers = managers;
    this.Student = mongomodels.Student;
    this.responseDispatcher = managers.responseDispatcher;

    // Http exposed methods
    this.httpExposed = [
      "createStudent",
      "get=getAllStudents",
      "get=getSchoolStudents",
      "get=getById",
      "put=updateStudent",
      "patch=graduateStudent",
      "get=getCurrentStudentClassroom",
      "get=getEnrollmentHistory",
    ];

    // Role-based authorization
    this.roles = {
      createStudent: ["SCHOOL_ADMIN"],
      getAllStudents: ["SCHOOL_ADMIN"],
      getSchoolStudents: ["SUPER_ADMIN"],
      getById: ["SCHOOL_ADMIN","SUPER_ADMIN"],
      updateStudent: ["SCHOOL_ADMIN","SUPER_ADMIN"],
      graduateStudent: ["SCHOOL_ADMIN","SUPER_ADMIN"],
      getCurrentStudentClassroom: ["SCHOOL_ADMIN","SUPER_ADMIN"],
      getEnrollmentHistory: ["SCHOOL_ADMIN","SUPER_ADMIN"],
    }
  }

  /**
   * Helper method: Get school ID from authenticated admin user
   * @param {Object} __authenticate - Authentication context with userId
   * @returns {string|null} School ID or null if not found
   */
  async getSchoolIdFromAdmin(__authenticate) {
    const user = await this.managers.user.getUserById(__authenticate.userId);
    if (!user) {
      console.error("User not found for ID:", __authenticate.userId);
      return null;
    }
    if (!user.schoolId) {
      console.error("User does not have a schoolId:", __authenticate.userId);
      return null;
    }
    return user.schoolId;
  }

  /**
   * Helper method: Get student by ID with school verification
   * @param {string} studentId - Student ID
   * @param {string} schoolId - School ID for verification
   * @returns {Object|null} Student object or null if not found
   */
  async getStudentById(studentId, schoolId) {
    if (!studentId || !schoolId) {
      console.error("Student ID and School ID are required");
      return null;
    }
    const student = await this.Student.findOne({ _id: studentId, schoolId });
    return student;
  }

    /**
   * Helper method: Get student by ID
   * @param {string} studentId - Student ID
   * @returns {Object|null} Student object or null if not found
   */
  async getStudentByStudentId(studentId, ) {
    if (!studentId ) {
      console.error("Student ID is required");
      return null;
    }
    const student = await this.Student.findById(studentId );
    return student;
  }




  /**
   * Helper method: Generate unique registration number
   * Format: STU-YYYY-XXXXXX (e.g., STU-2026-000001)
   * @param {string} schoolId - School ID for scoping the registration number
   * @returns {string} Unique registration number
   */
  async generateRegistrationNumber(schoolId) {
    const year = new Date().getFullYear();
    const prefix = `STU-${year}-`;

    // Find the last student with this prefix in this school
    const lastStudent = await this.Student.findOne({
      schoolId,
      registrationNumber: { $regex: `^${prefix}` },
    })
      .sort({ registrationNumber: -1 })
      .select("registrationNumber");

    let nextNumber = 1;
    if (lastStudent && lastStudent.registrationNumber) {
      const lastNumber = parseInt(
        lastStudent.registrationNumber.replace(prefix, ""),
        10,
      );
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    // Pad number to 6 digits
    const paddedNumber = String(nextNumber).padStart(6, "0");
    return `${prefix}${paddedNumber}`;
  }

  /**
   * Create a new student
   *
   * @route POST /api/student/createStudent
   * @access SCHOOL_ADMIN only
   * @param {Object} __authenticate - Authentication context with user ID
   * @param {Object} __authorize - Authorization context
   * @param {string} firstName - Student first name (required)
   * @param {string} lastName - Student last name (required)
   * @param {string} email - Student email (required, unique)
   * @param {string} dateOfBirth - Date of birth (required)
   * @param {string} phone - Phone number (optional)
   * @param {string} address - Address (optional)
   * @returns {Object} Created student object with auto-generated registration number
   * @throws {400} If validation fails
   * @throws {404} If school not found for admin
   * @throws {409} If email already exists
   */
  async createStudent({
    __authenticate,
    __authorize,
    firstName,
    lastName,
    email,
    dateOfBirth,
    phone,
    address,
  }) {
    try {
      const userId = __authenticate.userId;

      const schoolId = await this.getSchoolIdFromAdmin(__authenticate);
      if (!schoolId) {
        return errorHandlers.notFoundError(
          "School not found for the authenticated user",
        );
      }

      const validation = await this.validators.student.createStudent({
        firstName,
        lastName,
        email,
        dateOfBirth,
        phone,
        address,
      });

      if (!validation.ok) {
        return errorHandlers.validationError(validation);
      }

      // Generate unique registration number
      const registrationNumber = await this.generateRegistrationNumber(schoolId);

      const studentData = {
        ...validation.data,
        registrationNumber,
        schoolId,
        createdBy: userId,
        updatedBy: userId,
      };

      const student = await this.Student.create(studentData);

      return successHandlers.created(student, "Student created successfully");
    } catch (error) {
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        return errorHandlers.conflictError(
          `Student with this ${field} already exists`,
        );
      }

      return errorHandlers.serverError(
        `Failed to create student: ${error.message}`,
      );
    }
  }

  /**
   * Get all active students for the admin's school with pagination
   *
   * @route GET /api/student/getAllStudents?page=1&size=10&status=ACTIVE&search=keyword
   * @access SCHOOL_ADMIN only
   * @param {Object} __authenticate - Authentication context
   * @param {Object} __authorize - Authorization context
   * @param {Object} __query - Query parameters from URL
   * @param {number} __query.page - Page number (default: 1)
   * @param {number} __query.size - Items per page (default: 10)
   * @param {string} __query.status - Filter by status: ACTIVE, GRADUATED, TRANSFERRED, WITHDRAWN (default: ACTIVE)
   * @param {string} __query.search - Search by name, email, or registration number (optional)
   * @returns {Object} Object containing students array and pagination metadata
   * @throws {404} If school not found for admin
   */
  async getAllStudents({ __authenticate, __authorize, __query }) {
    try {
      const schoolId = await this.getSchoolIdFromAdmin(__authenticate);
      if (!schoolId) {
        return errorHandlers.notFoundError(
          "School not found for the authenticated user",
        );
      }

      const page = parseInt(__query.page) || 1;
      const size = parseInt(__query.size) || 10;
      const skip = (page - 1) * size;
      const status = __query.status;
      const search = __query.search || "";

      // Build query filter
      const filter = { schoolId };
      if (status) {
        filter.status = status;
      }

      // Add search filter if search query is provided
      if (search) {
        filter.$or = [
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { registrationNumber: { $regex: search, $options: "i" } },
        ];
      }

      const [students, total] = await Promise.all([
        this.Student.find(filter)
          .sort({ firstName: 1, lastName: 1 })
          .skip(skip)
          .limit(size),
        this.Student.countDocuments(filter),
      ]);

      const totalPages = Math.ceil(total / size);

      return successHandlers.success(
        {
          students,
          pagination: {
            page,
            size,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          },
        },
        "Students retrieved successfully",
      );
    } catch (error) {
      return errorHandlers.serverError(
        `Failed to retrieve students: ${error.message}`,
      );
    }
  }


    /**
   * Get all active students for the admin's school with pagination
   *
   * @route GET /api/student/getSchoolStudents?page=1&size=10&status=ACTIVE&search=keyword
   * @access SUPER_ADMIN only
   * @param {Object} __authenticate - Authentication context
   * @param {Object} __authorize - Authorization context
   * @param {Object} __query - Query parameters from URL
   * @param {number} __query.page - Page number (default: 1)
   * @param {number} __query.size - Items per page (default: 10)
   * @param {string} __query.status - Filter by status: ACTIVE, GRADUATED, TRANSFERRED, WITHDRAWN (default: ACTIVE)
   * @param {string} __query.search - Search by name, email, or registration number (optional)
   * @returns {Object} Object containing students array and pagination metadata
   * @throws {404} If school not found for admin
   */
  async getSchoolStudents({ __authenticate, __authorize, __query, __params }) {
    try {
        const school = await this.managers.school.getSchoolById(__params.id);

        if (!school) {
            return errorHandlers.notFoundError('School not found');
        } 

      const page = parseInt(__query.page) || 1;
      const size = parseInt(__query.size) || 10;
      const skip = (page - 1) * size;
      const status = __query.status;
      const search = __query.search || "";

      // Build query filter
      const filter = { schoolId: school._id };
      if (status) {
        filter.status = status;
      }

      // Add search filter if search query is provided
      if (search) {
        filter.$or = [
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { registrationNumber: { $regex: search, $options: "i" } },
        ];
      }

      const [students, total] = await Promise.all([
        this.Student.find(filter)
          .sort({ firstName: 1, lastName: 1 })
          .skip(skip)
          .limit(size),
        this.Student.countDocuments(filter),
      ]);

      const totalPages = Math.ceil(total / size);

      return successHandlers.success(
        {
          students,
          pagination: {
            page,
            size,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          },
        },
        "Students retrieved successfully",
      );
    } catch (error) {
      return errorHandlers.serverError(
        `Failed to retrieve students: ${error.message}`,
      );
    }
  }

  /**
   * Get student by ID
   *
   * @route GET /api/student/getById/:id
   * @access SCHOOL_ADMIN , SUPER_ADMIN
   * @param {Object} __authenticate - Authentication context
   * @param {Object} __authorize - Authorization context
   * @param {Object} __params - URL parameters
   * @param {string} __params.id - Student MongoDB ObjectId
   * @returns {Object} Student object with all details
   * @throws {400} If student ID is missing
   * @throws {404} If student or school not found
   */
  async getById({ __authenticate, __authorize, __params }) {
    try {
      const studentId = __params.id;
      if (!studentId) {
        return errorHandlers.badRequestError("Student ID is required");
      }


      const student = await this.getStudentByIdWithRoleCheck(studentId, __authenticate, __authorize );
      if (!student) {
        return errorHandlers.notFoundError("Student not found");
      }

      return successHandlers.success(student, "Student retrieved successfully");
    } catch (error) {
      return errorHandlers.serverError(
        `Failed to retrieve student: ${error.message}`,
      );
    }
  }

  /**
   * Update student details
   *
   * @route PUT /api/student/updateStudent/:id
   * @access SCHOOL_ADMIN , SUPER_ADMIN
   * @param {Object} __authenticate - Authentication context with user ID
   * @param {Object} __authorize - Authorization context
   * @param {Object} __params - URL parameters
   * @param {string} __params.id - Student MongoDB ObjectId
   * @param {string} firstName - Updated first name (optional)
   * @param {string} lastName - Updated last name (optional)
   * @param {string} email - Updated email (optional, must be unique)
   * @param {string} dateOfBirth - Updated date of birth (optional)
   * @param {string} phone - Updated phone number (optional)
   * @param {string} address - Updated address (optional)
   * @returns {Object} Updated student object
   * @throws {400} If student ID is missing or validation fails
   * @throws {404} If student or school not found
   * @throws {409} If email already exists
   */
  async updateStudent({
    __authenticate,
    __authorize,
    __params,
    firstName,
    lastName,
    email,
    dateOfBirth,
    phone,
    address,
  }) {
    try {
      const studentId = __params.id;
      if (!studentId) {
        return errorHandlers.badRequestError("Student ID is required");
      }

      const userId = __authenticate.userId;

      const validation = await this.validators.student.updateStudent({
        firstName,
        lastName,
        email,
        dateOfBirth,
        phone,
        address,
      });

      if (!validation.ok) {
        return errorHandlers.validationError(validation);
      }

      
      const student = await this.getStudentByIdWithRoleCheck(studentId, __authenticate, __authorize );
      if (!student) {
        return errorHandlers.notFoundError("Student not found");
      }

      const updateData = {
        ...validation.data,
        updatedBy: userId,
        updatedAt: new Date(),
      };

      const updatedStudent = await this.Student.findOneAndUpdate(
        { _id: studentId },
        updateData,
        { new: true, runValidators: true },
      );

      if (!updatedStudent) {
        return errorHandlers.notFoundError("Student not found");
      }

      return successHandlers.updated(updatedStudent, "Student updated successfully");
    } catch (error) {
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        return errorHandlers.conflictError(
          `Student with this ${field} already exists`,
        );
      }

      return errorHandlers.serverError(
        `Failed to update student: ${error.message}`,
      );
    }
  }

  /**
   * Graduate a student
   * Ends active enrollment and marks student as graduated
   *
   * @route PATCH /api/student/graduateStudent/:id
   * @access SCHOOL_ADMIN , SUPER_ADMIN
   * @param {Object} __authenticate - Authentication context with user ID
   * @param {Object} __authorize - Authorization context
   * @param {Object} __params - URL parameters
   * @param {string} __params.id - Student MongoDB ObjectId
   * @returns {Object} Updated student object with GRADUATED status
   * @throws {400} If student ID is missing
   * @throws {404} If student or school not found
   */
  async graduateStudent({ __authenticate, __authorize, __params }) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const studentId = __params.id;
      if (!studentId) {
        await session.abortTransaction();
        return errorHandlers.badRequestError("Student ID is required");
      }

      const userId = __authenticate.userId;

    const student = await this.getStudentByIdWithRoleCheck(studentId, __authenticate, __authorize );
      if (!student) {
        await session.abortTransaction();

        return errorHandlers.notFoundError("Student not found");
      }

      // Check if student is already graduated
      if (student.status === "GRADUATED") {
        await session.abortTransaction();
        return errorHandlers.conflictError("Student is already graduated");
      }

      // Check if student is inactive (TRANSFERRED, WITHDRAWN, etc.)
      if (student.status !== "ACTIVE") {
        await session.abortTransaction();
        return errorHandlers.conflictError(`Cannot graduate student with status: ${student.status}`);
      }


      // Use lazy access to avoid circular dependency
      await this.managers.studentClassroom.graduateStudent(studentId, student.schoolId, session);

      // Update student status to graduated
      const updatedStudent = await this.Student.findOneAndUpdate(
        { _id: studentId, schoolId: student.schoolId },
        {
          status: "GRADUATED",
          updatedBy: userId,
          updatedAt: new Date(),
        },
        { session, new: true },
      );

      if (!updatedStudent) {
        await session.abortTransaction();
        return errorHandlers.notFoundError("Student not found");
      }

      await session.commitTransaction();

      return successHandlers.updated(updatedStudent, "Student graduated successfully");
    } catch (error) {
      await session.abortTransaction();
      return errorHandlers.serverError(
        `Failed to graduate student: ${error.message}`,
      );
    } finally {
      session.endSession();
    }
  }

  /**
   * Get current classroom for a student
   *
   * @route GET /api/student/getCurrentClassroom/:id
   * @access SCHOOL_ADMIN , SUPER_ADMIN
   * @param {Object} __authenticate - Authentication context
   * @param {Object} __authorize - Authorization context
   * @param {Object} __params - URL parameters
   * @param {string} __params.id - Student MongoDB ObjectId
   * @returns {Object} Current classroom details or null if not enrolled
   * @throws {400} If student ID is missing
   * @throws {404} If school not found for admin
   */
  async getCurrentStudentClassroom({ __authenticate, __authorize, __params }) {
    try {
      const studentId = __params.id;
      if (!studentId) {
        return errorHandlers.badRequestError("Student ID is required");
      }

    const student = await this.getStudentByIdWithRoleCheck(studentId, __authenticate, __authorize );
      if (!student) {
        await session.abortTransaction();

        return errorHandlers.notFoundError("Student not found");
      }


      const enrollment = await this.managers.studentClassroom.getCurrentEnrollment(
        studentId,
        student.schoolId,
      );

      if (!enrollment) {
        return errorHandlers.notFoundError(
          "Student is not currently enrolled in any classroom",
        );
      }

      const data = {
        classroomId: enrollment.classroomId._id,
        classroomName: enrollment.classroomId.name,
        capacity: enrollment.classroomId.capacity,
        resources: enrollment.classroomId.resources,
        enrolledDate: enrollment.enrolledDate,
      };

      return successHandlers.success(
        data,
        "Current classroom retrieved successfully",
      );
    } catch (error) {
      return errorHandlers.serverError(
        `Failed to retrieve current classroom: ${error.message}`,
      );
    }
  }

  /**
   * Get enrollment history for a student
   * Shows all past and present classroom enrollments
   *
   * @route GET /api/student/getEnrollmentHistory/:id
   * @access SCHOOL_ADMIN, SUPER_ADMIN
   * @param {Object} __authenticate - Authentication context
   * @param {Object} __authorize - Authorization context
   * @param {Object} __params - URL parameters
   * @param {string} __params.id - Student MongoDB ObjectId
   * @returns {Array} Array of enrollment records with classroom details
   * @throws {400} If student ID is missing
   * @throws {404} If school not found for admin
   */
  async getEnrollmentHistory({ __authenticate, __authorize, __params }) {
    try {
      const studentId = __params.id;
      if (!studentId) {
        return errorHandlers.badRequestError("Student ID is required");
      }

    const student = await this.getStudentByIdWithRoleCheck(studentId, __authenticate, __authorize );
      if (!student) {
        return errorHandlers.notFoundError("Student not found");
      }

      const enrollments = await this.managers.studentClassroom.getEnrollments(
        studentId,
        student.schoolId,
      );

      if (!enrollments || enrollments.length === 0) {
        return successHandlers.success([], "No enrollment history found");
      }

      const history = enrollments.map((enrollment) => ({
        classroomId: enrollment.classroomId._id,
        classroomName: enrollment.classroomId.name,
        enrolledDate: enrollment.enrolledDate,
        endDate: enrollment.endDate || null,
        reason: enrollment.reason || "ACTIVE",
        isActive: enrollment.isActive,
      }));

      return successHandlers.success(
        history,
        "Enrollment history retrieved successfully",
      );
    } catch (error) {
      return errorHandlers.serverError(
        `Failed to retrieve enrollment history: ${error.message}`,
      );
    }
  }


    /**
   * Helper method: Get student by ID with role-based access control
   * @param {string} studentId - Student ID
   * @param {Object} __authenticate - Authentication context
   * @param {Object} __authorize - Authorization context
   * @returns {Object|null} Classroom object or null if not found
   */
  async getStudentByIdWithRoleCheck(studentId, __authenticate, __authorize) {
    let student = null;

    if (!studentId) {
      console.error('Student ID is required');
      return null;
    }

      if (__authorize.role === 'SCHOOL_ADMIN') {
        const schoolId = await this.getSchoolIdFromAdmin(__authenticate);

        if (!schoolId) {
          console.error('School not found for this admin');
          return null;
        }

        student = await this.getStudentById(studentId,schoolId);
      } else {
        student = await this.getStudentByStudentId(studentId);
      }

      return student;

  }
};
