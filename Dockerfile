# Imagem do WORKER dedicado (Railway) — Next.js + Playwright/Chromium.
# Roda o mesmo app com MODO_CONSULTA=rpa: consulta os portais dos bancos via robô.

FROM node:20-bookworm-slim

WORKDIR /app

# Evita o download de browsers no npm install; instalamos só o Chromium depois.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
# DATABASE_URL placeholder só para `prisma generate` no build (o Railway injeta a real em runtime).
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
ENV NODE_ENV=production
ENV MODO_CONSULTA=rpa

# OpenSSL + CA certs são exigidos pelo engine do Prisma em runtime.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copia package*.json E o schema do Prisma antes do `npm ci` — o postinstall do
# projeto roda `prisma generate`, que precisa de prisma/schema.prisma presente.
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .

# Instala o Chromium + dependências de sistema para o Playwright.
RUN npx playwright install --with-deps chromium
# Build (o script já roda `prisma generate && next build`).
RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start"]
