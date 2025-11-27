# ============================
# BUILD STAGE
# ============================
FROM oven/bun:1-debian AS builder

WORKDIR /app

# Install required tools for building
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Copy only package files first (better cache)
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy the rest of the app
COPY . .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build Next.js app
RUN bun run build


# ============================
# RUNTIME STAGE
# ============================
FROM oven/bun:1-debian AS runner

WORKDIR /app

# Install all Playwright system dependencies
RUN apt-get update && apt-get install -y \
    dumb-init \
    # Playwright deps
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
    # Fonts
    fonts-liberation \
    fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Create non-root user
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nextjs

# Copy standalone output
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy node_modules (Playwright CLI lives here)
COPY --from=builder /app/node_modules ./node_modules


# Install Playwright globally + install Chromium
RUN bun install playwright && \
    bunx playwright install chromium

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["dumb-init", "node", "server.js"]
