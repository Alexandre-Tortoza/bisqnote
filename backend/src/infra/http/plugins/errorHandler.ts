import fp from 'fastify-plugin'
import { AppError } from '../../../domain/errors/AppError.js'

/** Global error handler — maps domain errors to HTTP responses and prevents leaking raw details. */
export const errorHandlerPlugin = fp(async (fastify) => {
  fastify.setErrorHandler((error, _request, reply) => {
    fastify.log.error(error)

    if (error instanceof AppError) {
      return reply.status(400).send({ error: error.message })
    }

    // AJV schema validation errors have a numeric statusCode
    const fastifyError = error as { statusCode?: number; message: string }
    if (fastifyError.statusCode === 400) {
      return reply.status(400).send({ error: fastifyError.message })
    }

    return reply.status(500).send({ error: 'Internal server error' })
  })
})
