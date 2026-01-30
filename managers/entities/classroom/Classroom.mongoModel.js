const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * Classroom Schema
 * Represents a classroom within a school
 * Always belongs to exactly one school
 * Managed by SCHOOL_ADMIN
 */
const ClassroomSchema = new Schema(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    grade: {
      type: String,
      required: true,
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
      max: 100,
    },
    classTeacher: {
      type: String,
      trim: true,
    },
    resources: {
      type: Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ["ACTIVE", "ARCHIVED"],
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
    collection: "classrooms",
  },
);

// Compound index for school and status queries
ClassroomSchema.index({ schoolId: 1, status: 1 });

// Virtual: Map _id to id
ClassroomSchema.virtual("id").get(function () {
  return this._id.toString();
});

module.exports = mongoose.model("Classroom", ClassroomSchema);
