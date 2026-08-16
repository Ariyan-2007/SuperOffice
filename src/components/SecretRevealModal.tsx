import { useState } from "react";
import { Check, Copy, ShieldAlert } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";

// The one UI pattern shared verbatim by gift cards, webhooks and API keys: a plaintext secret
// is returned exactly once, on the create response, and never again. Show it once, make it
// trivial to copy, and say plainly that it can't be retrieved later.
export function SecretRevealModal({ title, label, secret, onClose }: { title: string; label: string; secret: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard access can fail (permissions, insecure context) — the value is still
      // selectable in the box below, so this isn't a dead end for the user.
    }
  };

  return (
    <Modal open onClose={onClose} title={title} footer={<Button variant="primary" onClick={onClose}>Done</Button>}>
      <div className="section-stack">
        <div className="banner banner-warning">
          <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{label} is shown only this once. Copy it now — it can't be retrieved again after you close this dialog.</span>
        </div>
        <div className="secret-reveal-box">
          <span style={{ flex: 1 }}>{secret}</span>
          <Button type="button" size="sm" variant="secondary" onClick={copy}>
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
