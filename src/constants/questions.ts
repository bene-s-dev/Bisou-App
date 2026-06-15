export interface Question {
  q: string;
  h: string;
  o: string[];
}

export interface QuestionPool {
  tot: Question;
  ranking: Question;
  text: Question;
  wwe?: Question;
}

export const FALLBACK_QUESTIONS: QuestionPool = {
  tot: { q: "Was machen wir heute Abend?", h: "Entscheidet euch spontan für ein Bauchgefühl.", o: ["Sofa & Netflix", "Rausgehen & Erleben"] },
  ranking: { q: "Ordne nach deiner aktuellen Priorität:", h: "Halte die Karten gedrückt, um sie zu verschieben.", o: ["Freizeit / Hobbys", "Karriere / Arbeit", "Zeit zu zweit", "Schlaf & Erholung"] },
  text: { q: "Was hat dich heute an mir zum Lächeln gebracht?", h: "Nimm dir einen kurzen Moment Zeit zum Nachdenken.", o: [] },
  wwe: { q: "Wer würde eher...", h: "Wähle zwischen dir und deinem Partner.", o: ["Ich", "Partner"] }
};

export const GREETINGS = [
  "Heute schon gelacht?",
  "Jemand denkt gerade an dich",
  "Zeit für einen Bisou-Moment",
  "Was hat dich heute erfreut?",
  "Schön, dass du dir Zeit nimmst",
  "Ein kleiner Impuls für dich",
  "Was bringt der Tag wohl heute?",
  "Bereit für eure tägliche Dosis?",
  "Atme tief durch und genieße",
  "Kleine Momente, große Wirkung",
  "Dein Tag, deine Geschichte",
  "Lust auf ein wenig Inspiration?",
  "Jede Antwort zählt heute",
  "Schön, dich hier zu haben",
  "Worauf freust du dich heute?",
  "Zeit für ein Lächeln heute",
  "Lass uns den Tag bewusster erleben",
  "Schön, dass du da bist"
];
