// The one shared lesson shape. Whether a Lesson comes from a seeded phrase
// pool, the Anthropic free-text endpoint, or the Random mix on the backend,
// it always arrives in this shape — the UI (Read/Drill/Quiz) never needs to
// know or care where it came from.
export type Phrase = {
  id: string;
  target: string;
  pronunciation: string;
  native: string;
  category: PhraseCategory;
  icon: PhraseIcon;
};

export type Lesson = {
  title: string;
  language: Language;
  mode: string;
  phrases: Phrase[];
};

export type Language = "es" | "fr" | "de";

export type ModeInfo = {
  key: string;
  title: string;
};

// Mirrors backend PhraseCategory — a closed set so the UI's color mapping
// never encounters an unknown value.
export type PhraseCategory =
  | "reise"
  | "mat"
  | "sosialt"
  | "transport"
  | "nodsituasjon"
  | "handel"
  | "hoflighet"
  | "annet";

// Mirrors backend PhraseIcon — see backend/.../lesson/PhraseIcon.java.
export type PhraseIcon =
  | "airport"
  | "allergy"
  | "amazing"
  | "ambulance"
  | "atm"
  | "bathroom"
  | "beer"
  | "bill"
  | "bring"
  | "browsing"
  | "bus"
  | "buy"
  | "call-family"
  | "camera"
  | "card"
  | "cheers"
  | "color"
  | "confused"
  | "delay"
  | "delicious"
  | "dietary"
  | "direction"
  | "discount"
  | "doctor"
  | "document"
  | "drink"
  | "evening"
  | "excuse-me"
  | "expensive"
  | "fitting"
  | "general"
  | "gift"
  | "goodbye"
  | "greeting"
  | "help"
  | "help-offer"
  | "hospital"
  | "job"
  | "language"
  | "late"
  | "location"
  | "lost-wallet"
  | "luggage"
  | "menu"
  | "music"
  | "name"
  | "nice-house"
  | "nice-meet"
  | "open-hours"
  | "order"
  | "origin"
  | "pain"
  | "pharmacy"
  | "phone-number"
  | "police"
  | "price"
  | "receipt"
  | "recommend"
  | "rent-car"
  | "return"
  | "seat"
  | "shoes"
  | "sick"
  | "size"
  | "slower"
  | "spicy"
  | "split-bill"
  | "stop"
  | "table"
  | "takeaway"
  | "taxi"
  | "thanks"
  | "ticket"
  | "time"
  | "train"
  | "wait"
  | "water"
  | "wifi"
  | "write";
