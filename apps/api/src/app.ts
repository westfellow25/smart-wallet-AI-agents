import express from "express";
import "express-async-errors";
import cors from "cors";
import helmet from "helmet";

import { errorHandler } from "./middleware/errorHandler";
import { standardLimiter, authLimiter, txLimiter } from "./middleware/rateLimit";
import { authRouter } from "./routes/auth";
import { walletsRouter } from "./routes/wallets";
import { agentsRouter } from "./routes/agents";
import { transactionsRouter } from "./routes/transactions";
import { policiesRouter } from "./routes/policies";
import { apiKeysRouter } from "./routes/apiKeys";
import { webhooksRouter } from "./routes/webhooks";
import { analyticsRouter } from "./routes/analytics";
import { auditRouter } from "./routes/audit";
import { billingRouter } from "./routes/billing";

const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "agentvault-api", version: "0.1.0" });
});

app.use("/api/v1/auth", authLimiter, authRouter);
app.use("/api/v1/transactions", txLimiter, transactionsRouter);
app.use("/api/v1/wallets", standardLimiter, walletsRouter);
app.use("/api/v1/agents", standardLimiter, agentsRouter);
app.use("/api/v1/policies", standardLimiter, policiesRouter);
app.use("/api/v1/api-keys", standardLimiter, apiKeysRouter);
app.use("/api/v1/webhooks", standardLimiter, webhooksRouter);
app.use("/api/v1/analytics", standardLimiter, analyticsRouter);
app.use("/api/v1/audit", standardLimiter, auditRouter);
app.use("/api/v1/billing", standardLimiter, billingRouter);

app.use(errorHandler);

export default app;
