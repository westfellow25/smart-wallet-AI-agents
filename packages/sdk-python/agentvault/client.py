"""
AgentVault Python SDK.

    from agentvault import AgentVault

    vault = AgentVault(api_key=os.environ["AGENTVAULT_KEY"])
    decision = vault.spend(amount=15000, merchant="Google Ads", category="ads")
    if decision.approved:
        run_campaign()

Зависимости: только стандартная библиотека (urllib) — никаких внешних пакетов.
"""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from typing import Any, Dict, Optional


class AgentVaultError(Exception):
    """Ошибка SDK (сеть, авторизация, некорректный ответ)."""

    def __init__(self, message: str, status: Optional[int] = None) -> None:
        super().__init__(message)
        self.status = status


@dataclass
class SpendDecision:
    id: str
    status: str  # APPROVED | PENDING | BLOCKED | REJECTED
    reason: Optional[str]
    raw: Dict[str, Any] = field(default_factory=dict)

    @property
    def approved(self) -> bool:
        """True только при APPROVED — деньги списаны, можно действовать."""
        return self.status == "APPROVED"

    @property
    def pending(self) -> bool:
        """True при PENDING — ждёт ручного одобрения."""
        return self.status == "PENDING"

    @property
    def blocked(self) -> bool:
        """True при BLOCKED/REJECTED — нарушена политика."""
        return self.status in ("BLOCKED", "REJECTED")


class AgentVault:
    def __init__(
        self,
        api_key: str,
        base_url: str = "http://localhost:4000",
        timeout: float = 10.0,
    ) -> None:
        if not api_key:
            raise AgentVaultError("api_key is required")
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def spend(self, amount: int, merchant: str, category: str) -> SpendDecision:
        """
        Запросить трату. amount — в центах (1500 = $15.00).
        Возвращает решение policy engine; не бросает на BLOCKED/PENDING.
        """
        payload = json.dumps(
            {"amount": amount, "merchant": merchant, "category": category}
        ).encode()
        req = urllib.request.Request(
            f"{self.base_url}/v1/transactions",
            data=payload,
            method="POST",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                data = json.loads(resp.read().decode())
        except urllib.error.HTTPError as e:
            body = e.read().decode()
            try:
                data = json.loads(body)
            except json.JSONDecodeError:
                data = {}
            # 402 (нет средств) / 200 (BLOCKED) всё равно несут решение.
            if e.code in (401, 403) or "status" not in data:
                raise AgentVaultError(data.get("error", body) or "HTTP error", e.code)
        except urllib.error.URLError as e:
            raise AgentVaultError(f"Network error: {e.reason}") from e

        if "status" not in data:
            raise AgentVaultError(data.get("error", "Unexpected response"))

        return SpendDecision(
            id=str(data.get("id")),
            status=data["status"],
            reason=data.get("reason"),
            raw=data,
        )
