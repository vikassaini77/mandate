import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "@/features/marketing/LandingPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MANDATE — Agent spending, under control" },
      {
        name: "description",
        content:
          "Set plain-English spending rules for AI shopping agents, enforce every purchase, and retain a complete audit trail.",
      },
      { property: "og:title", content: "MANDATE — Agent spending, under control" },
      {
        property: "og:description",
        content: "A trust and spending-control layer for AI shopping agents.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});
