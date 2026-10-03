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

const categoryData = [
  { name: "Software", value: 43, color: "var(--chart-safe)" },
  { name: "Office", value: 28, color: "var(--gate)" },
  { name: "Hardware", value: 19, color: "var(--warning)" },
  { name: "Other", value: 10, color: "var(--muted-foreground)" },
];

export function BudgetBurnDownChart() {
  const data = spendData.map((row, index) => ({
    ...row,
    remaining: 4500 - spendData.slice(0, index + 1).reduce((sum, item) => sum + item.approved, 0),
    control: 4500 - (index + 1) * 430,
  }));

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
              borderRadius: 6,
            }}
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
                borderRadius: 6,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-3">
        {categoryData.map((item) => (
          <div key={item.name} className="text-xs">
            <span
              className="mr-2 inline-block size-2 rounded-full"
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
