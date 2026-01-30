const { createSchool } = require("../school/school.schema");

module.exports = {
  createSchoolAdmin: [
    {
      path: "email",
      label: "Email",
      type: "string",
      required: true,
      regex:
        /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
    },
    {
      path: "password",
      label: "Password",
      type: "string",
      required: true,
      length: { min: 8, max: 100 },
    },
  ],

  login: [
    {
      path: "email",
      label: "Email",
      type: "string",
      required: true,
      regex:
        /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
    },
    {
      path: "password",
      label: "Password",
      type: "string",
      required: true,
      length: { min: 8, max: 100 },
    },
  ],
};
