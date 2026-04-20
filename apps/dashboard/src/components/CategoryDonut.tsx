"use client";

import { CategoryStat } from "@/lib/api";

interface Props {
  data: CategoryStat[];
}

const colors = ["bg-vault-600", "bg-emerald-500", "bg-amber-500", "bg-purple-500", "bg-pink-500", "bg-cyan-500"];

export function CategoryDonut({ data }: Props) {
  if (data.length === 0) {
    return <div className="flex h-48 items-center justify-center text-sm text-gray-400">No data yet</div>;
  }

  const total = data.reduce((sum, d) => sum + d.total, 0);
  const sorted = [...data].sort((a, b) => b.total - a.total).slice(0, 6);

  return (
    <div className="space-y-3">
      {sorted.map((cat, i) => {
        const pct = total > 0 ? (cat.total / total) * 100 : 0;
        return (
          <div key={cat.category}>
            <div className="flex justify-between text-xs">
              <span className="font-medium capitalize">{cat.category.replace("-", " ")}</span>
              <span className="text-gray-500">${cat.total.toFixed(2)}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full ${colors[i % colors.length]}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
