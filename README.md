# AgentVault

**Corporate wallet for AI agents — spending policies, approvals, audit trail.**

AgentVault — это финансовая инфраструктура для компаний, которые запускают
AI-агентов в продакшене. Когда агент тратит деньги (вызывает платный API,
покупает рекламу, оплачивает подписки), AgentVault проверяет каждую транзакцию
через настраиваемые политики, требует человеческого одобрения для крупных
операций и ведёт неизменяемый audit trail.

```
Агент хочет потратить $250 на Facebook Ads
        │
        ▼
  AgentVault Policy Engine
        │
        ├─ Лимит на транзакцию ($500)?      OK
        ├─ Дневной лимит ($2000)?           OK ($1750 осталось)
        ├─ Разрешённая категория (ads)?     OK
        └─ Нужно одобрение (> $200)?        PENDING -> ждёт человека
        │
        ▼
   APPROVED / PENDING / BLOCKED  ->  audit log
```

## Архитектура

```
agentvault/
├── apps/
│   ├── api/          # Node.js + Express + TypeScript backend (есть)
│   └── dashboard/    # Next.js admin UI (скоро)
├── packages/
│   └── sdk/          # SDK для агентов (скоро)
├── docker-compose.yml  # Postgres + Redis
└── .env.example
```

## Tech Stack

| Слой       | Технология                          |
|------------|-------------------------------------|
| Backend    | Node.js 22, Express 5, TypeScript   |
| ORM / DB   | Prisma + PostgreSQL                 |
| Очереди    | Redis (для async-одобрений)         |
| Dashboard  | Next.js (App Router) — позже        |
| Платежи    | Stripe / USDC on Base L2 — позже    |

## Быстрый старт

```bash
# 1. Поднять базу (Postgres + Redis)
docker compose up -d

# 2. Установить зависимости API
cd apps/api
npm install

# 3. Применить схему и засеять демо-данные
npm run db:push
npm run db:seed

# 4. Запустить API
npm run dev
# -> http://localhost:4000/health
```

## API (текущие эндпоинты)

| Метод  | Путь                          | Описание                              |
|--------|-------------------------------|---------------------------------------|
| GET    | `/health`                     | Health check                          |
| POST   | `/v1/agents`                  | Создать агента (выдаёт API-ключ)      |
| GET    | `/v1/agents`                  | Список агентов организации            |
| POST   | `/v1/policies`                | Создать политику трат                 |
| GET    | `/v1/policies`                | Список политик                        |
| POST   | `/v1/transactions`            | **Агент инициирует трату** (policy check) |
| GET    | `/v1/transactions`            | Audit trail                           |
| POST   | `/v1/transactions/:id/approve`| Человек одобряет pending-транзакцию   |
| POST   | `/v1/transactions/:id/reject` | Человек отклоняет pending-транзакцию  |

## Roadmap (57 дней -> MVP)

- **Фаза 1 (день 1–14):** Backend foundation — схема, policy engine, audit trail (мы здесь)
- **Фаза 2 (день 15–30):** Dashboard (Next.js), live-feed, approvals UI
- **Фаза 3 (день 31–45):** SDK для агентов, виртуальные карты, USDC/Base
- **Фаза 4 (день 46–57):** Биллинг (Stripe), полировка, demo для инвестора

## License

MIT
