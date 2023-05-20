export default {
  type: "object",
  properties: {
    "*": {
      type: "object",
      properties: {
        type: {
          type: "string",
          eq: [
            "http", "apiKey"
          ]
        },
        in: {
          type: "string",
          eq: ["header", "query"],
          optional: true
        },
        name: {
          type: "string",
          optional: true
        },
        scheme: {
          type: "string",
          eq: ["bearer", "basic"],
          optional: true
        },
        bearerFormat: {
          type: "string",
          optional: true
        }
      }
    }
  }
}