# -------- BASE IMAGE --------
FROM node:20-slim AS base

# Required OS libs for Chromium headless shell
RUN apt-get update && apt-get install -y \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm-dev \
    libasound2 \
    libpangocairo-1.0-0 \
    libpango-1.0-0 \
    libcairo2 \
    libatspi2.0-0 \
    libx11-6 \
    libxext6 \
    libx11-xcb1 \
    libglib2.0-0 \
    wget \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# -------- INSTALL DEPENDENCIES --------
COPY package.json package-lock.json* ./
RUN npm install

# -------- BUILD --------
COPY . .
RUN npm run build

# -------- RUNNER --------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install playwright-core but only chromium-headless-shell
RUN npm install playwright-core
RUN npx playwright install chromium-headless-shell

# Copy built app and node_modules
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/.next ./.next
COPY --from=base /app/public ./public
COPY package.json .

EXPOSE 3000

CMD ["npm", "start"]
