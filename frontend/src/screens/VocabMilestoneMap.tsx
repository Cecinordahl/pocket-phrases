import { useMemo, useState } from "react";
import type { Language } from "../types/lesson";
import { getBatches, getMilestoneTiers, isMilestoneContentReady } from "../lib/frequency";
import { frequencyProgressStore } from "../lib/frequencyProgress";

type VocabMilestoneMapProps = {
  language: Language;
  onBack: () => void;
  onShowInfo: () => void;
  onOpenBatch: (batchIndex: number) => void;
};

export function VocabMilestoneMap({ language, onBack, onShowInfo, onOpenBatch }: VocabMilestoneMapProps) {
  const tiers = useMemo(() => getMilestoneTiers(), []);
  const batches = useMemo(() => getBatches(language), [language]);

  const tierInfos = tiers.map((tier) => {
    const contentReady = isMilestoneContentReady(language, tier.threshold);
    const tierBatches = batches.slice(tier.batchStart, tier.batchEnd);
    const completedCount = tierBatches.filter((b) =>
      frequencyProgressStore.isBatchCompleted(language, b.index),
    ).length;
    return { tier, contentReady, tierBatches, completedCount };
  });

  // Auto-expand whichever milestone the user should work on next: the
  // first content-ready one that isn't fully cleared yet, or — once
  // everything fetched so far is done — the last ready one, so there's
  // always something open rather than defaulting to nothing.
  const defaultExpanded = (() => {
    const current = tierInfos.findIndex((t) => t.contentReady && t.completedCount < t.tierBatches.length);
    if (current !== -1) return current;
    for (let i = tierInfos.length - 1; i >= 0; i--) {
      if (tierInfos[i].contentReady) return i;
    }
    return null;
  })();
  const [expanded, setExpanded] = useState<number | null>(defaultExpanded);

  return (
    <div style={{ marginTop: 16 }}>
      <button className="button button-secondary" style={{ marginBottom: 16 }} onClick={onBack}>
        ← Tilbake
      </button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <h2 style={{ margin: 0 }}>Ordforråd-reisen</h2>
        <button
          aria-label="Om denne metoden"
          className="button button-secondary"
          style={{ width: 32, height: 32, borderRadius: "50%", padding: 0, flexShrink: 0 }}
          onClick={onShowInfo}
        >
          ⓘ
        </button>
      </div>
      <p className="text-muted">Fullfør en økt på 20 ord med 100 % riktig for å låse opp neste.</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
        {tierInfos.map((info, i) => {
          const { tier, contentReady, tierBatches, completedCount } = info;
          const isComplete = contentReady && tierBatches.length > 0 && completedCount === tierBatches.length;
          const isExpanded = expanded === i;

          return (
            <div key={tier.threshold} className="card">
              <button
                onClick={() => contentReady && setExpanded(isExpanded ? null : i)}
                disabled={!contentReady}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  width: "100%",
                  textAlign: "left",
                  cursor: contentReady ? "pointer" : "default",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontWeight: 600 }}>{tier.threshold} ord</span>
                <span className="text-muted">
                  {!contentReady
                    ? "🔒 Ordforrådet kommer snart"
                    : isComplete
                      ? "✅ Fullført"
                      : `${completedCount}/${tierBatches.length} økter fullført`}
                </span>
              </button>

              {isExpanded && contentReady && (
                <div
                  className="animate-in"
                  style={{
                    marginTop: 12,
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(56px, 1fr))",
                    gap: 8,
                  }}
                >
                  {tierBatches.map((batch, localIndex) => {
                    const completed = frequencyProgressStore.isBatchCompleted(language, batch.index);
                    const unlocked = frequencyProgressStore.isBatchUnlocked(language, batch.index);
                    return (
                      <button
                        key={batch.index}
                        className="button button-secondary"
                        disabled={!unlocked}
                        onClick={() => onOpenBatch(batch.index)}
                        style={{ padding: "8px 4px", fontSize: "0.85rem" }}
                      >
                        {completed ? "✓" : unlocked ? localIndex + 1 : "🔒"}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
