import { buildApp } from '@infrastructure/app.js'
import { registerCronJobs } from '@infrastructure/cron/cron-jobs.js'
import { env } from '@shared/utils/env.js'

async function main() {
  const app = await buildApp()
  registerCronJobs({ logger: app.log })
  await app.listen({ port: env.PORT, host: env.HOST })
  app.log.info(`Docs: http://${env.HOST}:${env.PORT}/docs`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
