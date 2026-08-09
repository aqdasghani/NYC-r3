import { InvoiceDraft } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { useWizardStore } from "@/stores/useWizardStore";

export function StepConfirm({ invoice }: { invoice: InvoiceDraft }) {
  const setStep = useWizardStore((s) => s.setStep);
  return (
    <div>
      <h2 className="text-xl font-bold">Confirm Invoice</h2>
      <pre>{JSON.stringify(invoice, null, 2)}</pre>
      <Button onClick={() => setStep(3)}>Confirm</Button>
    </div>
  );
}
