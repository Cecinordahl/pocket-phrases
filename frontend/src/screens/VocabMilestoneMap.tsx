import { useMemo, useState } from "react";
import type { Language } from "../types/lesson";
import { getMilestoneTiers, getUnits, unitWords, type VocabReviewScope } from "../lib/frequency";
import { frequencyProgressStore } from "../lib/frequencyProgress";

const FINAL_TARGET_WORDS = 3000;

type VocabMilestoneMapProps = {
  language: Language;
  onBack: () => void;
  onShowInfo: () => void;
  onOpenModule: (moduleIndex: number) => void;
  onOpenReview: (scope: VocabReviewScope) => void;
};

export function VocabMilestoneMap({
  language,
  onBack,
  onShowInfo,
  onOpenModule,
  onOpenReview,
}: VocabMilestoneMapProps) {
  const units = useMemo(() => getUnits(language), [language]);
  const tiers = useMemo(() => getMilestoneTiers(), []);

  const completedUnitCount = units.filter((u) =>
    frequencyProgressStore.isUnitCompleted(language, u.index),
  ).length;
  const nextTier = tiers.find((t) => t.unitCount > completedUnitCount) ?? null;
  const wordsLearned = completedUnitCount * 100;
  const percentOfTarget = Math.round((wordsLearned / FINAL_TARGET_WORDS) * 100);

  // Auto-expand whichever unit the user should work on next: the first one
  // that isn't fully cleared yet, or — once everything fetched so far is
  // done — the last one, so there's always something open.
  const defaultExpanded = (() => {
    const current = units.findIndex(
      (u) => !frequencyProgressStore.isUnitCompleted(language, u.index),
    );
    if (current !== -1) return current;
    return units.length > 0 ? units.length - 1 : null;
  })();
  const [expandedUnit, setExpandedUnit] = useState<number | null>(defaultExpanded);

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

      <p className="text-muted">
        {nextTier
          ? `Neste milepæl: ${nextTier.threshold} ord (${completedUnitCount}/${nextTier.unitCount} enheter)`
          : "Du har nådd alle milepælene som er lagt inn så langt! 🎉"}
      </p>
      {completedUnitCount > 0 && (
        <p className="text-muted" style={{ marginTop: -8 }}>
          {percentOfTarget}% av de {FINAL_TARGET_WORDS} mest brukte ordene
        </p>
      )}

      {completedUnitCount > 0 && (
        <button
          className="button"
          style={{ width: "100%", marginTop: 8 }}
          onClick={() => onOpenReview({ type: "all" })}
        >
          Test alt du har lært
        </button>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
        {units.map((unit) => {
          const words = unitWords(unit);
          const completedModuleCount = unit.modules.filter((m) =>
            frequencyProgressStore.isModuleCompleted(language, m.index),
          ).length;
          const unitComplete = completedModuleCount === unit.modules.length;
          const isExpanded = expandedUnit === unit.index;

          return (
            <div key={unit.index} className="card">
              <button
                onClick={() => setExpandedUnit(isExpanded ? null : unit.index)}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  width: "100%",
                  textAlign: "left",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontWeight: 600 }}>
                  Enhet {unit.index + 1}: ord {words[0].rank}–{words[words.length - 1].rank}
                </span>
                <span className="text-muted">
                  {unitComplete ? "✅ Fullført" : `${completedModuleCount}/${unit.modules.length} moduler`}
                </span>
              </button>

              {isExpanded && (
                <div className="animate-in" style={{ marginTop: 12 }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(48px, 1fr))",
                      gap: 8,
                    }}
                  >
                    {unit.modules.map((module, localIndex) => {
                      const completed = frequencyProgressStore.isModuleCompleted(language, module.index);
                      const unlocked = frequencyProgressStore.isModuleUnlocked(language, module.index);
                      return (
                        <button
                          key={module.index}
                          className="button button-secondary"
                          disabled={!unlocked}
                          onClick={() => onOpenModule(module.index)}
                          style={{ padding: "8px 4px", fontSize: "0.85rem" }}
                        >
                          {completed ? "✓" : unlocked ? localIndex + 1 : "🔒"}
                        </button>
                      );
                    })}
                  </div>
                  {unitComplete && (
                    <button
                      className="button button-secondary"
                      style={{ marginTop: 10, width: "100%" }}
                      onClick={() => onOpenReview({ type: "unit", unitIndex: unit.index })}
                    >
                      Test denne enheten på nytt
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {units.length * 100 < FINAL_TARGET_WORDS && (
        <p className="text-muted" style={{ marginTop: 16 }}>
          Flere ord kommer snart.
        </p>
      )}
    </div>
  );
}
