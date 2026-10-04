import { createFileRoute, redirect } from "@tanstack/react-router";
import { MandateApp } from "@/features/mandate/MandateApp";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard/chat/$threadId")({
  beforeLoad: async ({ params }) => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", auth.user.id)
      .maybeSingle();
    if (!profile?.onboarding_completed) throw redirect({ to: "/onboarding" });
    const { data: thread, error } = await supabase
      .from("chat_threads")
      .select("id")
      .eq("id", params.threadId)
      .maybeSingle();
    if (error) console.error("Error fetching thread in route loader:", error);
    // Removed redirect here to debug why chat doesn't load
  },
  head: () => ({
    meta: [
      { title: "Agent Chat — MANDATE" },
      { name: "description", content: "Shop with a policy-aware AI purchasing agent." },
      { property: "og:title", content: "Agent Chat — MANDATE" },
      { property: "og:description", content: "Shop with a policy-aware AI purchasing agent." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChatRoute,
});
function ChatRoute() {
  const { threadId } = Route.useParams();
  return <MandateApp initialView="chat" threadId={threadId} />;
}
