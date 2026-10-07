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
  FileCheck2,
  Gauge,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  Mic,
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
import { mandateApi } from "./api";
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
const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value % 1 ? 2 : 0,
  }).format(value);

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
  const [intro, setIntro] = useState(initialView === "dashboard");
  const [dark, setDark] = useState(true);
  const requests = useMandateStore((state) => state.requests);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
  const pendingCount = requests.filter((item) => item.status === "pending").length;
  useEffect(() => {
    setView(initialView);
  }, [initialView]);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);
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
                  FAANG-GRADE ML SANITIZER: ACTIVE
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
            <p className="hidden font-mono text-[9px] text-muted-foreground sm:block">
              CONTROL ROOM / PRODUCTION
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
            <Button 
              variant="ghost" 
              size="icon" 
              aria-label="Notifications" 
              className="relative"
              onClick={() => {
                toast("Sentinel Engine Alert", {
                  description: "Unusual vendor pattern detected on digital goods purchase.",
                  icon: <Bell className="size-4 text-warning" />
                });
              }}
            >
              <Bell />
              <span className="absolute right-2 top-2 size-1.5 rounded-full bg-warning" />
            </Button>
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
            <CommandItem onSelect={() => setDark((value) => !value)}>
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
  const requests = useMandateStore((state) => state.requests);
  const [active, setActive] = useState(true);
  const [confirmKill, setConfirmKill] = useState(false);
  const { data = [] } = useQuery({
    queryKey: ["activity"],
    queryFn: mandateApi.getActivity,
  });
  const pending = requests.filter((request) => request.status === "pending").length;
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
          value={1842.62}
          prefix="$"
          note="41% of $4,500"
          icon={CircleDollarSign}
        />
        <CountMetric
          label="Budget remaining"
          value={2657.38}
          prefix="$"
          note="19 days remaining"
          icon={Gauge}
        />
        <CountMetric
          label="Approvals pending"
          value={pending}
          note="$341 exposure"
          icon={Clock3}
          warning
        />
        <CountMetric
          label="Blocked attempts"
          value={7}
          note="$783 protected"
          icon={ShieldAlert}
          danger
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
          subtitle="Decisions arriving from the policy gate"
          action={
            <Button variant="ghost" size="sm" onClick={() => onNavigate("audit")}>
              Open ledger <ChevronRight />
            </Button>
          }
        >
          <div className="mt-4 divide-y divide-border">
            {data.slice(0, 5).map((row) => (
              <div key={row.id} className="flex items-center gap-3 py-3">
                <MerchantMark name={row.merchant} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {row.merchant} · {row.item}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {row.time} · {row.rule}
                  </p>
                </div>
                <Status value={row.decision} />
                <span className="font-mono text-xs">{formatMoney(row.amount)}</span>
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
                  <p className="text-[10px] text-muted-foreground">4 tasks · last action 2m ago</p>
                </div>
              </div>
              <Bot className="size-5 text-signal" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Fact label="Today" value="23 decisions" />
              <Fact label="Autonomy" value="Balanced" />
            </div>
          </div>
          <Button
            variant={active ? "destructive" : "default"}
            className="mt-4 w-full"
            onClick={() => (active ? setConfirmKill(true) : setActive(true))}
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
              onClick={() => {
                setActive(false);
                toast.error("Agent spending paused");
              }}
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

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        headers: async () => {
          const { data } = await supabase.auth.getSession();
          return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
        },
        body: { id: threadId },
        fetch: localAI ? customAiFetch : undefined,
      }),
    [threadId, localAI],
  );
  const { messages, sendMessage, status, stop, regenerate } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
    onError: (error) => toast.error(error.message || "Agent response failed"),
    onFinish: (message) => {
      queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
      window.setTimeout(() => inputRef.current?.focus(), 50);
      
      // Voice assistant TTS
      try {
        const textToSpeak = message?.content || (message?.parts as any[])?.filter(p => p.type === "text").map(p => p.text).join(" ") || "";
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
      <TelemetryWidget messages={messages} status={status as string} />
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
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto"
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
                    ) : part.type === "tool-invocation" && part.toolInvocation.toolName === "delegate_task" ? (
                      <div key={`${message.id}-${partIndex}`} className="mt-4 mb-2 rounded-lg border border-border bg-subtle p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-3 border-b border-border pb-2">
                          <Users className="size-4 text-signal" />
                          <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#EAEAEA]">
                            {part.toolInvocation.args?.agent_type || "RESEARCHER"} (Sub-Agent)
                          </span>
                        </div>
                        {part.toolInvocation.state === "result" ? (
                          <div className="text-sm text-muted-foreground prose prose-invert prose-p:leading-relaxed prose-pre:bg-black/50">
                            {part.toolInvocation.result?.response || "No response."}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="size-2 rounded-full bg-signal animate-pulse" />
                            <Shimmer>Consulting {part.toolInvocation.args?.agent_type || "Researcher"}...</Shimmer>
                          </div>
                        )}
                      </div>
                    ) : null,
                  )}
                </MessageContent>
                {message.role === "assistant" && (
                  <>
                    {!busy && (message.toolInvocations?.some((t: any) => t.toolName === "propose_product") || message.parts?.some((p: any) => p.type === "tool-invocation" && p.toolInvocation.toolName === "propose_product") || message.parts?.some((p: any) => p.type === "text" && /headphone|auralis|nc-7|propose/i.test(p.text))) && <ProductProposal />}
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

function ProductProposal() {
  const proposal = featuredProposal;
  if (!proposal) return null;
  const { product } = proposal;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 grid overflow-hidden rounded-md border border-border bg-card sm:grid-cols-[150px_1fr]"
    >
      <img
        src={product.image}
        alt={product.name}
        loading="lazy"
        width={816}
        height={816}
        className="aspect-square h-full w-full object-cover"
      />
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">{product.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {product.merchant} · ★ {product.rating}
            </p>
          </div>
          <p className="font-mono text-lg">{formatMoney(product.price)}</p>
        </div>
        <div className="mt-4 border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] uppercase text-muted-foreground">
              Policy verdict
            </span>
            <Status value={proposal.verdict.toLowerCase()} />
          </div>
          <p className="mt-3 text-xs font-medium">{proposal.ruleTriggered}</p>
          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
            {proposal.agentReasoning}
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(product.price / 150) * 100}%` }}
              className="h-full bg-safe"
            />
          </div>
          <div className="mt-1 flex justify-between font-mono text-[9px] text-muted-foreground">
            <span>{formatMoney(product.price)}</span>
            <span>$150 LIMIT</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function MandateBuilder() {
  const baseText = "Up to $150/month, electronics only, ask me above $50";
  const [text, setText] = useState(baseText);
  const [rules, setRules] = useState<RuleSet>({
    monthlyCap: 150,
    autoApprove: 50,
    categories: ["Electronics"],
    blockedMerchants: ["Marketplace sellers"],
    timeWindow: "09:00–18:00",
    maxPerDay: 3,
  });
  const [versions, setVersions] = useState([
    { id: 3, label: "v3 · Current", date: "Today, 10:42", text: baseText },
    { id: 2, label: "v2", date: "Sep 28", text: "Up to $125/month, electronics only" },
    { id: 1, label: "v1", date: "Sep 21", text: "Electronics purchases under $50" },
  ]);
  const [test, setTest] = useState({ merchant: "B&H Photo", category: "Electronics", amount: 89 });
  useEffect(() => {
    const amount = text.match(/\$([\d,]+)/)?.[1];
    const ask = text.match(/above \$([\d,]+)/i)?.[1];
    setRules((current) => ({
      ...current,
      monthlyCap: amount ? Number(amount.replace(",", "")) : current.monthlyCap,
      autoApprove: ask ? Number(ask.replace(",", "")) : current.autoApprove,
      categories: /electronic/i.test(text) ? ["Electronics"] : current.categories,
    }));
  }, [text]);
  const verdict =
    test.category !== rules.categories[0]
      ? "BLOCK"
      : test.amount > rules.autoApprove
        ? "ESCALATE"
        : "APPROVE";
  const save = () => {
    setVersions((current) => [
      {
        id: current[0]?.id ? current[0].id + 1 : 1,
        label: `v${(current[0]?.id ?? 0) + 1} · Current`,
        date: "Just now",
        text,
      },
      ...current.map((version) => ({ ...version, label: version.label.replace(" · Current", "") })),
    ]);
    toast.success("Mandate version saved");
  };
  return (
    <div className="space-y-8">
      <PageTitle
        eyebrow="Natural-language control"
        title="Mandate Builder"
        description="Write intent on the left. Inspect and tune deterministic rules before activation."
        action={
          <Button variant="premium" onClick={save}>
            <Check />
            Save new version
          </Button>
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
            <p className="font-mono text-[9px] uppercase text-muted-foreground">Changes from v2</p>
            <p className="mt-2 text-xs leading-5">
              <span className="bg-safe-soft text-safe">+ $150/month</span>{" "}
              <span className="bg-danger-soft text-danger line-through">$125/month</span>{" "}
              <span className="bg-safe-soft text-safe">+ ask above $50</span>
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
            <RuleCard label="Allowed categories" value={rules.categories.join(", ")} />
            <RuleCard label="Blocked merchants" value={rules.blockedMerchants.join(", ")} />
            <RuleCard label="Purchase window" value={rules.timeWindow} />
            <RuleInput
              label="Max purchases / day"
              value={rules.maxPerDay}
              onChange={(value) => setRules({ ...rules, maxPerDay: value })}
            />
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
  const [selected, setSelected] = useState<string | null>(null);
  const [verifyingRequest, setVerifyingRequest] = useState<{ id: string, action: "approve" | "sign" } | null>(null);
  const [limit, setLimit] = useState(200);
  const [celebrate, setCelebrate] = useState(false);
  const [announcement, setAnnouncement] = useState("Approval queue ready");
  const [signatures, setSignatures] = useState<Record<string, number>>({});
  const active = requests.find((request) => request.id === selected);
  const pending = requests.filter((request) => request.status === "pending");
  const decide = (id: string, status: Exclude<RequestStatus, "pending">) => {
    resolve(id, status);
    if (status === 'approved') mandateApi.approveTransaction(id).catch(console.error);
    if (status === 'denied') mandateApi.denyTransaction(id).catch(console.error);
    setSelected(null);
    if (status === "approved") {
      setAnnouncement("Purchase approved and authorized in PayPal Sandbox");
      setCelebrate(true);
      window.setTimeout(() => setCelebrate(false), 1400);
      toast.success("Payment approved", {
        description: "Authorized in PayPal Sandbox and added to the ledger.",
      });
    } else {
      setAnnouncement("Purchase denied and removed from the approval queue");
      toast.error("Purchase denied");
    }
  };
  return (
    <div className="relative space-y-8">
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
      <PageTitle
        eyebrow="Human checkpoint"
        title="Approvals Center"
        description="Resolve edge cases before their authorization window closes."
      />
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
        <Empty title="Queue cleared" text="Every escalated purchase has been resolved." />
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

