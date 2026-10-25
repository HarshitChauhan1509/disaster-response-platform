FROM node:20-alpine AS builder

WORKDIR /app

# Enable corepack and pin pnpm to stable v9
RUN corepack enable && corepack prepare pnpm@9 --activate

# Copy monorepo configuration
COPY pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/

# Install dependencies
RUN pnpm install --filter @disaster-response/api...

# Copy source code
COPY apps/api/tsconfig.json ./apps/api/
COPY apps/api/src ./apps/api/src

# Compile TypeScript
RUN pnpm --filter @disaster-response/api build

# Runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

RUN corepack enable && corepack prepare pnpm@9 --activate

COPY pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/

# Install production dependencies only
RUN pnpm install --prod --filter @disaster-response/api...

# Copy compiled files from builder
COPY --from=builder /app/apps/api/dist ./apps/api/dist

EXPOSE 5000

CMD ["node", "apps/api/dist/server.js"]
