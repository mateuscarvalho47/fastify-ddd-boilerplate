# fastify-ddd-boilerplate

REST API boilerplate with Fastify 5, Drizzle ORM, DDD, and Clean Architecture.

## Stack

- **Runtime**: Node.js 22+, ESM
- **Framework**: Fastify 5
- **ORM**: Drizzle ORM + drizzle-kit (PostgreSQL via `postgres` driver)
- **Auth**: @fastify/jwt (access 15m) + Redis revocation (refresh 7d)
- **Password**: argon2id
- **Validation**: Zod 4
- **Cache**: @fastify/redis (ioredis)
- **Docs**: @fastify/swagger + @fastify/swagger-ui
- **Linter**: Biome
- **Tests**: Vitest
- **Scheduler**: node-cron

## Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your values

# 3. Start infrastructure
docker compose up -d

# 4. Run migrations
pnpm db:generate
pnpm db:migrate

# 5. Start dev server
pnpm dev
```

## Available scripts

| Script | Description |
|---|---|
| `pnpm dev` | Start dev server with hot reload |
| `pnpm build` | Compile TypeScript to `dist/` |
| `pnpm start` | Run compiled app |
| `pnpm typecheck` | Type-check without emitting |
| `pnpm lint` | Run Biome linter + formatter |
| `pnpm test` | Run Vitest tests |
| `pnpm test:cov` | Run tests with coverage |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:push` | Push schema directly (dev only) |
| `pnpm db:studio` | Open Drizzle Studio |

## Project structure

```
src/
├── domain/            # Enterprise business rules — no external deps
│   └── user/
│       ├── entities/          # Aggregate roots
│       ├── value-objects/     # Immutable domain primitives
│       ├── repositories/      # Repository interfaces (ports)
│       └── events/            # Domain events
│
├── application/       # Application business rules — depends only on domain
│   ├── ports/                 # Outbound port interfaces (password, token)
│   └── user/
│       ├── dtos/              # Input/output shapes + Zod schemas
│       ├── mappers/           # Domain → DTO transformations
│       └── use-cases/         # Orchestration logic
│
├── infrastructure/    # Adapters — implements domain/application ports
│   ├── container/             # Manual DI — single place to wire everything
│   ├── database/
│   │   ├── schema/            # Drizzle table definitions
│   │   ├── repositories/      # IUserRepository implemented with Drizzle
│   │   └── query-services/    # Read-model queries (no domain traversal)
│   ├── cache/                 # Argon2 hasher + JWT token service
│   ├── cron/                  # node-cron scheduled jobs
│   └── http/
│       ├── plugins/           # Fastify plugins (db, redis, jwt, cors, etc.)
│       └── routes/            # Route handlers — use app.container only
│
└── shared/            # Cross-cutting utilities (no business logic)
    ├── errors/                # Domain error hierarchy
    ├── result/                # Result<T, E> monad
    ├── types/                 # BaseEntity, UniqueId, DomainEvent
    └── utils/                 # Env validation
```

## Auth flow

```
POST /api/v1/users/login
  → returns { user, tokens: { accessToken, refreshToken } }

Authorization: Bearer <accessToken>   # 15-minute lifetime

POST /api/v1/users/refresh
  body: { refreshToken }
  → returns new { accessToken, refreshToken }

POST /api/v1/users/logout
  Authorization: Bearer <accessToken>
  body: { refreshToken }
  → revokes refresh token in Redis
```

## API docs

Swagger UI available at `http://localhost:3000/docs` in development.

## Nginx (production)

Nginx is **required** in production. The `docker/nginx.conf` configures:
- HTTP → HTTPS redirect
- TLS 1.3 only with OCSP stapling
- HTTP/2
- `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto` headers for correct IP resolution
- `Strict-Transport-Security` header

Without Nginx (or another reverse proxy with `trustProxy: true`), `request.ip` returns the proxy IP, breaking rate limiting.
