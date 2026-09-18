const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'QuickWatch API',
      version: '1.0.0',
      description: 'Authentication and user management endpoints for QuickWatch',
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 8000}`,
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./Routes/*.js', './app.js'],
};

module.exports = swaggerJSDoc(options);
