const successHandlers = {
  created: (data, message = 'Resource created successfully', code = 201) => {
    return { 
      ok: true, 
      code: code,
      data: data, 
      message 
    };
  },

  success: (data, message = 'Operation completed successfully', code = 200) => {
    return { 
      ok: true, 
      code: code,
      data: data, 
      message 
    };
  },

  updated: (data, message = 'Resource updated successfully', code = 200) => {
    return { 
      ok: true, 
      code: code,
      data: data, 
      message 
    };
  },

  deleted: (data, message = 'Resource deleted successfully', code = 200) => {
    return { 
      ok: true, 
      code: code,
      data: data, 
      message 
    };
  }
};

module.exports = successHandlers;
