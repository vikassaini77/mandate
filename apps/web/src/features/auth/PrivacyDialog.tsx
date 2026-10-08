import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function PrivacyDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="underline hover:text-foreground">
          Privacy Policy
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Privacy Policy</DialogTitle>
          <DialogDescription>Last updated: October 2026</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm text-muted-foreground">
          <p>
            At MANDATE, your privacy and data security are our highest priorities.
          </p>
          <h3 className="font-semibold text-foreground">Information We Collect</h3>
          <p>
            We collect information you provide directly to us (like your name and email) and data about your agent policies, transaction history, and telemetry metrics.
          </p>
          <h3 className="font-semibold text-foreground">How We Use Information</h3>
          <p>
            Your data is strictly used to enforce your procurement policies, train your local AI agents (if opted-in), and maintain the security of your MANDATE control workspace.
          </p>
          <h3 className="font-semibold text-foreground">Data Encryption</h3>
          <p>
            All mandate data is encrypted at rest and in transit. We employ zero-trust architectures to ensure no unauthorized entity can read or alter your policies.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
