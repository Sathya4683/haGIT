# Development image for the Next.js app (used by `docker compose --profile app up`).
# Production runs on Vercel and does not use this file.

FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json turbo.json ./
COPY apps/web/package.json apps/web/
COPY apps/extension/package.json apps/extension/
COPY packages/cli/package.json packages/cli/
COPY packages/coach-core/package.json packages/coach-core/
COPY packages/kb/package.json packages/kb/
COPY packages/mcp/package.json packages/mcp/
COPY packages/types/package.json packages/types/
COPY prisma ./prisma
RUN npm ci

FROM deps AS dev
COPY . .
RUN npm run fetch-model -w hagit-frontend
ENV NEXT_TELEMETRY_DISABLED=1
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy --schema=prisma/schema.prisma && npm run kb:sync && npm run dev -w hagit-frontend -- --hostname 0.0.0.0"]
