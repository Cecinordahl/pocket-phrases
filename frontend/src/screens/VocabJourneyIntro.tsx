type VocabJourneyIntroProps = {
  onBack: () => void;
  onContinue: () => void;
};

export function VocabJourneyIntro({ onBack, onContinue }: VocabJourneyIntroProps) {
  return (
    <div style={{ marginTop: 16 }}>
      <button className="button button-secondary" style={{ marginBottom: 16 }} onClick={onBack}>
        ← Tilbake
      </button>
      <h2>Lær de mest brukte ordene</h2>
      <p className="text-muted">
        En annen måte å lære språk på: i stedet for hele setninger til én situasjon, lærer du
        ordene som dukker opp aller oftest — uansett situasjon.
      </p>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Hvorfor det funker</h3>
        <p>
          I ethvert språk brukes et lite knippe ord uforholdsmessig ofte. De ~100 vanligste ordene
          dekker gjerne rundt halvparten av alt som blir sagt eller skrevet i hverdagen, og de
          ~2000–3000 vanligste dekker mesteparten. Å pugge disse ordene i frekvensrekkefølge gir
          altså mest mulig forståelse for hver time du bruker.
        </p>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3>Slik er reisen bygget opp</h3>
        <p>
          Ordene er delt inn i milepæler — 100, 500, 1000 ord og så videre — og hver milepæl består
          av små økter på 20 ord. Du må svare 100 % riktig på en økt før neste låses opp, så du
          bygger deg gjennom listen uten hull.
        </p>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3>Verdt å vite</h3>
        <p className="text-muted" style={{ marginBottom: 0 }}>
          Dette bygger først og fremst gjenkjennelse — å forstå ordet når du hører eller leser det.
          Det er et supplement til situasjons-leksjonene i appen, ikke en erstatning for dem.
        </p>
      </div>

      <button className="button" style={{ marginTop: 20, width: "100%" }} onClick={onContinue}>
        Start reisen
      </button>
    </div>
  );
}
