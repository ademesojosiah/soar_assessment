const errorHandlers = {
  forbidenError: (message) => {
    console.warn("[FORBIDDEN - 403]:", message);
    return {
      ok: false,
      code: 403,
      data: {},
      errors: [message],
      message,
    };
  },

  validationError: (validationError) => {
    console.warn(
      "[VALIDATION ERROR - 400]:",
      validationError.message,
      validationError.errors,
    );
    return {
      ok: false,
      code: 400,
      data: {},
      errors: [validationError.errors],
      message: validationError.message,
    };
  },

  notFoundError: (message) => {
    console.warn("[NOT FOUND - 404]:", message);
    return {
      ok: false,
      code: 404,
      data: {},
      errors: [message],
      message,
    };
  },

  unAuthorizedError: (message) => {
    console.warn("[UNAUTHORIZED - 401]:", message);
    return {
      ok: false,
      code: 401,
      data: {},
      errors: [message],
      message,
    };
  },

  badRequestError: (message) => {
    console.warn("[BAD REQUEST - 400]:", message);
    return {
      ok: false,
      code: 400,
      data: {},
      errors: [message],
      message,
    };
  },

  conflictError: (message) => {
    console.warn("[CONFLICT - 409]:", message);
    return {
      ok: false,
      code: 409,
      data: {},
      errors: [message],
      message,
    };
  },

  serverError: (error) => {
    const message = "Internal Server Error";

    console.error("[SERVER ERROR MESSAGE- 500]:", message);
    console.error("[SERVER ERROR - 500]:", error);

    return {
      ok: false,
      code: 500,
      data: {},
      errors: [message],
      message,
    };
  },
};

module.exports = errorHandlers;
