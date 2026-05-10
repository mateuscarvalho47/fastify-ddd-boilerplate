import type { FastifyBaseLogger } from 'fastify'
import cron from 'node-cron'

function scheduleJob(
  schedule: string,
  name: string,
  handler: () => Promise<void>,
  logger: FastifyBaseLogger,
): void {
  let running = false
  cron.schedule(schedule, async () => {
    if (running) {
      logger.warn(`[Cron] ${name} skipped — previous run still active`)
      return
    }
    running = true
    try {
      logger.info(`[Cron] Running ${name}...`)
      await handler()
      logger.info(`[Cron] ${name} done`)
    } catch (error) {
      logger.error({ error }, `[Cron] ${name} failed`)
    } finally {
      running = false
    }
  })
}

export function registerCronJobs({ logger }: { logger: FastifyBaseLogger }): void {
  scheduleJob(
    '0 * * * *',
    'hourly cleanup',
    async () => {
      // TODO: implement cleanup logic here
    },
    logger,
  )

  scheduleJob(
    '0 0 * * *',
    'daily report',
    async () => {
      // TODO: implement report logic here
    },
    logger,
  )
}
