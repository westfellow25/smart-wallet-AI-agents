import Link from "next/link";

export const metadata = {
  title: "AgentVault — the corporate wallet for AI agents",
  description:
    "Spending policies, human approvals, and an audit trail for every dollar your AI agents move.",
};

const features = [
  { icon: "🛡️", title: "Policy Engine", text: "Per-transaction & daily limits, allowed categories, and approval thresholds — enforced before any money moves." },
  { icon: "⏸", title: "Human-in-the-loop", text: "Anything over your threshold becomes PENDING and waits for a person to approve or reject." },
  { icon: "🧾", title: "Immutable audit trail", text: "Every spend is logged with its decision and the exact reason it was approved, held, or blocked." },
  { icon: "🔌", title: "Drop-in SDKs", text: "JS/TS and Python. Connect an agent in 3 lines — works with any agent framework." },
  { icon: "📟", title: "Live Control Tower", text: "Real-time transaction feed, KPIs, pending approvals, and per-agent wallet health." },
  { icon: "💳", title: "Per-agent wallets", text: "Each agent gets its own balance and daily-spend counter, auto-reset every day." },
];

const plans = [
  { name: "Free", price: "$0", agents: "2 agents", popular: false },
  { name: "Starter", price: "$199", agents: "5 agents", popular: false },
  { name: "Growth", price: "$499", agents: "25 agents", popular: true },
  { name: "Scale", price: "$2,000", agents: "∞ agents", popular: false },
];

export default function Landing() {
  return (
    <div className="lp">
      <header className="lp-nav">
        <div className="brand">
          <div className="logo">AV</div>
          <strong>AgentVault</strong>
        </div>
        <nav className="nav">
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <Link href="/dashboard">Live demo</Link>
          <Link href="/login">Sign in</Link>
          <Link href="/login" className="nav-cta">Get started →</Link>
        </nav>
      </header>

      <section className="hero">
        <div className="pill-tag">For companies running AI agents in production</div>
        <h1>
          The corporate wallet<br />for <span className="grad">AI agents</span>
        </h1>
        <p className="sub">
          Your agents can spend money. AgentVault makes sure they spend it within
          policy — with limits they can't exceed, human approvals for the big
          calls, and an audit trail for every dollar.
        </p>
        <div className="hero-cta">
          <Link href="/dashboard" className="btn-primary">See the live dashboard →</Link>
          <Link href="/billing" className="btn-secondary">View pricing</Link>
        </div>

        <div className="code-card">
          <div className="code-head"><span className="dot demo" /> agent.ts</div>
          <pre>{`import { AgentVault } from "@agentvault/sdk";

const vault = new AgentVault({ apiKey: process.env.AGENTVAULT_KEY! });

const decision = await vault.spend({
  amount: 30000,            // $300.00
  merchant: "Meta Ads",
  category: "ads",
});

decision.status   // "PENDING" — over the $200 approval threshold
decision.approved // false — waits for a human in the dashboard`}</pre>
        </div>
      </section>

      <section className="problem">
        <h2>A non-human employee with a credit card and no judgment</h2>
        <p>
          The moment an AI agent can move money, you have a new risk: a buggy
          prompt, a hallucinated decision, or a prompt-injection attack drains the
          budget at 3am. Today teams "solve" this with a shared API key, a
          spreadsheet, and hope. No limits. No approvals. No audit trail —
          nothing a CFO or security team would ever sign off on.
        </p>
      </section>

      <section id="features" className="features">
        <h2 className="section-title">Everything you need to let agents spend — safely</h2>
        <div className="feature-grid">
          {features.map((f) => (
            <div className="feature" key={f.title}>
              <div className="f-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flow">
        <h2 className="section-title">How a single spend is judged</h2>
        <div className="flow-row">
          <div className="flow-step"><span>1</span>Agent calls <code>vault.spend()</code></div>
          <div className="flow-arrow">→</div>
          <div className="flow-step"><span>2</span>Policy Engine checks limits & category</div>
          <div className="flow-arrow">→</div>
          <div className="flow-step"><span>3</span>APPROVED · PENDING · BLOCKED</div>
          <div className="flow-arrow">→</div>
          <div className="flow-step"><span>4</span>Wallet update + audit log</div>
        </div>
      </section>

      <section id="pricing" className="pricing-lp">
        <h2 className="section-title">Simple, usage-based pricing</h2>
        <div className="plan-row">
          {plans.map((p) => (
            <div className={`plan-mini ${p.popular ? "popular" : ""}`} key={p.name}>
              {p.popular && <div className="ribbon">Most popular</div>}
              <div className="pm-name">{p.name}</div>
              <div className="pm-price">{p.price}<span>/mo</span></div>
              <div className="pm-agents">{p.agents}</div>
            </div>
          ))}
        </div>
        <Link href="/billing" className="btn-primary center">Compare plans →</Link>
      </section>

      <section className="cta-final">
        <h2>Give your AI agents a wallet you can trust.</h2>
        <Link href="/dashboard" className="btn-primary">Open the live dashboard →</Link>
      </section>

      <footer className="lp-footer">
        <span>AgentVault — corporate wallet for AI agents</span>
        <a href="https://github.com/westfellow25/smart-wallet-AI-agents" target="_blank" rel="noreferrer">
          GitHub
        </a>
      </footer>
    </div>
  );
}
