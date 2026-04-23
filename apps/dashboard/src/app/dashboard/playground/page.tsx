"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

interface Step {
  label: string;
  transaction: {
    id: string;
    amount: number;
    status: string;
    merchantName: string | null;
    category: string | null;
  };
}

interface AskResponse {
  prompt: string;
  response: string;
  steps: Step[];
  totalCost: number;
  agent: { id: string; name: string };
}

const EXAMPLE_PROMPTS = [
  "Analyze last quarter's sales data and find outliers",
  "Research top competitors in AI agent infrastructure",
  "Write a Python script to parse CSV files",
  "Summarize the latest OpenAI announcement",
];

export default function PlaygroundPage() {
  const [prompt, setPrompt] = useState("");
  const [thinking, setThinking] = useState(false);
  const [revealedSteps, setRevealedSteps] = useState<Step[]>([]);
  const [answer, setAnswer] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const answerRef = useRef<HTMLDivElement>(null);

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || thinking) return;

    setThinking(true);
    setError("");
    setRevealedSteps([]);
    setAnswer(null);
    setTotal(0);

    try {
      const data = await apiFetch<AskResponse>("/api/v1/playground/ask", {
        method: "POST",
        body: JSON.stringify({ prompt }),
      });

      // Stream-style reveal of each step
      for (let i = 0; i < data.steps.length; i++) {
        await new Promise((r) => setTimeout(r, 600 + Math.random() * 400));
        setRevealedSteps(data.steps.slice(0, i + 1));
        setTotal(
          data.steps.slice(0, i + 1).reduce((a, s) => a + s.transaction.amount, 0),
        );
      }

      await new Promise((r) => setTimeout(r, 400));
      setAnswer(data.response);
      setTotal(data.totalCost);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setThinking(false);
    }
  }

  useEffect(() => {
    if (answer && answerRef.current) {
      answerRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [answer]);

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">AI Agent Playground</h1>
        <p className="text-sm text-gray-500">
          Watch a live AI agent process a query. Every reasoning step creates a real
          transaction, governed by your spending policies.
        </p>
      </div>

      {/* Prompt box */}
      <form onSubmit={handleAsk} className="mb-6">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask the agent anything... e.g. 'analyze Q3 sales data'"
            className="w-full resize-none border-0 bg-transparent text-sm focus:outline-none"
            rows={2}
            disabled={thinking}
          />
          <div className="mt-2 flex items-center justify-between">
            <div className="flex flex-wrap gap-1">
              {EXAMPLE_PROMPTS.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setPrompt(ex)}
                  disabled={thinking}
                  className="rounded-full border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  {ex}
                </button>
              ))}
            </div>
            <button
              type="submit"
              disabled={thinking || !prompt.trim()}
              className="rounded-lg bg-vault-600 px-4 py-2 text-sm font-medium text-white hover:bg-vault-700 disabled:opacity-50"
            >
              {thinking ? "Thinking..." : "Ask agent"}
            </button>
          </div>
        </div>
      </form>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Live steps */}
      {(thinking || revealedSteps.length > 0) && (
        <div className="mb-4 rounded-xl border bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              Agent reasoning{" "}
              <span className="text-gray-400">
                ({revealedSteps.length} step{revealedSteps.length !== 1 ? "s" : ""})
              </span>
            </h2>
            <div className="text-right">
              <div className="text-xs text-gray-500">Spent so far</div>
              <div className="text-sm font-bold">${total.toFixed(2)}</div>
            </div>
          </div>

          <div className="space-y-2">
            {revealedSteps.map((step, idx) => (
              <div
                key={step.transaction.id}
                className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm animate-in fade-in slide-in-from-top-1 duration-300"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="font-medium">{step.label}</div>
                    <div className="text-xs text-gray-500">
                      {step.transaction.merchantName} · {step.transaction.category}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                    {step.transaction.status}
                  </span>
                  <span className="font-mono text-xs font-semibold">
                    ${step.transaction.amount.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-500">
                <div className="flex gap-1">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-vault-500 [animation-delay:0ms]" />
                  <span className="h-2 w-2 animate-pulse rounded-full bg-vault-500 [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-pulse rounded-full bg-vault-500 [animation-delay:300ms]" />
                </div>
                Thinking...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Final answer */}
      {answer && (
        <div ref={answerRef} className="rounded-xl border border-vault-200 bg-vault-50 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-vault-600 text-xs font-bold text-white">
              AV
            </div>
            <span className="text-sm font-semibold">Agent response</span>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{answer}</p>
          <div className="mt-4 flex items-center justify-between border-t border-vault-200 pt-3 text-xs">
            <span className="text-gray-600">
              Total cost for this query: <strong>${total.toFixed(2)}</strong>
            </span>
            <Link
              href="/dashboard/transactions"
              className="font-medium text-vault-700 hover:text-vault-900"
            >
              View in transaction log →
            </Link>
          </div>
        </div>
      )}

      {/* Empty state explainer */}
      {!thinking && revealedSteps.length === 0 && !answer && (
        <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-8 text-center">
          <div className="mb-3 text-4xl">🤖</div>
          <h3 className="mb-1 font-semibold">This is a live agent, not a static page</h3>
          <p className="mx-auto max-w-md text-sm text-gray-500">
            Type a question above. The agent will call GPT-4, maybe search the web, maybe run
            cloud compute — and every call will be <strong>a real transaction</strong> in your
            AgentVault wallet, subject to your policies.
          </p>
        </div>
      )}
    </div>
  );
}
