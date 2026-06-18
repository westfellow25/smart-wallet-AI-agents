import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { agentsRouter } from "./routes/agents";
import { policiesRouter } from "./routes/policies";
import { transactionsRouter } from "./routes/transactions";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "agentvault-api", time: new Date().toISOString() });
});

app.use("/v1/agents", agentsRouter);
app.use("/v1/policies", policiesRouter);
app.use("/v1/transactions", transactionsRouter);

// Глобальный обработчик ошибок.
app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
);

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => {
  console.log(`AgentVault API listening on http://localhost:${port}`);
});
