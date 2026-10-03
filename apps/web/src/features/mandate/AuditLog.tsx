import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Download,
  FileJson2,
  ListFilter,
  Search,
  Table2,
  Waypoints,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { auditRecords, type AuditRecord } from "./mock";
import { VerdictBadge } from "./VerdictBadge";

const ROW_HEIGHT = 57;
const VIEWPORT_HEIGHT = 456;

export function AuditLog() {
  const [mode, setMode] = useState<"table" | "timeline">("table");
  const [query, setQuery] = useState("");
  const [verdict, setVerdict] = useState("all");
  const [merchant, setMerchant] = useState("all");
  const [category, setCategory] = useState("all");
  const [rule, setRule] = useState("all");
  const [date, setDate] = useState("30d");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const merchants = useMemo(() => [...new Set(auditRecords.map((row) => row.merchant))], []);
  const categories = useMemo(() => [...new Set(auditRecords.map((row) => row.category))], []);
  const rules = useMemo(() => [...new Set(auditRecords.map((row) => row.ruleCode))], []);
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return auditRecords.filter((row) => {
      const searchable =
        `${row.id} ${row.merchant} ${row.item} ${row.category} ${row.rule} ${row.ruleCode} ${row.reasoning} ${row.paypalOrderId ?? ""}`.toLowerCase();
      return (
        (!needle || searchable.includes(needle)) &&
        (verdict === "all" || row.decision === verdict) &&
        (merchant === "all" || row.merchant === merchant) &&
        (category === "all" || row.category === category) &&
        (rule === "all" || row.ruleCode === rule) &&
        (date !== "24h" || Date.now() - new Date(row.occurredAt).getTime() < 86_400_000)
      );
    });
  }, [category, date, merchant, query, rule, verdict]);
  const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 3);
  const end = Math.min(rows.length, Math.ceil((scrollTop + VIEWPORT_HEIGHT) / ROW_HEIGHT) + 3);
  const visibleRows = rows.slice(start, end);
  const exportData = (format: "csv" | "json") => {
    const body =
      format === "json"
        ? JSON.stringify(rows, null, 2)
        : [
            "id,time,merchant,item,category,amount,verdict,rule,paypal_order_id",
            ...rows.map((row) =>
              [
                row.id,
                row.occurredAt,
                row.merchant,
                row.item,
                row.category,
                row.amount,
                row.decision,
                row.ruleCode,
                row.paypalOrderId ?? "",
              ]
                .map((value) => `"${String(value).replaceAll('"', '""')}"`)
                .join(","),
            ),
          ].join("\n");
    const url = URL.createObjectURL(
      new Blob([body], { type: format === "json" ? "application/json" : "text/csv" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `mandate-audit.${format}`;
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.16em] text-primary">
            Immutable evidence
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold md:text-4xl">Audit Log</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Inspect every decision from agent intent through policy verdict and payment
            authorization.
          </p>
        </div>
        <div className="flex gap-2">
          <Tabs value={mode} onValueChange={(value) => setMode(value as "table" | "timeline")}>
            <TabsList>
              <TabsTrigger value="table">
                <Table2 className="mr-2 size-4" />
                Table
              </TabsTrigger>
              <TabsTrigger value="timeline">
                <Waypoints className="mr-2 size-4" />
                Timeline
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportData("csv")}>
                <Download />
                CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportData("json")}>
                <FileJson2 />
                JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <section className="border-y border-border bg-card/75 py-4">
        <div className="grid gap-2 px-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_repeat(5,minmax(130px,.45fr))]">
          <label className="relative">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search IDs, reasoning, orders…"
              className="pl-9"
            />
          </label>
          <FilterSelect
            value={verdict}
            onChange={setVerdict}
            label="Verdict"
            options={["approved", "review", "blocked"]}
          />
          <FilterSelect
            value={date}
            onChange={setDate}
            label="Date"
            options={["24h", "7d", "30d", "all-time"]}
          />
          <FilterSelect
            value={merchant}
            onChange={setMerchant}
            label="Merchant"
            options={merchants}
          />
          <FilterSelect
            value={category}
            onChange={setCategory}
            label="Category"
            options={categories}
          />
          <FilterSelect value={rule} onChange={setRule} label="Rule" options={rules} />
        </div>
      </section>
      <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground">
        <span>{rows.length} matching decisions</span>
        <span className="flex items-center gap-2">
          <ListFilter className="size-3.5" />
          Virtualized stream · 240 records
        </span>
      </div>
      {mode === "table" ? (
        <section className="overflow-hidden rounded-md border border-border bg-card">
          <div className="grid grid-cols-[28px_minmax(180px,1.3fr)_100px_120px_minmax(160px,1fr)_90px] gap-3 border-b border-border bg-subtle px-4 py-3 font-mono text-[9px] uppercase text-muted-foreground">
            <span />
            <span>Merchant / item</span>
            <span>Verdict</span>
            <span>Category</span>
            <span>Rule</span>
            <span className="text-right">Amount</span>
          </div>
          <div
            ref={viewportRef}
            onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
            className="overflow-auto"
            style={{ height: VIEWPORT_HEIGHT }}
          >
            <div className="relative min-w-[760px]" style={{ height: rows.length * ROW_HEIGHT }}>
              <div
                className="absolute inset-x-0"
                style={{ transform: `translateY(${start * ROW_HEIGHT}px)` }}
              >
                {visibleRows.map((row) => (
                  <div key={row.id}>
                    <Button
                      variant="ghost"
                      className="grid h-[57px] w-full grid-cols-[28px_minmax(180px,1.3fr)_100px_120px_minmax(160px,1fr)_90px] gap-3 rounded-none border-b border-border px-4 text-left font-normal"
                      onClick={() => setExpanded(expanded === row.id ? null : row.id)}
                    >
                      <span>
                        {expanded === row.id ? (
                          <ChevronDown className="size-4" />
                        ) : (
                          <ChevronRight className="size-4" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <b className="block truncate text-xs">
                          {row.merchant} · {row.item}
                        </b>
                        <span className="font-mono text-[9px] text-muted-foreground">
                          {row.id} · {row.displayTime}
                        </span>
                      </span>
                      <AuditStatus value={row.decision} />
                      <span className="truncate text-xs text-muted-foreground">{row.category}</span>
                      <span className="truncate font-mono text-[9px] text-muted-foreground">
                        {row.ruleCode}
                      </span>
                      <span className="text-right font-mono text-xs">${row.amount.toFixed(2)}</span>
                    </Button>
                    {expanded === row.id && <AuditDetails row={row} overlay />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="relative ml-3 border-l border-border pl-7">
          {rows.slice(0, 30).map((row) => (
            <div key={row.id} className="relative pb-5">
              <span
                className={cn(
                  "absolute -left-[33px] top-4 size-2.5 rounded-full border-2 border-background",
                  row.decision === "approved"
                    ? "bg-safe"
                    : row.decision === "blocked"
                      ? "bg-danger"
                      : "bg-warning",
                )}
              />
              <Button
                variant="ghost"
                onClick={() => setExpanded(expanded === row.id ? null : row.id)}
                className="h-auto w-full justify-start rounded-md border border-border bg-card p-4 text-left font-normal"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <AuditStatus value={row.decision} />
                    <span className="font-mono text-[9px] text-muted-foreground">
                      {row.displayTime} · {row.id}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold">
                    {row.merchant} · {row.item}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{row.rule}</p>
                </div>
                <span className="font-mono text-sm">${row.amount.toFixed(2)}</span>
              </Button>
              <AnimatePresence>{expanded === row.id && <AuditDetails row={row} />}</AnimatePresence>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  label,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  options: string[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {label.toLowerCase()}s</SelectItem>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option === "review" ? "Escalate" : option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
function AuditStatus({ value }: { value: string }) {
  return <VerdictBadge value={value} />;
}
function AuditDetails({ row, overlay }: { row: AuditRecord; overlay?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={cn(
        "border border-border bg-background p-5",
        overlay ? "absolute left-4 right-4 z-10 shadow-xl" : "mt-2 rounded-md",
      )}
    >
      <div className="grid gap-5 md:grid-cols-3">
        <div>
          <p className="font-mono text-[9px] uppercase text-muted-foreground">Agent reasoning</p>
          <p className="mt-2 text-xs leading-5">{row.reasoning}</p>
        </div>
        <div>
          <p className="font-mono text-[9px] uppercase text-muted-foreground">Exact rule fired</p>
          <p className="mt-2 text-xs font-semibold">{row.ruleCode}</p>
          <p className="mt-1 text-xs text-muted-foreground">{row.rule}</p>
        </div>
        <div>
          <p className="font-mono text-[9px] uppercase text-muted-foreground">PayPal order ID</p>
          <p className="mt-2 break-all font-mono text-xs">
            {row.paypalOrderId ?? "Not created — payment stopped"}
          </p>
        </div>
      </div>
      <div className="mt-5 border-t border-border pt-4">
        <p className="flex items-center gap-2 font-mono text-[9px] uppercase text-muted-foreground">
          <Wrench className="size-3.5" />
          Tool calls
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {row.toolCalls.map((tool) => (
            <span
              key={tool}
              className="rounded-sm border border-border bg-subtle px-2 py-1 font-mono text-[9px]"
            >
              {tool}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
