# AgentVault API — production image.
# Контекст сборки = корень монорепо (нужен package-lock и workspaces).
FROM node:22-slim

WORKDIR /app

# openssl нужен Prisma для генерации клиента.
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Ставим зависимости всего workspace (детерминированно).
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/dashboard/package.json apps/dashboard/package.json
COPY packages/sdk/package.json packages/sdk/package.json
RUN npm install

# Копируем код API и собираем.
COPY apps/api ./apps/api
WORKDIR /app/apps/api
RUN npx prisma generate && npm run build

ENV NODE_ENV=production
EXPOSE 4000

# На старте применяем схему к БД и поднимаем сервер.
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/index.js"]
