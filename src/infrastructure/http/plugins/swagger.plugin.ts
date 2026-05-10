import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUi from '@fastify/swagger-ui'
import fp from 'fastify-plugin'

export const swaggerPlugin = fp(async (app) => {
  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Fastify DDD API',
        description: 'REST API built with Fastify 5, DDD, and Clean Architecture',
        version: '1.0.0',
      },
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
  })

  await app.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      persistAuthorization: false,
    },
  })
})
