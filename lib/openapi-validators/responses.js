export default {
  type: 'object',
  properties: {
    '*': {
      type: 'object',
      properties: {
        content: {
          type: 'object',
          required: true,
          properties: {
            '*': {
              type: 'object',
              properties: {
                schema: {
                  type: 'object',
                },
              },
            },
          },
        },
      },
    },
  },
};
