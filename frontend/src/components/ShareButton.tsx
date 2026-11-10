import { useState } from "react";
import { buildShareUrl, type SharePayload } from "../lib/share";

type ShareButtonProps = {
  payload: SharePayload;
  /** Short text shown in the share sheet, e.g. "Øv på disse frasene med meg". */
  text: string;
  label?: string;
};

// Uses the phone's native share sheet (WhatsApp, Messenger, SMS …) when
// available, and falls back to copying the link everywhere else.
export function ShareButton({ payload, text, label = "👫 Del med reisefølget" }: ShareButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  async function share() {
    try {
      const url = await buildShareUrl(payload);
      if (navigator.share) {
        try {
          await navigator.share({ title: "Pocket Phrases", text, url });
          return;
        } catch (e) {
          // User closed the share sheet — not an error, and don't fall through to copying.
          if (e instanceof DOMException && e.name === "AbortError") return;
        }
      }
      await navigator.clipboard.writeText(url);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
    setTimeout(() => setStatus("idle"), 2500);
  }

  return (
    <button className="button button-secondary" style={{ width: "100%" }} onClick={share}>
      {status === "copied" ? "✅ Lenke kopiert — send den til reisefølget" : status === "error" ? "Kunne ikke dele lenken" : label}
    </button>
  );
}
