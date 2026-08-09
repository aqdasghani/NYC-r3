import { InvoiceDraft } from "@/lib/types";
import { Button } from "@/components/ui/Button";

export function StepDone({ invoice }: { invoice: InvoiceDraft }) {
  return (
    <div>
      <h2 className="text-xl font-bold">Done!</h2>
      <p>Invoice for {invoice.supplier} has been processed.</p>
    </div>
  );
}
