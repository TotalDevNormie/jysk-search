# ============================
# BUILDER STAGE
# ============================
FROM oven/bun:1-debian AS builder

WORKDIR /app

# Install build tools for native modules (Needed for some dependencies)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    npm \
    # Clean up APT lists to reduce image size
    && rm -rf /var/lib/apt/lists/*

# Copy package files first for efficient caching
COPY package.json bun.lock* ./

# Install dependencies (Playwright is installed here as a package)
RUN bun install --frozen-lockfile

# Copy source files
COPY . .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install Playwright's Chromium browser into the default location (inside node_modules)
# This step MUST run *after* bun install and *before* the next build, 
# as the build process might interact with Playwright dependencies.
RUN bunx playwright install chromium

# Build Next.js app
# The standalone output creates an optimized server.js file.
RUN bun run build

# ============================
# RUNNER STAGE
# ============================
FROM oven/bun:1-debian AS runner

WORKDIR /app

# Runtime dependencies for Next.js and Playwright/Chromium
# These packages are crucial for running the browser headlessly.
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
    # Clean up APT lists to reduce image size
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
# NOTE: Removed PLAYWRIGHT_BROWSERS_PATH environment variable as we rely on the default path.

# Create non-root user
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nextjs

# Copy built app and dependencies from builder stage
# These steps are optimized for Next.js standalone mode.
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.next/package.json ./package.json 
# ^ Ensure this copies the correct package.json for standalone mode, if applicable.
#   Otherwise, use /app/package.json
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# Crucially, copying node_modules ensures Playwright's browsers are included in the default location.
COPY --from=builder /app/node_modules ./node_modules 

USER nextjs

EXPOSE 3000

# Use dumb-init to handle process signals correctly
CMD ["dumb-init", "node", "server.js"]
