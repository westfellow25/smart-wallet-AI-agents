import dotenv from "dotenv";
dotenv.config();

import app from "./app";

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 AgentVault API running on port ${PORT}`);
  console.log(`📚 Health check: http://localhost:${PORT}/health`);
});
