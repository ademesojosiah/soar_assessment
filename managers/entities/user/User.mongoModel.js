const mongoose = require("mongoose");
const { Schema } = mongoose;
const bcrypt = require("bcrypt");

const UserSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["SUPER_ADMIN", "SCHOOL_ADMIN"],
      required: true,
    },
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: "School",
      default: null,
    },
  },
  { timestamps: true },
);

// Pre-save hook: Hash password if modified
UserSchema.pre("save", async function (next) {
  // Check if password field was modified
  if (!this.isModified("passwordHash")) {
    return next();
  }

  try {
    // Hash the password with salt rounds
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Method to compare password with hash
 * @param {string} candidatePassword - Plain text password to compare
 * @returns {Promise<boolean>} True if password matches, false otherwise
 */
UserSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.passwordHash);
  } catch (error) {
    throw new Error(`Password comparison failed: ${error.message}`);
  }
};

module.exports = mongoose.model("User", UserSchema);
