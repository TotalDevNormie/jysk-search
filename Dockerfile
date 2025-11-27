# ============================
# RUNNER STAGE (Revised)
# ============================
FROM oven/bun:1-debian AS runner

WORKDIR /app

# Runtime dependencies for Next.js and Playwright/Chromium
# ... (rest of the apt-get installs remain the same)
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

# Create non-root user
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nextjs

# Copy built app and dependencies from builder stage
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
# 🟢 CORRECTED LINE HERE
COPY --from=builder /app/package.json ./package.json 
# --------------------
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules ./node_modules 

USER nextjs

EXPOSE 3000

# Use dumb-init
CMD ["dumb-init", "node", "server.js"]
