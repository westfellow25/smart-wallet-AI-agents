"use client";

import { DailyPoint } from "@/lib/api";

interface Props {
  data: DailyPoint[];
}

export function SpendChart({ data }: Props) {
  if (data.length === 0) {
    return <div className="flex h-48 items-center justify-center text-sm text-gray-400">No data yet</div>;
  }

  const max = Math.max(...data.map((d) => d.total), 1);

  return (
    <div className="flex h-48 items-end gap-2">
      {data.map((d) => {
        const height = (d.total / max) * 100;
        return (
          <div key={d.day} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex-1 w-full flex items-end">
              <div
                className="w-full rounded-t bg-vault-600 transition-all hover:bg-vault-700"
                style={{ height: `${Math.max(height, 4)}%` }}
                title={`$${d.total.toFixed(2)}`}
              />
            </div>
            <div className="text-[10px] text-gray-500">
              {new Date(d.day).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
