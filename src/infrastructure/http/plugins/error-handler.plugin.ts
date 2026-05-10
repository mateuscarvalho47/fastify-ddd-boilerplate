import {
  ConflictError,
  DomainError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '@shared/errors/domain-errors.js'
import type { FastifyError } from 'fastify'
import fp from 'fastify-plugin'

export const errorHandlerPlugin = fp(async (app) => {
  app.setErrorHandler<FastifyError>((error, _request, reply) => {
    app.log.error({ err: error }, 'Request error')

    if (error.validation) {
      void reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Validation error',
        details: error.validation,
      })
      return
    }

    if (error instanceof ValidationError) {
      void reply.status(422).send({
        statusCode: 422,
        error: 'Unprocessable Entity',
        message: error.message,
        fields: error.fields,
      })
      return
    }

    if (error instanceof NotFoundError) {
      void reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: error.message,
      })
      return
    }

    if (error instanceof ConflictError) {
      void reply.status(409).send({
        statusCode: 409,
        error: 'Conflict',
        message: error.message,
      })
      return
    }

    if (error instanceof UnauthorizedError) {
      void reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: error.message,
      })
      return
    }

    if (error instanceof ForbiddenError) {
      void reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: error.message,
      })
      return
    }

    if (error instanceof DomainError) {
      void reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: error.message,
      })
      return
    }

    void reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    })
  })
})
