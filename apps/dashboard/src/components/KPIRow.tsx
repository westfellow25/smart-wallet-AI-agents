"use client";

const kpis = [
  { label: "Total Spent", value: "$12,450", change: "+12%", up: true },
  { label: "Active Agents", value: "8", change: "+2", up: true },
  { label: "Transactions", value: "1,247", change: "+18%", up: true },
  { label: "Blocked", value: "23", change: "-5%", up: false },
  { label: "Budget Used", value: "62%", change: "", up: true },
];

export function KPIRow() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
        >
          <p className="text-xs font-medium text-gray-500">{kpi.label}</p>
          <p className="mt-1 text-2xl font-bold">{kpi.value}</p>
          {kpi.change && (
            <p
              className={`mt-1 text-xs font-medium ${
                kpi.up ? "text-emerald-600" : "text-red-500"
              }`}
            >
              {kpi.change} vs last month
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
