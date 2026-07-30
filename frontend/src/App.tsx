import { useState } from "react";
import type { Language, Lesson } from "./types/lesson";
import { LanguagePicker } from "./screens/LanguagePicker";
import { ModePicker } from "./screens/ModePicker";
import { LessonScreen } from "./screens/LessonScreen";
import { EmailGate } from "./screens/EmailGate";

type Screen =
  | { name: "language" }
  | { name: "mode"; language: Language }
  | { name: "lesson"; language: Language; lesson: Lesson };

function App() {
  const [screen, setScreen] = useState<Screen>({ name: "language" });
  const [accessDenied, setAccessDenied] = useState(false);

  // Only ever triggered by a 403 from the backend's optional whitelist gate.
  if (accessDenied) {
    return <EmailGate onSubmitted={() => setAccessDenied(false)} />;
  }

  if (screen.name === "language") {
    return <LanguagePicker onSelect={(language) => setScreen({ name: "mode", language })} />;
  }

  if (screen.name === "mode") {
    return (
      <ModePicker
        language={screen.language}
        onBack={() => setScreen({ name: "language" })}
        onLessonReady={(lesson) =>
          setScreen({ name: "lesson", language: screen.language, lesson })
        }
        onAccessDenied={() => setAccessDenied(true)}
      />
    );
  }

  return (
    <LessonScreen
      lesson={screen.lesson}
      onBack={() => setScreen({ name: "mode", language: screen.language })}
    />
  );
}

export default App;
