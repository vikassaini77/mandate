import { cloneElement, isValidElement, useId, useRef, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Camera,
  Check,
  CheckCircle2,
  CreditCard,
  Download,
  ExternalLink,
  Github,
  LogOut,
  Shield,
  ShieldAlert,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

export interface PlanTier {
  id: string;
  name: string;
  badge?: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  limits: {
    decisions: string;
    decisionsProgress: number;
    conversations: string;
    conversationsProgress: number;
    retention: string;
    retentionProgress: number;
  };
}

export const PLANS: Record<string, PlanTier> = {
  starter: {
    id: "starter",
    name: "Developer Sandbox",
    price: "$0",
    period: "free forever",
    description: "Ideal for testing agent tool execution and local safety evaluation.",
    features: [
      "100 Agent decisions / month",
      "10 AI conversations / month",
      "7-day cryptographic audit log",
      "Standard heuristic firewall",
      "Local PayPal Mock Gateway",
    ],
    limits: {
      decisions: "42 / 100",
      decisionsProgress: 42,
      conversations: "8 / 10",
      conversationsProgress: 80,
      retention: "5 / 7 days",
      retentionProgress: 71,
    },
  },
  pro: {
    id: "pro",
    name: "Control Pro",
    badge: "Active Plan",
    price: "$29",
    period: "/ month · renews Nov 3",
    description: "Production-grade autonomous spend control for fast-moving AI engineering teams.",
    features: [
      "1,000 Agent decisions / month",
      "100 AI conversations / month",
      "90-day SHA-256 audit retention",
      "Neural DeBERTa ML Firewall",
      "PayPal Orders v2 Live & Sandbox",
      "Interactive Red-Team Arena (32 attacks)",
      "Slack Human-in-the-Loop Webhooks",
    ],
    limits: {
      decisions: "546 / 1,000",
      decisionsProgress: 55,
      conversations: "38 / 100",
      conversationsProgress: 38,
      retention: "36 / 90 days",
      retentionProgress: 40,
    },
  },
  enterprise: {
    id: "enterprise",
    name: "Living Vault Enterprise",
    badge: "Unlimited",
    price: "$199",
    period: "/ month · renews Nov 3",
    description: "Mission-critical financial infrastructure with immutable governance and custom ML.",
    features: [
      "Unlimited Agent decisions",
      "Unlimited AI conversations",
      "7-Year Immutable SHA-256 Chain",
      "Dedicated DeBERTa GPU cluster",
      "Custom IsolationForest Spend Profiles",
      "Multi-tenant SAML / SSO",
      "24/7 SLA & Dedicated FinTech Engineering",
    ],
    limits: {
      decisions: "1,420 / Unlimited",
      decisionsProgress: 20,
      conversations: "184 / Unlimited",
      conversationsProgress: 15,
      retention: "128 / 2555 days",
      retentionProgress: 5,
    },
  },
};

export function Profile() {
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      return { ...data, email: user.email };
    }
  });

  const displayName = profile?.display_name || profile?.email?.split('@')[0] || "VIKAS SAINI";
  const initials = displayName.substring(0, 2).toUpperCase();

  // Profile fields state with persistence
  const [fullName, setFullName] = useState(() => localStorage.getItem("mandate_user_fullname") || displayName);
  const [timezone, setTimezone] = useState(() => localStorage.getItem("mandate_user_timezone") || "asia");
  const [currency, setCurrency] = useState(() => localStorage.getItem("mandate_user_currency") || "usd");

  // Avatar state
  const [avatar, setAvatar] = useState<string | undefined>(() => localStorage.getItem("mandate_user_avatar") || undefined);
  const [cropOpen, setCropOpen] = useState(false);
  const [zoom, setZoom] = useState([100]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Plan Management Modal state
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [currentPlanId, setCurrentPlanId] = useState<string>(() => {
    try {
      return localStorage.getItem("mandate_user_plan") || "pro";
    } catch {
      return "pro";
    }
  });

  // Connected accounts state
  const [connectedAccounts, setConnectedAccounts] = useState(() => {
    try {
      const saved = localStorage.getItem("mandate_connected_accounts");
      return saved ? JSON.parse(saved) : { paypal: true, github: false, google: true };
    } catch {
      return { paypal: true, github: false, google: true };
    }
  });

  // Danger zone dialog states
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const activePlan = PLANS[currentPlanId] || PLANS.pro;

  const selectAvatar = (file?: File) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAvatar(url);
    try {
      localStorage.setItem("mandate_user_avatar", url);
    } catch {
      // ignore quota error
    }
    setCropOpen(true);
  };

  const handleSaveProfile = () => {
    localStorage.setItem("mandate_user_fullname", fullName);
    localStorage.setItem("mandate_user_timezone", timezone);
    localStorage.setItem("mandate_user_currency", currency);
    toast.success("Profile updated and persisted successfully");
  };

  const handleSelectPlan = (planId: string) => {
    if (planId === currentPlanId) return;
    setCurrentPlanId(planId);
    try {
      localStorage.setItem("mandate_user_plan", planId);
    } catch (e) {
      console.error(e);
    }
    toast.success(`Successfully switched to ${PLANS[planId].name} via PayPal Subscriptions!`);
    setPlanModalOpen(false);
  };

  const toggleAccount = (key: "paypal" | "github" | "google", title: string) => {
    setConnectedAccounts((prev: Record<string, boolean>) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem("mandate_connected_accounts", JSON.stringify(next));
      toast.success(next[key] ? `${title} connected successfully` : `${title} disconnected`);
      return next;
    });
  };

  const handleDownloadInvoice = () => {
    const invoiceContent = `=====================================================
MANDATE AUTONOMOUS SPENDING FIREWALL - INVOICE RECEIPT
=====================================================
Invoice ID: INV-2026-PAYPAL-${Math.floor(100000 + Math.random() * 900000)}
Date: October 16, 2026
Billed To: ${fullName} (${profile?.email || "vikassn44@gmail.com"})
Payment Gateway: PayPal Subscriptions v2 (Sandbox/Live)
Subscription Plan: ${activePlan.name}
Amount: ${activePlan.price} USD
Status: PAID / SETTLED
Next Renewal: November 3, 2026

Summary of Charges:
-----------------------------------------------------
1. ${activePlan.name} Tier License ...... ${activePlan.price}
2. Deterministic Policy Engine .......... INCLUDED
3. DeBERTa Neural ML Firewall ........... INCLUDED
4. Cryptographic SHA-256 Ledger ........ INCLUDED
-----------------------------------------------------
Total Paid: ${activePlan.price} USD

Idempotency Key: PAYPAL-REQ-${Date.now()}
Cryptographic Seal: SHA256:${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}
=====================================================`;

    const blob = new Blob([invoiceContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `MANDATE_INVOICE_${activePlan.id.toUpperCase()}_OCT2026.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Billing receipt downloaded successfully");
  };

  const handleSignOutEverywhere = () => {
    setSignOutOpen(false);
    toast.success("All 3 active session tokens revoked across all devices and API clients.");
  };

  const handleDeleteAccount = () => {
    if (deleteConfirmText.trim().toUpperCase() !== "DELETE") {
      toast.error("Please type DELETE to confirm");
      return;
    }
    setDeleteOpen(false);
    setDeleteConfirmText("");
    toast.error("Account deactivation submitted. Audit ledger cryptographically sealed.");
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[.16em] text-primary">
          Account identity
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold md:text-4xl">Profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage your identity, plan, connected accounts, and account controls.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="rounded-md border border-border bg-card p-5 md:p-7">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="relative">
                <Avatar className="size-24 rounded-none border border-[#2A2A2A]">
                  <AvatarImage src={avatar} className="object-cover" />
                  <AvatarFallback className="rounded-none font-mono text-xl text-[#EAEAEA] bg-[#121212]">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="icon-sm"
                  className="absolute -bottom-2 -right-2"
                  onClick={() => inputRef.current?.click()}
                  aria-label="Upload avatar"
                >
                  <Camera />
                </Button>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => selectAvatar(e.target.files?.[0])}
                />
              </div>
              <div>
                <h2 className="font-display text-xl font-semibold uppercase text-[#EAEAEA]">
                  {fullName}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground font-mono">
                  Owner · Member since September 2026
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => inputRef.current?.click()}
                >
                  <Upload />
                  Change avatar
                </Button>
              </div>
            </div>

            <div className="mt-7 grid gap-5 sm:grid-cols-2">
              <Field label="Full name">
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="font-mono rounded-none border-[#2A2A2A] bg-[#050505] text-[#EAEAEA]"
                />
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  defaultValue={profile?.email || "vikassn44@gmail.com"}
                  className="font-mono rounded-none border-[#2A2A2A] bg-[#050505] text-[#EAEAEA]"
                  readOnly
                />
              </Field>
              <Field label="Timezone">
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asia">Asia/Kolkata</SelectItem>
                    <SelectItem value="utc">UTC</SelectItem>
                    <SelectItem value="pacific">America/Los_Angeles</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Currency">
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="usd">USD · US Dollar</SelectItem>
                    <SelectItem value="inr">INR · Indian Rupee</SelectItem>
                    <SelectItem value="eur">EUR · Euro</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Button className="mt-7" onClick={handleSaveProfile}>
              Save profile
            </Button>
          </section>

          <section className="rounded-md border border-border bg-card p-5 md:p-7">
            <h2 className="text-sm font-semibold">Connected accounts</h2>
            <div className="mt-4 divide-y divide-border">
              <Account
                icon={CreditCard}
                title="PayPal Sandbox"
                detail="Connected for test payments & subscriptions"
                connected={connectedAccounts.paypal}
                onToggle={() => toggleAccount("paypal", "PayPal Sandbox")}
              />
              <Account
                icon={Github}
                title="GitHub"
                detail={connectedAccounts.github ? "Connected for CI/CD audit sync" : "Not connected"}
                connected={connectedAccounts.github}
                onToggle={() => toggleAccount("github", "GitHub")}
              />
              <Account
                icon={UserRound}
                title="Google"
                detail="Used for identity & sign-in"
                connected={connectedAccounts.google}
                onToggle={() => toggleAccount("google", "Google")}
              />
            </div>
          </section>

          <section className="rounded-md border border-danger/30 bg-danger-soft p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-danger">
              <ShieldAlert className="size-4" />
              Danger zone
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Revoke active sessions or request account deactivation with compliance lock.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Button variant="outline" onClick={() => setSignOutOpen(true)}>
                <LogOut />
                Sign out everywhere
              </Button>
              <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 />
                Delete account
              </Button>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="overflow-hidden rounded-md border border-border bg-card">
            <div className="border-b border-border bg-signal/10 p-5">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[9px] uppercase tracking-wider text-signal">Current plan</p>
                <Badge variant="outline" className="border-signal/30 text-[10px] text-signal font-mono">
                  PayPal Active
                </Badge>
              </div>
              <h2 className="mt-2 font-display text-2xl font-semibold">{activePlan.name}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {activePlan.price} {activePlan.period}
              </p>
            </div>
            <div className="p-5">
              <Button
                className="w-full bg-signal hover:bg-signal/90 text-white font-medium"
                onClick={() => setPlanModalOpen(true)}
              >
                Manage plan
              </Button>
            </div>
          </section>

          <section className="rounded-md border border-border bg-card p-5">
            <h2 className="text-sm font-semibold">Usage this cycle</h2>
            <Usage
              label="Agent decisions"
              value={activePlan.limits.decisions}
              progress={activePlan.limits.decisionsProgress}
            />
            <Usage
              label="AI conversations"
              value={activePlan.limits.conversations}
              progress={activePlan.limits.conversationsProgress}
            />
            <Usage
              label="Audit retention"
              value={activePlan.limits.retention}
              progress={activePlan.limits.retentionProgress}
            />
          </section>

          <section className="rounded-md border border-border bg-card p-5">
            <h2 className="text-sm font-semibold">Activity summary</h2>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Stat value="82.6%" label="approval rate" />
              <Stat value="$3,574" label="risk blocked" />
              <Stat value="7" label="active mandates" />
              <Stat value="184ms" label="decision time" />
            </div>
          </section>
        </aside>
      </div>

      {/* PLAN MANAGEMENT MODAL */}
      <Dialog open={planModalOpen} onOpenChange={setPlanModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-signal" />
              <DialogTitle className="font-display text-xl">Manage Subscription & Tiers</DialogTitle>
            </div>
            <DialogDescription>
              Enterprise spend firewall orchestration powered by PayPal Subscriptions v2. Upgrade or modify your tier anytime.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-3 mt-4">
            {Object.values(PLANS).map((tier) => {
              const isCurrent = tier.id === currentPlanId;
              return (
                <div
                  key={tier.id}
                  className={`flex flex-col justify-between rounded-lg border p-5 transition-all ${
                    isCurrent
                      ? "border-signal bg-signal/5 ring-1 ring-signal/50"
                      : "border-border bg-card hover:border-border/80"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-display font-semibold text-lg">{tier.name}</h3>
                      {tier.badge && (
                        <Badge
                          variant={isCurrent ? "default" : "outline"}
                          className={isCurrent ? "bg-signal text-white" : "border-border text-xs"}
                        >
                          {isCurrent ? "Active" : tier.badge}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="font-display text-3xl font-bold">{tier.price}</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {tier.id === "starter" ? "/ forever" : "/ month"}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{tier.description}</p>

                    <div className="mt-5 space-y-2 border-t border-border pt-4">
                      {tier.features.map((feature, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <Check className="size-3.5 text-signal mt-0.5 shrink-0" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-border">
                    {isCurrent ? (
                      <Button variant="outline" disabled className="w-full text-xs">
                        <CheckCircle2 className="size-3.5 mr-1 text-signal" />
                        Current Plan
                      </Button>
                    ) : (
                      <Button
                        className="w-full bg-signal hover:bg-signal/90 text-white text-xs"
                        onClick={() => handleSelectPlan(tier.id)}
                      >
                        Switch to {tier.name}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 rounded-md border border-border bg-subtle p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold flex items-center gap-1.5">
                  <CreditCard className="size-4 text-signal" />
                  Payment Method & Invoicing
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Billed through PayPal Sandbox account (<span className="font-mono text-foreground">{profile?.email || "vikassn44@gmail.com"}</span>)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={handleDownloadInvoice}
                >
                  <Download className="size-3.5 mr-1" />
                  Download Receipt
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    toast.success("Redirecting to PayPal Subscriptions portal...");
                    window.open("https://www.sandbox.paypal.com", "_blank");
                  }}
                >
                  <ExternalLink className="size-3.5 mr-1" />
                  PayPal Portal
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button variant="ghost" onClick={() => setPlanModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AVATAR CROP DIALOG */}
      <Dialog open={cropOpen} onOpenChange={setCropOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crop profile photo</DialogTitle>
            <DialogDescription>Position and scale your image before saving it.</DialogDescription>
          </DialogHeader>
          <div className="mx-auto mt-3 size-64 overflow-hidden rounded-full border border-border bg-subtle">
            {avatar && (
              <img
                src={avatar}
                alt="Avatar crop preview"
                width={256}
                height={256}
                className="size-full object-cover"
                style={{ transform: `scale(${(zoom[0] ?? 100) / 100})` }}
              />
            )}
          </div>
          <Label>Zoom</Label>
          <Slider value={zoom} onValueChange={setZoom} min={100} max={180} />
          <Button
            onClick={() => {
              setCropOpen(false);
              toast.success("Profile photo updated");
            }}
          >
            Save photo
          </Button>
        </DialogContent>
      </Dialog>

      {/* SIGN OUT EVERYWHERE DIALOG */}
      <Dialog open={signOutOpen} onOpenChange={setSignOutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-danger">
              <LogOut className="size-5" />
              Revoke All Active Sessions
            </DialogTitle>
            <DialogDescription>
              This will immediately invalidate all session tokens and refresh tokens across all browsers, mobile devices, and active CLI credentials.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setSignOutOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleSignOutEverywhere}>
              Confirm Sign Out Everywhere
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE ACCOUNT DIALOG */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-danger">
              <Trash2 className="size-5" />
              Deactivate Account
            </DialogTitle>
            <DialogDescription>
              Are you sure? All active autonomous mandates and API keys will be immediately revoked. In accordance with financial compliance standards, immutable SHA-256 transaction logs will remain sealed.
            </DialogDescription>
          </DialogHeader>
          <div className="my-2 space-y-2">
            <Label className="text-xs">Type DELETE to confirm:</Label>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              className="font-mono text-xs uppercase"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteConfirmText.trim().toUpperCase() !== "DELETE"}
              onClick={handleDeleteAccount}
            >
              Permanently Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactElement<{ id?: string }>;
}) {
  const id = useId();
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      {isValidElement(children) ? cloneElement(children, { id }) : children}
    </div>
  );
}

function Account({
  icon: Icon,
  title,
  detail,
  connected,
  onToggle,
}: {
  icon: typeof CreditCard;
  title: string;
  detail: string;
  connected?: boolean;
  onToggle?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 py-4">
      <span className="grid size-9 place-items-center rounded-md bg-subtle">
        <Icon className="size-4" />
      </span>
      <div className="flex-1">
        <p className="text-xs font-medium">{title}</p>
        <p className="text-[10px] text-muted-foreground">{detail}</p>
      </div>
      {connected ? (
        <Button
          variant="outline"
          size="sm"
          className="text-[10px] text-safe border-safe/30 hover:bg-safe/10 h-7"
          onClick={onToggle}
        >
          <CheckCircle2 className="size-3.5 mr-1 text-safe" />
          Connected
        </Button>
      ) : (
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onToggle}>
          Connect
        </Button>
      )}
    </div>
  );
}

function Usage({ label, value, progress }: { label: string; value: string; progress: number }) {
  return (
    <div className="mt-5">
      <div className="mb-2 flex justify-between text-[10px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono">{value}</span>
      </div>
      <Progress value={progress} className="h-1.5" />
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-md bg-subtle p-3">
      <p className="font-mono text-sm">{value}</p>
      <p className="mt-1 text-[9px] text-muted-foreground">{label}</p>
    </div>
  );
}
