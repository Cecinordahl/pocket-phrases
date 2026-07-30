import { useMemo, useState, type CSSProperties } from "react";
import type { Phrase } from "../types/lesson";
import { recordReview, sortByDue } from "../lib/srs";

type QuizProps = {
  phrases: Phrase[];
  onComplete: (score: number) => void;
};

type Question = {
  phrase: Phrase;
  options: string[];
};

type Answered = {
  phrase: Phrase;
  selected: string;
  correct: boolean;
};

// Selecting an option first shows a neutral "this is what you picked"
// highlight, then a beat later reveals green/red — so the selection itself
// is always clearly visible before any feedback color appears.
const SELECT_TO_REVEAL_MS = 350;
const REVEAL_TO_NEXT_MS = 900;

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildQuestions(phrases: Phrase[]): Question[] {
  return sortByDue(phrases).map((phrase) => {
    const distractors = shuffle(
      phrases.filter((p) => p.id !== phrase.id).map((p) => p.target),
    ).slice(0, 3);
    return { phrase, options: shuffle([phrase.target, ...distractors]) };
  });
}

export function Quiz({ phrases, onComplete }: QuizProps) {
  const questions = useMemo(() => buildQuestions(phrases), [phrases]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<Answered[]>([]);
  const [finished, setFinished] = useState(false);
  const [showReview, setShowReview] = useState(false);

  if (questions.length === 0) {
    return <p className="text-muted">Ingen fraser å teste.</p>;
  }

  const score = answers.filter((a) => a.correct).length;

  if (finished) {
    return (
      <div>
        <div className="card">
          <h3>Ferdig!</h3>
          <p>
            Du fikk {score} av {questions.length} riktige.
          </p>
          <button className="button button-secondary" onClick={() => setShowReview((s) => !s)}>
            {showReview ? "Skjul gjennomgang" : "Gå gjennom svarene"}
          </button>
        </div>
        {showReview && (
          <ul
            className="animate-in"
            style={{
              listStyle: "none",
              padding: 0,
              margin: "16px 0 0",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {answers.map((a) => (
              <li
                key={a.phrase.id}
                className="card"
                style={{
                  borderLeft: `4px solid ${a.correct ? "var(--color-correct)" : "var(--color-wrong)"}`,
                }}
              >
                <div className="text-muted">{a.phrase.native}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                  <span aria-hidden="true" style={{ color: a.correct ? "var(--color-correct)" : "var(--color-wrong)" }}>
                    {a.correct ? "✓" : "✗"}
                  </span>
                  <strong>{a.selected}</strong>
                </div>
                {!a.correct && (
                  <div style={{ marginTop: 4, color: "var(--color-correct)" }}>
                    <span aria-hidden="true">✓</span> Riktig svar: {a.phrase.target}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const question = questions[index];
  const isLast = index === questions.length - 1;

  function handleSelect(option: string) {
    if (selected !== null) return;
    setSelected(option);

    setTimeout(() => {
      setRevealed(true);
      const correct = option === question.phrase.target;
      recordReview(question.phrase.id, correct);
      setAnswers((prev) => [...prev, { phrase: question.phrase, selected: option, correct }]);

      setTimeout(() => {
        if (isLast) {
          setFinished(true);
          onComplete(score + (correct ? 1 : 0));
        } else {
          setIndex((i) => i + 1);
          setSelected(null);
          setRevealed(false);
        }
      }, REVEAL_TO_NEXT_MS);
    }, SELECT_TO_REVEAL_MS);
  }

  return (
    <div>
      <p className="text-muted">
        Spørsmål {index + 1} av {questions.length} · Poeng: {score}
      </p>
      <div className="card">
        <h3>{question.phrase.native}</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
          {question.options.map((option) => {
            const isSelected = option === selected;
            const isCorrectOption = option === question.phrase.target;

            let className = "button button-secondary";
            let style: CSSProperties = {
              justifyContent: "space-between",
              textAlign: "left",
            };

            if (revealed) {
              if (isCorrectOption) className += " feedback-correct";
              else if (isSelected) className += " feedback-wrong";
            } else if (isSelected) {
              // Clearly highlight the pick itself — neutral ink, never
              // red/green, since the answer hasn't been revealed yet.
              style = {
                ...style,
                borderColor: "var(--color-primary)",
                borderWidth: 2,
                background: "var(--color-surface-muted)",
              };
            }

            return (
              <button
                key={option}
                className={className}
                style={style}
                disabled={selected !== null}
                onClick={() => handleSelect(option)}
              >
                <span>{option}</span>
                {revealed && isCorrectOption && <span aria-hidden="true">✓</span>}
                {revealed && isSelected && !isCorrectOption && <span aria-hidden="true">✗</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
