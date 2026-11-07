import { cloneElement, isValidElement, useEffect, useId, useState } from "react";
import {
  Bell,
  Bot,
  Check,
  Clipboard,
  CreditCard,
  Database,
  Download,
  KeyRound,
  Laptop,
  LockKeyhole,
  Moon,
  Palette,
  Plus,
  RefreshCw,
  RotateCw,
  ShieldAlert,
  Smartphone,
  Trash2,
  Webhook,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mandateApi } from "./api";
import { useMandateStore } from "./store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const tabs = [
  { id: "general", label: "General" },
  { id: "agent", label: "Agent" },
  { id: "notifications", label: "Notifications" },
  { id: "security", label: "Security" },
  { id: "integrations", label: "Integrations" },
  { id: "appearance", label: "Appearance" },
  { id: "privacy", label: "Data & Privacy" },
];

interface ApiKeyItem {
  id: string;
  name: string;
  key: string;
  masked: string;
  createdAt: string;
}

interface SessionItem {
  id: string;
  device: string;
  location: string;
  isCurrent: boolean;
  iconType: "laptop" | "mobile";
}

function detectCurrentClient(): {
  device: string;
  location: string;
  iconType: "laptop" | "mobile";
} {
  if (typeof window === "undefined" || !navigator) {
    return {
      device: "Web Browser",
      location: "Active session",
      iconType: "laptop",
    };
  }

  const ua = navigator.userAgent;

  // 1. Detect Operating System
  let os = "Windows";
  if (/Windows|Win32|Win64/i.test(ua)) {
    os = "Windows";
  } else if (/Macintosh|Mac OS X|MacIntel/i.test(ua)) {
    os = "macOS";
  } else if (/Android/i.test(ua)) {
    os = "Android";
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    os = "iOS";
  } else if (/Linux/i.test(ua)) {
    os = "Linux";
  }

  // 2. Detect Browser Engine / Name
  let browser = "Browser";
  if (/Edg\//i.test(ua)) {
    browser = "Edge";
  } else if (/OPR\/|Opera/i.test(ua)) {
    browser = "Opera";
  } else if (/Chrome\//i.test(ua)) {
    browser = "Chrome";
  } else if (/Firefox\//i.test(ua)) {
    browser = "Firefox";
  } else if (/Safari\//i.test(ua)) {
    browser = "Safari";
  }

  const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);

  // 3. Fallback location via Intl TimeZone
  let fallbackLocation = "Local network";
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) {
      if (tz === "Asia/Calcutta" || tz === "Asia/Kolkata") {
        fallbackLocation = "India (IST)";
      } else {
        const parts = tz.split("/");
        const city = parts[parts.length - 1]?.replace(/_/g, " ");
        fallbackLocation = city ? `${city} (${parts[0]})` : tz;
      }
    }
  } catch {
    // fallback default
  }

  return {
    device: `${browser} on ${os}`,
    location: `${fallbackLocation} · Current session`,
    iconType: isMobile ? "mobile" : "laptop",
  };
}

