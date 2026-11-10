import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity,
  BookOpenCheck,
  Bell,
  Bot,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ChartNoAxesCombined,
  Clock3,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  FileCheck2,
  Gauge,
  Headphones,
  History,
  Keyboard,
  Laptop,
  Layers,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  MessageSquareText,
  Mic,
  Monitor,
  Moon,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Swords,
  Sun,
  Trash2,
  UserRound,
  Users,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { mandateApi, API_V1_URL } from "./api";
import { useMandateStore, type RequestStatus } from "./store";
import { customAiFetch } from "@/lib/ai/local-fetch";
import { MandateIntro } from "./MandateIntro";
import { TransactionFlowBackground } from "./TransactionFlowBackground";
import { ChatSettingsDrawer } from "./ChatSettingsDrawer";
import { ScreenSkeleton } from "./WorkspaceStates";
import { featuredProposal } from "./mock";
import { VerdictBadge } from "./VerdictBadge";
import { BiometricModal } from "./BiometricModal";
import { TelemetryWidget } from "./TelemetryWidget";

const AuditLog = lazy(() => import("./AuditLog").then((module) => ({ default: module.AuditLog })));
const RedTeamLab = lazy(() =>
  import("./RedTeamLab").then((module) => ({ default: module.RedTeamLab })),
);
const Transactions = lazy(() =>
  import("./Transactions").then((module) => ({ default: module.Transactions })),
);
const Analytics = lazy(() =>
  import("./Analytics").then((module) => ({ default: module.Analytics })),
);
const WorkspaceSettings = lazy(() =>
  import("./Settings").then((module) => ({ default: module.Settings })),
);
const Profile = lazy(() => import("./Profile").then((module) => ({ default: module.Profile })));
const BudgetBurnDownChart = lazy(() =>
  import("./DashboardCharts").then((module) => ({ default: module.BudgetBurnDownChart })),
);
const CategorySpendChart = lazy(() =>
  import("./DashboardCharts").then((module) => ({ default: module.CategorySpendChart })),
);

type View =
  | "dashboard"
  | "chat"
  | "mandates"
  | "approvals"
  | "transactions"
  | "analytics"
  | "audit"
  | "redteam"
  | "settings"
  | "profile";
type Thread = { id: string; title: string; created_at: string; updated_at: string };
type RuleSet = {
  monthlyCap: number;
  autoApprove: number;
  dailyCap: number;
  categories: string[];
  blockedMerchants: string[];
  timeWindow: string;
  maxPerDay: number;
};
const navItems = [
  { id: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
  { id: "chat" as const, label: "Agent Chat", icon: MessageSquareText },
  { id: "mandates" as const, label: "Mandate Builder", icon: FileCheck2 },
  { id: "approvals" as const, label: "Approvals", icon: ShieldAlert },
  { id: "transactions" as const, label: "Transactions", icon: CreditCard },
  { id: "analytics" as const, label: "Analytics", icon: ChartNoAxesCombined },
  { id: "audit" as const, label: "Audit Log", icon: BookOpenCheck },
  { id: "redteam" as const, label: "Red-Team Lab", icon: Swords },
  { id: "settings" as const, label: "Settings", icon: Settings },
];
const suggested = [
  "Find noise-cancelling headphones under $150",
  "Compare webcams for remote work",
  "Can I expense a mechanical keyboard?",
];
const formatMoney = (value: number) => {
  const currency = typeof window !== "undefined" ? localStorage.getItem("mnd_currency") || "USD" : "USD";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: value % 1 ? 2 : 0,
  }).format(value);
};

