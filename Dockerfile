FROM node:20-alpine AS base
ENV NEXT_TELEMETRY_DISABLED=1
ENV TZ=Asia/Shanghai
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM node:20-alpine AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=6000
ENV HOSTNAME=0.0.0.0
ENV TZ=Asia/Shanghai
WORKDIR /app

RUN apk add --no-cache tzdata

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 6000
CMD ["node", "server.js"]
