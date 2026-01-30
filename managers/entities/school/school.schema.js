
module.exports = {
  createSchool: [
    {
      path: 'name',
      type: 'string',
      required: true,
      length: { min: 3, max: 100 }
    },
    {
      path: 'email',
      type: 'string',
      required: true,
      regex: /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
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
    },
    {
      path: 'city',
      type: 'string',
      required: false,
      length: { min: 2, max: 50 }
    },    
    {
      path: 'state',
      type: 'string',
      required: false,
      length: { min: 2, max: 50 }
    },
    {
      path: 'country',
      type: 'string',
      required: false,
      length: { min: 2, max: 50 }
    }
  ],

  updateSchool: [
    {
      path: 'name',
      type: 'string',
      required: false,
      length: { min: 3, max: 100 }
    },
    {
      path: 'email',
      type: 'string',
      required: false,
      regex: /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
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
    },
    {
      path: 'city',
      type: 'string',
      required: false,
      length: { min: 2, max: 50 }
    },
    {
      path: 'state',
      type: 'string',
      required: false,
      length: { min: 2, max: 50 }
    },
    {
      path: 'country',
      type: 'string',
      required: false,
      length: { min: 2, max: 50 }
    }
  ]
};
