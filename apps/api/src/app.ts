import express from "express";
import cors from "cors";
import helmet from "helmet";

import { errorHandler } from "./middleware/errorHandler";
import { authRouter } from "./routes/auth";
import { walletsRouter } from "./routes/wallets";
import { agentsRouter } from "./routes/agents";
import { transactionsRouter } from "./routes/transactions";
import { policiesRouter } from "./routes/policies";

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "agentvault-api", version: "0.1.0" });
});

// Routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/wallets", walletsRouter);
app.use("/api/v1/agents", agentsRouter);
app.use("/api/v1/transactions", transactionsRouter);
app.use("/api/v1/policies", policiesRouter);

// Error handler
app.use(errorHandler);

export default app;
