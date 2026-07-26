# syntax=docker/dockerfile:1

FROM oven/bun:1 AS base
WORKDIR /app

# ---- Install dependencies (cached layer) ----
# Includes devDependencies since drizzle-kit (used for migrations at
# startup) lives there.
FROM base AS deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ---- Runtime image ----
FROM base AS runner
ENV NODE_ENV=production

# Run as a non-root user
RUN addgroup --system --gid 1001 bunjs && \
    adduser --system --uid 1001 fastify

COPY --from=deps /app/node_modules ./node_modules
COPY . .

USER fastify

EXPOSE 8000

# Run pending migrations, then start the server.
CMD ["sh", "-c", "bun run db:migrate && bun index.ts"]