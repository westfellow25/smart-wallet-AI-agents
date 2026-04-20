# AgentVault Python SDK

Python client for the AgentVault API — smart wallet infrastructure for AI agents.

## Install

```bash
pip install agentvault
```

## Usage

```python
from agentvault import AgentVault

vault = AgentVault(api_key="av_live_...")

# Submit a spend request
tx = vault.spend(
    amount=5.00,
    category="api-call",
    description="GPT-4 inference call",
    merchant_name="OpenAI",
)

print(tx.status)  # "COMPLETED", "PENDING", or "BLOCKED"
```

## Error handling

```python
from agentvault import AgentVault, AgentVaultError

try:
    tx = vault.spend(amount=1000, category="api-call")
except AgentVaultError as e:
    if e.status_code == 403:
        print(f"Blocked by policy: {e.message}")
```
