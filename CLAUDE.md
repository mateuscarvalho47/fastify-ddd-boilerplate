# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
pnpm dev                    # Start with hot reload (tsx watch + .env)
pnpm build                  # Compile to dist/ (excludes tests)
pnpm start                  # Run compiled output

# Code quality
pnpm lint                   # Biome check + auto-fix (v2)
pnpm typecheck              # TypeScript type check (no emit)

# Testing
pnpm test                   # Vitest run once
pnpm test:watch             # Vitest watch mode
pnpm test:cov               # Vitest with coverage

# Database
pnpm db:generate            # Generate Drizzle migrations from schema changes
pnpm db:migrate             # Apply pending migrations
pnpm db:push                # Push schema directly (dev only, skips migration)
pnpm db:studio              # Open Drizzle Studio UI

# Infrastructure
docker compose up -d        # Start PostgreSQL + Redis
```

## Architecture

This is a Fastify 5 REST API structured in four layers with strict unidirectional dependencies: `domain → application → infrastructure`, with `shared` available to all.

### Layer Responsibilities

**`src/domain/`** — Zero external dependencies. Contains aggregates (`User.entity.ts`), value objects (`Email.ts`), repository interfaces (`IUserRepository`), and domain events (`UserCreatedEvent`). Aggregates extend `BaseEntity<T>` which tracks domain events. Factory methods are `create()` (new) and `reconstitute()` (from persistence).

**`src/application/`** — Depends only on domain. Contains use cases, DTOs (Zod schemas + TypeScript interfaces), mappers (entity → DTO), and outbound port interfaces (`IPasswordHasher`, `ITokenService`). Use cases return `Result<T, DomainError>` — never throw.

**`src/infrastructure/`** — Implements all ports. Key sub-structures:
- `container/container.ts` — Manual DI wiring. All dependencies instantiated here and mounted on `FastifyInstance` via `containerPlugin`.
- `database/` — Drizzle ORM schema, `DrizzleUserRepository` (implements `IUserRepository`), `UserQueryService` (read-model, bypasses domain layer).
- `cache/` — `Argon2PasswordHasher`, `JwtTokenService` (refresh token revocation via Redis).
- `http/plugins/` — One file per Fastify plugin (cors, helmet, rate-limit, swagger, database, redis, jwt, container, error-handler).
- `http/routes/` — Route handlers call `app.container.<useCase>.execute()` and map `Result` to HTTP responses.

**`src/shared/`** — Cross-cutting concerns: `Result<T, E>` monad, `DomainError` hierarchy, `BaseEntity`, `UniqueId`, env validation.

### Path Aliases

```
@domain/*         → src/domain/*
@application/*    → src/application/*
@infrastructure/* → src/infrastructure/*
@shared/*         → src/shared/*
```

---

## Key Patterns

### Result monad

Use cases return `Result<T, DomainError>`. Check with `result.success`. Never throw from use cases; surface errors by returning `Result.fail(new SomeDomainError(...))`.

```ts
// use case
async execute(dto: SomeDTO): Promise<Result<SomeResponseDTO, ConflictError>> {
  if (conflict) return Result.fail(new ConflictError('...'))
  return Result.ok(value)
}

// route handler
const result = await app.container.someUseCase.execute(dto)
if (!result.success) throw result.error   // let errorHandler map it
return reply.status(201).send(result.value)
```

### Error hierarchy & mapping

`errorHandlerPlugin` maps `DomainError` subclasses to HTTP status codes automatically:

| Class | HTTP |
|---|---|
| `ValidationError` | 422 |
| `NotFoundError` | 404 |
| `ConflictError` | 409 |
| `UnauthorizedError` | 401 |
| `ForbiddenError` | 403 |
| `DomainError` (other) | 400 |

**Rules:**
- Never throw bare `Error` in infrastructure code — always use a `DomainError` subclass.
- Never use inline `reply.status(4xx).send(...)` for error cases in route handlers — always `throw` a `DomainError` so the centralized handler emits a consistent response and the TypeScript schema types stay correct.
- Adding a new error type requires adding a case in `error-handler.plugin.ts`.
- `DomainError` subclasses with no extra fields need no constructor — the base class handles it:

```ts
export class PaymentError extends DomainError {
  readonly code = 'PAYMENT_ERROR'
  // no constructor needed
}
```

### Domain entity pattern (`BaseEntity`)

- Access internal state only via named getters — the `props` getter was intentionally removed to prevent external callers from mutating state directly.
- Mutation must go through dedicated domain methods (`updateName()`, `deactivate()`, etc.) that also update `updatedAt`.
- `_props` is `protected readonly` (reference only); properties on it may be mutated inside the class via those domain methods.

```ts
// ✅ correct
user.updateName('New Name')

// ❌ wrong — props getter does not exist
user.props.name = 'New Name'
```

### Manual DI

`buildContainer()` in `container.ts` wires everything. To add a new service:
1. Instantiate it in `buildContainer()`
2. Add it to the `AppContainer` interface
3. Access via `app.container.<name>` in routes

### Route guards

- Public routes — no decorator
- Authenticated users — `onRequest: [app.authenticate]`
- Admin only — `onRequest: [app.authenticateAdmin]`

`authenticateAdmin` delegates to `authenticate` first, then checks `req.user.role === 'admin'`. Both are defined in `jwtPlugin`.

### Route schema requirement

Every route handler **must** include a `schema` property — routes without one are invisible to Swagger and Insomnia:

```ts
app.get('/example', {
  schema: {
    tags: ['Example'],
    summary: 'Short description',
    security: [{ bearerAuth: [] }], // omit for public routes
    querystring: { type: 'object', properties: { ... } },
    body: { type: 'object', required: [...], properties: { ... } },
    response: { 200: { type: 'object', properties: { ... } } },
  },
}, handler)
```

Do **not** declare error response codes (4xx, 5xx) in the schema — they are handled globally by `errorHandlerPlugin`.

### Zod validation in routes

Use `safeParse` + a `zodFail` helper (defined in each route file) to convert Zod errors into `ValidationError`:

```ts
function zodFail(error: { flatten(): { fieldErrors: Record<string, string[] | undefined> } }): never {
  const fieldErrors = error.flatten().fieldErrors
  const fields: Record<string, string> = {}
  for (const [key, msgs] of Object.entries(fieldErrors)) {
    const first = msgs?.[0]
    if (first !== undefined) fields[key] = first
  }
  throw new ValidationError('Validation error', fields)
}

// usage
const parsed = SomeSchema.safeParse(request.body)
if (!parsed.success) zodFail(parsed.error)
```

### Cron jobs

All cron jobs go in `src/infrastructure/cron/cron-jobs.ts`. Use the private `scheduleJob()` helper — it handles the running-flag guard and try/catch/finally logging automatically:

```ts
scheduleJob('0 * * * *', 'job name', async () => {
  // implementation
}, logger)
```

Do **not** copy the guard/logging pattern manually.

### Token revocation (Redis TTL)

`revokeRefreshToken` derives the Redis TTL from the token's `exp` claim — do not hardcode a duration constant that would need to stay in sync with `JWT_REFRESH_EXPIRES_IN`:

```ts
const decoded = this.app.jwt.decode<{ exp?: number }>(token)
const ttl = decoded?.exp !== undefined
  ? decoded.exp - Math.floor(Date.now() / 1000)
  : FALLBACK_REFRESH_TTL_SECONDS
if (ttl > 0) {
  await this.redis.set(this.tokenKey(token), '1', 'EX', ttl)
}
```

### Domain events

Aggregates record events via `this.addDomainEvent()`. Events are stored on the entity until explicitly dispatched (currently manual — no event bus).

---

## Drizzle ORM Conventions

### Schema

- **Always** use `{ withTimezone: true }` on `timestamp` columns — without it Postgres stores without timezone, causing silent date bugs.
- **Always** use `.$onUpdate(() => new Date())` on `updatedAt` — Drizzle injects the value automatically on every `.update()`.
- **Always** point `schema` in `drizzle.config.ts` to the glob `./src/infrastructure/database/schema/*.ts` — never to a single file.

```ts
createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
```

### Queries

- Import operators (`eq`, `count`, `ilike`, `or`, `and`, `sql`, …) from `drizzle-orm`, never from `drizzle-orm/pg-core`.
- Use `Promise.all` for independent parallel queries (e.g. data + pagination count).
- In query services, select only the columns needed — never `SELECT *`.

### Migrations

Whenever the schema changes, run in sequence:

```bash
pnpm db:generate   # generates the SQL migration file
pnpm db:migrate    # applies it to the database
```

Never use `db:push` in production — it is only for fast local iteration.

---

## Biome (Linter/Formatter)

Biome **v2** is used (`biome.json` schema `2.x`). Key settings:
- 2-space indent, 100-char line width, single quotes, no semicolons, trailing commas
- `organizeImports` lives under `assist.actions.source.organizeImports` (v2 API)
- `files.includes` with negation patterns replaces the old `files.ignore`

Run `pnpm lint` to check and auto-fix. For unsafe auto-fixes (e.g. removing redundant constructors), apply them manually.

---

## Tech Stack

- **Runtime**: Node.js, TypeScript (ESM, strict mode, `exactOptionalPropertyTypes`)
- **HTTP**: Fastify 5
- **ORM**: Drizzle ORM + PostgreSQL (postgres-js driver)
- **Cache**: Redis (ioredis) — refresh token revocation
- **Auth**: `@fastify/jwt` — access token (15m) + refresh token (7d, Redis-revoked)
- **Password**: argon2id (memoryCost: 65536, timeCost: 3, parallelism: 4)
- **Validation**: Zod (DTOs, env variables)
- **Linter/Formatter**: Biome v2
- **Testing**: Vitest + @vitest/coverage-v8
- **API Docs**: Swagger UI at `/docs` (dev only)

## Environment

Copy `.env.example` to `.env`. Required variables:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — minimum 32 characters

See `src/shared/utils/env.ts` for all validated variables and defaults.

In production `CORS_ORIGIN` must be set to a specific origin — the app refuses to start with `*`.
