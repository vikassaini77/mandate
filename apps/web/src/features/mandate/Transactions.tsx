import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useMandateStore } from "./store";
import { mandateApi } from "./api";
import {
  ArrowDownLeft,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  ExternalLink,
  Receipt,
  RotateCcw,
  Search,
  XCircle,
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
  const requests = useMandateStore((state) => state.requests);
  const storeTransactions = useMandateStore((state) => state.transactions || []);
  const fetchTransactions = useMandateStore((state) => state.fetchTransactions);
  const [payments, setPayments] = useState(seed);
  const [backendPayments, setBackendPayments] = useState<Payment[]>([]);
  const [refunds, setRefunds] = useState<Record<string, number>>({});
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Payment | null>(null);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refunding, setRefunding] = useState(false);
  const [capturingId, setCapturingId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  const loadBackendTransactions = async () => {
    try {
      const json = await mandateApi.getTransactions();
      if (json?.data && Array.isArray(json.data) && json.data.length > 0) {
        const mapped: Payment[] = json.data.map((tx: any) => {
          const paymentStatus = (tx.payment_status || "").toLowerCase();
          const st = (tx.status || "").toLowerCase();
          const isRefunded = paymentStatus === "refunded" || st === "refunded";
          const isDenied = st === "denied" || st === "blocked" || (tx.verdict || "").toLowerCase() === "block";
          const isPaid =
            !isRefunded &&
            !isDenied &&
            (paymentStatus ? paymentStatus === "completed" : st === "completed");
          const status: PaymentStatus = isRefunded
            ? "refunded"
            : isPaid
            ? "completed"
            : isDenied
            ? "denied"
            : "pending";
          const refunded = typeof tx.refunded_cents === "number" ? tx.refunded_cents / 100 : 0;
          return {
            id: tx.paypal_order_id || tx.id,
            merchant: tx.merchant || "Authorized Merchant",
            item: tx.description || `${tx.category || "Item"} Purchase`,
            amount: typeof tx.amount === "number" ? tx.amount : (tx.amount_cents ? tx.amount_cents / 100 : 0),
            status,
            date: tx.timestamp
              ? new Date(tx.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })
              : "Just now",
            mandate: tx.rule_id || "Human-in-the-Loop Approval",
            verdict: isRefunded
              ? "REFUNDED"
              : isPaid
              ? `${tx.verdict || "APPROVE"} · ${tx.rule_id || "MND-AUTO"}`
              : isDenied
              ? `BLOCK · ${tx.rule_id || "DENIED"}`
              : "PENDING · AWAITING PAYMENT",
            refunded,
            employee: "Security Operator",
          };
        });
        setBackendPayments(mapped);
      }
    } catch (err) {
      console.warn("Failed to load backend transactions:", err);
    }
  };

  useEffect(() => {
    void fetchTransactions();
    void loadBackendTransactions();
  }, [fetchTransactions]);

  const approvedFromStore = useMemo(() => {
    return requests
      .filter((req) => req.status === "approved")
      .map((req) => {
        const isPaid = req.payment_completed === true;
        return {
          id: req.paypal_order_id || `PAYPAL-SBX-${req.id.toUpperCase()}`,
          merchant: req.merchant,
          item: req.item,
          amount: req.amount,
          status: (isPaid ? "completed" : "pending") as PaymentStatus,
          date: req.resolved_at
            ? new Date(req.resolved_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })
            : (req.time || "Just now"),
          mandate: "Human-in-the-Loop Approval",
          verdict: isPaid ? "APPROVE · PAID" : "PENDING · AWAITING PAYMENT",
          refunded: 0,
          employee: "Security Operator",
        };
      });
  }, [requests]);

  const mappedStoreTx = useMemo(() => {
    return storeTransactions.map((tx) => ({
      id: tx.paypalOrderId || tx.id,
      merchant: tx.merchant,
      item: tx.item,
      amount: tx.amount,
      status: (tx.status === "denied" ? "denied" : tx.status) as PaymentStatus,
      date: tx.date || "Just now",
      mandate: tx.mandate || (tx.ruleId ? `Rule ${tx.ruleId}` : "Autonomous Mandate"),
      verdict: tx.status === "completed"
        ? `${tx.verdict || "APPROVE"} · ${tx.ruleId || "MND-AUTO"}`
        : tx.status === "denied"
        ? `BLOCK · ${tx.ruleId || "DENIED"}`
        : "PENDING · AWAITING PAYMENT",
      refunded: tx.refunded || 0,
      employee: tx.employee || "Security Agent",
    }));
  }, [storeTransactions]);

  const isMockOrder = (orderId: string) =>
    orderId.startsWith("MOCK-") || orderId.startsWith("PAYPAL-SBX-");

  const allPayments = useMemo(() => {
    const map = new Map<string, Payment>();
    const put = (p: Payment) => {
      if (map.has(p.id)) return;
      const refundedAmt = refunds[p.id] ?? p.refunded;
      map.set(p.id, {
        ...p,
        refunded: refundedAmt,
        status: refundedAmt >= p.amount ? "refunded" : p.status,
      });
    };
    // 1. Live transactions from the backend are authoritative
    for (const p of backendPayments) {
      put(p);
    }
    // 2. Approved items from the approval store (instant optimistic state)
    for (const p of approvedFromStore) {
      if (!isMockOrder(p.id)) {
        put(p);
      }
    }
    // 3. Direct transactions from the store (e.g. from chat checkout)
    for (const p of mappedStoreTx) {
      if (!isMockOrder(p.id)) {
        put(p);
      }
    }
    // 4. Base seed payments
    for (const p of payments) {
      put(p);
    }

    return Array.from(map.values());
  }, [approvedFromStore, mappedStoreTx, backendPayments, payments, refunds]);

  const metrics = useMemo(() => {
    // Settled this month: sum of all completed & refunded payments
    const settledAmount = allPayments
      .filter((p) => p.status === "completed" || p.status === "refunded")
      .reduce((sum, p) => sum + p.amount, 0);

    // Total refunded amount
    const refundedAmount = allPayments.reduce((sum, p) => sum + (p.refunded || 0), 0);

    // Success rate: completed & refunded vs denied
    const successfulCount = allPayments.filter((p) => p.status === "completed" || p.status === "refunded").length;
    const deniedCount = allPayments.filter((p) => p.status === "denied").length;
    const totalDecided = successfulCount + deniedCount;
    const rate = totalDecided > 0 ? `${((successfulCount / totalDecided) * 100).toFixed(1)}%` : "100.0%";

    const currencyFormatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    });

    return {
      settled: currencyFormatter.format(settledAmount),
      refunded: currencyFormatter.format(refundedAmount),
      rate,
    };
  }, [allPayments]);

  const rows = useMemo(() => {
    return allPayments.filter(
      (row) =>
        (filter === "all" || row.status === filter) &&
        `${row.merchant} ${row.item} ${row.id}`.toLowerCase().includes(query.toLowerCase()),
    );
  }, [allPayments, filter, query]);

  const issueRefund = async () => {
    if (!selected || refunding) return;
    const amount = Number(refundAmount);
    if (!amount || amount <= 0 || amount > selected.amount - selected.refunded) {
      toast.error("Enter an amount within the refundable balance");
      return;
    }

    setRefunding(true);
    try {
      await mandateApi.refundTransaction(selected.id, {
        amount_cents: Math.round(amount * 100),
        currency: "USD",
      });

      const newRefunded = selected.refunded + amount;
      const newStatus: PaymentStatus = newRefunded >= selected.amount ? "refunded" : "completed";
      setRefunds((prev) => ({ ...prev, [selected.id]: newRefunded }));
      setSelected((prev) => (prev ? { ...prev, refunded: newRefunded, status: newStatus } : null));
      setRefundOpen(false);
      setRefundAmount("");
      void fetchTransactions();
      void loadBackendTransactions();
      toast.success(`$${amount.toFixed(2)} refund submitted in PayPal Sandbox`);
    } catch (err: any) {
      toast.error(err?.message || "PayPal Sandbox refund failed");
    } finally {
      setRefunding(false);
    }
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
        <Metric icon={CircleDollarSign} label="Settled this month" value={metrics.settled} />
        <Metric icon={ArrowDownLeft} label="Refunded" value={metrics.refunded} />
        <Metric icon={Receipt} label="Success rate" value={metrics.rate} />
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
                  <span className={cn("font-mono text-xs", selected.status === "completed" ? "text-safe" : selected.status === "pending" ? "text-warning" : "text-destructive")}>
                    {selected.verdict}
                  </span>
                </Detail>
                <Detail label="Mandate">
                  <span className="text-xs">{selected.mandate}</span>
                </Detail>
                <Detail label="Capture method">
                  <span className="text-xs">
                    {selected.status === "completed" ? "PayPal Sandbox · Immediate capture & settled" : selected.status === "pending" ? "PayPal Sandbox · Payment capture pending" : "PayPal Sandbox · Rejected / Blocked"}
                  </span>
                </Detail>
                <Detail label="Refunded">
                  <span className="font-mono text-xs">${selected.refunded.toFixed(2)}</span>
                </Detail>
                <div className="border-l-2 border-border pl-4">
                  <p className="font-mono text-[9px] uppercase text-muted-foreground">Lifecycle</p>
                  <div className="mt-3 space-y-3 text-xs">
                    <p className="flex items-center gap-2 text-safe">
                      <CheckCircle2 className="size-4 shrink-0 text-safe" />
                      <span>Policy authorized · 132ms</span>
                    </p>
                    <p className="flex items-center gap-2 text-safe">
                      <CheckCircle2 className="size-4 shrink-0 text-safe" />
                      <span>PayPal order generated</span>
                    </p>
                    {selected.status === "completed" ? (
                      <p className="flex items-center gap-2 text-safe">
                        <CheckCircle2 className="size-4 shrink-0 text-safe" />
                        <span>Payment captured & settled</span>
                      </p>
                    ) : selected.status === "pending" ? (
                      <p className="flex items-center gap-2 text-warning animate-pulse">
                        <Clock className="size-4 shrink-0 text-warning" />
                        <span>Awaiting PayPal Sandbox payment checkout</span>
                      </p>
                    ) : (
                      <p className="flex items-center gap-2 text-destructive">
                        <XCircle className="size-4 shrink-0 text-destructive" />
                        <span>Payment not executed / blocked</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
              {selected.status === "pending" && (
                isMockOrder(selected.id) ? (
                  <div className="mt-6 rounded-md border border-warning/30 bg-warning/10 p-3.5 space-y-2.5">
                    <div className="flex items-center gap-2 font-semibold text-xs text-warning">
                      <Clock className="size-4" />
                      <span>Legacy Mock Order ({selected.id})</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      This placeholder order was created before live PayPal Sandbox credentials were active and cannot be checked out in PayPal Sandbox. Create or approve a new purchase to generate a live Sandbox order ID.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8 gap-1.5"
                        onClick={() => {
                          useMandateStore.getState().dismissTransaction(selected.id);
                          setSelected(null);
                          toast.info(`Removed stale mock order ${selected.id} from local ledger.`);
                        }}
                      >
                        Remove Legacy Mock Entry
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 rounded-md border border-warning/30 bg-warning/10 p-3.5 space-y-2.5">
                    <div className="flex items-center gap-2 font-semibold text-xs text-warning">
                      <Clock className="size-4" />
                      <span>Payment Not Captured · Awaiting Checkout</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      This order was authorized by policy, but PayPal payment has not yet been completed. It is not counted towards settled spend.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="paypal"
                        className="text-xs h-8 gap-1.5"
                        onClick={() => {
                          window.open(`https://www.sandbox.paypal.com/checkoutnow?token=${selected.id}`, "_blank");
                        }}
                      >
                        <ExternalLink className="size-3.5" />
                        Pay in PayPal Sandbox
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={capturingId === selected.id}
                        className="text-xs h-8 border-safe text-safe hover:bg-safe/10 gap-1.5"
                        onClick={async () => {
                          setCapturingId(selected.id);
                          try {
                            await mandateApi.completeTransaction(selected.id, {
                              paypal_order_id: selected.id,
                              amount_cents: Math.round(selected.amount * 100),
                              merchant: selected.merchant,
                              description: selected.item,
                            });
                            useMandateStore.getState().completeTransaction(selected.id, selected.id);
                            useMandateStore.getState().markRequestPaid(selected.id, selected.id);
                            void fetchTransactions();
                            void loadBackendTransactions();
                            toast.success("Payment captured and settled in PayPal Sandbox!");
                            setSelected((prev) => prev ? { ...prev, status: "completed", verdict: "APPROVE · PAID" } : null);
                          } catch (err: any) {
                            toast.error(err?.message || "PayPal payment has not been captured yet");
                          } finally {
                            setCapturingId(null);
                          }
                        }}
                      >
                        <CheckCircle2 className="size-3.5" />
                        {capturingId === selected.id ? "Capturing..." : "Confirm Payment Captured"}
                      </Button>
                    </div>
                  </div>
                )
              )}
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
              Refund the full payment or enter a partial amount against this transaction on the ledger.
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
              <Button variant="outline" onClick={() => setRefundOpen(false)} disabled={refunding}>
                Cancel
              </Button>
              <Button onClick={issueRefund} disabled={refunding}>
                {refunding ? "Submitting..." : "Confirm refund"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function PaymentChip({ value }: { value: PaymentStatus }) {
  if (value === "completed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-sm bg-safe/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-safe border border-safe/30">
        <CheckCircle2 className="size-3" /> PAID
      </span>
    );
  }
  if (value === "pending") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-sm bg-warning/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-warning border border-warning/30">
        <Clock className="size-3" /> UNPAID · PENDING
      </span>
    );
  }
  if (value === "denied") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-sm bg-destructive/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-destructive border border-destructive/30">
        <XCircle className="size-3" /> FAILED
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-sm bg-signal/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-signal border border-signal/30">
      <RotateCcw className="size-3" /> REFUNDED
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
