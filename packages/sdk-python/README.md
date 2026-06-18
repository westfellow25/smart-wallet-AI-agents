# agentvault (Python SDK)

Official Python SDK for **AgentVault** — let your AI agents spend money safely.
Zero dependencies (stdlib only).

```python
import os
from agentvault import AgentVault

vault = AgentVault(api_key=os.environ["AGENTVAULT_KEY"])

decision = vault.spend(amount=15000, merchant="Google Ads", category="ads")

if decision.approved:
    run_campaign()                       # политики пройдены, деньги списаны
elif decision.pending:
    print("Ждём одобрения:", decision.reason)
else:
    print("Заблокировано:", decision.reason)
```

См. полный пример: [`example_agent.py`](./example_agent.py).