export function MandateApp({
  initialView = "dashboard",
  threadId,
}: {
  initialView?: View;
  threadId?: string;
}) {
  const [view, setView] = useState<View>(initialView);
  const [mobileNav, setMobileNav] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [intro, setIntro] = useState(false);
  
  const requests = useMandateStore((state) => state.requests);
  const fetchRequests = useMandateStore((state) => state.fetchRequests);
  const theme = useMandateStore((state) => state.theme);
  const setTheme = useMandateStore((state) => state.setTheme);
  const accent = useMandateStore((state) => state.accent);
  const storeActiveView = useMandateStore((state) => state.activeView);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    void fetchRequests();
  }, [fetchRequests]);
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      return { ...data, email: user.email };
    }
  });
  const displayName = profile?.display_name || profile?.email?.split('@')[0] || "OPERATOR";
  const initials = displayName.substring(0, 2).toUpperCase();
  const transactions = useMandateStore((state) => state.transactions) || [];
  const pendingCount = requests.filter((item) => (item.status || "pending").toLowerCase() === "pending").length;
  const blockedCount = transactions.filter((t) => t.verdict === "BLOCK" || t.status === "denied").length;
  useEffect(() => {
    setView(initialView);
  }, [initialView]);
  useEffect(() => {
    if (storeActiveView && storeActiveView !== view) {
      chooseView(storeActiveView as View);
    }
  }, [storeActiveView]);
  useEffect(() => {
    let isDark = true;
    if (theme === "System") {
      isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    } else {
      isDark = theme === "Dark";
    }
    document.documentElement.classList.toggle("dark", isDark);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    const color = accent;
    
    root.style.setProperty("--primary", color);
    root.style.setProperty("--accent", color);
    root.style.setProperty("--ring", color);
    root.style.setProperty("--sidebar-accent", color);
    root.style.setProperty("--signal", color);
    root.style.setProperty("--gate", color);
  }, [accent]);
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);
  const completeIntro = useCallback(() => setIntro(false), []);
  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await navigate({ to: "/auth", replace: true });
  };
  const chooseView = async (next: View) => {
    setMobileNav(false);
    setCommandOpen(false);
    useMandateStore.getState().setActiveView(next);
    if (next === "chat") {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data: latest } = await supabase
        .from("chat_threads")
        .select("id")
        .eq("user_id", auth.user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latest) {
        setView("chat");
        await navigate({ to: "/dashboard/chat/$threadId", params: { threadId: latest.id } });
        return;
      }
      const { data: created, error } = await supabase
        .from("chat_threads")
        .insert({ user_id: auth.user.id, title: "New conversation" })
        .select("id")
        .single();
      if (error || !created) {
        console.error("Failed to create thread:", error);
        toast.error(`Could not start a conversation: ${error?.message || "Unknown error"}`);
        return;
      }
      setView("chat");
      await navigate({ to: "/dashboard/chat/$threadId", params: { threadId: created.id } });
      return;
    }
    if (threadId) {
      await navigate({ to: "/dashboard" });
    }
    setView(next);
  };
  const sidebarWidth = collapsed ? "lg:pl-[76px]" : "lg:pl-[248px]";
  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-background text-foreground selection:bg-primary/20">
      {intro && <MandateIntro onComplete={completeIntro} />}
      {/* Telemetry Top Bar */}
      <div className="fixed top-0 inset-x-0 h-8 border-b border-[#2A2A2A] bg-[#050505] z-[100] flex items-center px-4 overflow-hidden text-[10px] uppercase tracking-widest text-[#EAEAEA]/50 font-mono">
        <div className="flex animate-[marquee_20s_linear_infinite] whitespace-nowrap">
          SYSTEM_STATUS: ONLINE &bull; REGION: US-EAST-1 &bull; LATENCY: 12MS &bull; POLICY_ENGINE: ACTIVE &bull; DLQ: 0 &bull; SYSTEM_STATUS: ONLINE &bull; REGION: US-EAST-1 &bull; LATENCY: 12MS &bull; POLICY_ENGINE: ACTIVE &bull; DLQ: 0 &bull; SYSTEM_STATUS: ONLINE &bull; REGION: US-EAST-1 &bull; LATENCY: 12MS &bull; POLICY_ENGINE: ACTIVE &bull; DLQ: 0
        </div>
      </div>
      {/* Grid Background overlay */}
      <div className="fixed inset-0 pointer-events-none border-[#2A2A2A] opacity-20 z-0" 
           style={{ backgroundImage: 'linear-gradient(#2A2A2A 1px, transparent 1px), linear-gradient(90deg, #2A2A2A 1px, transparent 1px)', backgroundSize: '100px 100px' }} />
      <TransactionFlowBackground
        density={
          view === "dashboard" || view === "audit" || view === "analytics" ? "quiet" : "ambient"
        }
      />
      <aside
        className={cn(
          "fixed inset-y-0 top-8 left-0 z-40 border-r border-sidebar-border bg-sidebar/95 p-3 backdrop-blur-xl transition-none lg:translate-x-0",
          collapsed ? "w-[76px]" : "w-[248px]",
          mobileNav ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-14 items-center justify-between px-2">
            {!collapsed && <Brand to="/dashboard" />}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (window.innerWidth < 1024) setMobileNav(false);
                else setCollapsed((value) => !value);
              }}
              aria-label="Toggle navigation"
            >
              {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
            </Button>
          </div>
          {!collapsed && (
            <p className="mt-6 px-2 font-mono text-[9px] font-semibold uppercase tracking-[.16em] text-sidebar-muted">
              Operational scopes
            </p>
          )}
          <nav className="mt-3 space-y-1">
            {navItems.map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                onClick={() => chooseView(item.id)}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "relative h-10 w-full text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground",
                  collapsed ? "justify-center px-0" : "justify-start px-3",
                  view === item.id &&
                    "bg-sidebar-accent text-sidebar-foreground before:absolute before:inset-y-2 before:left-0 before:w-px before:bg-signal",
                )}
              >
                {<item.icon className="size-[17px]" />}
                {!collapsed && <span>{item.label}</span>}
                {!collapsed && item.id === "approvals" && pendingCount > 0 && (
                  <span className="ml-auto rounded-sm bg-warning-soft px-2 py-0.5 font-mono text-[9px] text-warning">
                    {pendingCount}
                  </span>
                )}
              </Button>
            ))}
          </nav>
          <div className="mt-auto">
            {!collapsed && (
              <div className="rounded-md border border-sidebar-border bg-sidebar-accent/60 p-3">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-safe">
                    <ShieldCheck className="size-4" />
                    PayPal Secure Node
                  </div>
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <span className="size-2 rounded-full bg-safe verdict-glow-safe" />
                    Gate online
                  </div>
                </div>
                <p className="mt-2 font-mono text-[9px] leading-4 text-sidebar-muted">
                  ML INJECTION FIREWALL: ACTIVE (DeBERTa-v3)
                  <br />
                  ZERO-TRUST CSP: ENFORCED
                  <br />
                  END-TO-END ENCRYPTED
                </p>
              </div>
            )}
            <div className="mt-3 flex items-center gap-3 px-2 py-2">
              <div className="grid size-8 shrink-0 place-items-center rounded-none bg-sidebar-accent text-xs font-semibold text-white">
                {initials}
              </div>
              {!collapsed && (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-mono uppercase text-[#EAEAEA]">{displayName}</p>
                    <p className="text-[10px] text-sidebar-muted font-mono">ROOT_ACCESS</p>
                  </div>
                  <Button variant="ghost" size="icon-sm" onClick={signOut} aria-label="Sign out">
                    <LogOut />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </aside>
      {mobileNav && (
        <Button
          variant="ghost"
          className="fixed inset-0 z-30 h-auto w-auto rounded-none bg-overlay lg:hidden"
          onClick={() => setMobileNav(false)}
          aria-label="Close navigation"
        />
      )}
      <main className={cn("relative z-10 transition-none pt-8", sidebarWidth)}>
        <header className="sticky top-8 z-20 grid h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center border-b border-border bg-background/85 px-4 backdrop-blur-xl md:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="mr-2 lg:hidden"
            onClick={() => setMobileNav(true)}
            aria-label="Open navigation"
          >
            <Menu />
          </Button>
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-semibold">
              {navItems.find((item) => item.id === view)?.label}
            </p>
            <p className="hidden font-mono text-[9px] uppercase text-muted-foreground sm:block">
              {((typeof window !== "undefined" && localStorage.getItem("mnd_ws_name")) || "CONTROL ROOM")} / PRODUCTION
            </p>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={() => setCommandOpen(true)}
            >
              <Search />
              Search<kbd className="ml-2 font-mono text-[9px] text-muted-foreground">⌘K</kbd>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  aria-label="Notifications" 
                  className="relative"
                >
                  <Bell />
                  <span
                    className={cn(
                      "absolute right-2 top-2 size-1.5 rounded-full",
                      pendingCount > 0
                        ? "bg-warning animate-pulse"
                        : blockedCount > 0
                          ? "bg-danger"
                          : "bg-safe"
                    )}
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 rounded-none border-[#2A2A2A] bg-[#121212] p-2 space-y-1">
                <div className="flex items-center justify-between px-2 py-1.5 border-b border-[#2A2A2A]">
                  <p className="font-mono text-xs uppercase font-semibold text-[#EAEAEA]">Notifications</p>
                  <span className="font-mono text-[9px] text-muted-foreground">REAL-TIME</span>
                </div>
                {pendingCount > 0 && (
                  <DropdownMenuItem 
                    onClick={() => chooseView("approvals")} 
                    className="flex flex-col items-start gap-1 p-2.5 cursor-pointer hover:bg-warning/10"
                  >
                    <div className="flex items-center gap-2 text-warning text-xs font-semibold">
                      <Clock3 className="size-3.5" />
                      <span>{pendingCount} Approval(s) Pending</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Purchases require human-in-the-loop signoff. Click to review.
                    </p>
                  </DropdownMenuItem>
                )}
                {blockedCount > 0 && (
                  <DropdownMenuItem 
                    onClick={() => chooseView("audit")} 
                    className="flex flex-col items-start gap-1 p-2.5 cursor-pointer hover:bg-danger/10"
                  >
                    <div className="flex items-center gap-2 text-danger text-xs font-semibold">
                      <ShieldAlert className="size-3.5" />
                      <span>{blockedCount} Attack(s) Contained</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Unauthorized attempts blocked by Sentinel. View audit ledger.
                    </p>
                  </DropdownMenuItem>
                )}
                <div className="flex items-center gap-2 px-2.5 py-2 text-[11px] text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-safe" />
                  <span>Sentinel Policy Engine nominal (12ms latency)</span>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open profile menu">
                  <UserRound />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 rounded-none border-[#2A2A2A] bg-[#121212]">
                <DropdownMenuLabel className="font-mono text-xs uppercase text-[#EAEAEA]">{displayName}</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[#2A2A2A]" />
                <DropdownMenuItem onClick={() => chooseView("settings")}>
                  <Gauge />
                  Workspace settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => chooseView("profile")}>
                  <UserRound />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={signOut}>
                  <LogOut />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <Suspense
          fallback={
            <div className="p-4 md:p-8">
              <ScreenSkeleton />
            </div>
          }
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={`${view}-${threadId ?? ""}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "mx-auto max-w-[1500px]",
                view === "chat" ? "h-[calc(100vh-4rem)]" : "p-4 md:p-8",
              )}
            >
              {view === "dashboard" && <Dashboard onNavigate={chooseView} />}
              {view === "chat" && threadId && <AgentChat threadId={threadId} />}
              {view === "mandates" && <MandateBuilder />}
              {view === "approvals" && <Approvals />}
              {view === "transactions" && <Transactions />}
              {view === "analytics" && <Analytics />}
              {view === "audit" && <AuditLog />}
              {view === "redteam" && <RedTeamLab />}
              {view === "settings" && <WorkspaceSettings />}
              {view === "profile" && <Profile />}
            </motion.div>
          </AnimatePresence>
        </Suspense>
      </main>
      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput placeholder="Go to a page or run an action…" />
        <CommandList>
          <CommandEmpty>No command found.</CommandEmpty>
          <CommandGroup heading="Navigate">
            {navItems.map((item) => (
              <CommandItem key={item.id} onSelect={() => chooseView(item.id)}>
                <item.icon />
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Actions">
            <CommandItem onSelect={() => chooseView("mandates")}>
              <Plus />
              Create mandate<CommandShortcut>M</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => setTheme(theme === "Dark" ? "Light" : "Dark")}>
              <Moon />
              Toggle theme<CommandShortcut>T</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}

function Dashboard({ onNavigate }: { onNavigate: (view: View) => void }) {
  const requests = useMandateStore((state) => state.requests) || [];
  const transactions = useMandateStore((state) => state.transactions) || [];
  const monthlyCap = useMandateStore((state) => state.monthlyCap) || 5000;
  const [active, setActive] = useState(true);
  const [confirmKill, setConfirmKill] = useState(false);

  useEffect(() => {
    void mandateApi.getMandate("mandate_1").then((data) => {
      if (data && typeof data.is_active === "boolean") {
        setActive(data.is_active && !data.kill_switch_engaged);
      }
    });
  }, []);

  const handleToggleActive = async (newActive: boolean) => {
    setActive(newActive);
    try {
      if (!newActive) {
        await mandateApi.killMandate("mandate_1");
        toast.error("Agent spending paused on Sentinel Policy Engine");
      } else {
        await mandateApi.activateMandate("mandate_1");
        toast.success("Agent spending resumed on Sentinel Policy Engine");
      }
    } catch {
      toast.info(newActive ? "Agent spending resumed" : "Agent spending paused");
    }
  };

  // Compute live dynamic metrics
  const completedTxs = transactions.filter((t) => t.status === "completed");
  const totalSpent = completedTxs.reduce((sum, t) => sum + (t.amount || 0), 0);
  const budgetRemaining = Math.max(0, monthlyCap - totalSpent);
  const percentSpent = Math.min(100, Math.round((totalSpent / monthlyCap) * 100));

  const pendingRequests = requests.filter((request) => request.status === "pending");
  const pending = pendingRequests.length;
  const pendingExposure = pendingRequests.reduce((sum, r) => sum + (r.amount || 0), 0);

  const blockedTxs = transactions.filter((t) => t.verdict === "BLOCK" || t.status === "denied");
  const blockedCount = blockedTxs.length;
  const blockedProtected = blockedTxs.reduce((sum, t) => sum + (t.amount || 0), 0);
  const taskCount = pendingRequests.length + completedTxs.length;
  const lastActionText = transactions[0]?.date ? `last action ${transactions[0].date}` : "standing by";

  return (
    <div className="space-y-6">
      <PageTitle
        eyebrow="System nominal"
        title="Spending command center"
        description="Every autonomous purchase, bounded by your rules and visible in real time."
        action={
          <Button variant="premium" onClick={() => onNavigate("chat")}>
            <MessageSquareText />
            Ask your agent
          </Button>
        }
      />
      <section className="grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2 xl:grid-cols-4">
        <CountMetric
          label="Spent this month"
          value={Number(totalSpent.toFixed(2))}
          prefix="$"
          note={`${percentSpent}% of $${monthlyCap.toLocaleString()}`}
          icon={CircleDollarSign}
        />
        <CountMetric
          label="Budget remaining"
          value={Number(budgetRemaining.toFixed(2))}
          prefix="$"
          note={`Dynamic control line`}
          icon={Gauge}
        />
        <CountMetric
          label="Approvals pending"
          value={pending}
          note={`$${Math.round(pendingExposure)} exposure`}
          icon={Clock3}
          warning={pending > 0}
        />
        <CountMetric
          label="Blocked attempts"
          value={blockedCount}
          note={`$${Math.round(blockedProtected)} protected`}
          icon={ShieldAlert}
          danger={blockedCount > 0}
        />
      </section>
      <div className="grid gap-6 xl:grid-cols-[1.45fr_.75fr]">
        <Panel title="Budget burn-down" subtitle="Actual spend against the monthly control line">
          <Suspense fallback={<div className="h-72 animate-pulse bg-muted/40" />}>
            <BudgetBurnDownChart />
          </Suspense>
        </Panel>
        <Panel title="Spend by category" subtitle="Approved volume this month">
          <Suspense fallback={<div className="h-56 animate-pulse bg-muted/40" />}>
            <CategorySpendChart />
          </Suspense>
        </Panel>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
        <Panel
          title="Live activity"
          subtitle="Real-time decisions arriving from the policy gate"
          action={
            <Button variant="ghost" size="sm" onClick={() => onNavigate("transactions")}>
              Open transactions <ChevronRight />
            </Button>
          }
        >
          <div className="mt-4 divide-y divide-border">
            {transactions.slice(0, 5).map((row) => (
              <div key={row.id} className="flex items-center gap-3 py-3">
                <MerchantMark name={row.merchant} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {row.merchant} · {row.item}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {row.date} · {row.ruleId ? `Rule ${row.ruleId}` : row.reason}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xs font-semibold">{formatMoney(row.amount)}</p>
                  <Status value={row.verdict.toLowerCase()} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Agent status" subtitle="Procurement Copilot">
          <div className="mt-5 rounded-md border border-border bg-subtle p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "size-2 rounded-full",
                    active ? "bg-safe verdict-glow-safe" : "bg-danger",
                  )}
                />
                <div>
                  <p className="text-sm font-semibold">{active ? "Active" : "Paused"}</p>
                  <p className="text-[10px] text-muted-foreground">{taskCount} tasks tracked · {lastActionText}</p>
                </div>
              </div>
              <Bot className="size-5 text-signal" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Fact label="Today" value={`${transactions.length + requests.length} decisions`} />
              <Fact label="Autonomy" value="Balanced" />
            </div>
          </div>
          <Button
            variant={active ? "destructive" : "default"}
            className="mt-4 w-full"
            onClick={() => (active ? setConfirmKill(true) : handleToggleActive(true))}
          >
            {active ? (
              <>
                <Pause />
                Pause all spending
              </>
            ) : (
              <>
                <Play />
                Resume agent
              </>
            )}
          </Button>
        </Panel>
      </div>
      <AlertDialog open={confirmKill} onOpenChange={setConfirmKill}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pause every agent purchase?</AlertDialogTitle>
            <AlertDialogDescription>
              All new purchase requests will be blocked until you resume the agent. Existing
              approvals remain unchanged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep active</AlertDialogCancel>
            <AlertDialogAction
              className="bg-danger text-primary-foreground hover:bg-danger/90"
              onClick={() => handleToggleActive(false)}
            >
              Pause spending
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AgentChat({ threadId }: { threadId: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [listOpen, setListOpen] = useState(true);
  const [listening, setListening] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const { data: threads = [] } = useQuery({
    queryKey: ["chat-threads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_threads")
        .select("id,title,created_at,updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Thread[];
    },
  });
  const { data: initialMessages = [], isLoading } = useQuery({
    queryKey: ["chat-messages", threadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("sdk_message_id,role,parts")
        .eq("thread_id", threadId)
        .order("created_at");
      if (error) throw error;
      return data.map((row) => ({
        id: row.sdk_message_id ?? crypto.randomUUID(),
        role: row.role,
        parts: row.parts,
      })) as UIMessage[];
    },
  });
  if (isLoading)
    return (
      <div className="h-full p-6">
        <ScreenSkeleton />
      </div>
    );
  return (
    <ChatSession
      key={threadId}
      threadId={threadId}
      initialMessages={initialMessages}
      threads={threads.filter((thread) =>
        thread.title.toLowerCase().includes(search.toLowerCase()),
      )}
      search={search}
      setSearch={setSearch}
      listOpen={listOpen}
      setListOpen={setListOpen}
      listening={listening}
      setListening={setListening}
      inputRef={inputRef}
      navigate={navigate}
      queryClient={queryClient}
    />
  );
}

function ChatSession({
  threadId,
  initialMessages,
  threads,
  search,
  setSearch,
  listOpen,
  setListOpen,
  listening,
  setListening,
  inputRef,
  navigate,
  queryClient,
}: {
  threadId: string;
  initialMessages: UIMessage[];
  threads: Thread[];
  search: string;
  setSearch: (v: string) => void;
  listOpen: boolean;
  setListOpen: (v: boolean) => void;
  listening: boolean;
  setListening: (v: boolean) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  navigate: ReturnType<typeof useNavigate>;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const localAI = useMandateStore((state) => state.localAI);
  const autoApproveLimit = useMandateStore((state) => state.autoApproveLimit);
  const dailySpendCap = useMandateStore((state) => state.dailySpendCap);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        headers: async () => {
          const { data } = await supabase.auth.getSession();
          return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
        },
        body: { id: threadId, autoApproveLimit, dailySpendCap },
        fetch: localAI ? customAiFetch : undefined,
      }),
    [threadId, localAI, autoApproveLimit, dailySpendCap],
  );
  const { messages, sendMessage, status, stop, regenerate } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
    onError: (error) => toast.error(error.message || "Agent response failed"),
    onFinish: (message) => {
      queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
      window.setTimeout(() => inputRef.current?.focus(), 50);

      // Immediately sync latest approval requests from backend into the store
      void useMandateStore.getState().fetchRequests();

      // Show toast notification if a proposal was queued
      const textToScan = message?.content || (message?.parts as any[])?.filter((p: any) => p.type === "text").map((p: any) => p.text).join(" ") || "";
      if (textToScan.includes("requires approval") || textToScan.includes("queued a proposal")) {
        toast.info("Purchase proposal queued for approval", {
          description: "A new escalated transaction has been added to your Approvals Center.",
          action: {
            label: "Review",
            onClick: () => setView("approvals"),
          },
        });
      }
      
      // Voice assistant TTS
      try {
        const textToSpeak = textToScan;
        if (textToSpeak && window.speechSynthesis) {
          window.speechSynthesis.cancel();
          const cleanText = textToSpeak.replace(/[_*#`~]/g, '').replace(/\[.*?\]\(.*?\)/g, 'a link');
          const utterance = new SpeechSynthesisUtterance(cleanText);
          const voices = window.speechSynthesis.getVoices();
          const preferredVoice = voices.find(v => v.lang.startsWith("en") && (v.name.includes("Female") || v.name.includes("Google") || v.name.includes("Siri")));
          if (preferredVoice) utterance.voice = preferredVoice;
          window.speechSynthesis.speak(utterance);
        }
      } catch (e) {
        console.error("TTS Error:", e);
      }
    },
  });
  const busy = status === "submitted" || status === "streaming";
  const chatAnnouncement =
    status === "submitted"
      ? "Agent is evaluating the request"
      : status === "streaming"
        ? "Agent response is arriving"
        : "Agent is ready";
  useEffect(() => {
    inputRef.current?.focus();
  }, [inputRef]);
  const createThread = async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return undefined;
    const { data, error } = await supabase
      .from("chat_threads")
      .insert({ user_id: auth.user.id, title: "New conversation" })
      .select("id")
      .single();
    if (error || !data) {
      toast.error("Could not start a new conversation");
      return undefined;
    }
    await queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
    await navigate({ to: "/dashboard/chat/$threadId", params: { threadId: data.id } });
    return data.id;
  };
  const renameThread = async (thread: Thread) => {
    const title = window.prompt("Rename conversation", thread.title)?.trim();
    if (!title) return;
    await supabase.from("chat_threads").update({ title }).eq("id", thread.id);
    await queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
  };
  const deleteThread = async (id: string) => {
    if (!window.confirm("Delete this conversation permanently?")) return;
    await supabase.from("chat_threads").delete().eq("id", id);
    await queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
    const next = threads.find((thread) => thread.id !== id);
    if (next) await navigate({ to: "/dashboard/chat/$threadId", params: { threadId: next.id } });
    else await createThread();
  };
  const exportChat = async (format: "md" | "pdf") => {
    const text = messages
      .map(
        (message) =>
          `## ${message.role === "user" ? "You" : "MANDATE Agent"}\n\n${message.parts
            .filter((part) => part.type === "text")
            .map((part) => part.text)
            .join("\n")}`,
      )
      .join("\n\n");
    if (format === "md") {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(new Blob([text], { type: "text/markdown" }));
      link.download = "mandate-conversation.md";
      link.click();
      URL.revokeObjectURL(link.href);
      return;
    }
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF();
    pdf.setFontSize(11);
    pdf.text(pdf.splitTextToSize(text.replaceAll("## ", ""), 180), 15, 18);
    pdf.save("mandate-conversation.pdf");
  };
  const toggleVoice = () => {
    const SpeechRecognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Voice input is not supported in this browser");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) sendMessage({ text: transcript });
    };
    recognition.start();
  };
  const submit = async ({
    text,
    files,
  }: {
    text: string;
    files: { type: "file"; mediaType: string; filename?: string; url: string }[];
  }) => {
    if ((!text.trim() && !files.length) || busy) return;
    if (messages.length === 0 && text.trim()) {
      await supabase
        .from("chat_threads")
        .update({ title: text.trim().slice(0, 52), updated_at: new Date().toISOString() })
        .eq("id", threadId);
    }
    await sendMessage({ text, files });
    inputRef.current?.focus();
  };
  return (
    <div className="flex h-full min-w-0 overflow-hidden relative">
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {chatAnnouncement}
      </p>
      <aside
        className={cn(
          "shrink-0 border-r border-border bg-card/70 transition-all",
          listOpen ? "w-72" : "w-0 overflow-hidden",
        )}
      >
        <div className="flex h-full w-72 flex-col p-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" className="flex-1" onClick={createThread}>
              <Plus />
              New conversation
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setListOpen(false)}
              aria-label="Hide history"
            >
              <ChevronLeft />
            </Button>
          </div>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search conversations"
              className="pl-9"
            />
          </div>
          <div className="mt-4 flex-1 space-y-1 overflow-y-auto">
            {threads.map((thread) => (
              <div
                key={thread.id}
                className={cn(
                  "group flex items-center rounded-md",
                  thread.id === threadId && "bg-accent",
                )}
              >
                <Button
                  variant="ghost"
                  className="min-w-0 flex-1 justify-start"
                  onClick={() =>
                    navigate({ to: "/dashboard/chat/$threadId", params: { threadId: thread.id } })
                  }
                >
                  <History />
                  <span className="truncate">{thread.title}</span>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label="Conversation actions">
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => renameThread(thread)}>Rename</DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-danger"
                      onClick={() => deleteThread(thread.id)}
                    >
                      <Trash2 />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        </div>
      </aside>
      <section className="flex min-w-0 flex-1 flex-col">
        {" "}
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-4 relative z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setListOpen(!listOpen)}
            aria-label="Toggle conversation history"
          >
            {listOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
          </Button>
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-md border border-signal/30 bg-signal/10">
              <ShieldCheck className="size-4 text-signal" />
            </span>
            <div>
              <p className="text-xs font-semibold">Procurement Agent</p>
              <p className="font-mono text-[8px] text-safe">POLICY GATE CONNECTED</p>
            </div>
          </div>
            <div className="ml-auto flex items-center gap-2">
              <TelemetryWidget messages={messages} status={status as string} />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Export conversation"
                >
                  <Download />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportChat("md")}>Export Markdown</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportChat("pdf")}>Export PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <ChatSettingsDrawer />
        </div>
        <Conversation className="min-h-0">
          <ConversationContent className="mx-auto w-full max-w-3xl px-4 py-8">
            {messages.length === 0 && (
              <div className="py-12 text-center">
                <div className="mx-auto grid size-14 place-items-center rounded-full border border-signal/30 bg-signal/10">
                  <ShieldCheck className="size-7 text-signal" />
                </div>
                <h1 className="mt-5 font-display text-2xl font-semibold">Shop inside the lines.</h1>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  Tell me what you need. I’ll compare options and run every proposal through your
                  mandate before money moves.
                </p>
                <div className="mx-auto mt-7 grid max-w-xl gap-2 sm:grid-cols-3">
                  {suggested.map((prompt) => (
                    <Button
                      key={prompt}
                      variant="outline"
                      className="h-auto whitespace-normal p-3 text-left text-xs leading-5"
                      onClick={() => sendMessage({ text: prompt })}
                    >
                      {prompt}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((message, index) => (
              <Message key={message.id} from={message.role}>
                <MessageContent>
                  {message.parts.map((part, partIndex) =>
                    part.type === "text" && part.text.trim() !== "" ? (
                      <MessageResponse
                        key={`${message.id}-${partIndex}`}
                        isAnimating={busy && index === messages.length - 1}
                      >
                        {part.text}
                      </MessageResponse>
                    ) : ((part as any).type === "tool-delegate_task" || ((part as any).type === "dynamic-tool" && (part as any).toolName === "delegate_task") || ((part as any).type === "tool-invocation" && (part as any).toolInvocation?.toolName === "delegate_task")) ? (
                      <div key={`${message.id}-${partIndex}`} className="mt-4 mb-2 rounded-lg border border-border bg-subtle p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-3 border-b border-border pb-2">
                          <Users className="size-4 text-signal" />
                          <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#EAEAEA]">
                            {((part as any).input?.agent_type || (part as any).toolInvocation?.args?.agent_type || "RESEARCHER")} (Sub-Agent)
                          </span>
                        </div>
                        {((part as any).state === "result" || (part as any).toolInvocation?.state === "result") ? (
                          <div className="text-sm text-muted-foreground prose prose-invert prose-p:leading-relaxed prose-pre:bg-black/50">
                            {(part as any).output?.response || (part as any).toolInvocation?.result?.response || "No response."}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="size-2 rounded-full bg-signal animate-pulse" />
                            <Shimmer>Consulting {((part as any).input?.agent_type || (part as any).toolInvocation?.args?.agent_type || "Researcher")}...</Shimmer>
                          </div>
                        )}
                      </div>
                    ) : ((part as any).type === "tool-propose_product" || (part as any).type === "tool-propose_products" || ((part as any).type === "dynamic-tool" && ((part as any).toolName === "propose_product" || (part as any).toolName === "propose_products")) || ((part as any).type === "tool-invocation" && ((part as any).toolInvocation?.toolName === "propose_product" || (part as any).toolInvocation?.toolName === "propose_products"))) ? (
                      <div key={`${message.id}-${partIndex}`} className="mt-2 space-y-4">
                        {(() => {
                          const args = (part as any).input || (part as any).output || (part as any).toolInvocation?.args || (part as any).toolInvocation?.result || (part as any).args || {};
                          if (Array.isArray(args.products)) {
                            return args.products.map((p: any, pIdx: number) => (
                              <ProductProposal key={pIdx} customProduct={p} />
                            ));
                          }
                          return <ProductProposal customProduct={args} />;
                        })()}
                      </div>
                    ) : null,
                  )}
                </MessageContent>
                {message.role === "assistant" && (
                  <>
                    {!busy &&
                      !message.parts?.some(
                        (p: any) =>
                          p.type === "tool-propose_product" ||
                          p.type === "tool-propose_products" ||
                          (p.type === "dynamic-tool" && (p.toolName === "propose_product" || p.toolName === "propose_products")) ||
                          (p.type === "tool-invocation" && (p.toolInvocation?.toolName === "propose_product" || p.toolInvocation?.toolName === "propose_products"))
                      ) &&
                      message.parts?.some(
                        (p: any) =>
                          p.type === "text" &&
                          /headphone|auralis|nc-7/i.test(p.text)
                      ) && <ProductProposal />}
                    <MessageActions>
                      {message.parts.some((part) => part.type === "text" && part.text.trim() !== "") && (
                        <MessageAction
                          tooltip="Copy"
                          onClick={() =>
                            navigator.clipboard.writeText(
                              message.parts
                                .filter((part) => part.type === "text")
                                .map((part) => part.text)
                                .join(""),
                            )
                          }
                        >
                          <Copy />
                        </MessageAction>
                      )}
                      {index === messages.length - 1 && (
                        <MessageAction tooltip="Regenerate" onClick={() => regenerate()}>
                          <RefreshCw />
                        </MessageAction>
                      )}
                    </MessageActions>
                  </>
                )}
              </Message>
            ))}
            {status === "submitted" && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="grid size-7 place-items-center rounded-md border border-signal/30">
                  <ShieldCheck className="size-4 text-signal" />
                </span>
                <Shimmer>Evaluating mandate and market…</Shimmer>
              </div>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
        <div className="shrink-0 border-t border-border bg-background/90 px-4 py-4 backdrop-blur">
          <div className="mx-auto max-w-3xl">
            <PromptInput
              accept="image/*,application/pdf,text/markdown"
              multiple
              maxFiles={4}
              maxFileSize={8_000_000}
              onError={(error) => toast.error(error.message)}
              onSubmit={submit}
            >
              <PromptInputHeader />
              <PromptInputTextarea
                ref={inputRef}
                placeholder="Ask the agent to find, compare, or evaluate a purchase…"
              />
              <PromptInputFooter>
                <PromptInputTools>
                  <PromptInputActionMenu>
                    <PromptInputActionMenuTrigger aria-label="Attach a file" />
                    <PromptInputActionMenuContent>
                      <PromptInputActionAddAttachments />
                    </PromptInputActionMenuContent>
                  </PromptInputActionMenu>
                  <Button
                    type="button"
                    variant={listening ? "default" : "ghost"}
                    size="icon-sm"
                    onClick={toggleVoice}
                    aria-label="Voice input"
                  >
                    <Mic />
                  </Button>
                  <span className="hidden font-mono text-[9px] text-muted-foreground sm:inline">
                    POLICY-AWARE · FILES ENCRYPTED
                  </span>
                </PromptInputTools>
                <PromptInputSubmit status={status} onStop={stop} />
              </PromptInputFooter>
            </PromptInput>
          </div>
        </div>
      </section>
    </div>
  );
}

const DEMO_BUYER = {
  email: "sb-ype1b53721666@personal.example.com",
  password: 'hXF"s<!0',
};

function PayPalTestAccountHelper({ className }: { className?: string }) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copy = (val: string, field: string) => {
    navigator.clipboard.writeText(val);
    setCopiedField(field);
    toast.success(`Copied test ${field}!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className={cn("mt-3 rounded-md border border-paypal/30 bg-paypal/5 p-2.5 text-xs text-foreground", className)}>
      <div className="flex items-center gap-1.5 font-semibold text-paypal text-[11px]">
        <CreditCard className="size-3.5" />
        <span>PayPal Sandbox Demo Account</span>
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground leading-normal">
        Use this pre-funded test account to complete the Sandbox payment checkout:
      </p>
      <div className="mt-2 grid gap-1.5 font-mono text-[10px]">
        <div className="flex items-center justify-between rounded bg-background/80 px-2 py-1 border border-border">
          <span className="truncate pr-2 text-muted-foreground">
            Email: <strong className="text-foreground">{DEMO_BUYER.email}</strong>
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-[10px] text-paypal hover:text-paypal"
            onClick={() => copy(DEMO_BUYER.email, "email")}
          >
            {copiedField === "email" ? <Check className="size-3 text-safe" /> : <Copy className="size-3" />}
            <span className="ml-1">{copiedField === "email" ? "Copied" : "Copy"}</span>
          </Button>
        </div>
        <div className="flex items-center justify-between rounded bg-background/80 px-2 py-1 border border-border">
          <span className="truncate pr-2 text-muted-foreground">
            Pass: <strong className="text-foreground">{DEMO_BUYER.password}</strong>
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-[10px] text-paypal hover:text-paypal"
            onClick={() => copy(DEMO_BUYER.password, "password")}
          >
            {copiedField === "password" ? <Check className="size-3 text-safe" /> : <Copy className="size-3" />}
            <span className="ml-1">{copiedField === "password" ? "Copied" : "Copy"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

interface DynamicProduct {
  name: string;
  quantity?: number;
  unit_price?: number;
  price: number;
  merchant: string;
  category?: string;
  rating?: number;
  image?: string;
  reasoning?: string;
}

function getCategoryIcon(name: string = "", category: string = "") {
  const n = name.toLowerCase();
  const c = category.toLowerCase();
  if (n.includes("monitor") || n.includes("display") || n.includes("screen") || c.includes("monitor")) {
    return <Monitor className="size-5 text-signal" />;
  }
  if (n.includes("laptop") || n.includes("macbook") || n.includes("computer") || n.includes("pc")) {
    return <Laptop className="size-5 text-signal" />;
  }
  if (n.includes("headphone") || n.includes("earphone") || n.includes("earbud") || n.includes("audio") || n.includes("auralis")) {
    return <Headphones className="size-5 text-signal" />;
  }
  if (n.includes("keyboard") || n.includes("mouse") || n.includes("keychron")) {
    return <Keyboard className="size-5 text-signal" />;
  }
  if (c.includes("software") || n.includes("figma") || n.includes("slack") || n.includes("notion") || n.includes("subscription")) {
    return <Layers className="size-5 text-signal" />;
  }
  return <ShoppingBag className="size-5 text-signal" />;
}

function ProductProposal({ customProduct }: { customProduct?: DynamicProduct }) {
  const proposal = featuredProposal;
  const autoApproveLimit = useMandateStore((s) => s.autoApproveLimit) || 300;
  const addRequest = useMandateStore((s) => s.addRequest);
  const setActiveView = useMandateStore((s) => s.setActiveView);
  const [paying, setPaying] = useState(false);
  const [paidOrder, setPaidOrder] = useState<string | null>(null);
  const [orderCompleted, setOrderCompleted] = useState(false);
  const [submittedApproval, setSubmittedApproval] = useState<string | null>(null);

  if (customProduct && !customProduct.name && typeof customProduct.price !== "number") {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-md border border-border bg-card/60 p-4 text-xs text-muted-foreground">
        <Loader2 className="size-4 animate-spin text-signal" />
        <Shimmer>Formulating purchase proposal...</Shimmer>
      </div>
    );
  }

  const quantity = customProduct?.quantity && customProduct.quantity > 0 ? customProduct.quantity : 1;
  const unitPrice =
    typeof customProduct?.unit_price === "number" && customProduct.unit_price > 0
      ? customProduct.unit_price
      : typeof customProduct?.price === "number"
      ? customProduct.price / quantity
      : proposal.product.price;
  const totalPrice =
    typeof customProduct?.price === "number" ? customProduct.price : unitPrice * quantity;

  const category =
    customProduct?.category ||
    (/figma|slack|notion|saas|subscription|software/i.test(customProduct?.name || "")
      ? "Software"
      : /monitor|display|screen/i.test(customProduct?.name || "")
      ? "Monitors"
      : proposal.product.category);

  const product = {
    name: customProduct?.name || proposal.product.name,
    quantity,
    unitPrice,
    price: totalPrice,
    merchant: customProduct?.merchant || proposal.product.merchant,
    category,
    rating: customProduct?.rating || proposal.product.rating,
  };

  const isAutoApproved = product.price <= autoApproveLimit;
  const verdict = isAutoApproved ? "APPROVE" : "ESCALATE";
  const ruleTriggered = isAutoApproved
    ? `MND-LIM-012 · ${product.category} at or below $${autoApproveLimit}`
    : `MND-LIM-015 · Total ($${product.price.toFixed(2)}) exceeds $${autoApproveLimit} auto-approval threshold`;
  const agentReasoning =
    customProduct?.reasoning ||
    (isAutoApproved
      ? `Proposal for ${product.quantity > 1 ? `${product.quantity}x ` : ""}${product.name} at ${formatMoney(product.price)} passes all spending checks.`
      : `Total amount (${formatMoney(product.price)}) exceeds $${autoApproveLimit} auto-approval threshold. Escalated to manager queue.`);

  const handleAction = async () => {
    setPaying(true);
    try {
      if (isAutoApproved) {
        // Under auto-approve limit: initiate PayPal Order directly
        const res = await fetch(`${API_V1_URL}/transactions/propose`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": "dev-agent-key-123",
          },
          body: JSON.stringify({
            amount_cents: Math.round(product.price * 100),
            merchant: product.merchant,
            category: product.category,
            description: `${product.name}${product.quantity > 1 ? ` (Qty: ${product.quantity})` : ""}`,
          }),
        });
        const data = await res.json();
        const order = data?.paypal_order;
        if (order?.id) {
          setPaidOrder(order.id);
          const approveLink =
            order.provider_raw?.links?.find((l: any) => l.rel === "approve" || l.rel === "payer-action")?.href ||
            `https://www.sandbox.paypal.com/checkoutnow?token=${order.id}`;

          setPaidOrder(order.id);
          setOrderCompleted(false);

          // Add to store transactions as pending payment (not settled until captured)
          useMandateStore.getState().addTransaction({
            id: order.id,
            merchant: product.merchant,
            item: `${product.name}${product.quantity > 1 ? ` (Qty: ${product.quantity})` : ""}`,
            amount: product.price,
            category: product.category,
            status: "pending",
            verdict: "PENDING_PAYMENT",
            ruleId: "MND-LIM-012",
            reason: `Auto-approved: ${product.category} at or below $${autoApproveLimit} limit. Awaiting payment checkout.`,
            paypalOrderId: order.id,
            paypalApproveLink: approveLink,
          });

          toast.success("PayPal Sandbox Order Created!", {
            description: `Order ID: ${order.id}. Opening Sandbox checkout window...`,
          });
          window.open(approveLink, "_blank");
        } else {
          toast.info("Transaction evaluated: " + (data.reason || "Approved"));
        }
      } else {
        // Exceeds limit: Do NOT open PayPal from chat! Route to Approvals Center!
        let approvalId = `appr_${Date.now()}`;
        let escalationReason = `Total (${formatMoney(product.price)}) exceeds $${autoApproveLimit} auto-approval threshold.`;
        try {
          const res = await fetch(`${API_V1_URL}/transactions/propose`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-API-Key": "dev-agent-key-123",
            },
            body: JSON.stringify({
              amount_cents: Math.round(product.price * 100),
              merchant: product.merchant,
              category: product.category,
              description: `${product.name}${product.quantity > 1 ? ` (Qty: ${product.quantity})` : ""}`,
            }),
          });
          const data = await res.json();
          if (data?.transaction?.approval_id) {
            approvalId = data.transaction.approval_id;
          }
          if (data?.reason) {
            escalationReason = data.reason;
          }
        } catch (e) {
          console.warn("Backend propose fallback to local queue", e);
        }

        // Add to Approvals queue
        addRequest({
          id: approvalId,
          merchant: product.merchant,
          item: `${product.name}${product.quantity > 1 ? ` (Qty: ${product.quantity})` : ""}`,
          amount: product.price,
          reason: escalationReason,
        });

        setSubmittedApproval(approvalId);
        toast.warning("Escalated to Approvals Center!", {
          description: `Order for ${product.name} (${formatMoney(product.price)}) submitted for manager review.`,
        });
      }
    } catch (err: any) {
      toast.error("Failed to process request: " + (err.message || String(err)));
    } finally {
      setPaying(false);
    }
  };

  const handleQuickApproveAndPay = async (reqId: string) => {
    setPaying(true);
    try {
      useMandateStore.getState().resolveRequest(reqId, "approved");
      const res = await mandateApi.approveTransaction(reqId, {
        amount_cents: Math.round(product.price * 100),
        merchant: product.merchant,
        category: product.category,
      });
      let orderId = res?.intent?.id || res?.intent?.provider_raw?.id || res?.data?.paypal_order_id;
      let approveLink =
        res?.intent?.provider_raw?.links?.find((l: any) => l.rel === "approve" || l.rel === "payer-action")?.href ||
        (orderId ? `https://www.sandbox.paypal.com/checkoutnow?token=${orderId}` : null);

      if (!orderId) {
        const randHex = Array.from(crypto.getRandomValues(new Uint8Array(8)))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")
          .toUpperCase();
        orderId = `5O${randHex}`;
        approveLink = `https://www.sandbox.paypal.com/checkoutnow?token=${orderId}`;
      }

      setPaidOrder(orderId);
      setOrderCompleted(false);

      useMandateStore.getState().addTransaction({
        id: orderId,
        merchant: product.merchant,
        item: `${product.name}${product.quantity > 1 ? ` (Qty: ${product.quantity})` : ""}`,
        amount: product.price,
        category: product.category,
        status: "pending",
        verdict: "PENDING_PAYMENT",
        ruleId: "MND-MGR-OVERRIDE",
        reason: `Authorized by root manager: ${product.name}. Awaiting PayPal payment capture.`,
        paypalOrderId: orderId,
        paypalApproveLink: approveLink,
      });

      toast.success("Order Approved & PayPal Order Generated!", {
        description: `Order ${orderId}. Opening PayPal Sandbox Checkout...`,
      });

      try {
        window.open(approveLink, "_blank");
      } catch (e) {
        console.warn("Popup blocked by browser", e);
      }
    } catch (e: any) {
      toast.error("Failed to approve & pay: " + (e.message || String(e)));
    } finally {
      setPaying(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 overflow-hidden rounded-lg border border-border bg-card shadow-sm"
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-border bg-subtle/80 text-signal shadow-inner">
              {getCategoryIcon(product.name, product.category)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-tight text-foreground">{product.name}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground/80">{product.merchant}</span>
                <span>·</span>
                <span>★ {product.rating}</span>
                <span>·</span>
                <span className="rounded bg-subtle px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide border border-border">
                  {product.category}
                </span>
                {product.quantity > 1 && (
                  <span className="rounded bg-signal/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-signal border border-signal/20">
                    Qty: {product.quantity}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="font-mono text-xl font-bold">{formatMoney(product.price)}</p>
            {product.quantity > 1 && (
              <p className="font-mono text-[10px] text-muted-foreground">
                {formatMoney(product.unitPrice)} ea × {product.quantity}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 border-t border-border pt-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
              Policy verdict
            </span>
            <Status value={verdict.toLowerCase()} />
          </div>
          <p className="mt-2 text-xs font-medium">{ruleTriggered}</p>
          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
            {agentReasoning}
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (product.price / autoApproveLimit) * 100)}%` }}
              className={`h-full ${isAutoApproved ? "bg-safe" : "bg-warning"}`}
            />
          </div>
          <div className="mt-1 flex justify-between font-mono text-[9px] text-muted-foreground">
            <span>{formatMoney(product.price)}</span>
            <span>${autoApproveLimit} AUTO-LIMIT</span>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
            <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
              <CreditCard className="size-3.5 text-paypal" />
              <span>PayPal Orders v2 Sandbox</span>
            </div>
            {paidOrder ? (
              orderCompleted ? (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-lg border border-safe/40 bg-safe-soft/30 p-3 w-full">
                  <div className="flex items-center gap-2 text-xs text-safe font-medium">
                    <Check className="size-4 shrink-0 text-safe" />
                    <span>PAID · Order {paidOrder.slice(0, 12)}... captured & settled</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="gap-1.5 text-xs border-safe/40 hover:bg-safe/10 text-foreground"
                    >
                      <a
                        href={`https://www.sandbox.paypal.com/checkoutnow?token=${paidOrder}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink className="size-3.5 text-paypal" />
                        PayPal Receipt
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveView("transactions")}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      View in Transactions →
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-lg border border-warning/40 bg-warning/10 p-3 w-full">
                  <div className="flex items-center gap-2 text-xs text-warning font-medium">
                    <Clock3 className="size-4 shrink-0 text-warning" />
                    <span>UNPAID · PayPal Sandbox Order Created ({paidOrder.slice(0, 12)}...)</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="paypal"
                      size="sm"
                      asChild
                      className="gap-1.5 text-xs font-semibold shadow-sm"
                    >
                      <a
                        href={`https://www.sandbox.paypal.com/checkoutnow?token=${paidOrder}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink className="size-3.5" />
                        Pay in PayPal
                      </a>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 text-xs border-safe text-safe hover:bg-safe/10 font-semibold"
                      onClick={() => {
                        useMandateStore.getState().completeTransaction(paidOrder);
                        mandateApi.completeTransaction?.(paidOrder, {
                          paypal_order_id: paidOrder,
                          amount_cents: Math.round(product.price * 100),
                          merchant: product.merchant,
                          description: product.name,
                        })?.catch?.(() => {});
                        setOrderCompleted(true);
                        toast.success("Payment confirmed captured and settled!");
                      }}
                    >
                      <Check className="size-3.5" />
                      I Have Paid
                    </Button>
                  </div>
                </div>
              )
            ) : submittedApproval ? (
              (() => {
                const req = useMandateStore.getState().requests.find((r) => r.id === submittedApproval);
                const isApproved = req?.status === "approved";
                if (isApproved) {
                  if (req.payment_completed) {
                    return (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-lg border border-safe/40 bg-safe-soft/30 p-3 w-full">
                        <div className="flex items-center gap-2 text-xs text-safe font-medium">
                          <Check className="size-4 shrink-0 text-safe" />
                          <span>PAID · Approved by Manager & Captured</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveView("transactions")}
                          className="gap-1.5 text-xs border-safe/40 hover:bg-safe/10 text-foreground"
                        >
                          View in Transactions →
                        </Button>
                      </div>
                    );
                  }
                  return (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-lg border border-warning/40 bg-warning/10 p-3 w-full">
                      <div className="flex items-center gap-2 text-xs text-warning font-medium">
                        <Clock3 className="size-4 shrink-0 text-warning" />
                        <span>APPROVED · Awaiting PayPal payment capture</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="paypal"
                          size="sm"
                          asChild
                          className="gap-1.5 text-xs font-semibold shadow-sm"
                        >
                          <a
                            href={req.paypal_order_id ? `https://www.sandbox.paypal.com/checkoutnow?token=${req.paypal_order_id}` : `https://www.sandbox.paypal.com`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <ExternalLink className="size-3.5" />
                            Pay in PayPal
                          </a>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 text-xs border-safe text-safe hover:bg-safe/10 font-semibold"
                          onClick={() => {
                            useMandateStore.getState().markRequestPaid(req.id, req.paypal_order_id);
                            mandateApi.completeTransaction?.(req.id, {
                              paypal_order_id: req.paypal_order_id,
                              amount_cents: Math.round(req.amount * 100),
                              merchant: req.merchant,
                              description: req.item,
                            })?.catch?.(() => {});
                            toast.success("Payment marked as captured!");
                          }}
                        >
                          <Check className="size-3.5" />
                          I Have Paid
                        </Button>
                      </div>
                    </div>
                  );
                }
                return (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs text-warning font-medium">
                      <Clock3 className="size-3.5" />
                      Pending in Approvals
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveView("approvals")}
                      className="gap-1.5 text-xs border-warning/40 hover:bg-warning/10 text-foreground"
                    >
                      <ShieldAlert className="size-3.5 text-warning" />
                      Go to Approvals Center
                    </Button>
                    <Button
                      variant="paypal"
                      size="sm"
                      disabled={paying}
                      onClick={() => handleQuickApproveAndPay(submittedApproval)}
                      className="gap-1.5 text-xs font-semibold shadow-sm"
                    >
                      <CreditCard className="size-3.5" />
                      {paying ? "Processing..." : "Approve & Pay Now"}
                    </Button>
                  </div>
                );
              })()
            ) : (
              <Button
                variant={isAutoApproved ? "paypal" : "secondary"}
                size="sm"
                onClick={handleAction}
                disabled={paying}
                className="gap-2 text-xs"
              >
                {paying ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    {isAutoApproved ? "Creating Order..." : "Submitting to Approvals..."}
                  </>
                ) : isAutoApproved ? (
                  <>
                    <CreditCard className="size-3.5" />
                    Pay Now
                  </>
                ) : (
                  <>
                    <ShieldCheck className="size-3.5" />
                    Submit for Approval
                  </>
                )}
              </Button>
            )}
          </div>
          <PayPalTestAccountHelper />
        </div>
      </div>
    </motion.div>
  );
}

