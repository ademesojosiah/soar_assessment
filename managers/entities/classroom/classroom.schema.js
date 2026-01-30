const schemaModels = require('../../_common/schema.models.js');

module.exports = {
  createClassroom: [
    {
      path: 'name',
      type: 'string',
      required: true,
      length: { min: 2, max: 100 }
    },
    {
      path: 'grade',
      type: 'string',
      required: true,
      length: { min: 1, max: 10 }
    },
    {
      path: 'capacity',
      type: 'number',
      required: true,
      length: { min: 1, max: 100 }
    },
    {
      path: 'classTeacher',
      type: 'string',
      required: false,
      length: { min: 3, max: 100 }
    },
    {
      path: 'resources',
      type: 'object',
      required: false
    }
  ],

  updateClassroom: [
    {
      path: 'name',
      type: 'string',
      required: false,
      length: { min: 2, max: 100 }
    },
    {
      path: 'grade',
      type: 'string',
      required: false,
      length: { min: 1, max: 10 }
    },
    {
      path: 'capacity',
      type: 'number',
      required: false,
      length: { min: 1, max: 100 }
    },
    {
      path: 'classTeacher',
      type: 'string',
      required: false,
      length: { min: 3, max: 100 }
    },
    {
      path: 'resources',
      type: 'object',
      required: false
    }
  ]
};
