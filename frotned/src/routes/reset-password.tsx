import { createFileRoute } from "@tanstack/react-router";
import { ResetPasswordPage } from "@/features/auth/ResetPasswordPage";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — MANDATE" },
      { name: "description", content: "Choose a new password for your MANDATE account." },
      { property: "og:title", content: "Reset password — MANDATE" },
      { property: "og:description", content: "Secure account recovery for MANDATE." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPasswordPage,
});
