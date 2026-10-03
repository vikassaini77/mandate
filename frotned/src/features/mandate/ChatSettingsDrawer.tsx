import { useState } from "react";
import { Brain, Eraser, Settings2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
  SheetTrigger,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export function ChatSettingsDrawer() {
  const [creativity, setCreativity] = useState([35]);
  const [memory, setMemory] = useState(true);
  const [tools, setTools] = useState({ search: true, compare: true, purchase: false });
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open agent settings">
          <Settings2 />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Agent settings</SheetTitle>
          <SheetDescription>
            Controls for this procurement agent and its active conversations.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-7 space-y-7">
          <SettingGroup title="Model & response">
            <Field label="Model">
              <Select defaultValue="astra">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="astra">Astra · reasoned</SelectItem>
                  <SelectItem value="swift">Swift · fast</SelectItem>
                  <SelectItem value="deep">Deep analyst</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Response style">
              <Select defaultValue="concise">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="concise">Concise</SelectItem>
                  <SelectItem value="balanced">Balanced</SelectItem>
                  <SelectItem value="detailed">Detailed</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label={`Creativity · ${creativity[0] ?? 35}%`}>
              <Slider value={creativity} onValueChange={setCreativity} max={100} step={5} />
            </Field>
          </SettingGroup>
          <SettingGroup title="Tool permissions">
            {(["search", "compare", "purchase"] as const).map((tool) => (
              <Toggle
                key={tool}
                label={
                  tool === "purchase"
                    ? "Prepare purchases"
                    : `${tool.charAt(0).toUpperCase()}${tool.slice(1)} products`
                }
                checked={tools[tool]}
                onCheckedChange={(checked) =>
                  setTools((current) => ({ ...current, [tool]: checked }))
                }
              />
            ))}
          </SettingGroup>
          <SettingGroup title="Memory">
            <Toggle label="Remember preferences" checked={memory} onCheckedChange={setMemory} />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => toast.success("Agent memory cleared for this workspace")}
            >
              <Eraser />
              Clear memory
            </Button>
          </SettingGroup>
          <SettingGroup title="System prompt">
            <Textarea
              readOnly
              value="You are MANDATE's procurement agent. Treat active spending policies as binding. Compare value, merchant trust, and policy fit. Never claim a purchase completed before PayPal confirms it."
              className="min-h-32 resize-none font-mono text-[10px]"
            />
            <p className="flex gap-2 text-[10px] leading-5 text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-safe" />
              This protected instruction is read-only. Mandate rules always take precedence.
            </p>
          </SettingGroup>
        </div>
      </SheetContent>
    </Sheet>
  );
}
function SettingGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 border-b border-border pb-6">
      <h3 className="flex items-center gap-2 font-mono text-[10px] uppercase text-muted-foreground">
        <Brain className="size-3.5" />
        {title}
      </h3>
      {children}
    </section>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
function Toggle({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-border bg-subtle p-3">
      <Label className="text-xs">{label}</Label>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
