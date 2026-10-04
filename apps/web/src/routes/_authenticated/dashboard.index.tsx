import { createFileRoute, redirect } from "@tanstack/react-router";
import { MandateApp } from "@/features/mandate/MandateApp";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  beforeLoad: async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", userData.user.id)
      .maybeSingle();
    if (!profile?.onboarding_completed) throw redirect({ to: "/onboarding" });
  },
  head: () => ({
    meta: [
      { title: "Control room — MANDATE" },
      {
        name: "description",
        content: "Monitor mandates, approvals, and AI agent spending decisions.",
      },
      { property: "og:title", content: "Control room — MANDATE" },
      {
        property: "og:description",
        content: "Monitor mandates, approvals, and AI agent spending decisions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MandateApp,
});
