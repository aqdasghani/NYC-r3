"use client";

import { AnimatePresence, motion } from "motion/react";
import { useWizardStore } from "@/stores/useWizardStore";
import { StepAiRead } from "./StepAiRead";
import { StepConfirm } from "./StepConfirm";
import { StepDone } from "./StepDone";
import { StepUpload } from "./StepUpload";
import { WizardStepper } from "./WizardStepper";

const steps = ["Upload", "AI Reads", "Confirm", "Done"];

/** Orchestrates the 4-step OCR flow with animated step transitions. */
export function InvoiceWizard() {
  const step = useWizardStore((s) => s.step);
  const invoice = useWizardStore((s) => s.invoice);

  return (
    <div className="mx-auto max-w-3xl">
      <WizardStepper steps={steps} current={step} />
      <div className="mt-8">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {step === 0 && <StepUpload />}
            {step === 1 && <StepAiRead />}
            {step === 2 && invoice && <StepConfirm invoice={invoice} />}
            {step === 3 && invoice && <StepDone invoice={invoice} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
