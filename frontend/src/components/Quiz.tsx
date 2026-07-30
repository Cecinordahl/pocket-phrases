import { useMemo, useState } from "react";
import type { Phrase } from "../types/lesson";

type QuizProps = {
  phrases: Phrase[];
  onComplete: (score: number) => void;
};

type Question = {
  native: string;
  correct: string;
  options: string[];
};

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildQuestions(phrases: Phrase[]): Question[] {
  return shuffle(phrases).map((phrase) => {
    const distractors = shuffle(
      phrases.filter((p) => p.target !== phrase.target).map((p) => p.target),
    ).slice(0, 3);
    return {
      native: phrase.native,
      correct: phrase.target,
      options: shuffle([phrase.target, ...distractors]),
    };
  });
}

export function Quiz({ phrases, onComplete }: QuizProps) {
  const questions = useMemo(() => buildQuestions(phrases), [phrases]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  if (questions.length === 0) {
    return <p className="text-muted">Ingen fraser å teste.</p>;
  }

  if (finished) {
    return (
      <div className="card">
        <h3>Ferdig!</h3>
        <p>
          Du fikk {score} av {questions.length} riktige.
        </p>
      </div>
    );
  }

  const question = questions[index];
  const isLast = index === questions.length - 1;

  function handleSelect(option: string) {
    if (selected !== null) return;
    setSelected(option);
    const nextScore = option === question.correct ? score + 1 : score;
    setScore(nextScore);
    setTimeout(() => {
      if (isLast) {
        setFinished(true);
        onComplete(nextScore);
      } else {
        setIndex((i) => i + 1);
        setSelected(null);
      }
    }, 700);
  }

  return (
    <div>
      <p className="text-muted">
        Spørsmål {index + 1} av {questions.length} · Poeng: {score}
      </p>
      <div className="card">
        <h3>{question.native}</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
          {question.options.map((option) => {
            const isCorrect = option === question.correct;
            const showState = selected !== null;
            let background: string | undefined;
            if (showState && option === selected) {
              background = isCorrect ? "#dff3e6" : "#fdecea";
            } else if (showState && isCorrect) {
              background = "#dff3e6";
            }
            return (
              <button
                key={option}
                className="button button-secondary"
                style={background ? { background } : undefined}
                disabled={selected !== null}
                onClick={() => handleSelect(option)}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
