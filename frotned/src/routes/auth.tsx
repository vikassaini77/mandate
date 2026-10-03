import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AuthPage } from "@/features/auth/AuthPage";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ mode: z.enum(["signin", "signup"]).optional() }),
  head: () => ({
    meta: [
      { title: "Sign in — MANDATE" },
      { name: "description", content: "Sign in or create your MANDATE control workspace." },
      { property: "og:title", content: "Sign in — MANDATE" },
      { property: "og:description", content: "Secure access to your MANDATE control workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});
