import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  ArrowDownLeft,
  CheckCircle2,
  CircleDollarSign,
  ExternalLink,
  Receipt,
  RotateCcw,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ActionEmpty } from "./WorkspaceStates";
import { VerdictBadge } from "./VerdictBadge";

type PaymentStatus = "completed" | "pending" | "refunded" | "denied";
type Payment = {
  id: string;
  merchant: string;
  item: string;
  amount: number;
  status: PaymentStatus;
  date: string;
  mandate: string;
  verdict: string;
  refunded: number;
  employee: string;
};
const seed: Payment[] = [
  {
    id: "4KJ92163MR782114A",
    merchant: "Notion",
    item: "Team workspace · monthly",
    amount: 80,
    status: "completed",
    date: "Oct 3, 2026 · 10:31",
    mandate: "Developer tools up to $500/month",
    verdict: "APPROVE · MND-SW-104",
    refunded: 0,
    employee: "Jane Doe",
  },
  {
    id: "8NY11402CH260701V",
    merchant: "B&H Photo",
    item: "Auralis NC-7 headphones",
    amount: 139,
    status: "completed",
    date: "Oct 2, 2026 · 16:18",
    mandate: "Electronics under $150",
    verdict: "APPROVE · MND-LIM-012",
    refunded: 0,
    employee: "John Smith",
  },
  {
    id: "3BR77561FJ908442P",
    merchant: "Linear",
    item: "Business plan · annual",
    amount: 192,
    status: "pending",
    date: "Oct 2, 2026 · 12:06",
    mandate: "Developer tools up to $500/month",
    verdict: "ESCALATE · MND-BIL-009",
    refunded: 0,
    employee: "Jane Doe",
  },
  {
    id: "7WA03925HL511420N",
    merchant: "Figma",
    item: "Professional seats",
    amount: 64,
    status: "refunded",
    date: "Sep 29, 2026 · 09:42",
    mandate: "Design tools",
    verdict: "APPROVE · MND-SW-104",
    refunded: 64,
    employee: "Sarah Connor",
  },
  {
    id: "1GU21847XL903155S",
    merchant: "Flight Club",
    item: "Luxury sneakers",
    amount: 264,
    status: "denied",
    date: "Sep 28, 2026 · 17:11",
    mandate: "Office essentials",
    verdict: "BLOCK · MND-CAT-003",
    refunded: 0,
    employee: "John Smith",
  },
];

