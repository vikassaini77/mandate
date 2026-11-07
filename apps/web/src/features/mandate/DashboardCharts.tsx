import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { spendData } from "./mock";
import { useMandateStore } from "./store";

const defaultCategoryData = [
  { name: "Software", value: 43, color: "var(--chart-safe)" },
  { name: "Office", value: 28, color: "var(--gate)" },
  { name: "Hardware", value: 19, color: "var(--warning)" },
  { name: "Other", value: 10, color: "var(--muted-foreground)" },
];

export function BudgetBurnDownChart() {
  const transactions = useMandateStore((state) => state.transactions) || [];
  const monthlyCap = useMandateStore((state) => state.monthlyCap) || 5000;

  const data = useMemo(() => {
    const completed = transactions.filter((tx) => tx.status === "completed");
    if (completed.length > 0) {
      let cumulative = 0;
      return completed.slice(-10).map((tx, idx, arr) => {
        cumulative += tx.amount;
        return {
          day: tx.date ? tx.date.split("·")[0].trim() : `Tx ${idx + 1}`,
          approved: tx.amount,
          remaining: Math.max(0, monthlyCap - cumulative),
          control: Math.max(0, monthlyCap - (idx + 1) * (monthlyCap / (arr.length + 1))),
        };
      });
    }

    return spendData.map((row, index) => ({
      ...row,
      remaining: Math.max(0, monthlyCap - spendData.slice(0, index + 1).reduce((sum, item) => sum + item.approved, 0)),
      control: Math.max(0, monthlyCap - (index + 1) * (monthlyCap / spendData.length)),
    }));
  }, [transactions, monthlyCap]);

  return (
    <div className="h-72 pt-5" aria-label="Budget burn-down chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="burn" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-safe)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="var(--chart-safe)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
            width={44}
          />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 0,
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              textTransform: "uppercase",
            }}
            itemStyle={{ color: "var(--foreground)" }}
            labelStyle={{ color: "var(--muted-foreground)", marginBottom: 4 }}
          />
          <Area
            type="monotone"
            dataKey="control"
            stroke="var(--muted-foreground)"
            fill="transparent"
            strokeDasharray="4 5"
          />
          <Area
            type="monotone"
            dataKey="remaining"
            stroke="var(--chart-safe)"
            fill="url(#burn)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategorySpendChart() {
  const transactions = useMandateStore((state) => state.transactions) || [];

  const categoryData = useMemo(() => {
    const completed = transactions.filter((tx) => tx.status === "completed");
    if (completed.length > 0) {
      const counts: Record<string, number> = {};
      completed.forEach((tx) => {
        const cat = tx.category || "General";
        counts[cat] = (counts[cat] || 0) + tx.amount;
      });
      const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
      const palette = ["var(--chart-safe)", "var(--gate)", "var(--warning)", "var(--paypal)", "var(--muted-foreground)"];
      return Object.entries(counts).map(([name, val], idx) => ({
        name,
        value: Math.round((val / total) * 100),
        color: palette[idx % palette.length],
      }));
    }
    return defaultCategoryData;
  }, [transactions]);

  return (
    <div className="flex items-center gap-3 pt-4">
      <div className="h-52 min-w-0 flex-1" aria-label="Spend by category chart">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={categoryData}
              innerRadius={52}
              outerRadius={76}
              paddingAngle={3}
              dataKey="value"
            >
              {categoryData.map((item) => (
                <Cell key={item.name} fill={item.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 0,
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                textTransform: "uppercase",
              }}
              itemStyle={{ color: "var(--foreground)" }}
              labelStyle={{ color: "var(--muted-foreground)" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-3">
        {categoryData.map((item) => (
          <div key={item.name} className="text-xs">
            <span
              className="mr-2 inline-block size-2 rounded-none"
              style={{ background: item.color }}
              aria-hidden="true"
            />
            {item.name}
            <span className="ml-2 font-mono text-muted-foreground">{item.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