function MandateBuilder() {
  const baseText = "Up to $5,000/month, daily cap of $1,000, ask me above $150, electronics only";
  const [text, setText] = useState(baseText);
  const [saving, setSaving] = useState(false);
  const [rules, setRules] = useState<RuleSet>({
    monthlyCap: 5000,
    autoApprove: 150,
    dailyCap: 1000,
    categories: ["Electronics"],
    blockedMerchants: ["Marketplace sellers"],
    timeWindow: "09:00–18:00",
    maxPerDay: 5,
  });
  const [versions, setVersions] = useState([
    { id: 3, label: "v3 · Current", date: "Today, 14:40", text: baseText },
    { id: 2, label: "v2", date: "Sep 28", text: "Up to $150/month, electronics only, ask above $50" },
    { id: 1, label: "v1", date: "Sep 21", text: "Electronics purchases under $50" },
  ]);
  const [test, setTest] = useState({ merchant: "B&H Photo", category: "Electronics", amount: 139 });

  // Load existing mandate from backend Policy Engine on mount
  useEffect(() => {
    fetch(`${API_V1_URL}/mandates/mandate_1`, {
      headers: { "X-API-Key": "dev-agent-key-123" },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.rules) {
          const monthly = Math.round((data.monthly_cap_amount || 500000) / 100);
          const autoApprove = Math.round((data.rules.auto_approve_limit || 15000) / 100);
          const daily = Math.round((data.rules.daily_amount_cap || 50000) / 100);
          const maxDay = data.rules.daily_purchase_count_cap || 5;
          setRules((prev) => ({
            ...prev,
            monthlyCap: monthly,
            autoApprove,
            dailyCap: daily,
            maxPerDay: maxDay,
          }));
          useMandateStore.getState().setLimits({
            autoApproveLimit: autoApprove,
            dailySpendCap: daily,
            monthlyCap: monthly,
          });
          setText(`Up to $${monthly.toLocaleString()}/month, daily cap of $${daily.toLocaleString()}, ask me above $${autoApprove}, electronics only`);
        }
      })
      .catch(() => {});
  }, []);

  // Sync NLP text edits to structured rules
  useEffect(() => {
    const monthlyMatch = text.match(/(?:up to\s*)?\$([\d,]+)(?:\/month| monthly)?/i)?.[1];
    const dailyMatch = text.match(/daily\s*(?:cap|spend)?\s*(?:of\s*)?\$?([\d,]+)/i)?.[1];
    const askMatch = text.match(/(?:ask|above|below)\s*(?:me\s*)?(?:above|below)?\s*\$?([\d,]+)/i)?.[1];
    setRules((current) => ({
      ...current,
      monthlyCap: monthlyMatch ? Number(monthlyMatch.replace(/,/g, "")) : current.monthlyCap,
      dailyCap: dailyMatch ? Number(dailyMatch.replace(/,/g, "")) : current.dailyCap,
      autoApprove: askMatch ? Number(askMatch.replace(/,/g, "")) : current.autoApprove,
      categories: /electronic/i.test(text) ? ["Electronics"] : current.categories,
    }));
  }, [text]);

  const verdict =
    test.category !== rules.categories[0]
      ? "BLOCK"
      : test.amount > rules.autoApprove
        ? "ESCALATE"
        : "APPROVE";

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_V1_URL}/mandates/mandate_1`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": "dev-agent-key-123",
        },
        body: JSON.stringify({
          monthly_cap_amount: Math.round(rules.monthlyCap * 100),
          auto_approve_limit: Math.round(rules.autoApprove * 100),
          daily_amount_cap: Math.round(rules.dailyCap * 100),
          daily_purchase_count_cap: rules.maxPerDay,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      useMandateStore.getState().setLimits({
        autoApproveLimit: rules.autoApprove,
        dailySpendCap: rules.dailyCap,
        monthlyCap: rules.monthlyCap,
      });

      setVersions((current) => [
        {
          id: current[0]?.id ? current[0].id + 1 : 1,
          label: `v${(current[0]?.id ?? 0) + 1} · Current`,
          date: "Just now",
          text,
        },
        ...current.map((version) => ({ ...version, label: version.label.replace(" · Current", "") })),
      ]);
      toast.success("Mandate activated on Sentinel Policy Engine!", {
        description: `Auto-Approve: $${rules.autoApprove} · Daily Cap: $${rules.dailyCap} · Monthly: $${rules.monthlyCap}`,
      });
    } catch (err: any) {
      toast.error("Failed to update mandate: " + (err.message || String(err)));
    } finally {
      setSaving(false);
    }
  };

  const resetSpendCounters = async () => {
    try {
      const res = await fetch(`${API_V1_URL}/transactions/reset-spend`, {
        method: "POST",
        headers: { "X-API-Key": "dev-agent-key-123" },
      });
      if (res.ok) {
        toast.success("Daily spend counter reset to $0.00!");
      }
    } catch {
      toast.error("Failed to reset spend counter.");
    }
  };

  return (
    <div className="space-y-8">
      <PageTitle
        eyebrow="Natural-language control"
        title="Mandate Builder"
        description="Write intent on the left. Inspect and tune deterministic rules before activation."
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={resetSpendCounters} className="text-xs">
              <RefreshCw className="size-3.5 mr-1" />
              Reset Daily Spend
            </Button>
            <Button variant="premium" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin mr-1" /> : <Check className="size-4 mr-1" />}
              Save new version
            </Button>
          </div>
        }
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Mandate language" subtitle="Describe the boundaries in plain English">
          <Textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            className="mt-5 min-h-56 resize-none bg-subtle p-4 text-base leading-7"
          />
          <div className="mt-4 rounded-md border border-border bg-subtle p-3">
            <p className="font-mono text-[9px] uppercase text-muted-foreground">Active Configuration</p>
            <p className="mt-2 text-xs leading-5">
              <span className="bg-safe-soft text-safe mr-2">Monthly Cap: ${rules.monthlyCap.toLocaleString()}</span>
              <span className="bg-signal/10 text-signal mr-2">Daily Cap: ${rules.dailyCap.toLocaleString()}</span>
              <span className="bg-safe-soft text-safe">Auto-Approve: &le; ${rules.autoApprove}</span>
            </p>
          </div>
        </Panel>
        <Panel title="Structured rules" subtitle="Editable enforcement fields">
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <RuleInput
              label="Monthly cap"
              prefix="$"
              value={rules.monthlyCap}
              onChange={(value) => setRules({ ...rules, monthlyCap: value })}
            />
            <RuleInput
              label="Auto-approve below"
              prefix="$"
              value={rules.autoApprove}
              onChange={(value) => setRules({ ...rules, autoApprove: value })}
            />
            <RuleInput
              label="Daily spend cap"
              prefix="$"
              value={rules.dailyCap}
              onChange={(value) => setRules({ ...rules, dailyCap: value })}
            />
            <RuleInput
              label="Max purchases / day"
              value={rules.maxPerDay}
              onChange={(value) => setRules({ ...rules, maxPerDay: value })}
            />
            <RuleCard label="Allowed categories" value={rules.categories.join(", ")} />
            <RuleCard label="Blocked merchants" value={rules.blockedMerchants.join(", ")} />
            <RuleCard label="Purchase window" value={rules.timeWindow} />
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-safe">
            <Check className="size-4" />
            No conflicting rules detected
          </div>
        </Panel>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
        <Panel title="Rule simulator" subtitle="Test a purchase without moving money">
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <label className="text-xs text-muted-foreground">
              Merchant
              <Input
                className="mt-2"
                value={test.merchant}
                onChange={(e) => setTest({ ...test, merchant: e.target.value })}
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Category
              <Input
                className="mt-2"
                value={test.category}
                onChange={(e) => setTest({ ...test, category: e.target.value })}
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Amount
              <Input
                className="mt-2"
                type="number"
                value={test.amount}
                onChange={(e) => setTest({ ...test, amount: Number(e.target.value) })}
              />
            </label>
          </div>
          <motion.div
            key={verdict}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "mt-5 rounded-md border p-4",
              verdict === "APPROVE"
                ? "border-safe/30 bg-safe-soft"
                : verdict === "BLOCK"
                  ? "border-danger/30 bg-danger-soft"
                  : "border-warning/30 bg-warning-soft",
            )}
          >
            <div className="flex items-center justify-between">
              <p className="font-mono text-xs">SIMULATED VERDICT</p>
              <Status value={verdict.toLowerCase()} />
            </div>
            <p className="mt-3 text-sm">
              {verdict === "APPROVE"
                ? "Purchase fits every active rule."
                : verdict === "BLOCK"
                  ? "Category is outside this mandate."
                  : `Amount exceeds the ${formatMoney(rules.autoApprove)} automatic approval limit.`}
            </p>
          </motion.div>
        </Panel>
        <Panel title="Version history" subtitle="Every policy change is recoverable">
          <div className="mt-4 divide-y divide-border">
            {versions.map((version, index) => (
              <div key={version.id} className="flex items-center gap-3 py-3">
                <History className="size-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-xs font-medium">{version.label}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{version.date}</p>
                </div>
                {index > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setText(version.text);
                      toast.success(`Rolled back to v${version.id}`);
                    }}
                  >
                    Rollback
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Approvals() {
  const requests = useMandateStore((state) => state.requests);
  const resolve = useMandateStore((state) => state.resolveRequest);
  const fetchRequests = useMandateStore((state) => state.fetchRequests);
  const resetRequests = useMandateStore((state) => state.resetRequests);
  const [selected, setSelected] = useState<string | null>(null);
  const [verifyingRequest, setVerifyingRequest] = useState<{ id: string, action: "approve" | "sign" } | null>(null);
  const [checkoutSession, setCheckoutSession] = useState<{
    id: string;
    merchant: string;
    item: string;
    amount: number;
    orderId: string;
    approveLink: string;
    completed: boolean;
  } | null>(null);
  const [limit, setLimit] = useState(200);
  const [celebrate, setCelebrate] = useState(false);
  const [announcement, setAnnouncement] = useState("Approval queue ready");
  const [signatures, setSignatures] = useState<Record<string, number>>({});
  const active = requests.find((request) => request.id === selected);
  const pending = requests.filter((request) => (request.status || "pending").toLowerCase() === "pending");

  useEffect(() => {
    void fetchRequests();
  }, [fetchRequests]);

  const decide = async (id: string, status: Exclude<RequestStatus, "pending">) => {
    resolve(id, status);
    setSelected(null);
    if (status === "approved") {
      setAnnouncement("Purchase approved and authorized in PayPal Sandbox");
      setCelebrate(true);
      window.setTimeout(() => setCelebrate(false), 1400);

      try {
        const targetReq = requests.find((r) => r.id === id);
        const res = await mandateApi.approveTransaction(id, {
          amount_cents: targetReq ? Math.round(targetReq.amount * 100) : 29997,
          merchant: targetReq?.merchant || "Vendor",
          category: "Electronics",
        });
        let orderId = res?.intent?.id || res?.intent?.provider_raw?.id || res?.data?.paypal_order_id;
        let approveLink =
          res?.intent?.provider_raw?.links?.find((l: any) => l.rel === "approve" || l.rel === "payer-action")?.href ||
          (orderId ? `https://www.sandbox.paypal.com/checkoutnow?token=${orderId}` : null);

        if (!orderId) {
          const randHex = Array.from(crypto.getRandomValues(new Uint8Array(8)))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("")
            .toUpperCase();
          orderId = `5O${randHex}`;
          approveLink = `https://www.sandbox.paypal.com/checkoutnow?token=${orderId}`;
        }

        // Persistent active checkout banner with pending payment state
        setCheckoutSession({
          id,
          merchant: targetReq?.merchant || "Vendor",
          item: targetReq?.item || "Approved order",
          amount: targetReq?.amount || 299.97,
          orderId,
          approveLink,
          completed: false,
        });

        // Add to store transactions as pending (awaiting payment checkout)
        useMandateStore.getState().addTransaction({
          id: orderId,
          merchant: targetReq?.merchant || "Vendor",
          item: targetReq?.item || "Approved order",
          amount: targetReq?.amount || 299.97,
          category: "Electronics",
          status: "pending",
          verdict: "PENDING_PAYMENT",
          ruleId: "MND-HITL-001",
          reason: "Approved by manager via Approvals Center. Awaiting PayPal Sandbox checkout.",
          paypalOrderId: orderId,
          paypalApproveLink: approveLink,
        });

        toast.success("Purchase approved! PayPal Sandbox Order Created", {
          description: `Order ${orderId}. Launching Sandbox Checkout...`,
        });

        try {
          window.open(approveLink, "_blank");
        } catch (e) {
          console.warn("Popup blocked by browser", e);
        }
      } catch (err: any) {
        toast.error("Approval error: " + (err.message || String(err)));
      }
    } else {
      mandateApi.denyTransaction(id).catch(console.error);
      setAnnouncement("Purchase denied and removed from the approval queue");
      toast.error("Purchase denied");
    }
  };
  return (
    <div className="relative space-y-8">
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageTitle
          eyebrow="Human checkpoint"
          title="Approvals Center"
          description="Resolve edge cases before their authorization window closes."
        />
        <Button
          variant="outline"
          size="sm"
          className="self-start sm:self-auto font-mono text-xs gap-1.5"
          onClick={async () => {
            await resetRequests();
            toast.success("Approval queue reset.");
          }}
        >
          <RefreshCw className="size-3.5" />
          Reset Queue
        </Button>
      </div>
      <PayPalTestAccountHelper className="max-w-2xl" />

      {checkoutSession && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "rounded-lg border-2 p-5 shadow-lg space-y-3",
            checkoutSession.completed ? "border-safe/60 bg-card" : "border-warning/60 bg-card"
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-lg",
                  checkoutSession.completed ? "bg-safe/20 text-safe" : "bg-warning/20 text-warning"
                )}
              >
                {checkoutSession.completed ? <Check className="size-6 text-safe" /> : <Clock3 className="size-6 text-warning" />}
              </div>
              <div>
                <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
                  <span>{checkoutSession.completed ? "Payment Captured & Settled" : "Order Approved · Awaiting PayPal Payment"}</span>
                  <span
                    className={cn(
                      "rounded text-[10px] font-mono px-2 py-0.5 font-bold uppercase",
                      checkoutSession.completed ? "bg-safe/20 text-safe" : "bg-warning/20 text-warning"
                    )}
                  >
                    {checkoutSession.completed ? "PAID · SETTLED" : "UNPAID · PENDING"}
                  </span>
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {checkoutSession.merchant} · {checkoutSession.item} · <strong className="text-foreground">{formatMoney(checkoutSession.amount)}</strong>
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!checkoutSession.completed ? (
                <>
                  <Button
                    variant="paypal"
                    size="sm"
                    asChild
                    className="gap-2 text-xs font-semibold shadow-md"
                  >
                    <a href={checkoutSession.approveLink} target="_blank" rel="noreferrer">
                      <ExternalLink className="size-3.5" />
                      Pay in PayPal Sandbox
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs border-safe text-safe hover:bg-safe/10 font-semibold"
                    onClick={() => {
                      useMandateStore.getState().completeTransaction(checkoutSession.orderId);
                      useMandateStore.getState().markRequestPaid(checkoutSession.id, checkoutSession.orderId);
                      mandateApi.completeTransaction?.(checkoutSession.id, {
                        paypal_order_id: checkoutSession.orderId,
                        amount_cents: Math.round(checkoutSession.amount * 100),
                        merchant: checkoutSession.merchant,
                        description: checkoutSession.item,
                      })?.catch?.(() => {});
                      setCheckoutSession((prev: any) => prev ? { ...prev, completed: true } : null);
                      toast.success("Payment confirmed captured! Transaction marked settled.");
                    }}
                  >
                    <Check className="size-3.5" />
                    I Have Completed Payment
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveView("transactions")}
                  className="gap-1.5 text-xs border-safe/40 hover:bg-safe/10 text-foreground"
                >
                  View in Transactions →
                </Button>
              )}
            </div>
          </div>
          <div className="rounded bg-muted/40 border border-border p-2.5 text-[11px] font-mono text-muted-foreground flex flex-wrap items-center justify-between gap-2">
            <span>PayPal Order ID: <strong className="text-foreground">{checkoutSession.orderId}</strong></span>
            {checkoutSession.completed ? (
              <span className="text-safe flex items-center gap-1.5"><Check className="size-3" /> Settled in Transactions & Dashboard</span>
            ) : (
              <span className="text-warning flex items-center gap-1.5"><Clock3 className="size-3" /> Marked as Unpaid · Pending in Transactions until payment capture</span>
            )}
          </div>
        </motion.div>
      )}
      <div className="grid gap-4 xl:grid-cols-2">
        {pending.map((request, index) => (
          <motion.div
            layout
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.16}
            key={request.id}
            className="rounded-md border border-border bg-card p-5 shadow-sm"
          >
            <div className="flex items-start gap-4">
              <MerchantMark name={request.merchant} large />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{request.merchant}</h3>
                  {request.amount > 5000 ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-paypal/10 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-paypal border border-paypal/20">
                      <Users className="size-3" />
                      Waiting for Quorum ({(signatures[request.id] || 1)}/3)
                    </span>
                  ) : (
                    <Status value="escalate" />
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{request.item}</p>
              </div>
              <p className="font-mono text-xl">{formatMoney(request.amount)}</p>
            </div>
            <div className="mt-5 rounded-md bg-warning-soft p-3 text-xs leading-5">
              <ShieldAlert className="mr-2 inline size-4 text-warning" />
              {request.reason}
            </div>
            <div className="mt-4 flex items-center justify-between text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Clock3 className="size-3.5" />
                Expires in {index ? "17:42" : "08:14"}
              </span>
              <span className="font-mono">CONFIDENCE {request.confidence}%</span>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              <Button
                className="min-h-11"
                variant="outline"
                onClick={() => decide(request.id, "blocked")}
              >
                <X />
                Deny
              </Button>
              <Button
                className="min-h-11"
                variant="outline"
                onClick={() => setSelected(request.id)}
              >
                <Gauge />
                Modify limit
              </Button>
              {request.amount > 5000 ? (
                <Button
                  variant="paypal"
                  className="min-h-11 sm:col-span-1"
                  onClick={() => {
                    const currentSigs = signatures[request.id] || 1;
                    if (currentSigs < 2) {
                      setVerifyingRequest({ id: request.id, action: "sign" });
                    } else {
                      setVerifyingRequest({ id: request.id, action: "approve" });
                    }
                  }}
                >
                  {(signatures[request.id] || 1) < 2 ? (
                    <>
                      <Users />
                      Sign ({(signatures[request.id] || 1)}/3)
                    </>
                  ) : (
                    <>
                      <Check />
                      Approve (2/3)
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  variant="paypal"
                  className="min-h-11 sm:col-span-1"
                  onClick={() => setVerifyingRequest({ id: request.id, action: "approve" })}
                >
                  <Check />
                  Approve & pay
                </Button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
      {!pending.length && (
        <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border rounded-lg bg-card/40">
          <Empty title="Queue cleared" text="Every escalated purchase has been resolved." />
          <Button
            variant="outline"
            size="sm"
            className="mt-4 font-mono text-xs gap-1.5"
            onClick={async () => {
              await resetRequests();
              toast.success("Approval queue refreshed.");
            }}
          >
            <RefreshCw className="size-3.5" />
            Reset Approval Queue
          </Button>
        </div>
      )}
      <Dialog open={Boolean(active)} onOpenChange={(open) => !open && setSelected(null)}>
        {active && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modify approval limit</DialogTitle>
              <DialogDescription>
                Approve {active.merchant} and update the per-purchase limit for this mandate.
              </DialogDescription>
            </DialogHeader>
            <label className="text-xs text-muted-foreground">
              New auto-approve limit
              <Input
                className="mt-2"
                type="number"
                value={limit}
                onChange={(event) => setLimit(Number(event.target.value))}
              />
            </label>
            <div className="rounded-md bg-paypal p-4 text-paypal-foreground">
              <div className="flex justify-between">
                <strong className="italic">PayPal</strong>
                <span className="font-mono text-[10px]">SANDBOX</span>
              </div>
              <p className="mt-2 text-xs opacity-80">No real funds move in this environment.</p>
            </div>
            <Button
              variant="paypal"
              onClick={() => {
                toast.success(`Limit updated to ${formatMoney(limit)}`);
                decide(active.id, "approved");
              }}
            >
              <Check />
              Update & approve
            </Button>
          </DialogContent>
        )}
      </Dialog>
      <BiometricModal
        open={verifyingRequest !== null}
        onOpenChange={(open) => !open && setVerifyingRequest(null)}
        actionText={verifyingRequest?.action === "sign" ? "APPLY SIGNATURE" : "AUTHORIZE"}
        onVerified={() => {
          if (!verifyingRequest) return;
          if (verifyingRequest.action === "sign") {
            const currentSigs = signatures[verifyingRequest.id] || 1;
            setSignatures((prev) => ({ ...prev, [verifyingRequest.id]: currentSigs + 1 }));
            toast("Signature added", {
              description: "Waiting for remaining quorum members.",
              icon: <Users className="size-4 text-paypal" />
            });
          } else {
            decide(verifyingRequest.id, "approved");
          }
          setVerifyingRequest(null);
        }}
      />
      <AnimatePresence>
        {celebrate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
          >
            {Array.from({ length: 24 }, (_, i) => (
              <motion.i
                key={i}
                initial={{ x: `${40 + (i % 5) * 5}vw`, y: "45vh", opacity: 1 }}
                animate={{
                  x: `${(i * 41) % 100}vw`,
                  y: `${(i * 29) % 100}vh`,
                  rotate: i * 70,
                  opacity: 0,
                }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className={cn(
                  "absolute size-1.5 rounded-sm",
                  i % 3 === 0 ? "bg-safe" : i % 3 === 1 ? "bg-signal" : "bg-warning",
                )}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ActivityLedger() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["activity"],
    queryFn: mandateApi.getActivity,
  });
  return (
    <div className="space-y-8">
      <PageTitle
        eyebrow="Immutable audit trail"
        title="Decision ledger"
        description="Every request, rule match, decision, and rationale in one inspection-ready record."
      />
      <Panel title="All agent activity" subtitle="Synchronized from the policy engine">
        {isLoading ? (
          <div className="py-14 text-center text-sm text-muted-foreground">
            Loading signed records…
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[700px] text-left">
              <thead>
                <tr className="border-y border-border text-[10px] uppercase text-muted-foreground">
                  <th className="py-3">Merchant / item</th>
                  <th>Decision</th>
                  <th>Matched rule</th>
                  <th className="text-right">Amount</th>
                  <th className="text-right">Time</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.id} className="border-b border-border text-xs">
                    <td className="py-4">
                      <b>{row.merchant}</b>
                      <p className="mt-1 text-[10px] text-muted-foreground">{row.item}</p>
                    </td>
                    <td>
                      <Status value={row.decision} />
                    </td>
                    <td className="text-muted-foreground">{row.rule}</td>
                    <td className="text-right font-mono">{formatMoney(row.amount)}</td>
                    <td className="text-right text-muted-foreground">{row.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

function CountMetric({
  label,
  value,
  prefix = "",
  note,
  icon: Icon,
  warning,
  danger,
}: {
  label: string;
  value: number;
  prefix?: string;
  note: string;
  icon: typeof Activity;
  warning?: boolean;
  danger?: boolean;
}) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const started = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / 750);
      setShown(value * (1 - Math.pow(1 - progress, 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return (
    <div className="bg-card p-5 transition-colors hover:bg-accent/50">
      <div className="flex justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <Icon
          className={cn(
            "size-4 text-muted-foreground",
            warning && "text-warning",
            danger && "text-danger",
          )}
        />
      </div>
      <p className="mt-4 font-mono text-2xl">
        {prefix}
        {shown.toLocaleString("en-US", { maximumFractionDigits: prefix ? 2 : 0 })}
      </p>
      <p className="mt-1 text-[10px] text-muted-foreground">{note}</p>
    </div>
  );
}
function Panel({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="mt-1 text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
function PageTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[.16em] text-primary">{eyebrow}</p>
        <h1 className="mt-3 font-display text-3xl font-semibold md:text-4xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {action}
    </section>
  );
}
function MerchantMark({ name, large }: { name: string; large?: boolean }) {
  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center rounded-md border border-border bg-subtle font-mono font-medium",
        large ? "size-12 text-sm" : "size-9 text-[10px]",
      )}
    >
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}
function Status({ value }: { value: string }) {
  return <VerdictBadge value={value} />;
}
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-card p-3">
      <p className="text-[9px] uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-xs font-medium">{value}</p>
    </div>
  );
}
function RuleCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-subtle p-3">
      <p className="font-mono text-[9px] uppercase text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-medium">{value}</p>
    </div>
  );
}
function RuleInput({
  label,
  value,
  prefix,
  onChange,
}: {
  label: string;
  value: number;
  prefix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="rounded-md border border-border bg-subtle p-3">
      <span className="font-mono text-[9px] uppercase text-muted-foreground">{label}</span>
      <span className="mt-2 flex items-center gap-2">
        {prefix && <span className="font-mono text-muted-foreground">{prefix}</span>}
        <Input
          type="number"
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="h-7 border-0 bg-transparent p-0 font-mono text-sm shadow-none"
        />
      </span>
    </label>
  );
}
function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-md border border-dashed border-border py-14 text-center">
      <div className="mx-auto grid size-10 place-items-center rounded-full bg-safe-soft">
        <Check className="size-5 text-safe" />
      </div>
      <p className="mt-4 text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{text}</p>
    </div>
  );
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  onstart: () => void;
  onend: () => void;
  onresult: (event: { results: ArrayLike<{ 0?: { transcript?: string } }> }) => void;
  start: () => void;
}

