const schemaModels = require('../../_common/schema.models.js');

module.exports = {
  enrollStudent: [
    {
      path: 'studentId',
      type: 'string',
      required: true,
      length: { min: 24, max: 24 }
    },
    {
      path: 'classroomId',
      type: 'string',
      required: true,
      length: { min: 24, max: 24 }
    }
  ],

  transferStudent: [
    {
      path: 'studentId',
      type: 'string',
      required: true,
      length: { min: 24, max: 24 }
    },
    {
      path: 'newClassroomId',
      type: 'string',
      required: true,
      length: { min: 24, max: 24 }
    }
  ],

  endEnrollment: [
    {
      path: 'enrollmentId',
      type: 'string',
      required: true,
      length: { min: 24, max: 24 }
    }
  ]
};
