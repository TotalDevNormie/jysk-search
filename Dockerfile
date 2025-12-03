# ============================
# BUILDER STAGE
# ============================
FROM oven/bun:1-debian AS builder

WORKDIR /app

# Install build tools for native modules (better-sqlite3, Playwright)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Copy package files first (cache layer)
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source files
COPY . .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build Next.js app
RUN bun run build

# Install Playwright + Chromium in builder
RUN bun install playwright && bunx playwright install chromium


# ============================
# RUNNER STAGE
# ============================
FROM oven/bun:1-debian AS runner

WORKDIR /app

# Install runtime deps for Playwright
RUN apt-get update && apt-get install -y \
    dumb-init \
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
    libasound2 \
    libatspi2.0-0 \
    libxshmfence1 \
    fonts-liberation \
    fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Create non-root user
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nextjs

# Copy built Next.js app and node_modules from builder
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules ./node_modules

USER nextjs

EXPOSE 3000

# Use dumb-init to handle signals
CMD ["dumb-init", "node", "server.js"]
