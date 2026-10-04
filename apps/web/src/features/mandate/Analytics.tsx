import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Clock3, ShieldCheck, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const trends = [
  { month: "May", spend: 2210, blocked: 290 },
  { month: "Jun", spend: 1980, blocked: 410 },
  { month: "Jul", spend: 2670, blocked: 780 },
  { month: "Aug", spend: 2320, blocked: 520 },
  { month: "Sep", spend: 2890, blocked: 910 },
  { month: "Oct", spend: 1843, blocked: 663 },
];
const categories = [
  { name: "Software", value: 43, color: "var(--chart-safe)" },
  { name: "Office", value: 28, color: "var(--gate)" },
  { name: "Hardware", value: 19, color: "var(--warning)" },
  { name: "Other", value: 10, color: "var(--muted-foreground)" },
];
const hourly = Array.from({ length: 7 }, (_, day) =>
  Array.from({ length: 12 }, (_, hour) => ({
    day,
    hour: hour * 2,
    count: (day * 7 + hour * 3 + (hour > 6 ? 5 : 0)) % 10,
  })),
);

export function Analytics() {
  const [range, setRange] = useState("6M");
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.16em] text-primary">
            Decision intelligence
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold md:text-4xl">Analytics</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            See how autonomy, intervention, and spend change over time.
          </p>
        </div>
        <div className="flex rounded-md border border-border p-1">
          {["30D", "3M", "6M", "1Y"].map((item) => (
            <Button
              key={item}
              size="sm"
              variant={range === item ? "secondary" : "ghost"}
              onClick={() => setRange(item)}
            >
              {item}
            </Button>
          ))}
        </div>
      </div>
      <section className="grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={TrendingUp}
          label="Total spend"
          value="$12,976"
          note="+8.4% vs prior period"
        />
        <Metric
          icon={ShieldCheck}
          label="Approval rate"
          value="82.6%"
          note="451 of 546 decisions"
          positive
        />
        <Metric icon={Clock3} label="Average decision" value="184ms" note="28ms faster" positive />
        <Metric
          icon={TrendingDown}
          label="Blocked exposure"
          value="$3,574"
          note="95 attempts contained"
        />
      </section>
      <div className="grid gap-6 xl:grid-cols-[1.5fr_.7fr]">
        <ChartPanel
          title="Spend trend"
          subtitle={`Approved spend and prevented exposure · ${range}`}
        >
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trends}>
              <defs>
                <linearGradient id="analyticsSpend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--safe)" stopOpacity={0.36} />
                  <stop offset="100%" stopColor="var(--safe)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={10} />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={10}
                tickFormatter={(v) => `$${v / 1000}k`}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  borderColor: "var(--border)",
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
                dataKey="spend"
                stroke="var(--safe)"
                fill="url(#analyticsSpend)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="blocked"
                stroke="var(--danger)"
                fill="transparent"
                strokeDasharray="4 4"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ChartPanel title="Category mix" subtitle="Share of approved spend">
          <div className="grid place-items-center">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={categories}
                  dataKey="value"
                  innerRadius={65}
                  outerRadius={90}
                  paddingAngle={3}
                >
                  {categories.map((item) => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    borderColor: "var(--border)",
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
            <div className="grid w-full grid-cols-2 gap-2">
              {categories.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <span>
                    <i
                      className="mr-2 inline-block size-2 rounded-none"
                      style={{ background: item.color }}
                    />
                    {item.name}
                  </span>
                  <span className="font-mono">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </ChartPanel>
      </div>

      <ChartPanel 
        title="Explainable AI (SHAP Contributions)" 
        subtitle="Real-time feature contribution breakdown from the AnomalyDetector ML model"
      >
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={[
            { name: "Velocity (24h)", contribution: 60, fill: "var(--danger)" },
            { name: "Amount", contribution: 30, fill: "var(--warning)" },
            { name: "Category Novelty", contribution: 10, fill: "var(--muted-foreground)" }
          ]} layout="vertical" margin={{ left: 40 }}>
            <CartesianGrid stroke="var(--border)" horizontal={false} />
            <XAxis type="number" hide />
            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} fontSize={10} width={100} />
            <Tooltip
              contentStyle={{ background: "var(--popover)", borderColor: "var(--border)", borderRadius: 0, fontFamily: "var(--font-mono)", fontSize: "10px", textTransform: "uppercase" }}
              itemStyle={{ color: "var(--foreground)" }}
              labelStyle={{ color: "var(--muted-foreground)" }}
              formatter={(value) => [`${value}% impact`, "SHAP Value"]}
            />
            <Bar dataKey="contribution" radius={[0, 0, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel
        title="Blocked-attempt heatmap"
        subtitle="Day and hour patterns reveal when hostile or out-of-policy requests peak"
      >
        <div className="mt-6 overflow-x-auto">
          <div className="min-w-[680px]">
            <div className="ml-12 grid grid-cols-12 gap-1 font-mono text-[8px] text-muted-foreground">
              {Array.from({ length: 12 }, (_, i) => (
                <span key={i}>{String(i * 2).padStart(2, "0")}:00</span>
              ))}
            </div>
            <div className="mt-2 space-y-1">
              {hourly.map((row, day) => (
                <div key={day} className="grid grid-cols-[42px_repeat(12,1fr)] gap-1">
                  <span className="self-center font-mono text-[9px] text-muted-foreground">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][day]}
                  </span>
                  {row.map((cell) => (
                    <div
                      key={cell.hour}
                      title={`${cell.count} blocked attempts on ${["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][day]} at ${cell.hour}:00`}
                      aria-label={`${cell.count} blocked attempts`}
                      className={cn(
                        "aspect-[1.5] rounded-sm border border-danger/10",
                        cell.count < 2
                          ? "bg-danger/5"
                          : cell.count < 5
                            ? "bg-danger/20"
                            : cell.count < 8
                              ? "bg-danger/45"
                              : "bg-danger/80",
                      )}
                    />
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-end gap-1 text-[9px] text-muted-foreground">
              <span className="mr-1">Fewer</span>
              {["bg-danger/5", "bg-danger/20", "bg-danger/45", "bg-danger/80"].map((color) => (
                <span key={color} className={cn("size-3 rounded-sm", color)} />
              ))}
              <span className="ml-1">More</span>
            </div>
          </div>
        </div>
      </ChartPanel>
      <ChartPanel
        title="Decision throughput"
        subtitle="Approved, escalated, and blocked requests by month"
      >
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={trends}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={10} />
            <YAxis tickLine={false} axisLine={false} fontSize={10} />
            <Tooltip
              contentStyle={{
                background: "var(--popover)",
                borderColor: "var(--border)",
                borderRadius: 0,
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                textTransform: "uppercase",
              }}
              itemStyle={{ color: "var(--foreground)" }}
              labelStyle={{ color: "var(--muted-foreground)", marginBottom: 4 }}
            />
            <Bar dataKey="spend" fill="var(--safe)" radius={[0, 0, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>
    </div>
  );
}
function Metric({
  icon: Icon,
  label,
  value,
  note,
  positive,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  note: string;
  positive?: boolean;
}) {
  return (
    <div className="bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <p className="mt-4 font-mono text-2xl">{value}</p>
      <p className={cn("mt-2 text-[10px]", positive ? "text-safe" : "text-muted-foreground")}>
        {note}
      </p>
    </div>
  );
}
function ChartPanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-border bg-card p-5">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}
