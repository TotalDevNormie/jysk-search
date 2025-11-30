# Build stage
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lockb* ./

# Install dependencies (prod to reduce size)
RUN bun install --frozen-lockfile --production || bun install --production

# Copy source code
COPY . .

# Reinstall with dev deps for build
RUN rm -rf node_modules && \
    bun install --frozen-lockfile || bun install

# Build the application
RUN bun run build

# Install production dependencies only
RUN rm -rf node_modules && \
    bun install --frozen-lockfile --production || bun install --production


# -------- PRODUCTION IMAGE --------
FROM debian:bookworm-slim AS runner

# Install Bun runtime
COPY --from=oven/bun:1 /usr/local/bin/bun /usr/local/bin/bun

# Install minimal dependencies for Chromium
RUN apt-get update && apt-get install -y \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    ca-certificates \
    fonts-liberation \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

WORKDIR /app

ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Copy app build artifacts (NON-STANDALONE)
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server.js ./server.js

# Install Chromium browser only
RUN mkdir -p /ms-playwright && \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright bun x playwright install chromium && \
    rm -rf /tmp/* /var/tmp/*

# Create non-root user
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nextjs && \
    mkdir -p /home/nextjs/.cache && \
    chown -R nextjs:nodejs /app /home/nextjs /ms-playwright

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start your custom Next.js server
CMD ["bun", "run", "server.js"]
