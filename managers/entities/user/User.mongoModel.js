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
  { timestamps: true ,
    toJSON: {
      transform: function(doc, ret) {
        delete ret.passwordHash;  // ✅ Remove passwordHash when converting to JSON
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    },
    toObject: {
      transform: function(doc, ret) {
        delete ret.passwordHash;  // ✅ Remove passwordHash when converting to Object
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  },
);


/**
 * Method to compare password with hash
 * @param {string} candidatePassword - Plain text password to compare
 * @returns {Promise<boolean>} True if password matches, false otherwise
 */


UserSchema.methods.comparePassword = async function(candidatePassword) {
  // Check if both arguments exist
  if (!candidatePassword) {
    throw new Error('Password is required for comparison');
  }
  
  if (!this.passwordHash) {
    throw new Error('User password hash not found. Make sure to select password field.');
  }
  
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

// Virtual: Map _id to id
UserSchema.virtual("id").get(function () {
  return this._id.toString();
});

module.exports = mongoose.model("User", UserSchema);
