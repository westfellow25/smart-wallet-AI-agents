"""
Пример: AI-агент на Python тратит деньги через AgentVault.

Запуск (нужен работающий API и ключ агента из `npm run db:seed`):
    AGENTVAULT_KEY=av_xxx python example_agent.py
"""

import os

from agentvault import AgentVault

vault = AgentVault(
    api_key=os.environ.get("AGENTVAULT_KEY", "av_REPLACE_ME"),
    base_url=os.environ.get("AGENTVAULT_API_URL", "http://localhost:4000"),
)

campaigns = [
    (15000, "Google Ads", "ads"),   # $150  -> APPROVED
    (30000, "Meta Ads", "ads"),     # $300  -> PENDING (порог $200)
    (60000, "TikTok Ads", "ads"),   # $600  -> BLOCKED (лимит $500)
]

for amount, merchant, category in campaigns:
    d = vault.spend(amount=amount, merchant=merchant, category=category)
    icon = "OK " if d.approved else ("WAIT" if d.pending else "STOP")
    print(f"[{icon}] ${amount/100:.2f} {merchant} -> {d.status}")
    if d.reason:
        print(f"      {d.reason}")
    if d.approved:
        print(f"      Запустил кампанию на {merchant}")