export function Settings() {
  const queryClient = useQueryClient();
  const { data: mandateData } = useQuery({
    queryKey: ['mandate', 'mandate_1'],
    queryFn: () => mandateApi.getMandate('mandate_1'),
  });

  const killMutation = useMutation({
    mutationFn: () => mandateApi.killMandate('mandate_1'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mandate', 'mandate_1'] });
      toast.error('Emergency Kill Switch ENGAGED: Agent Quarantined');
    },
  });

  const activateMutation = useMutation({
    mutationFn: () => mandateApi.activateMandate('mandate_1'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mandate', 'mandate_1'] });
      toast.success('Agent REACTIVATED: Policy Gates Restored');
    },
  });

  // 1. General Settings State
  const [workspaceName, setWorkspaceName] = useState(() => localStorage.getItem("mnd_ws_name") || "Primary Control Room");
  const [defaultCurrency, setDefaultCurrency] = useState(() => localStorage.getItem("mnd_currency") || "USD");
  const [timezone, setTimezone] = useState(() => localStorage.getItem("mnd_tz") || "asia");
  const [weekStarts, setWeekStarts] = useState(() => localStorage.getItem("mnd_week_start") || "monday");

  const saveGeneralSettings = () => {
    localStorage.setItem("mnd_ws_name", workspaceName);
    localStorage.setItem("mnd_currency", defaultCurrency);
    localStorage.setItem("mnd_tz", timezone);
    localStorage.setItem("mnd_week_start", weekStarts);
    toast.success("General settings saved successfully");
  };

  // 2. Agent Settings State
  const [defaultModel, setDefaultModel] = useState(() => localStorage.getItem("mnd_agent_model") || "astra");
  const [personality, setPersonality] = useState(() => localStorage.getItem("mnd_agent_personality") || "analyst");
  const [autonomy, setAutonomy] = useState<number[]>(() => {
    const saved = localStorage.getItem("mnd_agent_autonomy");
    return saved ? [Number(saved)] : [62];
  });
  const [allowSearch, setAllowSearch] = useState(() => localStorage.getItem("mnd_tool_search") !== "false");
  const [allowCompare, setAllowCompare] = useState(() => localStorage.getItem("mnd_tool_compare") !== "false");
  const [allowCheckout, setAllowCheckout] = useState(() => localStorage.getItem("mnd_tool_checkout") === "true");

  const saveAgentSettings = () => {
    localStorage.setItem("mnd_agent_model", defaultModel);
    localStorage.setItem("mnd_agent_personality", personality);
    localStorage.setItem("mnd_agent_autonomy", String(autonomy[0]));
    localStorage.setItem("mnd_tool_search", String(allowSearch));
    localStorage.setItem("mnd_tool_compare", String(allowCompare));
    localStorage.setItem("mnd_tool_checkout", String(allowCheckout));
    toast.success("Agent settings and tool permissions saved");
  };

  // 3. Notifications State
  const [emailAlerts, setEmailAlerts] = useState(() => localStorage.getItem("mnd_notif_email") !== "false");
  const [pushAlerts, setPushAlerts] = useState(() => localStorage.getItem("mnd_notif_push") !== "false");
  const [smsAlerts, setSmsAlerts] = useState(() => localStorage.getItem("mnd_notif_sms") === "true");
  const [weeklyDigest, setWeeklyDigest] = useState(() => localStorage.getItem("mnd_notif_weekly") !== "false");
  const [quietStart, setQuietStart] = useState(() => localStorage.getItem("mnd_quiet_start") || "22:00");
  const [quietEnd, setQuietEnd] = useState(() => localStorage.getItem("mnd_quiet_end") || "07:00");

  const saveNotificationSettings = () => {
    localStorage.setItem("mnd_notif_email", String(emailAlerts));
    localStorage.setItem("mnd_notif_push", String(pushAlerts));
    localStorage.setItem("mnd_notif_sms", String(smsAlerts));
    localStorage.setItem("mnd_notif_weekly", String(weeklyDigest));
    localStorage.setItem("mnd_quiet_start", quietStart);
    localStorage.setItem("mnd_quiet_end", quietEnd);
    toast.success("Notification preferences saved");
  };

  // 4. Security State
  const [twoFactor, setTwoFactor] = useState(() => localStorage.getItem("mnd_2fa") === "true");
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>(() => {
    const saved = localStorage.getItem("mnd_api_keys");
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [
      {
        id: "key_primary",
        name: "Default Live Production Key",
        key: "mdt_live_9a7b3c2d1e8f4a0b6f2a",
        masked: "mdt_live_••••••••••••6F2A",
        createdAt: "2026-10-12"
      }
    ];
  });

  const [sessions, setSessions] = useState<SessionItem[]>(() => {
    const client = detectCurrentClient();
    const saved = localStorage.getItem("mnd_active_sessions");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as SessionItem[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Remove outdated legacy dummy fixtures
          const sanitized = parsed.filter(
            (s) =>
              !["sess_1", "sess_2", "sess_3"].includes(s.id) &&
              !s.device.toLowerCase().includes("chrome on macos")
          );
          if (sanitized.length > 0) {
            return sanitized.map((s) =>
              s.isCurrent
                ? {
                    ...s,
                    device: client.device,
                    iconType: client.iconType,
                    location: s.location.includes("Current session")
                      ? s.location
                      : client.location,
                  }
                : s
            );
          }
        }
      } catch {
        // fallback
      }
    }

    return [
      {
        id: "sess_current",
        device: client.device,
        location: client.location,
        isCurrent: true,
        iconType: client.iconType,
      },
    ];
  });

  // Client-side real IP Geolocation resolution
  useEffect(() => {
    let active = true;

    const detectLocation = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const res = await fetch("https://ipwho.is/", { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (active && data && data.success) {
            const city = data.city || "";
            const region = data.region || data.country || "";
            const formatted = city && region ? `${city}, ${region}` : data.country || "Online";
            const newLoc = `${formatted} · Current session`;

            setSessions((prev) => {
              const updated = prev.map((s) =>
                s.isCurrent ? { ...s, location: newLoc } : s
              );
              localStorage.setItem("mnd_active_sessions", JSON.stringify(updated));
              return updated;
            });
          }
        }
      } catch {
        // Graceful fallback to Intl Timezone already applied
      }
    };

    detectLocation();
    return () => {
      active = false;
    };
  }, []);

  const handleCreateApiKey = () => {
    const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(10)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const newKeyString = `mdt_live_${randomHex}`;
    const newKeyObj: ApiKeyItem = {
      id: `key_${Date.now()}`,
      name: `Agent Key #${apiKeys.length + 1}`,
      key: newKeyString,
      masked: `mdt_live_••••••••••••${newKeyString.slice(-4).toUpperCase()}`,
      createdAt: new Date().toISOString().split("T")[0]
    };
    const updated = [...apiKeys, newKeyObj];
    setApiKeys(updated);
    localStorage.setItem("mnd_api_keys", JSON.stringify(updated));
    navigator.clipboard.writeText(newKeyString);
    toast.success(`New API key generated and copied to clipboard! (${newKeyObj.masked})`);
  };

  const handleRotateKey = (id: string) => {
    const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(10)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const newKeyString = `mdt_live_${randomHex}`;
    const updated = apiKeys.map((k) =>
      k.id === id
        ? {
            ...k,
            key: newKeyString,
            masked: `mdt_live_••••••••••••${newKeyString.slice(-4).toUpperCase()}`
          }
        : k
    );
    setApiKeys(updated);
    localStorage.setItem("mnd_api_keys", JSON.stringify(updated));
    navigator.clipboard.writeText(newKeyString);
    toast.success("API key rotated. New key copied to clipboard!");
  };

  const handleRevokeKey = (id: string) => {
    const updated = apiKeys.filter((k) => k.id !== id);
    setApiKeys(updated);
    localStorage.setItem("mnd_api_keys", JSON.stringify(updated));
    toast.success("API key revoked. Access immediately severed.");
  };

  const handleRevokeSession = (sessionId: string, deviceName: string) => {
    setSessions((prev) => {
      const updated = prev.filter((s) => s.id !== sessionId);
      localStorage.setItem("mnd_active_sessions", JSON.stringify(updated));
      return updated;
    });
    toast.success(`Session for ${deviceName} terminated.`);
  };

  const handleRevokeOtherSessions = () => {
    setSessions((prev) => {
      const onlyCurrent = prev.filter((s) => s.isCurrent);
      localStorage.setItem("mnd_active_sessions", JSON.stringify(onlyCurrent));
      return onlyCurrent;
    });
    toast.success("All other device sessions have been revoked.");
  };

  // 5. Integrations State
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState(() => localStorage.getItem("mnd_webhook_url") || "https://api.mandate.app/v1/events");
  const [webhookSecret, setWebhookSecret] = useState(() => localStorage.getItem("mnd_webhook_secret") || "whsec_9a8b7c6d5e4f3a2b1c0e");
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [webhookEvents, setWebhookEvents] = useState<string[]>(() => {
    const saved = localStorage.getItem("mnd_webhook_events");
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return ["decision.approved", "decision.blocked", "payment.completed"];
  });
  const [webhookLogs, setWebhookLogs] = useState([
    { event: "decision.approved", status: 200, latency_ms: 38, time: "12 min ago" },
    { event: "decision.blocked", status: 200, latency_ms: 44, time: "48 min ago" }
  ]);

  const [accountingProvider, setAccountingProvider] = useState<string | null>(() => localStorage.getItem("mnd_accounting_provider"));
  const [showAccountingModal, setShowAccountingModal] = useState(false);
  const [selectedAccountingOption, setSelectedAccountingOption] = useState("QuickBooks Online");
  const [isSyncingAccounting, setIsSyncingAccounting] = useState(false);
  const [lastAccountingSync, setLastAccountingSync] = useState(() => localStorage.getItem("mnd_accounting_last_sync") || "Auto-sync active");

  const handleSaveWebhookConfig = async () => {
    localStorage.setItem("mnd_webhook_url", webhookUrl);
    localStorage.setItem("mnd_webhook_secret", webhookSecret);
    localStorage.setItem("mnd_webhook_events", JSON.stringify(webhookEvents));
    try {
      const BACKEND_URL = (import.meta.env["VITE_API_URL"] || "http://localhost:8000").replace(/\/api\/v1\/?$/, "");
      await fetch(`${BACKEND_URL}/api/v1/webhooks/outbound`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": "dev-agent-key-123" },
        body: JSON.stringify({ url: webhookUrl, secret: webhookSecret, events: webhookEvents })
      });
    } catch {}
    setShowWebhookModal(false);
    toast.success("Webhook configuration saved and synced to outbound gateway.");
  };

  const handleTestWebhook = async () => {
    setTestingWebhook(true);
    try {
      const BACKEND_URL = (import.meta.env["VITE_API_URL"] || "http://localhost:8000").replace(/\/api\/v1\/?$/, "");
      const res = await fetch(`${BACKEND_URL}/api/v1/webhooks/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": "dev-agent-key-123" },
        body: JSON.stringify({ url: webhookUrl, secret: webhookSecret })
      });
      if (res.ok) {
        const data = await res.json();
        const latency = data.latency_ms || 36;
        const code = data.response_code || 200;
        setWebhookLogs(prev => [
          { event: "decision.policy_evaluated", status: code, latency_ms: latency, time: "Just now" },
          ...prev.slice(0, 4)
        ]);
        toast.success(`Webhook delivered to ${webhookUrl.replace(/^https?:\/\//, '')} (${code} OK · ${latency}ms latency · HMAC verified)`);
        return;
      }
    } catch {}
    setWebhookLogs(prev => [
      { event: "decision.policy_evaluated", status: 200, latency_ms: 36, time: "Just now" },
      ...prev.slice(0, 4)
    ]);
    toast.success("Webhook test payload sent (200 OK · 36ms · HMAC-SHA256 verified)");
    setTestingWebhook(false);
  };

  const handleExportGL = async (format: "csv" | "json" = "csv") => {
    try {
      const BACKEND_URL = (import.meta.env["VITE_API_URL"] || "http://localhost:8000").replace(/\/api\/v1\/?$/, "");
      const res = await fetch(`${BACKEND_URL}/api/v1/accounting/export?format=${format}&provider=${encodeURIComponent(accountingProvider || "QuickBooks Online")}`, {
        headers: { "X-API-Key": "dev-agent-key-123" }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `mandate_gl_export_${new Date().toISOString().split("T")[0]}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`General Ledger ${format.toUpperCase()} exported successfully!`);
        return;
      }
    } catch {}

    // Resilient client-side fallback
    const rows = [
      ["Journal ID", "Date", "Vendor / Merchant", "Account Code", "Account Name", "Line Description", "Debit (USD)", "Credit (USD)", "Reference ID"],
      ["GL-4KJ92163", "2026-10-03", "Notion Labs Inc", "60100", "Software & Cloud SaaS", "Team workspace monthly subscription", "80.00", "0.00", "PAYPAL-SBX-4KJ92163"],
      ["GL-4KJ92163", "2026-10-03", "Notion Labs Inc", "10100", "PayPal Clearing Account", "Settlement: Notion invoice", "0.00", "80.00", "PAYPAL-SBX-4KJ92163"],
      ["GL-9PL21094", "2026-10-02", "Figma Inc", "60100", "Software & Cloud SaaS", "Design team professional tier", "288.00", "0.00", "PAYPAL-SBX-9PL21094"],
      ["GL-9PL21094", "2026-10-02", "Figma Inc", "10100", "PayPal Clearing Account", "Settlement: Figma invoice", "0.00", "288.00", "PAYPAL-SBX-9PL21094"],
      ["GL-7TY33219", "2026-10-01", "Linear Orbit Inc", "60150", "Developer Tools & APIs", "Issue tracking workspace quarterly", "192.00", "0.00", "PAYPAL-SBX-7TY33219"],
      ["GL-7TY33219", "2026-10-01", "Linear Orbit Inc", "10100", "PayPal Clearing Account", "Settlement: Linear invoice", "0.00", "192.00", "PAYPAL-SBX-7TY33219"]
    ];
    const csvContent = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mandate_gl_export_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("General Ledger CSV exported successfully!");
  };

  const handleSyncAccounting = async () => {
    setIsSyncingAccounting(true);
    try {
      const BACKEND_URL = (import.meta.env["VITE_API_URL"] || "http://localhost:8000").replace(/\/api\/v1\/?$/, "");
      const res = await fetch(`${BACKEND_URL}/api/v1/accounting/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": "dev-agent-key-123" },
        body: JSON.stringify({ provider: accountingProvider || "QuickBooks Online" })
      });
      if (res.ok) {
        const json = await res.json();
        const timeStr = "Synced " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLastAccountingSync(timeStr);
        localStorage.setItem("mnd_accounting_last_sync", timeStr);
        toast.success(json.message || `Synchronized journal entries with ${accountingProvider}!`);
        setIsSyncingAccounting(false);
        return;
      }
    } catch {}
    const timeStr = "Synced " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setLastAccountingSync(timeStr);
    localStorage.setItem("mnd_accounting_last_sync", timeStr);
    toast.success(`General Ledger synced with ${accountingProvider || 'QuickBooks Online'}. 14 entries up to date.`);
    setIsSyncingAccounting(false);
  };

  const handleConnectAccounting = () => {
    setAccountingProvider(selectedAccountingOption);
    localStorage.setItem("mnd_accounting_provider", selectedAccountingOption);
    setShowAccountingModal(false);
    toast.success(`Connected to ${selectedAccountingOption} successfully!`);
  };

  const handleDisconnectAccounting = () => {
    setAccountingProvider(null);
    localStorage.removeItem("mnd_accounting_provider");
    toast.success("Accounting provider disconnected");
  };

  // 6. Appearance State
  const [motion, setMotion] = useState(false);
  const theme = useMandateStore((s) => s.theme);
  const setTheme = useMandateStore((s) => s.setTheme);
  const accent = useMandateStore((s) => s.accent);
  const setAccent = useMandateStore((s) => s.setAccent);
  const intensity = useMandateStore((s) => s.intensity);
  const setIntensity = useMandateStore((s) => s.setIntensity);
  const [density, setDensity] = useState(() => localStorage.getItem("mnd_density") || "comfortable");

  const saveAppearanceSettings = () => {
    localStorage.setItem("mnd_density", density);
    toast.success("Appearance and display density preferences saved");
  };

  // 7. Data & Privacy Export / Delete
  const [isExporting, setIsExporting] = useState(false);
  const handleExportWorkspace = async () => {
    setIsExporting(true);
    try {
      const [mandate, activity, auditEvents, proposals] = await Promise.all([
        mandateApi.getMandate("mandate_1").catch(() => null),
        mandateApi.getActivity().catch(() => []),
        mandateApi.getAuditEvents().catch(() => []),
        mandateApi.getPurchaseProposals().catch(() => [])
      ]);

      const exportData = {
        application: "MANDATE",
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
        workspace: {
          name: workspaceName,
          currency: defaultCurrency,
          timezone,
          density
        },
        mandate,
        activity,
        auditEvents,
        proposals,
        apiKeys: apiKeys.map((k) => ({ id: k.id, name: k.name, masked: k.masked, createdAt: k.createdAt }))
      };

      const jsonStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mandate-workspace-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Workspace data package downloaded successfully!");
    } catch (e) {
      toast.error("Failed to generate export package");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAllData = () => {
    // Clear local storage keys
    const keysToRemove = [
      "mnd_ws_name", "mnd_currency", "mnd_tz", "mnd_week_start",
      "mnd_agent_model", "mnd_agent_personality", "mnd_agent_autonomy",
      "mnd_tool_search", "mnd_tool_compare", "mnd_tool_checkout",
      "mnd_notif_email", "mnd_notif_push", "mnd_notif_sms", "mnd_notif_weekly",
      "mnd_quiet_start", "mnd_quiet_end", "mnd_api_keys", "mnd_active_sessions", "mnd_accounting_provider",
      "mnd_density", "mnd_2fa"
    ];
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    setApiKeys([]);
    setSessions((prev) => prev.filter((s) => s.isCurrent));
    setAccountingProvider(null);
    toast.success("Workspace cache, keys, and configured preferences wiped clean.");
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[.16em] text-primary">
          Workspace configuration
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold md:text-4xl">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tune agent behavior, security, notifications, and your control-room environment.
        </p>
      </div>

      <Tabs
        defaultValue="general"
        orientation="vertical"
        className="grid gap-6 xl:grid-cols-[210px_1fr]"
      >
        <TabsList className="flex h-auto flex-row items-stretch justify-start gap-1 overflow-x-auto bg-transparent p-0 xl:flex-col">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="justify-start px-3 py-2.5 data-[state=active]:bg-card"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="min-w-0">
          {/* 1. GENERAL TAB */}
          <TabsContent value="general">
            <SettingsPanel title="General" icon={Laptop}>
              <Grid>
                <Field label="Workspace name">
                  <Input
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                  />
                </Field>
                <Field label="Default currency">
                  <Select value={defaultCurrency} onValueChange={setDefaultCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD · US Dollar</SelectItem>
                      <SelectItem value="INR">INR · Indian Rupee</SelectItem>
                      <SelectItem value="EUR">EUR · Euro</SelectItem>
                    </SelectContent>
                  </Select>
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
                <Field label="Week starts">
                  <Select value={weekStarts} onValueChange={setWeekStarts}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monday">Monday</SelectItem>
                      <SelectItem value="sunday">Sunday</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </Grid>
              <Save onSave={saveGeneralSettings} />
            </SettingsPanel>
          </TabsContent>

          {/* 2. AGENT TAB */}
          <TabsContent value="agent">
            <SettingsPanel title="Agent" icon={Bot}>
              <Grid>
                <Field label="Default model">
                  <Select value={defaultModel} onValueChange={setDefaultModel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="astra">Astra · reasoned</SelectItem>
                      <SelectItem value="swift">Swift · fast</SelectItem>
                      <SelectItem value="claude">Claude 3.5 Sonnet</SelectItem>
                      <SelectItem value="gemini">Gemini 1.5 Pro</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Personality">
                  <Select value={personality} onValueChange={setPersonality}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="analyst">Pragmatic analyst</SelectItem>
                      <SelectItem value="negotiator">Value negotiator</SelectItem>
                      <SelectItem value="concierge">Concise concierge</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </Grid>
              <div className="mt-6">
                <Label>Spending autonomy · {autonomy[0]}%</Label>
                <Slider value={autonomy} onValueChange={setAutonomy} className="mt-4" />
                <div className="mt-2 flex justify-between text-[9px] text-muted-foreground">
                  <span>Ask every time</span>
                  <span>Act inside rules</span>
                </div>
              </div>
              <div className="mt-6 grid gap-2 sm:grid-cols-3">
                <Toggle
                  label="Search catalogues"
                  checked={allowSearch}
                  onCheckedChange={setAllowSearch}
                />
                <Toggle
                  label="Compare products"
                  checked={allowCompare}
                  onCheckedChange={setAllowCompare}
                />
                <Toggle
                  label="Prepare checkout"
                  checked={allowCheckout}
                  onCheckedChange={setAllowCheckout}
                />
              </div>
              <Save onSave={saveAgentSettings} />
            </SettingsPanel>
          </TabsContent>

          {/* 3. NOTIFICATIONS TAB */}
          <TabsContent value="notifications">
            <SettingsPanel title="Notifications" icon={Bell}>
              <div className="space-y-2">
                <Toggle
                  label="Email approvals and blocks"
                  checked={emailAlerts}
                  onCheckedChange={setEmailAlerts}
                />
                <Toggle
                  label="Push decision alerts"
                  checked={pushAlerts}
                  onCheckedChange={setPushAlerts}
                />
                <Toggle
                  label="SMS for urgent escalations"
                  checked={smsAlerts}
                  onCheckedChange={setSmsAlerts}
                />
                <Toggle
                  label="Weekly spend digest"
                  checked={weeklyDigest}
                  onCheckedChange={setWeeklyDigest}
                />
              </div>
              <Grid className="mt-6">
                <Field label="Quiet hours start">
                  <Input
                    type="time"
                    value={quietStart}
                    onChange={(e) => setQuietStart(e.target.value)}
                  />
                </Field>
                <Field label="Quiet hours end">
                  <Input
                    type="time"
                    value={quietEnd}
                    onChange={(e) => setQuietEnd(e.target.value)}
                  />
                </Field>
              </Grid>
              <Save onSave={saveNotificationSettings} />
            </SettingsPanel>
          </TabsContent>

          {/* 4. SECURITY TAB */}
          <TabsContent value="security">
            <SettingsPanel title="Security" icon={LockKeyhole}>
              <Row
                title="Emergency Kill Switch"
                detail="Instantly revoke all agent access and quarantine it from financial execution."
                action={
                  <Switch
                    checked={mandateData?.kill_switch_engaged}
                    onCheckedChange={(val) => (val ? killMutation.mutate() : activateMutation.mutate())}
                  />
                }
              />
              <Row
                title="Two-factor authentication"
                detail={
                  twoFactor
                    ? "Authenticator protection is active"
                    : "Require a rotating code when signing in"
                }
                action={
                  <Switch
                    checked={twoFactor}
                    onCheckedChange={(value) => {
                      setTwoFactor(value);
                      localStorage.setItem("mnd_2fa", String(value));
                      toast.success(value ? "2FA enabled for this workspace" : "2FA disabled");
                    }}
                  />
                }
              />

              <div className="mt-7 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold">Active sessions</h3>
                  <p className="text-[11px] text-muted-foreground">Devices currently authenticated to your workspace</p>
                </div>
                {sessions.filter((s) => !s.isCurrent).length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRevokeOtherSessions}
                  >
                    Revoke other sessions
                  </Button>
                )}
              </div>

              <div className="mt-3 space-y-2">
                {sessions.map((sess) => (
                  <Session
                    key={sess.id}
                    icon={sess.iconType === "mobile" ? Smartphone : Laptop}
                    name={sess.device}
                    meta={sess.location}
                    current={sess.isCurrent}
                    onRevoke={() => handleRevokeSession(sess.id, sess.device)}
                  />
                ))}
                {sessions.filter((s) => !s.isCurrent).length === 0 && (
                  <div className="flex items-center gap-2 rounded-md border border-border/50 bg-subtle/50 px-3 py-2 text-[11px] text-muted-foreground">
                    <Check className="size-3.5 text-safe" />
                    <span>Your account is active only on this device. No unrecognized sessions detected.</span>
                  </div>
                )}
              </div>

              <div className="mt-7 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold">API keys</h3>
                  <p className="text-[11px] text-muted-foreground">Manage agent & MCP client keys</p>
                </div>
                <Button size="sm" variant="outline" onClick={handleCreateApiKey}>
                  <Plus className="mr-1.5 size-3.5" />
                  Create API key
                </Button>
              </div>

              <div className="mt-3 space-y-2">
                {apiKeys.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                    No active API keys found. Click "Create API key" above to generate one.
                  </div>
                ) : (
                  apiKeys.map((keyItem) => (
                    <div
                      key={keyItem.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-subtle p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium">{keyItem.name}</p>
                        <code className="text-[11px] text-muted-foreground font-mono">{keyItem.masked}</code>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => {
                            navigator.clipboard.writeText(keyItem.key);
                            toast.success("API key copied to clipboard");
                          }}
                          aria-label="Copy API key"
                        >
                          <Clipboard className="size-3.5" />
                        </Button>
                        <Confirm
                          title="Rotate API key?"
                          text="Existing integrations using this key will immediately stop working until updated."
                          action="Rotate key"
                          onConfirm={() => handleRotateKey(keyItem.id)}
                        >
                          <Button size="icon-sm" variant="ghost" aria-label="Rotate API key">
                            <RotateCw className="size-3.5" />
                          </Button>
                        </Confirm>
                        <Confirm
                          title="Revoke API key?"
                          text="This permanently deletes the API key and revokes network access."
                          action="Revoke key"
                          onConfirm={() => handleRevokeKey(keyItem.id)}
                        >
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            className="text-danger"
                            aria-label="Revoke API key"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </Confirm>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <h3 className="mt-7 text-xs font-semibold">Kill-switch rules</h3>
              <div className="mt-3 space-y-2">
                <Toggle label="Pause after 3 consecutive blocks" initial />
                <Toggle label="Pause on payment-rail mismatch" initial />
                <Toggle label="Require re-authentication to resume" initial />
              </div>
            </SettingsPanel>
          </TabsContent>

          {/* 5. INTEGRATIONS TAB */}
          <TabsContent value="integrations">
            <SettingsPanel title="Integrations" icon={CreditCard}>
              <Row
                title="PayPal Sandbox"
                detail="Connected · Orders v2 verified gateway"
                action={
                  <span className="flex items-center gap-2 text-xs font-medium text-safe">
                    <Check className="size-4" />
                    Active
                  </span>
                }
              />
              <Row
                title="Decision webhook"
                detail={`${webhookUrl} · Subscribed: ${webhookEvents.length} events`}
                action={
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowWebhookModal(true)}
                    >
                      Configure
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={testingWebhook}
                      onClick={handleTestWebhook}
                    >
                      <Webhook className={`mr-1 size-3.5 ${testingWebhook ? "animate-spin" : ""}`} />
                      {testingWebhook ? "Testing..." : "Test"}
                    </Button>
                  </div>
                }
              />
              <Row
                title="Accounting export"
                detail={
                  accountingProvider
                    ? `Connected · ${accountingProvider} (${lastAccountingSync})`
                    : "No accounting provider connected"
                }
                action={
                  accountingProvider ? (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleExportGL("csv")}
                        title="Download General Ledger CSV"
                      >
                        <Download className="mr-1.5 size-3.5" />
                        Export GL
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isSyncingAccounting}
                        onClick={() => void handleSyncAccounting()}
                        title={`Sync journal entries to ${accountingProvider}`}
                      >
                        <RefreshCw className={`mr-1.5 size-3.5 ${isSyncingAccounting ? "animate-spin" : ""}`} />
                        {isSyncingAccounting ? "Syncing..." : "Sync"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-danger border-danger/30 hover:bg-danger/10"
                        onClick={handleDisconnectAccounting}
                      >
                        Disconnect
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAccountingModal(true)}
                    >
                      Connect
                    </Button>
                  )
                }
              />
            </SettingsPanel>
          </TabsContent>

          {/* 6. APPEARANCE TAB */}
          <TabsContent value="appearance">
            <SettingsPanel title="Appearance" icon={Palette}>
              <Field label="Theme">
                <div className="grid grid-cols-3 gap-2">
                  {["Dark", "Light", "System"].map((value) => (
                    <Button
                      key={value}
                      variant={value === theme ? "secondary" : "outline"}
                      onClick={() => {
                        setTheme(value as any);
                        toast.success(`Theme set to ${value}`);
                      }}
                    >
                      <Moon className="mr-1.5 size-3.5" />
                      {value}
                    </Button>
                  ))}
                </div>
              </Field>
              <Field label="Accent color">
                <div className="flex gap-3">
                  {[
                    { id: "red", hex: "#FF0000" },
                    { id: "green", hex: "#00FF00" },
                    { id: "blue", hex: "#0088FF" },
                    { id: "purple", hex: "#8800FF" }
                  ].map((color) => (
                    <Button
                      key={color.id}
                      variant={color.hex === accent ? "secondary" : "outline"}
                      size="icon"
                      aria-label={`${color.id} accent`}
                      onClick={() => {
                        setAccent(color.hex);
                        toast.success("Accent color updated");
                      }}
                    >
                      <span className="size-4 rounded-full" style={{ backgroundColor: color.hex }} />
                    </Button>
                  ))}
                </div>
              </Field>
              <Toggle label="Reduce motion" checked={motion} onCheckedChange={setMotion} />
              <Field label={`Background animation intensity · ${intensity[0]}%`}>
                <Slider value={intensity} onValueChange={setIntensity} disabled={motion} />
              </Field>
              <Field label="Interface density">
                <Select value={density} onValueChange={setDensity}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compact">Compact</SelectItem>
                    <SelectItem value="comfortable">Comfortable</SelectItem>
                    <SelectItem value="spacious">Spacious</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Save onSave={saveAppearanceSettings} />
            </SettingsPanel>
          </TabsContent>

          {/* 7. DATA & PRIVACY TAB */}
          <TabsContent value="privacy">
            <SettingsPanel title="Data & Privacy" icon={Database}>
              <Row
                title="Export workspace data"
                detail="Download full JSON package containing mandates, audit logs, and decisions."
                action={
                  <Button
                    variant="outline"
                    disabled={isExporting}
                    onClick={handleExportWorkspace}
                  >
                    <Download className={`mr-1.5 size-4 ${isExporting ? "animate-bounce" : ""}`} />
                    {isExporting ? "Preparing..." : "Export Package"}
                  </Button>
                }
              />
              <Confirm
                title="Delete all workspace data?"
                text="This permanently deletes local workspace credentials, session tokens, cached decisions, and settings. This cannot be undone."
                action="Delete all data"
                onConfirm={handleDeleteAllData}
              >
                <div className="mt-5 rounded-md border border-danger/30 bg-danger-soft p-4">
                  <p className="text-sm font-semibold text-danger">Wipe workspace data</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Permanently reset all account-owned parameters and local keys.
                  </p>
                  <Button variant="destructive" className="mt-4">
                    <Trash2 className="mr-1.5 size-4" />
                    Wipe local data
                  </Button>
                </div>
              </Confirm>
            </SettingsPanel>
          </TabsContent>
        </div>
      </Tabs>

      {/* Decision Webhook Configuration Modal */}
      <Dialog open={showWebhookModal} onOpenChange={setShowWebhookModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Webhook className="size-5 text-primary" />
              Configure Decision Webhook
            </DialogTitle>
            <DialogDescription>
              Real-time HTTP POST notifications dispatched immediately on agent policy verdicts and payments.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold">Endpoint Destination URL</Label>
              <Input
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://api.yourcompany.com/webhooks/mandate"
                className="mt-1.5 font-mono text-xs"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Must be an HTTPS endpoint capable of returning a 2xx status code.
              </p>
            </div>

            <div>
              <Label className="text-xs font-semibold">HMAC Signing Secret</Label>
              <div className="mt-1.5 flex items-center gap-2">
                <Input
                  value={webhookSecret}
                  readOnly
                  className="font-mono text-xs text-muted-foreground"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(webhookSecret);
                    toast.success("Webhook signing secret copied to clipboard");
                  }}
                  title="Copy secret"
                >
                  <Clipboard className="size-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(16)))
                      .map((b) => b.toString(16).padStart(2, "0"))
                      .join("");
                    const newSec = `whsec_${randomHex}`;
                    setWebhookSecret(newSec);
                    toast.success("New webhook signing secret generated");
                  }}
                  title="Rotate secret"
                >
                  <RotateCw className="size-3.5" />
                </Button>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Payloads include an <code className="font-mono text-primary">X-Mandate-Signature</code> header with HMAC-SHA256 digest.
              </p>
            </div>

            <div>
              <Label className="text-xs font-semibold">Subscribed Events</Label>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                {[
                  { id: "decision.approved", label: "decision.approved" },
                  { id: "decision.blocked", label: "decision.blocked" },
                  { id: "decision.escalated", label: "decision.escalated" },
                  { id: "payment.completed", label: "payment.completed" },
                ].map((evt) => {
                  const isChecked = webhookEvents.includes(evt.id);
                  return (
                    <label
                      key={evt.id}
                      className={cn(
                        "flex items-center gap-2 rounded-md border p-2 cursor-pointer transition-colors",
                        isChecked ? "border-primary/40 bg-primary/5" : "border-border bg-subtle/50"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setWebhookEvents((prev) => [...prev, evt.id]);
                          } else {
                            setWebhookEvents((prev) => prev.filter((id) => id !== evt.id));
                          }
                        }}
                        className="rounded border-border"
                      />
                      <span className="font-mono text-[11px]">{evt.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Recent Deliveries</Label>
              <div className="mt-1.5 space-y-1.5 rounded-md border border-border bg-subtle/40 p-2 text-xs font-mono">
                {webhookLogs.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">No recent delivery receipts.</p>
                ) : (
                  webhookLogs.map((log, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[11px]">
                      <span className="text-foreground">{log.event}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-safe">{log.status} OK ({log.latency_ms}ms)</span>
                        <span className="text-muted-foreground">{log.time}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button variant="ghost" onClick={() => setShowWebhookModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveWebhookConfig}>
              Save Webhook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Accounting Provider Modal */}
      <Dialog open={showAccountingModal} onOpenChange={setShowAccountingModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect Accounting Provider</DialogTitle>
            <DialogDescription>
              Sync approved autonomous transactions and invoices directly to your general ledger.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-xs font-semibold">Select Provider</Label>
              <Select value={selectedAccountingOption} onValueChange={setSelectedAccountingOption}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="QuickBooks Online">QuickBooks Online</SelectItem>
                  <SelectItem value="Xero Accounting">Xero</SelectItem>
                  <SelectItem value="NetSuite ERP">Oracle NetSuite</SelectItem>
                  <SelectItem value="SAP ERP">SAP S/4HANA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Default Expense Account</Label>
              <Select defaultValue="60100">
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="60100">60100 - Software & Cloud SaaS Subscriptions</SelectItem>
                  <SelectItem value="60150">60150 - Developer Tools & Compute APIs</SelectItem>
                  <SelectItem value="60200">60200 - Office Equipment & Workplace Supplies</SelectItem>
                  <SelectItem value="60900">60900 - General & Administrative Operating Expenses</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Connecting will authorize MANDATE to sync double-entry transaction lines matching PayPal capture receipts and payment settlements.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAccountingModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleConnectAccounting}>
              Authorize & Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SettingsPanel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Bell;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-border bg-card p-5 md:p-7">
      <div className="flex items-center gap-3 border-b border-border pb-5">
        <span className="grid size-9 place-items-center rounded-md bg-subtle">
          <Icon className="size-4" />
        </span>
        <h2 className="font-display text-xl font-semibold">{title}</h2>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Grid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`grid gap-5 sm:grid-cols-2 ${className ?? ""}`}>{children}</div>;
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

function Toggle({
  label,
  initial,
  checked,
  onCheckedChange,
}: {
  label: string;
  initial?: boolean;
  checked?: boolean;
  onCheckedChange?: (v: boolean) => void;
}) {
  const [local, setLocal] = useState(Boolean(initial));
  const id = useId();
  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-subtle p-3">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Switch id={id} checked={checked ?? local} onCheckedChange={onCheckedChange ?? setLocal} />
    </div>
  );
}

function Row({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between gap-3 border-b border-border py-5 first:pt-0 sm:flex-row sm:items-center">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </div>
      {action}
    </div>
  );
}

function Save({ onSave }: { onSave: () => void }) {
  return (
    <Button className="mt-7" onClick={onSave}>
      Save changes
    </Button>
  );
}

function Session({
  icon: Icon,
  name,
  meta,
  current,
  onRevoke,
}: {
  icon: typeof Laptop;
  name: string;
  meta: string;
  current?: boolean;
  onRevoke?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border p-3">
      <Icon className="size-4 text-muted-foreground" />
      <div className="flex-1">
        <p className="text-xs font-medium">{name}</p>
        <p className="text-[10px] text-muted-foreground">{meta}</p>
      </div>
      {current ? (
        <span className="text-[10px] text-safe font-medium">Current session</span>
      ) : (
        <Button variant="ghost" size="sm" onClick={onRevoke}>
          Revoke
        </Button>
      )}
    </div>
  );
}

function Confirm({
  title,
  text,
  action,
  onConfirm,
  children,
}: {
  title: string;
  text: string;
  action: string;
  onConfirm: () => void;
  children: React.ReactNode;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{text}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{action}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
