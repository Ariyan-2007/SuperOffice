import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { useDemoMode } from "./DemoModeContext";
import { demoStore } from "./store";
import { ConfirmDialog } from "../components/Modal";

// Persistent reminder shown in every authenticated shell while Project Showcase mode is
// active, plus a way to wipe whatever a visitor has changed and start over from the seed data.
export function ShowcaseIndicator() {
  const isDemoMode = useDemoMode();
  const [confirming, setConfirming] = useState(false);

  if (!isDemoMode) return null;

  return (
    <>
      <span
        className="badge badge-info"
        title="No backend connected — this is sample data stored only in this browser."
      >
        <span className="badge-dot" />
        Showcase Mode
      </span>
      <button className="icon-btn" aria-label="Reset demo data" title="Reset demo data" onClick={() => setConfirming(true)}>
        <RotateCcw size={15} />
      </button>
      <ConfirmDialog
        open={confirming}
        title="Reset Demo Data"
        description="This restores every Business, product, order and account back to the original showcase data. Anything you've changed in this session will be lost."
        confirmLabel="Reset"
        danger
        onConfirm={() => {
          demoStore.reset();
          window.location.reload();
        }}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
