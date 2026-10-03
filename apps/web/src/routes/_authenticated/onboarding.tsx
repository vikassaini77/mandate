import { createFileRoute, redirect } from "@tanstack/react-router";
import { OnboardingPage } from "@/features/onboarding/OnboardingPage";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/onboarding")({
  beforeLoad: async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", userData.user.id)
      .maybeSingle();
    if (profile?.onboarding_completed) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Set up your vault — MANDATE" },
      {
        name: "description",
        content: "Connect PayPal Sandbox, create a mandate, and choose your agent persona.",
      },
      { property: "og:title", content: "Set up your vault — MANDATE" },
      { property: "og:description", content: "Complete your MANDATE control setup." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OnboardingPage,
});
