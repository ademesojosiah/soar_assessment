const mongoose = require("mongoose");
const errorHandlers = require("../../_common/errorHandlers");
const successHandlers = require("../../_common/successHandlers");

module.exports = class StudentClassroom {
  constructor({ config, cortex, managers, validators, mongomodels } = {}) {
    this.config = config;
    this.cortex = cortex;
    this.validators = validators;
    this.mongomodels = mongomodels;
    this.StudentClassroom = mongomodels.StudentClassroom;
    this.responseDispatcher = managers.responseDispatcher;
    this.managers = managers;

    // HTTP exposed methods
    this.httpExposed = [
      "enrollStudent",
      "put=transferStudent",
      "patch=endEnrollment",
    ];

    // Role-based authorization
    this.roles = {
      enrollStudent: ["SCHOOL_ADMIN"],
      transferStudent: ["SCHOOL_ADMIN"],
      endEnrollment: ["SCHOOL_ADMIN"],
    };
  }

  /**
   * Helper method: Verify student exists and belongs to school
   * @param {string} studentId - Student ID
   * @param {string} schoolId - School ID for verification
   * @returns {Object|null} Student object or null if not found
   */
  async verifyStudent(studentId, schoolId) {
    if (!studentId || !schoolId) {
      console.error("Student ID and School ID are required");
      return null;
    }
    const student = await this.managers.student.getStudentById(
      studentId,
      schoolId,
    );
    return student;
  }

  /**
   * Helper method: Verify classroom exists and belongs to school
   * @param {string} classroomId - Classroom ID
   * @param {string} schoolId - School ID for verification
   * @returns {Object|null} Classroom object or null if not found
   */
  async verifyClassroom(classroomId, schoolId) {
    if (!classroomId || !schoolId) {
      console.error("Classroom ID and School ID are required");
      return null;
    }
    const classroom =
      await this.managers.classroom.getClassroomById(classroomId);
    // Verify classroom belongs to the school
    if (classroom && classroom.schoolId.toString() !== schoolId.toString()) {
      console.error("Classroom does not belong to this school");
      return null;
    }
    return classroom;
  }

  /**
   * Helper method: Get current active enrollment for a student
   * @param {string} studentId - Student ID
   * @param {string} schoolId - School ID for verification
   * @returns {Object|null} Enrollment object with classroom details or null if not enrolled
   */
  async getCurrentEnrollment(studentId, schoolId) {
    if (!studentId || !schoolId) {
      console.error("Student ID and School ID are required");
      return null;
    }

    const enrollment = await this.StudentClassroom.findOne({
      studentId,
      schoolId,
      isActive: true,
    }).populate("classroomId", "name capacity resources");

    return enrollment;
  }

  /**
   * Helper method: Check if classroom has active students
   * @param {string} classroomId - Classroom ID
   * @returns {boolean} True if classroom has active students
   */
  async hasActiveStudents(classroomId) {
    if (!classroomId) {
      console.error("Classroom ID is required");
      return false;
    }

    const count = await this.StudentClassroom.countDocuments({
      classroomId,
      isActive: true,
    });

    return count > 0;
  }

  /**
   * Helper method: Get all active students in a classroom
   * @param {string} classroomId - Classroom ID
   * @param {string} schoolId - School ID for verification
   * @returns {Array} Array of student enrollments with student details
   */
  async getClassroomStudents(classroomId, schoolId) {
    if (!classroomId || !schoolId) {
      console.error("Classroom ID and School ID are required");
      return [];
    }

    const studentEnrollments = await this.StudentClassroom.find({
      classroomId,
      schoolId,
      isActive: true,
    })
      .populate("studentId", "firstName lastName email dateOfBirth")
      .sort({ createdAt: 1 });

    return studentEnrollments;
  }

  /**
   * Helper method: Get enrollments for a student
   * @param {string} studentId - Student ID
   * @param {string} schoolId - School ID for verification
   * @returns {Object|null} Enrollments object with classroom details or null if not enrolled
   */
  async getEnrollments(studentId, schoolId) {
    if (!studentId || !schoolId) {
      console.error("Student ID and School ID are required");
      return null;
    }

    const enrollments = await this.StudentClassroom.find({
      studentId,
      schoolId,
    })
      .populate("classroomId", "name")
      .sort({ enrolledDate: -1 });

    return enrollments;
  }

  /**
   * Check if classroom has active students
   * @param {string} classroomId - Classroom ID
   * @param {string} schoolId - School ID
   */
  async activeStudentCount(classroomId, schoolId) {
    try {
      // Check if classroom has active students
      const activeStudentsCount = await this.StudentClassroom.countDocuments({
        classroomId,
        schoolId,
        isActive: true,
      });

      return activeStudentsCount;
    } catch (error) {
      throw new Error(`Failed to get active students: ${error.message}`);
    }
  }

  /**
   * Check if classroom has active students
   * @param {string} classroomId - Classroom ID
   * @returns {boolean} True if has active students
   */
  async hasActiveStudents(classroomId) {
    try {
      const count = await this.StudentClassroom.countDocuments({
        classroomId,
        isActive: true,
      });

      return count > 0;
    } catch (error) {
      throw new Error(`Failed to check active students: ${error.message}`);
    }
  }

  /**
   * Enroll a student in a classroom
   *
   * @route POST /api/studentClassroom/enrollStudent/:id
   * @access SCHOOL_ADMIN only
   * @param {Object} __authenticate - Authentication context with user ID
   * @param {Object} __authorize - Authorization context
   * @param {Object} __params - URL parameters
   * @param {string} __params.id - Student MongoDB ObjectId
   * @param {string} classroomId - Classroom ID to enroll student in (required)
   * @returns {Object} Created enrollment record
   * @throws {400} If student ID or classroom ID is missing
   * @throws {404} If student, classroom, or school not found
   * @throws {409} If student is already enrolled in the classroom
   */
  async enrollStudent({ __authenticate, __authorize, __params, classroomId }) {
    try {
      const studentId = __params.id;
      const userId = __authenticate.userId;

      const validation = await this.validators.studentClassroom.enrollStudent({
        studentId,
        classroomId,
      });

      if (!validation.ok) {
        return errorHandlers.validationError(validation);
      }

      const schoolId =
        await this.managers.student.getSchoolIdFromAdmin(__authenticate);
      if (!schoolId) {
        return errorHandlers.notFoundError(
          "School not found for the authenticated user",
        );
      }

      // Verify student exists and belongs to school
      const student = await this.managers.student.getStudentById(
        studentId,
        schoolId,
      );
      if (!student) {
        return errorHandlers.notFoundError("Student not found in this school");
      }

      // Verify classroom exists and belongs to school
      const classroom = await this.verifyClassroom(classroomId, schoolId);
      if (!classroom) {
        return errorHandlers.notFoundError(
          "Classroom not found in this school",
        );
      }

      // Check classroom capacity
      const currentEnrollmentCount = await this.activeStudentCount(
        classroomId,
        schoolId,
      );
      if (currentEnrollmentCount >= classroom.capacity) {
        return errorHandlers.conflictError(
          `Classroom is at full capacity (${classroom.capacity} students)`,
        );
      }

      // Check if student is already enrolled in this classroom
      const existingEnrollment = await this.StudentClassroom.findOne({
        studentId,
        classroomId,
        isActive: true,
      });

      if (existingEnrollment) {
        return errorHandlers.conflictError(
          "Student is already enrolled in this classroom",
        );
      }

      // Create enrollment record
      const enrollment = await this.StudentClassroom.create({
        studentId,
        classroomId,
        schoolId,
        createdBy: userId,
        reason: "ENROLLMENT",
      });

      return successHandlers.created(
        enrollment,
        "Student enrolled successfully",
      );
    } catch (error) {
      return errorHandlers.serverError(
        `Failed to enroll student: ${error.message}`,
      );
    }
  }

  /**
   * Transfer student to a different classroom
   * Handles transactional operations: ends old enrollment, creates new one
   *
   * @route PUT /api/studentClassroom/transferStudent/:id
   * @access SCHOOL_ADMIN only
   * @param {Object} __authenticate - Authentication context with user ID
   * @param {Object} __authorize - Authorization context
   * @param {Object} __params - URL parameters
   * @param {string} __params.id - Student MongoDB ObjectId
   * @param {string} newClassroomId - New classroom ID to transfer student to (required)
   * @returns {Object} New enrollment record
   * @throws {400} If student ID or new classroom ID is missing, or student has no active enrollment
   * @throws {404} If student, classroom, or school not found
   * @throws {409} If student is already in the target classroom
   */
  async transferStudent({
    __authenticate,
    __authorize,
    __params,
    newClassroomId,
  }) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const studentId = __params.id;
      const userId = __authenticate.userId;

      const validation = await this.validators.studentClassroom.transferStudent(
        {
          studentId,
          newClassroomId,
        },
      );

      if (!validation.ok) {
        await session.abortTransaction();
        return errorHandlers.validationError(validation);
      }

      const schoolId =
        await this.managers.student.getSchoolIdFromAdmin(__authenticate);
      if (!schoolId) {
        await session.abortTransaction();
        return errorHandlers.notFoundError(
          "School not found for the authenticated user",
        );
      }

      // Verify student exists and belongs to school
      const student = await this.managers.student.getStudentById(
        studentId,
        schoolId,
      );

      if (!student) {
        await session.abortTransaction();
        return errorHandlers.notFoundError("Student not found in this school");
      }

      // Verify new classroom exists and belongs to school
      const newClassroom =
        await this.managers.classroom.getClassroomById(newClassroomId);

      if (
        !newClassroom ||
        newClassroom.schoolId.toString() !== schoolId.toString()
      ) {
        await session.abortTransaction();
        return errorHandlers.notFoundError(
          "New classroom not found in this school",
        );
      }

      // Check new classroom capacity
      const currentEnrollmentCount = await this.activeStudentCount(
        newClassroomId,
        schoolId,
      );
      if (currentEnrollmentCount >= newClassroom.capacity) {
        await session.abortTransaction();
        return errorHandlers.conflictError(
          `Target classroom is at full capacity (${newClassroom.capacity} students)`,
        );
      }

      // Get current active enrollment
      const currentEnrollment = await this.StudentClassroom.findOne({
        studentId,
        schoolId,
        isActive: true,
      }).session(session);

      if (!currentEnrollment) {
        await session.abortTransaction();
        return errorHandlers.badRequestError(
          "Student has no active enrollment",
        );
      }

      // Prevent transfer to the same classroom
      if (currentEnrollment.classroomId.toString() === newClassroomId) {
        await session.abortTransaction();
        return errorHandlers.conflictError(
          "Student is already in this classroom",
        );
      }

      // End current enrollment (append-only pattern)
      await this.StudentClassroom.findByIdAndUpdate(
        currentEnrollment._id,
        {
          isActive: false,
          endDate: new Date(),
          reason: "TRANSFER",
        },
        { session, new: true },
      );

      // Create new enrollment record
      const newEnrollment = await this.StudentClassroom.create(
        [
          {
            studentId,
            classroomId: newClassroomId,
            schoolId,
            createdBy: userId,
            reason: "TRANSFER",
          },
        ],
        { session },
      );

      await session.commitTransaction();

      return successHandlers.updated(
        newEnrollment[0],
        "Student transferred successfully",
      );
    } catch (error) {
      await session.abortTransaction();
      return errorHandlers.serverError(
        `Failed to transfer student: ${error.message}`,
      );
    } finally {
      session.endSession();
    }
  }

  /**
   * End an active enrollment (withdrawal)
   *
   * @route PATCH /api/studentClassroom/endEnrollment/:id
   * @access SCHOOL_ADMIN only
   * @param {Object} __authenticate - Authentication context with user ID
   * @param {Object} __authorize - Authorization context
   * @param {Object} __params - URL parameters
   * @param {string} __params.id - Enrollment MongoDB ObjectId
   * @returns {Object} Updated enrollment record
   * @throws {400} If enrollment ID is missing
   * @throws {404} If enrollment not found, already ended, or school not found
   */
  async endEnrollment({ __authenticate, __authorize, __params }) {
    try {
      const enrollmentId = __params.id;
      if (!enrollmentId) {
        return errorHandlers.badRequestError("Enrollment ID is required");
      }

      const userId = __authenticate.userId;

      const schoolId =
        await this.managers.student.getSchoolIdFromAdmin(__authenticate);
      if (!schoolId) {
        return errorHandlers.notFoundError(
          "School not found for the authenticated user",
        );
      }

      const enrollment = await this.StudentClassroom.findOneAndUpdate(
        {
          _id: enrollmentId,
          schoolId,
          isActive: true,
        },
        {
          isActive: false,
          endDate: new Date(),
          reason: "WITHDRAWAL",
          updatedBy: userId,
        },
        { new: true },
      );

      if (!enrollment) {
        return errorHandlers.notFoundError(
          "Enrollment not found or already ended",
        );
      }

      return successHandlers.updated(
        enrollment,
        "Enrollment ended successfully",
      );
    } catch (error) {
      return errorHandlers.serverError(
        `Failed to end enrollment: ${error.message}`,
      );
    }
  }

  /**
   * Helper method: Get active enrollment for a student
   * @param {string} studentId - Student ID
   * @param {string} schoolId - School ID for verification
   * @returns {Object|null} Active enrollment record or null if not found
   */
  async getActiveEnrollment(studentId, schoolId) {
    if (!studentId || !schoolId) {
      console.error("Student ID and School ID are required");
      return null;
    }

    const enrollment = await this.StudentClassroom.findOne({
      studentId,
      schoolId,
      isActive: true,
    }).populate("classroomId");

    return enrollment;
  }

  /**
   * Helper method: Get classroom roster (all active students)
   * @param {string} classroomId - Classroom ID
   * @param {string} schoolId - School ID for verification
   * @returns {Array|null} Array of enrolled students or null if error
   */
  async getClassroomRoster(classroomId, schoolId) {
    if (!classroomId || !schoolId) {
      console.error("Classroom ID and School ID are required");
      return null;
    }

    const roster = await this.StudentClassroom.find({
      classroomId,
      schoolId,
      isActive: true,
    })
      .populate("studentId")
      .sort({ createdAt: 1 });

    return roster;
  }

  /**
   * Helper method: Get complete enrollment history for a student
   * @param {string} studentId - Student ID
   * @param {string} schoolId - School ID for verification
   * @returns {Array|null} Array of all enrollment records or null if error
   */
  async getStudentEnrollmentHistory(studentId, schoolId) {
    if (!studentId || !schoolId) {
      console.error("Student ID and School ID are required");
      return null;
    }

    const history = await this.StudentClassroom.find({
      studentId,
      schoolId,
    })
      .populate("classroomId")
      .sort({ enrolledDate: -1 });

    return history;
  }

  /**
   * Helper method: Check if classroom has active students
   * @param {string} classroomId - Classroom ID
   * @returns {boolean} True if has active students, false otherwise
   */
  async hasActiveStudents(classroomId) {
    if (!classroomId) {
      console.error("Classroom ID is required");
      return false;
    }

    const count = await this.StudentClassroom.countDocuments({
      classroomId,
      isActive: true,
    });

    return count > 0;
  }

  async graduateStudent(studentId, schoolId, session = null) {
    console.log(
      "Graduating student in StudentClassroom manager:",
      studentId,
      schoolId,
    );
    // End active enrollment
    await this.StudentClassroom.findOneAndUpdate(
      {
        studentId,
        schoolId,
        isActive: true,
      },
      {
        isActive: false,
        endDate: new Date(),
        reason: "GRADUATION",
      },
      { session, new: true },
    );

    console.log("Active enrollment ended for student:", studentId);
  }
  /**
   * Helper method: End active enrollment for a student (used in graduation)
   * @param {string} studentId - Student ID
   * @param {string} reason - End reason
   * @param {Object} session - Optional Mongoose session for transactions
   * @returns {Object|null} Updated enrollment or null if not found
   */
  async endActiveEnrollment(studentId, reason = "ENDED", session = null) {
    if (!studentId) {
      console.error("Student ID is required");
      return null;
    }

    const options = { new: true };
    if (session) {
      options.session = session;
    }

    const enrollment = await this.StudentClassroom.findOneAndUpdate(
      {
        studentId,
        isActive: true,
      },
      {
        isActive: false,
        endDate: new Date(),
        reason,
      },
      options,
    );

    return enrollment;
  }
};
