import { cloneElement, isValidElement, useId, useState } from "react";
import {
  Bell,
  Bot,
  Check,
  Clipboard,
  CreditCard,
  Database,
  KeyRound,
  Laptop,
  LockKeyhole,
  Moon,
  Palette,
  Plus,
  RotateCw,
  ShieldAlert,
  Smartphone,
  Trash2,
  Webhook,
} from "lucide-react";
import { toast } from "sonner";
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

const tabs = [
  { id: "general", label: "General" },
  { id: "agent", label: "Agent" },
  { id: "notifications", label: "Notifications" },
  { id: "security", label: "Security" },
  { id: "integrations", label: "Integrations" },
  { id: "appearance", label: "Appearance" },
  { id: "privacy", label: "Data & Privacy" },
];
export function Settings() {
  const [autonomy, setAutonomy] = useState([62]);
  const [motion, setMotion] = useState(false);
  const [intensity, setIntensity] = useState([35]);
  const [twoFactor, setTwoFactor] = useState(false);
  const [apiKey, setApiKey] = useState("mdt_live_••••••••••••6F2A");
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
          <TabsContent value="general">
            <SettingsPanel title="General" icon={Laptop}>
              <Grid>
                <Field label="Workspace name">
                  <Input defaultValue="Primary Control Room" />
                </Field>
                <Field label="Default currency">
                  <Select defaultValue="USD">
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
                  <Select defaultValue="asia">
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
                  <Select defaultValue="monday">
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
              <Save />
            </SettingsPanel>
          </TabsContent>
          <TabsContent value="agent">
            <SettingsPanel title="Agent" icon={Bot}>
              <Grid>
                <Field label="Default model">
                  <Select defaultValue="astra">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="astra">Astra · reasoned</SelectItem>
                      <SelectItem value="swift">Swift · fast</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Personality">
                  <Select defaultValue="analyst">
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
                <Toggle label="Search catalogues" initial />
                <Toggle label="Compare products" initial />
                <Toggle label="Prepare checkout" />
              </div>
              <Save />
            </SettingsPanel>
          </TabsContent>
          <TabsContent value="notifications">
            <SettingsPanel title="Notifications" icon={Bell}>
              <div className="space-y-2">
                <Toggle label="Email approvals and blocks" initial />
                <Toggle label="Push decision alerts" initial />
                <Toggle label="SMS for urgent escalations" />
                <Toggle label="Weekly spend digest" initial />
              </div>
              <Grid className="mt-6">
                <Field label="Quiet hours start">
                  <Input type="time" defaultValue="22:00" />
                </Field>
                <Field label="Quiet hours end">
                  <Input type="time" defaultValue="07:00" />
                </Field>
              </Grid>
              <Save />
            </SettingsPanel>
          </TabsContent>
          <TabsContent value="security">
            <SettingsPanel title="Security" icon={LockKeyhole}>
              <Row
                title="Two-factor authentication"
                detail={
                  twoFactor
                    ? "Authenticator protection is enabled"
                    : "Require a rotating code when signing in"
                }
                action={
                  <Switch
                    checked={twoFactor}
                    onCheckedChange={(value) => {
                      setTwoFactor(value);
                      toast.success(value ? "2FA setup enabled for this demo" : "2FA disabled");
                    }}
                  />
                }
              />
              <h3 className="mt-7 text-xs font-semibold">Active sessions</h3>
              <div className="mt-3 space-y-2">
                <Session
                  icon={Laptop}
                  name="Chrome on macOS"
                  meta="Jaipur, India · Current session"
                  current
                />
                <Session
                  icon={Smartphone}
                  name="Safari on iPhone"
                  meta="Jaipur, India · 2 hours ago"
                />
              </div>
              <h3 className="mt-7 text-xs font-semibold">API keys</h3>
              <div className="mt-3 rounded-md border border-border bg-subtle p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <code className="min-w-0 flex-1 truncate text-xs">{apiKey}</code>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => {
                      navigator.clipboard.writeText(apiKey);
                      toast.success("API key copied");
                    }}
                    aria-label="Copy API key"
                  >
                    <Clipboard />
                  </Button>
                  <Confirm
                    title="Rotate API key?"
                    text="Existing applications using this key will stop working."
                    action="Rotate key"
                    onConfirm={() => {
                      setApiKey("mdt_live_••••••••••••9C4D");
                      toast.success("API key rotated");
                    }}
                  >
                    <Button size="icon-sm" variant="ghost" aria-label="Rotate API key">
                      <RotateCw />
                    </Button>
                  </Confirm>
                  <Confirm
                    title="Revoke API key?"
                    text="This immediately removes access for applications using this key."
                    action="Revoke key"
                    onConfirm={() => {
                      setApiKey("No active key");
                      toast.success("API key revoked");
                    }}
                  >
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      className="text-danger"
                      aria-label="Revoke API key"
                    >
                      <Trash2 />
                    </Button>
                  </Confirm>
                </div>
              </div>
              <Button variant="outline" className="mt-3">
                <Plus />
                Create API key
              </Button>
              <h3 className="mt-7 text-xs font-semibold">Kill-switch rules</h3>
              <div className="mt-3 space-y-2">
                <Toggle label="Pause after 3 consecutive blocks" initial />
                <Toggle label="Pause on payment-rail mismatch" initial />
                <Toggle label="Require re-authentication to resume" initial />
              </div>
            </SettingsPanel>
          </TabsContent>
          <TabsContent value="integrations">
            <SettingsPanel title="Integrations" icon={CreditCard}>
              <Row
                title="PayPal Sandbox"
                detail="Connected · merchant sandbox account"
                action={
                  <span className="flex items-center gap-2 text-xs text-safe">
                    <Check className="size-4" />
                    Connected
                  </span>
                }
              />
              <Row
                title="Decision webhook"
                detail="https://api.example.test/mandate/events"
                action={
                  <Button variant="outline" size="sm">
                    <Webhook />
                    Test
                  </Button>
                }
              />
              <Row
                title="Accounting export"
                detail="No accounting provider connected"
                action={
                  <Button variant="outline" size="sm">
                    Connect
                  </Button>
                }
              />
            </SettingsPanel>
          </TabsContent>
          <TabsContent value="appearance">
            <SettingsPanel title="Appearance" icon={Palette}>
              <Field label="Theme">
                <div className="grid grid-cols-3 gap-2">
                  {["Dark", "Light", "System"].map((value) => (
                    <Button key={value} variant={value === "Dark" ? "secondary" : "outline"}>
                      <Moon />
                      {value}
                    </Button>
                  ))}
                </div>
              </Field>
              <Field label="Accent color">
                <div className="flex gap-3">
                  {["bg-signal", "bg-safe", "bg-warning", "bg-danger"].map((color) => (
                    <Button
                      key={color}
                      variant="outline"
                      size="icon"
                      aria-label={`${color} accent`}
                    >
                      <span className={`size-4 rounded-full ${color}`} />
                    </Button>
                  ))}
                </div>
              </Field>
              <Toggle label="Reduce motion" checked={motion} onCheckedChange={setMotion} />
              <Field label={`Background animation intensity · ${intensity[0]}%`}>
                <Slider value={intensity} onValueChange={setIntensity} disabled={motion} />
              </Field>
              <Field label="Interface density">
                <Select defaultValue="comfortable">
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
              <Save />
            </SettingsPanel>
          </TabsContent>
          <TabsContent value="privacy">
            <SettingsPanel title="Data & Privacy" icon={Database}>
              <Row
                title="Export workspace data"
                detail="Download mandates, decisions, transactions, and chat history."
                action={
                  <Button
                    variant="outline"
                    onClick={() => toast.success("Data export is being prepared")}
                  >
                    <Database />
                    Export
                  </Button>
                }
              />
              <Confirm
                title="Delete all workspace data?"
                text="This permanently removes mandates, logs, conversations, and settings. This action cannot be undone."
                action="Delete all data"
                onConfirm={() => toast.success("Deletion request simulated; no data was removed")}
              >
                <div className="mt-5 rounded-md border border-danger/30 bg-danger-soft p-4">
                  <p className="text-sm font-semibold text-danger">Delete workspace data</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Permanently erase all account-owned data.
                  </p>
                  <Button variant="destructive" className="mt-4">
                    <Trash2 />
                    Delete data
                  </Button>
                </div>
              </Confirm>
            </SettingsPanel>
          </TabsContent>
        </div>
      </Tabs>
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
function Save() {
  return (
    <Button className="mt-7" onClick={() => toast.success("Settings saved")}>
      Save changes
    </Button>
  );
}
function Session({
  icon: Icon,
  name,
  meta,
  current,
}: {
  icon: typeof Laptop;
  name: string;
  meta: string;
  current?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border p-3">
      <Icon className="size-4 text-muted-foreground" />
      <div className="flex-1">
        <p className="text-xs font-medium">{name}</p>
        <p className="text-[10px] text-muted-foreground">{meta}</p>
      </div>
      {current ? (
        <span className="text-[10px] text-safe">Current</span>
      ) : (
        <Button variant="ghost" size="sm">
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
