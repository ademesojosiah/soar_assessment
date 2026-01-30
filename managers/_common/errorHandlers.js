const errorHandlers = {
  forbidenError: (message) => {
    return { 
      ok: false, 
      code: 403, 
      data: {}, 
      errors: [message], 
      message 
    };
  },

  validationError: (validationError) => {
    return { 
      ok: false, 
      code: 400, 
      data: {}, 
      errors: [validationError.errors], 
      message: validationError.message
    };
  },

  notFoundError: (message) => {
    return { 
      ok: false, 
      code: 404, 
      data: {}, 
      errors: [message], 
      message 
    };
  },

  unAuthorizedError: (message) => {
    return { 
      ok: false, 
      code: 401, 
      data: {}, 
      errors: [message], 
      message 
    };
  },

  badRequestError: (message) => {
    return  { 
      ok: false, 
      code: 400, 
      data: {}, 
      errors: [message], 
      message 
    };
  },

  serverError: (error) => {
    const message = error.message || "Internal Server Error";

    console.error("[SERVER ERROR]: ", error);

    return { 
      ok: false, 
      code: 500, 
      data: {}, 
      errors: [message], 
      message 
    };
  }
};

module.exports = errorHandlers;
