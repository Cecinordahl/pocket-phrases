import { useState, type FormEvent } from "react";
import { storeEmail } from "../lib/api";

type EmailGateProps = {
  onSubmitted: () => void;
};

// Only ever shown when the backend's optional Firestore whitelist gate is
// switched on and rejects the current (missing or unlisted) email — the
// gate is off by default in v1, so most deployments never render this.
export function EmailGate({ onSubmitted }: EmailGateProps) {
  const [email, setEmail] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    storeEmail(email.trim().toLowerCase());
    onSubmitted();
  }

  return (
    <div className="card" style={{ marginTop: 32 }}>
      <h2>Tilgang</h2>
      <p className="text-muted">
        Denne appen er foreløpig kun tilgjengelig for inviterte brukere. Skriv inn e-posten
        du ble invitert med.
      </p>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="din@epost.no"
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 12,
            border: "1px solid var(--color-border)",
            marginBottom: 12,
            fontSize: "1rem",
          }}
        />
        <button type="submit" className="button">
          Fortsett
        </button>
      </form>
    </div>
  );
}
