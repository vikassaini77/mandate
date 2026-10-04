import { cloneElement, isValidElement, useId, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Camera,
  CheckCircle2,
  CreditCard,
  Github,
  LogOut,
  ShieldAlert,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  const displayName = profile?.display_name || profile?.email?.split('@')[0] || "OPERATOR";
  const initials = displayName.substring(0, 2).toUpperCase();
  const [avatar, setAvatar] = useState<string | undefined>();
  const [cropOpen, setCropOpen] = useState(false);
  const [zoom, setZoom] = useState([100]);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectAvatar = (file?: File) => {
    if (!file) return;
    setAvatar(URL.createObjectURL(file));
    setCropOpen(true);
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
                  <AvatarFallback className="rounded-none font-mono text-xl text-[#EAEAEA] bg-[#121212]">{initials}</AvatarFallback>
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
                <h2 className="font-display text-xl font-semibold uppercase text-[#EAEAEA]">{displayName}</h2>
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
                <Input defaultValue={displayName || ""} className="font-mono rounded-none border-[#2A2A2A] bg-[#050505] text-[#EAEAEA]" />
              </Field>
              <Field label="Email">
                <Input type="email" defaultValue={profile?.email || ""} className="font-mono rounded-none border-[#2A2A2A] bg-[#050505] text-[#EAEAEA]" readOnly />
              </Field>
              <Field label="Timezone">
                <Select defaultValue="asia">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asia">Asia/Kolkata</SelectItem>
                    <SelectItem value="utc">UTC</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Currency">
                <Select defaultValue="usd">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="usd">USD · US Dollar</SelectItem>
                    <SelectItem value="inr">INR · Indian Rupee</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Button className="mt-7" onClick={() => toast.success("Profile updated")}>
              Save profile
            </Button>
          </section>
          <section className="rounded-md border border-border bg-card p-5 md:p-7">
            <h2 className="text-sm font-semibold">Connected accounts</h2>
            <div className="mt-4 divide-y divide-border">
              <Account
                icon={CreditCard}
                title="PayPal Sandbox"
                detail="Connected for test payments"
                connected
              />
              <Account icon={Github} title="GitHub" detail="Not connected" />
              <Account icon={UserRound} title="Google" detail="Used for sign-in" connected />
            </div>
          </section>
          <section className="rounded-md border border-danger/30 bg-danger-soft p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-danger">
              <ShieldAlert className="size-4" />
              Danger zone
            </h2>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Button variant="outline">
                <LogOut />
                Sign out everywhere
              </Button>
              <Button variant="destructive">
                <Trash2 />
                Delete account
              </Button>
            </div>
          </section>
        </div>
        <aside className="space-y-6">
          <section className="overflow-hidden rounded-md border border-border bg-card">
            <div className="border-b border-border bg-signal/10 p-5">
              <p className="font-mono text-[9px] uppercase text-signal">Current plan</p>
              <h2 className="mt-2 font-display text-2xl font-semibold">Control Pro</h2>
              <p className="mt-1 text-xs text-muted-foreground">$29 / month · renews Nov 3</p>
            </div>
            <div className="p-5">
              <Button className="w-full">Manage plan</Button>
            </div>
          </section>
          <section className="rounded-md border border-border bg-card p-5">
            <h2 className="text-sm font-semibold">Usage this cycle</h2>
            <Usage label="Agent decisions" value="546 / 1,000" progress={55} />
            <Usage label="AI conversations" value="38 / 100" progress={38} />
            <Usage label="Audit retention" value="36 / 90 days" progress={40} />
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
}: {
  icon: typeof CreditCard;
  title: string;
  detail: string;
  connected?: boolean;
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
        <span className="flex items-center gap-1 text-[10px] text-safe">
          <CheckCircle2 className="size-3.5" />
          Connected
        </span>
      ) : (
        <Button variant="outline" size="sm">
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
