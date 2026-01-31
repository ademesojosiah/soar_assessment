const schemaModels = require('../../_common/schema.models.js');

module.exports = {
  createStudent: [
    {
      path: 'firstName',
      type: 'string',
      required: true,
      length: { min: 2, max: 50 }
    },
    {
      path: 'lastName',
      type: 'string',
      required: true,
      length: { min: 2, max: 50 }
    },
    {
      path: 'email',
      type: 'string',
      required: true,
      regex: /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    },
    {
      path: 'dateOfBirth',
      type: 'string',
      required: false,
      length: { min: 10, max: 10 }
    },
    {
      path: 'phone',
      type: 'string',
      required: false,
      length: { min: 10, max: 15 }
    },
    {
      path: 'address',
      type: 'string',
      required: false,
      length: { min: 5, max: 300 }
    }
  ],

  updateStudent: [
    {
      path: 'firstName',
      type: 'string',
      required: false,
      length: { min: 2, max: 50 }
    },
    {
      path: 'lastName',
      type: 'string',
      required: false,
      length: { min: 2, max: 50 }
    },
    {
      path: 'email',
      type: 'string',
      required: false,
      regex: /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    },
    {
      path: 'dateOfBirth',
      type: 'string',
      required: false,
      length: { min: 10, max: 10 }
    },
    {
      path: 'phone',
      type: 'string',
      required: false,
      length: { min: 10, max: 15 }
    },
    {
      path: 'address',
      type: 'string',
      required: false,
      length: { min: 5, max: 300 }
    }
  ]
};
