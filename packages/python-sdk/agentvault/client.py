"""AgentVault Python client."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Optional

import httpx


class AgentVaultError(Exception):
    def __init__(self, status_code: int, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.message = message


@dataclass
class Transaction:
    id: str
    amount: float
    status: str
    category: Optional[str] = None
    description: Optional[str] = None
    created_at: Optional[str] = None

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Transaction":
        return cls(
            id=data["id"],
            amount=float(data["amount"]),
            status=data["status"],
            category=data.get("category"),
            description=data.get("description"),
            created_at=data.get("createdAt"),
        )


@dataclass
class Wallet:
    id: str
    name: str
    balance: float
    currency: str
    status: str

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Wallet":
        return cls(
            id=data["id"],
            name=data["name"],
            balance=float(data["balance"]),
            currency=data["currency"],
            status=data["status"],
        )


class AgentVault:
    """Client for the AgentVault API.

    Example:
        >>> vault = AgentVault(api_key="av_live_...")
        >>> tx = vault.spend(amount=5.00, category="api-call", description="GPT-4 inference")
        >>> print(tx.status)
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.agentvault.dev",
        timeout: float = 10.0,
    ) -> None:
        self._client = httpx.Client(
            base_url=base_url,
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=timeout,
        )

    def _request(self, method: str, path: str, json: Optional[dict[str, Any]] = None) -> dict[str, Any]:
        resp = self._client.request(method, path, json=json)
        if resp.status_code >= 400:
            body = {}
            try:
                body = resp.json()
            except Exception:
                pass
            raise AgentVaultError(resp.status_code, body.get("error", f"HTTP {resp.status_code}"))
        return resp.json() if resp.content else {}

    def spend(
        self,
        amount: float,
        agent_id: Optional[str] = None,
        category: Optional[str] = None,
        description: Optional[str] = None,
        merchant_name: Optional[str] = None,
        reference: Optional[str] = None,
        metadata: Optional[dict[str, Any]] = None,
    ) -> Transaction:
        """Submit a spend request. Returns the transaction (may be pending approval)."""
        payload: dict[str, Any] = {"amount": amount}
        if agent_id:
            payload["agentId"] = agent_id
        if category:
            payload["category"] = category
        if description:
            payload["description"] = description
        if merchant_name:
            payload["merchantName"] = merchant_name
        if reference:
            payload["reference"] = reference
        if metadata:
            payload["metadata"] = metadata

        data = self._request("POST", "/api/v1/transactions", json=payload)
        return Transaction.from_dict(data["transaction"])

    def get_transaction(self, transaction_id: str) -> Transaction:
        data = self._request("GET", f"/api/v1/transactions/{transaction_id}")
        return Transaction.from_dict(data["transaction"])

    def list_transactions(self, limit: int = 20) -> list[Transaction]:
        data = self._request("GET", f"/api/v1/transactions?limit={limit}")
        return [Transaction.from_dict(t) for t in data["transactions"]]

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> "AgentVault":
        return self

    def __exit__(self, *_: Any) -> None:
        self.close()
