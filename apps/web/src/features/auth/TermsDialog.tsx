import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function TermsDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="underline hover:text-foreground">
          Terms of Service
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Terms of Service</DialogTitle>
          <DialogDescription>Last updated: October 2026</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm text-muted-foreground">
          <p>
            By accessing or using MANDATE ("the Platform"), you agree to be bound by these Terms of Service.
          </p>
          <h3 className="font-semibold text-foreground">1. Access and Security</h3>
          <p>
            You are responsible for maintaining the confidentiality of your credentials and your workspace environment. Any unauthorized access must be reported immediately.
          </p>
          <h3 className="font-semibold text-foreground">2. Autonomous Transactions</h3>
          <p>
            MANDATE provides an approval layer for autonomous AI agents. We are not responsible for the downstream impacts of approved transactions unless caused by our gross negligence.
          </p>
          <h3 className="font-semibold text-foreground">3. Termination</h3>
          <p>
            We reserve the right to terminate or suspend access to our Platform immediately, without prior notice, for any breach of these Terms.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
