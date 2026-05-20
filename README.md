<div align="center">
  <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/heart.svg" alt="Bisou Logo" width="80" height="80">
  
  # Bisou
  
  **Die App für dich und deinen Lieblingsmenschen.** <br>
  Jeden Tag ein kleiner magischer Moment zu zweit.

  <br>

  [![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
  [![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)](https://reactjs.org/)
  [![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
  [![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)

</div>

<hr>

## ✨ Was ist Bisou?

Bisou ist eine liebevoll gestaltete Web-App (PWA) für Paare, die jeden Tag eine kleine, gemeinsame Routine schaffen möchten. 
Täglich gibt es drei neue Fragen für euch beide. Aber pssst: Die Antworten des jeweils anderen seht ihr erst, wenn ihr beide eure eigenen Antworten abgeschickt habt!

### 🚀 Features

- **Für zwei gemacht:** Verknüpft eure Profile mit einem einzigartigen Partner-Code.
- **Tägliche Magie:** Jeden Morgen drei neue spannende, tiefe oder lustige Fragen.
- **Gemeinsam teilen:** Die Antworten werden erst sichtbar, wenn beide Partner geantwortet haben.
- **Streaks & Serien:** Schaut täglich rein, beantwortet die Fragen und baut eure Flamme (Serie) auf! 🔥
- **PWA Ready:** Installiere Bisou direkt auf dem Startbildschirm deines Smartphones für das perfekte App-Erlebnis (iOS & Android).

<br>

## 🛠️ Technologie

Bisou ist eine moderne Single Page Application, gebaut mit:

*   **Frontend:** React (Vite) + TypeScript
*   **Styling:** Tailwind CSS + Lucide Icons für wunderschöne UI
*   **Backend / Auth:** Supabase (PostgreSQL + Authentication)
*   **Hosting:** Bereit für Vercel / Netlify

<br>

## 📦 Lokale Entwicklung

Möchtest du Bisou lokal ausführen? So geht's:

1. **Repository klonen**
   ```bash
   git clone https://github.com/dein-username/bisou.git
   cd bisou
   ```

2. **Abhängigkeiten installieren**
   ```bash
   npm install
   ```

3. **Umgebungsvariablen setzen**
   Kopiere die `.env.example` zu `.env` und trage deine Supabase-Keys ein:
   ```env
   VITE_SUPABASE_URL=deine_supabase_url
   VITE_SUPABASE_ANON_KEY=dein_supabase_anon_key
   ```

4. **Entwicklungsserver starten**
   ```bash
   npm run dev
   ```
   Die App ist nun unter `http://localhost:5173` erreichbar.

<br>

<div align="center">
  Made with ❤️ for couples.
</div>
