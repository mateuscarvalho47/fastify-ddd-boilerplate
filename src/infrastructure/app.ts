import { containerPlugin } from "@infrastructure/http/plugins/container.plugin.js";
import { corsPlugin } from "@infrastructure/http/plugins/cors.plugin.js";
import { databasePlugin } from "@infrastructure/http/plugins/database.plugin.js";
import { errorHandlerPlugin } from "@infrastructure/http/plugins/error-handler.plugin.js";
import { helmetPlugin } from "@infrastructure/http/plugins/helmet.plugin.js";
import { jwtPlugin } from "@infrastructure/http/plugins/jwt.plugin.js";
import { rateLimitPlugin } from "@infrastructure/http/plugins/rate-limit.plugin.js";
import { redisPlugin } from "@infrastructure/http/plugins/redis.plugin.js";
import { swaggerPlugin } from "@infrastructure/http/plugins/swagger.plugin.js";
import { userRoutes } from "@infrastructure/http/routes/user/user.routes.js";
import { env } from "@shared/utils/env.js";
import Fastify from "fastify";

export async function buildApp() {
  const app = Fastify({
    trustProxy: true,
    bodyLimit: 1_048_576,
    ajv: {
      customOptions: { allErrors: false },
    },
    logger: {
      level: env.NODE_ENV === "production" ? "info" : "debug",
      ...(env.NODE_ENV !== "production"
        ? { transport: { target: "pino-pretty", options: { colorize: true } } }
        : {}),
    },
  });

  await app.register(helmetPlugin);
  await app.register(corsPlugin);
  await app.register(rateLimitPlugin);

  if (env.NODE_ENV !== "production") {
    await app.register(swaggerPlugin);
  }

  await app.register(databasePlugin);
  await app.register(redisPlugin);
  await app.register(jwtPlugin);
  await app.register(containerPlugin);

  await app.register(errorHandlerPlugin);

  await app.register(userRoutes, { prefix: "/api/v1/users" });

  app.get(
    "/health",
    {
      schema: {
        response: {
          200: {
            type: "object",
            properties: {
              status: { type: "string" },
              timestamp: { type: "string" },
            },
          },
        },
      },
    },
    async () => ({ status: "ok", timestamp: new Date().toISOString() }),
  );

  return app;
}
