FROM node:20-alpine AS builder

WORKDIR /app

COPY apps/dashboard/package.json ./
RUN npm install

COPY apps/dashboard/ ./
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "start"]
