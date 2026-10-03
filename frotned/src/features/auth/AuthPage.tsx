import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

type Mode = "signin" | "signup" | "forgot";
const schema = z.object({
  displayName: z.string().trim().max(100).optional(),
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().max(72).optional(),
});
type Fields = z.infer<typeof schema>;

export function AuthPage() {
  const search = useSearch({ from: "/auth" });
  const [mode, setMode] = useState<Mode>(search.mode === "signup" ? "signup" : "signin");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Fields>({
    resolver: zodResolver(schema),
    defaultValues: { displayName: "", email: "", password: "" },
  });
  const password = watch("password") ?? "";
  const strength = useMemo(
    () =>
      [
        password.length >= 8,
        /[A-Z]/.test(password),
        /[0-9]/.test(password),
        /[^A-Za-z0-9]/.test(password),
      ].filter(Boolean).length,
    [password],
  );

  const continueAfterAuth = useCallback(
    async (userId: string) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", userId)
        .maybeSingle();
      await navigate({
        to: profile?.onboarding_completed ? "/dashboard" : "/onboarding",
        replace: true,
      });
    },
    [navigate],
  );

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) void continueAfterAuth(data.user.id);
    });
  }, [continueAfterAuth]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setMessage(null);
    reset();
  };
  const submit = async (values: Fields) => {
    setError(null);
    setMessage(null);
    if (mode === "forgot") {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) setError(resetError.message);
      else setMessage("Check your email for a secure reset link.");
      return;
    }
    if (!values.password || values.password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }
    if (mode === "signin") {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      if (signInError) setError(signInError.message);
      else if (signInData.user) await continueAfterAuth(signInData.user.id);
      return;
    }
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth`,
        data: { display_name: values.displayName?.trim() || undefined },
      },
    });
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    if (data.session && data.user) {
      await supabase
        .from("profiles")
        .upsert({ id: data.user.id, display_name: values.displayName?.trim() || null });
      await navigate({ to: "/onboarding", replace: true });
    } else setMessage("Check your email to confirm your account, then return to sign in.");
  };
  const google = async () => {
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/auth`,
      extraParams: { prompt: "select_account" },
    });
    if (result.error) setError(result.error.message);
    else if (!result.redirected) {
      const { data } = await supabase.auth.getUser();
      if (data.user) await continueAfterAuth(data.user.id);
    }
  };

  return (
    <main className="grid min-h-dvh bg-background lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden overflow-hidden border-r border-border bg-ink p-10 text-ink-foreground lg:flex lg:flex-col">
        <div className="intro-grid absolute inset-0" />
        <div className="relative">
          <Brand large />
        </div>
        <div className="relative my-auto max-w-xl">
          <p className="font-mono text-[10px] uppercase text-signal">Identity checkpoint</p>
          <h1 className="font-display mt-5 text-5xl font-semibold leading-tight">
            The gate knows who holds the mandate.
          </h1>
          <p className="mt-5 text-base leading-7 text-ink-muted">
            Secure access for the people defining policy, reviewing exceptions, and authorizing
            agent payments.
          </p>
          <div className="mt-10 space-y-3">
            {[
              "Your mandates stay private",
              "Every decision remains attributable",
              "Sensitive actions require an authenticated session",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm">
                <span className="grid size-6 place-items-center rounded-full bg-safe-soft">
                  <Check className="size-3.5 text-safe" />
                </span>
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="relative flex items-center gap-2 font-mono text-[9px] text-ink-muted">
          <ShieldCheck className="size-4 text-safe" /> AEGIS-9 SECURE SESSION
        </div>
      </section>
      <section className="flex min-h-dvh items-center justify-center px-4 py-16 sm:px-8">
        <div className="w-full max-w-md">
          <Link
            to="/"
            className="mb-10 inline-flex min-h-11 items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to MANDATE
          </Link>
          <div className="lg:hidden">
            <Brand large />
          </div>
          <div className="mt-10 lg:mt-0">
            <p className="font-mono text-[10px] uppercase text-primary">
              {mode === "forgot"
                ? "Account recovery"
                : mode === "signup"
                  ? "Create workspace"
                  : "Secure access"}
            </p>
            <h2 className="font-display mt-3 text-3xl font-semibold">
              {mode === "forgot"
                ? "Reset your password"
                : mode === "signup"
                  ? "Create your MANDATE account"
                  : "Welcome back"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {mode === "forgot"
                ? "We’ll send a single-use recovery link."
                : "Control agent spending from one trusted workspace."}
            </p>
          </div>
          {mode !== "forgot" && (
            <Button variant="outline" className="mt-8 h-11 w-full" onClick={google} type="button">
              <span className="font-semibold">G</span> Continue with Google
            </Button>
          )}
          {mode !== "forgot" && (
            <div className="my-6 flex items-center gap-3 text-[10px] uppercase text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              or continue with email
              <span className="h-px flex-1 bg-border" />
            </div>
          )}
          <form
            onSubmit={handleSubmit(submit)}
            className={mode === "forgot" ? "mt-8 space-y-5" : "space-y-5"}
          >
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="displayName">Display name</Label>
                <Input
                  id="displayName"
                  autoComplete="name"
                  {...register("displayName")}
                  placeholder="Vikas Saini"
                />
                {errors.displayName && (
                  <p className="text-xs text-danger">{errors.displayName.message}</p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                {...register("email")}
                placeholder="you@company.com"
              />
              {errors.email && (
                <p role="alert" className="text-xs text-danger">
                  {errors.email.message}
                </p>
              )}
            </div>
            {mode !== "forgot" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {mode === "signin" && (
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto min-h-11 px-0 text-xs"
                      onClick={() => switchMode("forgot")}
                    >
                      Forgot password?
                    </Button>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    {...register("password")}
                    className="pr-12"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-1/2 -translate-y-1/2"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
                {mode === "signup" && (
                  <div>
                    <div
                      className="grid grid-cols-4 gap-1"
                      role="meter"
                      aria-label="Password strength"
                      aria-valuemin={0}
                      aria-valuemax={4}
                      aria-valuenow={strength}
                    >
                      {[1, 2, 3, 4].map((level) => (
                        <span
                          key={level}
                          className={`h-1 rounded-full ${level <= strength ? "bg-safe" : "bg-muted"}`}
                        />
                      ))}
                    </div>
                    <p className="mt-2 text-[10px] text-muted-foreground">
                      8+ characters with uppercase, number, and symbol
                    </p>
                  </div>
                )}
              </div>
            )}
            {error && (
              <div
                role="alert"
                className="border border-danger/30 bg-danger-soft p-3 text-xs text-danger"
              >
                {error}
              </div>
            )}
            {message && (
              <div
                role="status"
                aria-live="polite"
                className="border border-safe/30 bg-safe-soft p-3 text-xs text-safe"
              >
                {message}
              </div>
            )}
            <Button variant="premium" className="h-11 w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : null}
              {mode === "forgot"
                ? "Send reset link"
                : mode === "signup"
                  ? "Create account"
                  : "Sign in"}
              <ArrowRight />
            </Button>
          </form>
          <div className="mt-7 flex min-h-11 items-center justify-center gap-1 text-xs text-muted-foreground">
            {mode === "forgot" ? (
              <Button variant="link" className="px-1 text-xs" onClick={() => switchMode("signin")}>
                Return to sign in
              </Button>
            ) : mode === "signup" ? (
              <>
                Already have an account?{" "}
                <Button
                  variant="link"
                  className="px-1 text-xs"
                  onClick={() => switchMode("signin")}
                >
                  Sign in
                </Button>
              </>
            ) : (
              <>
                New to MANDATE?{" "}
                <Button
                  variant="link"
                  className="px-1 text-xs"
                  onClick={() => switchMode("signup")}
                >
                  Create an account
                </Button>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