export function Transactions() {
  const [payments, setPayments] = useState(seed);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Payment | null>(null);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [revealed, setRevealed] = useState(false);

  const rows = useMemo(
    () =>
      payments.filter(
        (row) =>
          (filter === "all" || row.status === filter) &&
          `${row.merchant} ${row.item} ${row.id}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [filter, payments, query],
  );
  const issueRefund = () => {
    if (!selected) return;
    const amount = Number(refundAmount);
    if (!amount || amount <= 0 || amount > selected.amount - selected.refunded) {
      toast.error("Enter an amount within the refundable balance");
      return;
    }
    setPayments((current) =>
      current.map((row) =>
        row.id === selected.id
          ? {
              ...row,
              refunded: row.refunded + amount,
              status: row.refunded + amount >= row.amount ? "refunded" : "completed",
            }
          : row,
      ),
    );
    setSelected((row) =>
      row
        ? {
            ...row,
            refunded: row.refunded + amount,
            status: row.refunded + amount >= row.amount ? "refunded" : "completed",
          }
        : null,
    );
    setRefundOpen(false);
    setRefundAmount("");
    toast.success(`$${amount.toFixed(2)} refund submitted in PayPal Sandbox`);
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.16em] text-paypal">
            PayPal Sandbox ledger
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold md:text-4xl">Transactions</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Payments, authorizations, and refunds connected to policy decisions.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-safe/25 bg-safe-soft px-3 py-2 text-xs text-safe">
          <span className="size-2 rounded-full bg-safe" />
          Sandbox connected
        </div>
      </div>
      <section className="grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-3">
        <Metric icon={CircleDollarSign} label="Settled this month" value="$1,842.62" />
        <Metric icon={ArrowDownLeft} label="Refunded" value="$64.00" />
        <Metric icon={Receipt} label="Success rate" value="96.8%" />
      </section>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="relative flex-1">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search merchant, item, or order ID"
            className="pl-9"
          />
        </label>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["all", "completed", "pending", "refunded", "denied"].map((value) => (
              <SelectItem key={value} value={value}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          className={cn(
            "w-full sm:w-auto font-mono text-xs uppercase tracking-widest transition-colors",
            revealed ? "border-safe text-safe hover:bg-safe/10" : "border-warning text-warning hover:bg-warning/10"
          )}
          onClick={() => {
            if (!revealed) {
              toast.success("Identity Verified", {
                description: "Decrypted PII temporarily exposed.",
                icon: <CheckCircle2 className="size-4 text-safe" />
              });
            }
            setRevealed(!revealed);
          }}
        >
          {revealed ? "HIDE PII" : "REVEAL PII"}
        </Button>
      </div>
      {rows.length === 0 ? (
        <ActionEmpty
          title="No matching payments"
          description="Adjust the filters or clear your search to return to the full sandbox ledger."
          action="Clear filters"
          onAction={() => {
            setQuery("");
            setFilter("all");
          }}
        />
      ) : (
        <div className="overflow-x-auto rounded-md border border-border bg-card">
          <table className="w-full min-w-[760px] text-left">
            <thead className="border-b border-border bg-subtle font-mono text-[9px] uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Merchant</th>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">PayPal order</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="w-16" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0 hover:bg-subtle">
                  <td className="px-4 py-4">
                    <p className="text-sm font-medium">{row.merchant}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{row.item}</p>
                  </td>
                  <td className="px-4 font-mono text-[10px]">
                    {revealed ? row.employee : `${row.employee.split(" ")[0]} S****`}
                  </td>
                  <td className="px-4">
                    <PaymentChip value={row.status} />
                  </td>
                  <td className="px-4 font-mono text-[10px]">
                    {revealed ? row.id : `****-****-${row.id.slice(-4)}`}
                  </td>
                  <td className="px-4 text-xs text-muted-foreground">{row.date}</td>
                  <td className="px-4 text-right font-mono text-sm">${row.amount.toFixed(2)}</td>
                  <td>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setSelected(row)}
                      aria-label={`Open ${row.merchant} transaction`}
                    >
                      <ExternalLink />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>Transaction detail</SheetTitle>
                <SheetDescription>PayPal Sandbox order {selected.id}</SheetDescription>
              </SheetHeader>
              <div className="mt-7 flex items-start justify-between border-y border-border py-5">
                <div>
                  <p className="text-lg font-semibold">{selected.merchant}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{selected.item}</p>
                </div>
                <p className="font-mono text-2xl">${selected.amount.toFixed(2)}</p>
              </div>
              <div className="mt-6 space-y-5">
                <Detail label="Status">
                  <PaymentChip value={selected.status} />
                </Detail>
                <Detail label="Policy verdict">
                  <span className="font-mono text-xs text-safe">{selected.verdict}</span>
                </Detail>
                <Detail label="Mandate">
                  <span className="text-xs">{selected.mandate}</span>
                </Detail>
                <Detail label="Capture method">
                  <span className="text-xs">PayPal Sandbox · immediate capture</span>
                </Detail>
                <Detail label="Refunded">
                  <span className="font-mono text-xs">${selected.refunded.toFixed(2)}</span>
                </Detail>
                <div className="border-l-2 border-safe pl-4">
                  <p className="font-mono text-[9px] uppercase text-muted-foreground">Lifecycle</p>
                  <div className="mt-3 space-y-3 text-xs">
                    <p>
                      <CheckCircle2 className="mr-2 inline size-4 text-safe" />
                      Policy approved · 132ms
                    </p>
                    <p>
                      <CheckCircle2 className="mr-2 inline size-4 text-safe" />
                      PayPal order created
                    </p>
                    <p>
                      <CheckCircle2 className="mr-2 inline size-4 text-safe" />
                      Payment captured
                    </p>
                  </div>
                </div>
              </div>
              {selected.status === "completed" && selected.refunded < selected.amount && (
                <Button
                  variant="outline"
                  className="mt-8 w-full"
                  onClick={() => setRefundOpen(true)}
                >
                  <RotateCcw />
                  Issue refund
                </Button>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue sandbox refund</DialogTitle>
            <DialogDescription>
              Refund the full payment or enter a partial amount. This demo updates the local
              transaction ledger.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-3">
            <label className="text-xs font-medium" htmlFor="refund">
              Refund amount
            </label>
            <Input
              id="refund"
              type="number"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              placeholder={selected ? String(selected.amount - selected.refunded) : "0"}
              className="mt-2 font-mono"
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRefundOpen(false)}>
                Cancel
              </Button>
              <Button onClick={issueRefund}>Confirm refund</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function PaymentChip({ value }: { value: PaymentStatus }) {
  if (value === "completed") return <VerdictBadge value="approved" className="normal-case" />;
  if (value === "pending") return <VerdictBadge value="escalate" className="normal-case" />;
  if (value === "denied") return <VerdictBadge value="blocked" className="normal-case" />;
  return (
    <span className="inline-flex items-center rounded-sm bg-signal/10 px-2 py-1 font-mono text-[11px] uppercase text-signal">
      <RotateCcw className="mr-1.5 size-3" aria-hidden="true" /> {value}
    </span>
  );
}
function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Receipt;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-card p-5">
      <Icon className="size-4 text-muted-foreground" />
      <p className="mt-5 font-mono text-2xl">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}
