import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    setReady(hash.get("type") === "recovery" || Boolean(hash.get("access_token")));
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) setError(updateError.message);
    else await navigate({ to: "/dashboard", replace: true });
  };
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <Brand large />
        <div className="vault-panel mt-10 p-6 sm:p-8">
          <p className="font-mono text-[10px] uppercase text-primary">Secure recovery</p>
          <h1 className="font-display mt-3 text-3xl font-semibold">Choose a new password</h1>
          {!ready ? (
            <p className="mt-5 text-sm leading-6 text-muted-foreground">
              Open this page from the recovery link in your email. If the link expired, request a
              new one from sign in.
            </p>
          ) : (
            <form onSubmit={submit} className="mt-7 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={show ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    className="pr-12"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-1/2 -translate-y-1/2"
                    onClick={() => setShow((v) => !v)}
                    aria-label={show ? "Hide password" : "Show password"}
                  >
                    {show ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <Input
                  id="confirm-password"
                  type={show ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              {error && (
                <p role="alert" className="text-xs text-danger">
                  {error}
                </p>
              )}
              <Button variant="premium" className="w-full" disabled={busy}>
                {busy && <Loader2 className="animate-spin" />}Update password
              </Button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
