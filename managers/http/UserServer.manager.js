const http = require("http");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const app = express();

module.exports = class UserServer {
  constructor({ config, managers }) {
    this.config = config;
    this.userApi = managers.userApi;
    this.seed = managers.seed;
  }

  /** for injecting middlewares */
  use(args) {
    app.use(args);
  }

  /** server configs */
  run() {
    // Security middleware - Helmet with default config
    app.use(helmet());

    app.use(cors({ origin: "*" }));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use("/static", express.static("public"));

    /** an error handler */
    app.use((err, req, res, next) => {
      console.error(err.stack);
      res.status(500).send("Something broke!");
    });

    /** a single middleware to handle all */
    app.all("/api/:moduleName/:fnName/:id?", this.userApi.mw);

    // Seed super admin user
    this.seed.seedSuperAdmin();

    let server = http.createServer(app);
    server.listen(this.config.dotEnv.PORT, () => {
      console.log(
        `${this.config.dotEnv.SERVICE_NAME.toUpperCase()} is running on port: ${this.config.dotEnv.PORT}`,
      );
    });
  }
};
