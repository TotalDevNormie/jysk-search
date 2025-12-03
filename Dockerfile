# ============================
# BUILDER
# ============================
FROM node:20 AS builder

WORKDIR /app

# Install deps
COPY package.json package-lock.json ./
RUN npm ci

# Copy source
COPY . .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build standalone Next.js
RUN npm run build

# Install Playwright browser
RUN npx playwright install chromium


# ============================
# RUNNER
# ============================
FROM node:20-slim AS runner

WORKDIR /app

# Playwright runtime deps
RUN apt-get update && apt-get install -y \
    dumb-init \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libdbus-1-3 libxkbcommon0 \
    libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
    libgbm1 libasound2 libatspi2.0-0 libxshmfence1 \
    fonts-liberation fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Copy from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["dumb-init", "node", "server.js"]
