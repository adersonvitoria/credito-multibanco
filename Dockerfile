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

COPY package*.json ./
RUN npm ci

COPY . .

RUN npx prisma generate
# Instala o Chromium + dependências de sistema necessárias para o Playwright.
RUN npx playwright install --with-deps chromium
RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start"]
