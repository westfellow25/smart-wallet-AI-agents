export type TxStatus = "APPROVED" | "PENDING" | "BLOCKED" | "REJECTED";

export type Transaction = {
  id: string;
  amount: number; // в центах
  currency: string;
  merchant: string;
  category: string;
  status: TxStatus;
  reason: string | null;
  createdAt: string;
  agent?: { name: string };
};

export type Agent = {
  id: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | "REVOKED";
  createdAt: string;
  wallet?: { balance: number; dailySpent: number; currency: string } | null;
};

export type DashboardData = {
  transactions: Transaction[];
  agents: Agent[];
  source: "live" | "demo"; // откуда данные: реальный API или демо-фолбэк
};

export type CardNetwork = "VISA" | "USDC_BASE";

export type VirtualCard = {
  id: string;
  network: CardNetwork;
  last4: string;
  expMonth: number;
  expYear: number;
  status: "ACTIVE" | "FROZEN";
  agent?: { name: string };
};
