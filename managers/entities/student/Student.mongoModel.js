const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * Student Schema
 * Represents a student within a school
 * A student belongs to exactly one school
 * Managed by SCHOOL_ADMIN
 */
const StudentSchema = new Schema(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      unique: true,
      sparse: true,
    },
    phone: String,
    dateOfBirth: Date,
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
      sparse: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "TRANSFERRED", "GRADUATED", "INACTIVE"],
      default: "ACTIVE",
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    collection: "students",
  },
);

// Compound index for school and status queries
StudentSchema.index({ schoolId: 1, status: 1 });
StudentSchema.index({ registrationNumber: 1, schoolId: 1 });

/**
 * Virtual: Full name
 */
StudentSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

/**
 * Virtual: Map _id to id
 */
StudentSchema.virtual("id").get(function () {
  return this._id.toString();
});

module.exports = mongoose.model("Student", StudentSchema);
