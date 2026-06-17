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
  "Nicht schon wieder du",
  "Schon vermisst",
  "Na, wieder am Handy",
  "Wer hat heute die Hosen an",
  "Zeit für den Beziehungs-TÜV",
  "Benehmt euch heute mal",
  "Wer von euch schnarcht lauter",
  "Kekse oder Liebe",
  "Wer räumt heute die Spülmaschine aus",
  "Nicht schummeln beim Antworten",
  "Heute schon danke gesagt",
  "Habt ihr euch heute schon geküsst",
  "Wer von euch braucht mehr Schlaf",
  "Liebe geht durch den Magen – Hunger",
  "Wer ist hier der Chef",
  "Kein Streit heute",
  "Na, Lieblingsmensch"
];
