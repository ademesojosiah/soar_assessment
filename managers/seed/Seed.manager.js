const bcrypt = require("bcrypt");
const { ObjectId } = require("mongodb");

module.exports = class Seed {
  constructor({ config, mongomodels } = {}) {
    this.config = config;
    this.mongomodels = mongomodels;
  }

  /**
   * Seed super admin user
   * Creates a SUPER_ADMIN user if one doesn't already exist
   */
  async seedSuperAdmin() {
    try {
      const existing = await this.mongomodels.User.findOne({
        role: "SUPER_ADMIN",
      });

      if (existing) {
        console.log("Super admin already exists");
        return;
      }

      const password = this.config.dotEnv.SUPER_ADMIN_PASSWORD;
      const email = this.config.dotEnv.SUPER_ADMIN_EMAIL;

      if (!password || !email) {
        console.error(
          "SUPER_ADMIN_PASSWORD or SUPER_ADMIN_EMAIL not configured",
        );
        return;
      }

      const passwordHash = await bcrypt.hash(password, 10);

      await this.mongomodels.User.create({
        email: email,
        passwordHash,
        role: "SUPER_ADMIN",
        schoolId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log("Super admin created successfully");
    } catch (error) {
      console.error(`Failed to seed super admin: ${error.message}`);
    }
  }
};
