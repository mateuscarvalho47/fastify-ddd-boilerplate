import { buildContainer } from '@infrastructure/container/container.js'
import fp from 'fastify-plugin'

export const containerPlugin = fp(async (app) => {
  const container = buildContainer(app, app.db, app.redis)
  app.decorate('container', container)
})
