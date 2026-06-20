import os
import sys

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
    from reportlab.pdfgen import canvas
except ImportError:
    print("Die Bibliothek 'reportlab' ist nicht installiert.")
    print("Bitte führe folgenden Befehl in deinem Terminal aus:")
    print("pip install reportlab")
    sys.exit(1)

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_number(self, page_count):
        if self._pageNumber == 1:
            return  # Übersichtsseite ohne Kopf-/Fußzeile
        
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#A29BFE"))
        
        # Kopfzeile
        self.drawString(54, 800, "Bisou App - Technische Systemdokumentation & Funktionsanalyse")
        self.setStrokeColor(colors.HexColor("#E2DFFF"))
        self.setLineWidth(0.5)
        self.line(54, 792, 558, 792)
        
        # Fußzeile
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#6A6588"))
        page_text = f"Seite {self._pageNumber} von {page_count}"
        self.drawRightString(558, 40, page_text)
        self.drawString(54, 40, "Bisou App • Vollständige Funktionsspezifikation")
        self.line(54, 52, 558, 52)
        
        self.restoreState()

def build_pdf(filename="Bisou_App_Systemdokumentation.pdf"):
    current_dir = os.path.dirname(os.path.abspath(__file__))
    public_path = os.path.join(current_dir, "public", filename)
    
    # Ensure public folder exists
    os.makedirs(os.path.join(current_dir, "public"), exist_ok=True)
    
    # Printable area: 487pt width
    doc = SimpleDocTemplate(
        public_path,
        pagesize=A4,
        rightMargin=54,
        leftMargin=54,
        topMargin=72,
        bottomMargin=72
    )

    styles = getSampleStyleSheet()
    
    # Custom colors
    primary = colors.HexColor("#FF8A8A")
    secondary = colors.HexColor("#A29BFE")
    text_main = colors.HexColor("#1F1939")
    text_muted = colors.HexColor("#6A6588")
    bg_light = colors.HexColor("#F8F7FF")
    
    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=30,
        textColor=text_main,
        alignment=TA_CENTER,
        spaceAfter=15
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10.5,
        leading=14,
        textColor=secondary,
        alignment=TA_CENTER,
        spaceAfter=40
    )
    
    h1_style = ParagraphStyle(
        'H1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=text_main,
        spaceBefore=16,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'H2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=13.5,
        textColor=secondary,
        spaceBefore=10,
        spaceAfter=5,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12.5,
        textColor=text_muted,
        spaceAfter=5
    )

    code_style = ParagraphStyle(
        'Code',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7,
        leading=9,
        textColor=colors.HexColor("#2d3748"),
        spaceAfter=5
    )
    
    table_text_bold = ParagraphStyle(
        'TableTextBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7,
        leading=8.5,
        textColor=text_main
    )

    table_text = ParagraphStyle(
        'TableText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=6.5,
        leading=8,
        textColor=text_muted
    )

    story = []

    # ==========================================
    # TITELSEITE
    # ==========================================
    story.append(Spacer(1, 100))
    story.append(Paragraph("Bisou App", title_style))
    story.append(Paragraph("Detaillierte Funktionsspezifikation & Systemdokumentation", subtitle_style))
    story.append(Spacer(1, 80))
    
    meta_text = """
    <b>Entwickler & Architekt:</b> Benedikt S.<br/>
    <b>Dokumentation erstellt durch:</b> Antigravity AI Partner<br/>
    <b>Datum:</b> 20. Juni 2026<br/>
    <b>Version:</b> 6.0 (Optimiert auf Hauptfunktionen & lückenlose Detailtiefe)<br/>
    <b>Stack:</b> React Frontend & Supabase (Postgres Database, Edge Functions) Backend
    """
    story.append(Paragraph(meta_text, ParagraphStyle('Meta', parent=body_style, alignment=TA_CENTER, leading=16)))
    story.append(PageBreak())

    # ==========================================
    # KAPITEL 1: DAS FRAGENSYSTEM & KI-GENERIERUNG
    # ==========================================
    story.append(Paragraph("1. Das Fragensystem & die Gemini-KI-Generierung", h1_style))
    story.append(Paragraph(
        "Die tägliche Interaktion basiert auf vier verschiedenen Fragentypen, die Paare auf emotionale und spielerische "
        "Weise einander näherbringen. Die Bereitstellung der Fragen erfolgt vollautomatisch über eine Supabase Edge Function "
        "(<code>generate-questions</code>), die über einen täglichen Cron-Job (mittels <code>pg_cron</code> auf der Datenbank) "
        "um 12:00 Uhr mittags getriggert wird.",
        body_style
    ))
    
    story.append(Paragraph("1.1 JSON-Struktur der täglichen Fragen", h2_style))
    story.append(Paragraph(
        "In der Tabelle <code>daily_questions</code> werden die Fragen im Feld <code>questions</code> als strukturiertes "
        "JSONB-Dokument gespeichert. Dies ermöglicht eine flexible Auswertung und Übergabe an das Frontend. Ein valides JSON-Dokument "
        "besitzt folgendes Schema:",
        body_style
    ))

    json_schema_example = """{
  "tot": {
    "q": "Was ist euch an einem Sonntag wichtiger?",
    "o": ["Gemütliches Ausschlafen & Frühstück im Bett", "Früh aufstehen & zusammen etwas erleben"]
  },
  "ranking": {
    "q": "Sortiert diese Beziehungsfaktoren nach eurer persönlichen Priorität:",
    "o": ["Gemeinsame Hobbys", "Offene Kommunikation", "Körperliche Nähe", "Gegenseitiger Freiraum"]
  },
  "text": {
    "q": "Was war ein kleiner Moment in dieser Woche, für den du deinem Partner dankbar bist?"
  },
  "wwe": {
    "q": "Wer von euch beiden verliert bei einem Brettspiel eher die Geduld?"
  }
}"""
    story.append(Paragraph(json_schema_example.replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style))

    story.append(Paragraph("1.2 Der Prompt-Algorithmus der Gemini API", h2_style))
    story.append(Paragraph(
        "Falls für ein angefordertes Datum (<code>day_key</code>) noch kein Fragen-Datensatz existiert, formuliert die Edge Function "
        "einen detaillierten System-Prompt an das Modell <code>gemini-1.5-flash</code>. Der Prompt instruiert die KI wie folgt:<br/>"
        "• Generiere genau 4 Fragen mit den Typen <code>tot</code> (Dies oder Das mit 2 Optionen), <code>ranking</code> (mit exakt 4 Optionen), "
        "<code>text</code> (offene Freitextfrage) und <code>wwe</code> (Wer würde eher).<br/>"
        "• Die Fragen müssen sich auf die Themen Partnerschaft, Emotionen, Alltag, Träume und gemeinsame Zukunft beziehen. "
        "Sie müssen abwechslungsreich sein und dürfen sich niemals wiederholen. Plattitüden oder rein materielle Abfragen (z.B. Automarken) sind verboten.<br/>"
        "• Erzwinge die Ausgabe als reines, valides JSON-Dokument ohne Markdown-Formatting (keine Backticks wie ```json), "
        "damit der Deno-Server die Antwort ohne reguläre Ausdrücke parsen und direkt in die Datenbank schreiben kann.",
        body_style
    ))

    story.append(Paragraph("1.3 Robuste Fallbacks & Fehlerbehandlung", h2_style))
    story.append(Paragraph(
        "Um einen Systemausfall bei API-Drosselungen oder Netzwerkstörungen der Google API zu verhindern, implementiert die Funktion "
        "ein mehrstufiges Sicherheitsnetz:<br/>"
        "1. <b>Lokale Fallback-Datenbank:</b> Im Code der Edge Function ist eine statische Konstante <code>FALLBACK_QUESTIONS</code> mit vordefinierten, "
        "hochwertigen Beispielfragen hinterlegt. Schlägt der Gemini-Aufruf fehl, greift das System auf diese zurück, sodass der Benutzer "
        "keine Fehlermeldung sieht.<br/>"
        "2. <b>Wiederholungs-Warteschlange (Retry-Queue):</b> Schlägt die Generierung fehl, schreibt die Funktion einen Datensatz mit dem "
        "betroffenen Datum in die Tabelle <code>failed_generations</code>. Ein Datenbank-Cronjob (<code>retry_failed_generations</code>) "
        "prüft diese Tabelle alle 10 Minuten und versucht, die fehlenden Fragen asynchron im Hintergrund erneut per KI zu generieren. "
        "Ist dies erfolgreich, wird der Queue-Eintrag gelöscht.",
        body_style
    ))
    story.append(PageBreak())

    # ==========================================
    # KAPITEL 2: DER BEANTWORTUNGSPROZESS
    # ==========================================
    story.append(Paragraph("2. Der Beantwortungsprozess & die Datenserialisierung", h1_style))
    story.append(Paragraph(
        "Der Beantwortungsprozess im Client wird über einen Wizard gesteuert. Die App stellt sicher, dass "
        "Teilantworten lokal geschützt sind und dass die Antworten beider Partner sicher miteinander verglichen werden können.",
        body_style
    ))
    
    story.append(Paragraph("2.1 Clientseitige Zustandssicherung (LocalStorage-Cache)", h2_style))
    story.append(Paragraph(
        "Während der Benutzer die Fragen beantwortet, speichert die Komponente <code>Questions.tsx</code> nach jedem Einzelschritt "
        "den aktuellen Zustand im LocalStorage (Schlüssel: <code>quiz_progress_{dayKey}</code>). Das Objekt speichert den aktuellen "
        "Index des Schritts (0 bis 3) und ein Array mit den bisherigen Antworten. Dadurch wird verhindert, dass der Benutzer bei einem "
        "Verbindungsabbruch, einem versehentlichen Schließen der App oder dem Neuladen der Seite seinen Fortschritt verliert. "
        "Sobald der letzte Schritt vollendet und die Antworten erfolgreich an die Supabase-Datenbank übermittelt wurden, "
        "wird dieser LocalStorage-Eintrag bereinigt.",
        body_style
    ))

    story.append(Paragraph("2.2 Das serielle Antwort-String-Format & Signaturen", h2_style))
    story.append(Paragraph(
        "Die Antworten eines Benutzers für einen Tag werden nicht als separate Spalten oder Zeilen abgelegt, sondern als ein einziger, "
        "strukturiert serialisierter Text-String in der Spalte <code>choice</code> der Tabelle <code>answers</code> gespeichert. "
        "Das Format ist wie folgt aufgebaut:<br/>"
        "<code>Antwort1 | Antwort2 | Antwort3 | Antwort4 [Frage1][Frage2][Frage3][Frage4]</code><br/><br/>"
        "<b>Beispiel für einen echten Datenbank-Eintrag:</b><br/>"
        "<code>Sofa & Netflix | Offene Kommunikation > Körperliche Nähe > Hobbys | Zusammen kochen | Partner [tot:Was macht ihr sonntags?][ranking:Sortiert nach Prio...][text:Lieblingsgericht?][wwe:Wer ist ungeduldiger?]</code><br/><br/>"
        "<b>Der Zweck der Signatur-Klammern (Spionschutz & Integrität):</b><br/>"
        "Die am Ende angehängten Signatur-Klammern <code>[...]</code> enthalten den exakten Fragetext zum Zeitpunkt der Beantwortung. "
        "Da die Fragen theoretisch im Laufe des Tages regeneriert werden könnten (z. B. durch manuelle Admin-Eingriffe oder System-Resets), "
        "dient die Signatur als Validierung. Die Auswertungs-Function <code>calculate-stats</code> vergleicht die Signaturen beider Partner. "
        "Stimmen die Signaturen nicht überein, erkennt das System, dass die Partner auf unterschiedliche Fragen geantwortet haben. "
        "Dies verhindert Berechnungsfehler und falsche Auswertungen bei asynchronen Datumswechseln.",
        body_style
    ))

    story.append(Paragraph("2.3 Ablauf beim Absenden der Daten", h2_style))
    story.append(Paragraph(
        "Sobald der Benutzer den letzten Schritt abschließt, führt die App eine Datenbanktransaktion aus:<br/>"
        "1. Löscht eventuell bereits vorhandene temporäre Antworten des Benutzers für diesen Tag (falls korrigiert wird).<br/>"
        "2. Fügt den neu generierten Antwort-String in <code>public.answers</code> ein.<br/>"
        "3. Triggert über die Edge-Function eine Push-Benachrichtigung an den Partner, dass die Antworten vorliegen.<br/>"
        "4. Startet die lokale clientseitige Verschlüsselungs-Animation und ruft <code>onComplete()</code> auf, um das Dashboard zu aktualisieren.",
        body_style
    ))
    story.append(PageBreak())

    # ==========================================
    # KAPITEL 3: DER AUSWERTUNGS- ALGORITHMUS
    # ==========================================
    story.append(Paragraph("3. Der Kompatibilitäts- & Matching-Algorithmus (calculate-stats)", h1_style))
    story.append(Paragraph(
        "Die Berechnung der Übereinstimmungswerte erfolgt in der Deno Edge Function <code>calculate-stats</code>. "
        "Sie analysiert die letzten 30 Tage der Beziehung und wendet für jeden Fragentyp spezifische mathematische Verfahren an.",
        body_style
    ))
    
    story.append(Paragraph("3.1 Die vier Abgleich-Methoden im Detail", h2_style))
    story.append(Paragraph(
        "• <b>Dies oder Das (tot) - Binär-Matching:</b> Ein einfacher String-Vergleich. Stimmen die ausgewählten Optionen überein, "
        "beträgt der Match-Wert für diesen Tag 100%, andernfalls 0%.<br/>"
        "• <b>Ranking-Frage - Spearman-Distanz mit Wurzel-Dämpfung:</b> Die Partner sortieren 4 Elemente. Die Abweichung wird über die Summe "
        "der quadrierten Differenzen der Ränge (1 bis 4) berechnet. Der maximal mögliche quadratische Abstand bei 4 Elementen "
        "beträgt d^2_max = 20 (wenn die Listen komplett entgegengesetzt sortiert sind). Um eine Überstrafung kleiner Abweichungen zu verhindern "
        "und Paare psychologisch zu ermutigen, wird die Ähnlichkeit über eine Wurzelfunktion geglättet:<br/>"
        "<code>Score = Wurzel(1 - (Summe(Rang_A - Rang_B)^2 / 20)) * 100</code><br/>"
        "• <b>Freitext-Frage - Semantische Kosinus-Ähnlichkeit:</b> Die Texte werden durch das in der Edge Function ausgeführte Embedding-Modell "
        "<code>gte-small</code> in 384-dimensionale Vektor-Arrays konvertiert. Die mathematische Ähnlichkeit ist das Skalarprodukt der "
        "normierten Vektoren:<br/>"
        "<code>CosineSimilarity = (A · B) / (||A|| * ||B||)</code><br/>"
        "Ein identischer Text liefert 1.0 (100%), völlig unterschiedliche Texte liegen meist bei 0.3. Das System mappt den Bereich "
        "[0.3; 0.9] linear auf [0%; 100%]. Schlägt die Generierung fehl (z.B. Timeout), berechnet das System als Fallback den Jaccard-Koeffizienten "
        "(Schnittmenge der Wörter geteilt durch die Vereinigungsmenge).<br/>"
        "• <b>Wer würde eher (wwe) - Komplementär-Abgleich:</b> Da sich Partner bei der Frage 'Wer verliert eher die Geduld?' einig sind, "
        "wenn einer 'Ich' und der andere 'Partner' wählt, liegt ein Match vor, wenn die Antwort-Strings *ungleich* sind: "
        "<code>choice_A !== choice_B</code> (Match: 100%, sonst 0%).",
        body_style
    ))

    story.append(Paragraph("3.2 Dynamische Gewichtung & Berechnung des Bisou-Scores", h2_style))
    story.append(Paragraph(
        "Der Gesamt-Bisou-Score liegt auf einer Skala von 0.0 bis 10.0. Jede der vier Fragenkategorien hat das gleiche Gewicht von 25% (Faktor 0.25). "
        "Um verfälschte Ergebnisse bei unvollständigen Daten (z. B. wenn an einem Tag keine Freitext-Frage gestellt wurde oder die Partner "
        "die wwe-Frage übersprungen haben) zu vermeiden, wendet die Funktion eine <b>dynamische Gewichtungs-Normalisierung</b> an:<br/>"
        "• Es werden nur Kategorien in die Berechnung einbezogen, bei denen für die betrachteten Tage tatsächlich Antworten beider Partner vorliegen.<br/>"
        "• Die Summe der Übereinstimmungsprozente der aktiven Kategorien wird durch die Anzahl der tatsächlich aktiven Kategorien geteilt.<br/>"
        "• Der resultierende Prozentwert wird durch 10 geteilt und mathematisch auf eine Dezimalstelle gerundet (z.B. 84.3% Übereinstimmung = Score 8.4).",
        body_style
    ))

    story.append(Paragraph("3.3 Trendberechnung und Trendpfeile", h2_style))
    story.append(Paragraph(
        "Das Dashboard zeigt neben dem Bisou-Score einen Trendpfeil (Up/Down) an. Um diesen zu ermitteln, berechnet die Edge Function "
        "zwei Werte parallel: Den aktuellen Bisou-Score der letzten 30 Tage (inklusive heute) und den vorherigen Bisou-Score (indem der "
        "allerneueste gemeinsame Antworttag aus der Berechnung ausgeschlossen wird). Ist der aktuelle Score höher als der vorherige, "
        "wird ein steigender Trend signalisiert, andernfalls ein fallender. Dies motiviert Paare, durch kontinuierlich übereinstimmende "
        "Antworten ihren Score aktiv zu steigern.",
        body_style
    ))
    story.append(PageBreak())

    # ==========================================
    # KAPITEL 4: FRONTEND-DETAILS, SKALIERUNG
    # ==========================================
    story.append(Paragraph("4. Frontend-Architektur & Design-Spezifikation", h1_style))
    story.append(Paragraph(
        "Das visuelle Design der Bisou App zeichnet sich durch weiche Verläufe, harmonische Farbtöne und intuitive Bedienung aus.",
        body_style
    ))

    story.append(Paragraph("4.1 HSL-Theme Farbvariablen", h2_style))
    story.append(Paragraph(
        "Das CSS-Theme steuert alle Farben über native Variablen, um eine nahtlose Umschaltung zwischen Hell- und Dunkelmodus "
        "zu ermöglichen. Die Primärfarbe (Rose/Rot) vermittelt Wärme, während die Sekundärfarbe (Soft Lila) für Vertrauen steht.",
        body_style
    ))

    design_colors = [
        [Paragraph("<b>CSS Variable</b>", table_text_bold), Paragraph("<b>Light Theme</b>", table_text_bold), Paragraph("<b>Dark Theme</b>", table_text_bold), Paragraph("<b>Semantischer Nutzen</b>", table_text_bold)],
        [Paragraph("--primary", table_text_bold), Paragraph("#FF8A8A (Pastell-Rot)", table_text), Paragraph("#FF9B9B (Hell-Rot)", table_text), Paragraph("Streaks, Buttons, Akzente", table_text)],
        [Paragraph("--secondary", table_text_bold), Paragraph("#A29BFE (Soft-Lila)", table_text), Paragraph("#B4AFFF (Hell-Lila)", table_text), Paragraph("Buttons, Meilensteine", table_text)],
        [Paragraph("--bg", table_text_bold), Paragraph("#F8F7FF (Pastell-Weiß)", table_text), Paragraph("#0C0A15 (Tief-Schwarz)", table_text), Paragraph("Hintergrundfarbe", table_text)],
        [Paragraph("--text-main", table_text_bold), Paragraph("#1F1939 (Dunkel-Lila)", table_text), Paragraph("#F5F3FF (Off-White)", table_text), Paragraph("Überschriften und Fließtext", table_text)],
        [Paragraph("--card-border", table_text_bold), Paragraph("#E2DFFF (Hell-Grau-Lila)", table_text), Paragraph("#231E3D (Dunkel-Violett)", table_text), Paragraph("Ränder von Karten & Feldern", table_text)]
    ]
    t_colors = Table(design_colors, colWidths=[95, 105, 105, 182])
    t_colors.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#EAE5FF")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, bg_light]),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_colors)

    story.append(Paragraph("4.2 Typografie", h2_style))
    story.append(Paragraph(
        "• <b>Fraunces:</b> Eine ausdrucksstarke Serifenschrift. Sie wird im Header für das 'Bisou'-Logo und ausgewählte emotionale "
        "Überschriften verwendet, um Intimität und Individualität zu vermitteln.<br/>"
        "• <b>Plus Jakarta Sans:</b> Eine hochmoderne, geometrische Sans-Serif-Schrift. Sie dient als Haupt-Schriftart der Benutzeroberfläche "
        "und sorgt dank großzügiger Zeichenbreiten für hervorragende Lesbarkeit auf Smartphone-Bildschirmen.",
        body_style
    ))

    story.append(Paragraph("4.3 Micro-Animations & Interaktionseffekte", h2_style))
    story.append(Paragraph(
        "• <b>Wobble & Flicker (`.animate-flicker`):</b> Animiert die Flammen-Icons bei aktiven Antwortserien mit zufallsnahen "
        "Rotationsänderungen (±3 Grad), um das Flackern einer echten Kerze nachzuahmen.<br/>"
        "• <b>Eingangs-Transitionen (`.animate-fade-in-up`):</b> Karten und Formularelemente gleiten beim Laden um 24 Pixel "
        "von unten nach oben und blenden gleichzeitig ein. Eine gestaffelte CSS-Verzögerung (Stagger-Effekt) von 80ms pro Element "
        "lässt die Seiten organisch und flüssig aufgebaut erscheinen.",
        body_style
    ))
    story.append(PageBreak())

    # ==========================================
    # KAPITEL 5: DATENBANKSCHEMA
    # ==========================================
    story.append(Paragraph("5. Datenbank-Struktur & Schema-Referenz", h1_style))
    story.append(Paragraph(
        "Die PostgreSQL-Datenbank strukturiert alle Relationen, Integritätsbedingungen (Foreign Keys) und Trigger.",
        body_style
    ))

    # Profiles Table Schema
    story.append(Paragraph("5.1 Profile-Tabelle (public.profiles)", h2_style))
    profiles_sql = """CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  partner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  partner_code text UNIQUE,
  avatar_url text,
  intro_completed boolean DEFAULT false NOT NULL,
  partner_since timestamptz,
  last_answer_reset_at timestamptz,
  nudge_cooldown timestamptz,
  nudge_count integer DEFAULT 0 NOT NULL,
  last_nudge_at timestamptz,
  total_answers integer DEFAULT 0 NOT NULL,
  total_matches integer DEFAULT 0 NOT NULL,
  nudges_sent integer DEFAULT 0 NOT NULL,
  morning_answers_count integer DEFAULT 0 NOT NULL,
  night_answers_count integer DEFAULT 0 NOT NULL,
  lunch_answers_count integer DEFAULT 0 NOT NULL,
  last_minute_answers_count integer DEFAULT 0 NOT NULL,
  long_answers_count integer DEFAULT 0 NOT NULL,
  both_long_answers_count integer DEFAULT 0 NOT NULL,
  journal_views integer DEFAULT 0 NOT NULL,
  streaks_rebuilt integer DEFAULT 0 NOT NULL,
  avatar_change_count integer DEFAULT 0 NOT NULL,
  time_sync_5min_count integer DEFAULT 0 NOT NULL,
  time_sync_1min_count integer DEFAULT 0 NOT NULL,
  answered_valentines boolean DEFAULT false NOT NULL,
  answered_new_years boolean DEFAULT false NOT NULL,
  perfect_rankings_count integer DEFAULT 0 NOT NULL,
  perfect_match_days_count integer DEFAULT 0 NOT NULL
);"""
    story.append(Paragraph(profiles_sql.replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style))

    # Answers Table Schema
    story.append(Paragraph("5.2 Antworten-Tabelle (public.answers)", h2_style))
    answers_sql = """CREATE TABLE public.answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  day_key date NOT NULL,
  choice text NOT NULL,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT answers_user_id_day_key_key UNIQUE (user_id, day_key)
);"""
    story.append(Paragraph(answers_sql.replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style))

    # Streaks Table Schema
    story.append(Paragraph("5.3 Streaks-Tabelle (public.streaks)", h2_style))
    streaks_sql = """CREATE TABLE public.streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  partner_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_streak integer DEFAULT 0 NOT NULL,
  longest_streak integer DEFAULT 0 NOT NULL,
  last_answer_date date,
  streak_history jsonb DEFAULT '[]'::jsonb NOT NULL,
  CONSTRAINT streaks_user_id_partner_id_key UNIQUE (user_id, partner_id)
);"""
    story.append(Paragraph(streaks_sql.replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style))
    story.append(PageBreak())

    # Additional Tables Specification
    story.append(Paragraph("5.4 Zusätzliche Tabellen-Spezifikationen", h1_style))
    
    other_tables_sql = """-- Ankündigungen (Server-Driven Popups)
CREATE TABLE public.announcements (
  id bigint PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
  version_code integer UNIQUE NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  type text DEFAULT 'info'::text NOT NULL,
  emoji text DEFAULT '✨'::text NOT NULL,
  button_label text DEFAULT 'Los geht''s'::text NOT NULL,
  action_route text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Ankündigung-Views (Gelesen-Status)
CREATE TABLE public.announcement_views (
  id bigint PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  announcement_id bigint REFERENCES public.announcements(id) ON DELETE CASCADE NOT NULL,
  seen_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT announcement_views_user_id_announcement_id_key UNIQUE (user_id, announcement_id)
);

-- Push-Abonnements
CREATE TABLE public.push_subscriptions (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Erfolge / Meilensteine Definitionen
CREATE TABLE public.milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  trigger_type text NOT NULL,
  trigger_value integer NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Freigeschaltete Erfolge
CREATE TABLE public.unlocked_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  milestone_id uuid REFERENCES public.milestones(id) ON DELETE CASCADE NOT NULL,
  unlocked_at timestamptz DEFAULT now() NOT NULL,
  is_seen boolean DEFAULT false NOT NULL,
  CONSTRAINT unlocked_milestones_user_id_milestone_id_key UNIQUE (user_id, milestone_id)
);"""
    story.append(Paragraph(other_tables_sql.replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style))
    story.append(PageBreak())

    # ==========================================
    # KAPITEL 6: RLS POLICIES & SECURITY
    # ==========================================
    story.append(Paragraph("6. RLS (Row Level Security) & Zugriffskontrolle", h1_style))
    story.append(Paragraph(
        "Die Sicherheit der Benutzerdaten ist über restriktive Postgres-RLS-Regeln geregelt. Jeder Nutzer "
        "kann ausschließlich seine eigenen Einträge modifizieren, während Lesezugriffe für Partner über SQL-Unterabfragen freigegeben werden.",
        body_style
    ))
    
    rls_data = [
        [Paragraph("<b>Tabelle</b>", table_text_bold), Paragraph("<b>Operation</b>", table_text_bold), Paragraph("<b>SQL Policy Bedingung (USING / WITH CHECK)</b>", table_text_bold)],
        [
            Paragraph("profiles", table_text_bold),
            Paragraph("SELECT<br/>INSERT/UPDATE<br/>DELETE", table_text),
            Paragraph("TO authenticated USING (true)<br/>USING (auth.uid() = id)<br/>USING (auth.uid() = id)", table_text)
        ],
        [
            Paragraph("answers", table_text_bold),
            Paragraph("SELECT<br/><br/>INSERT/DELETE", table_text),
            Paragraph("auth.uid() = user_id OR user_id IN (<br/>  SELECT partner_id FROM public.profiles WHERE id = auth.uid()<br/>)<br/>USING (auth.uid() = user_id)", table_text)
        ],
        [
            Paragraph("streaks", table_text_bold),
            Paragraph("SELECT", table_text),
            Paragraph("auth.uid() = user_id OR user_id IN (<br/>  SELECT partner_id FROM public.profiles WHERE id = auth.uid()<br/>)", table_text)
        ],
        [
            Paragraph("announcements", table_text_bold),
            Paragraph("SELECT", table_text),
            Paragraph("TO public USING (true)", table_text)
        ],
        [
            Paragraph("announcement_views", table_text_bold),
            Paragraph("SELECT<br/>INSERT", table_text),
            Paragraph("USING (auth.uid() = user_id)<br/>WITH CHECK (auth.uid() = user_id)", table_text)
        ],
        [
            Paragraph("milestones", table_text_bold),
            Paragraph("SELECT", table_text),
            Paragraph("TO authenticated USING (true)", table_text)
        ],
        [
            Paragraph("unlocked_milestones", table_text_bold),
            Paragraph("SELECT<br/>INSERT", table_text),
            Paragraph("TO authenticated USING (true)<br/>TO service_role WITH CHECK (true)", table_text)
        ]
    ]
    t_rls = Table(rls_data, colWidths=[100, 87, 300])
    t_rls.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#DFFFE2")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, bg_light]),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_rls)
    story.append(PageBreak())

    # ==========================================
    # KAPITEL 7: PL/PGSQL RPC FUNCTIONS & TRIGGERS
    # ==========================================
    story.append(Paragraph("7. PL/pgSQL Funktionen, Trigger & RPCs", h1_style))
    story.append(Paragraph(
        "Komplexe Geschäftslogik und relationale Updates werden direkt im PostgreSQL-Server ausgeführt. Dies vermeidet Race-Conditions und minimiert Roundtrips vom Client.",
        body_style
    ))
    
    story.append(Paragraph("7.1 Partnerkopplung: public.link_partners()", h2_style))
    story.append(Paragraph(
        "Führt eine atomare, bidirektionale Verknüpfung zweier Profile durch. Die Funktion nimmt den `partner_code_to_link` "
        "entgegen, sucht die zugehörige UUID und setzt gegenseitig `partner_id` sowie `partner_since` auf den aktuellen Zeitstempel.",
        body_style
    ))
    
    story.append(Paragraph("7.2 Kontolöschung: public.delete_user_account()", h2_style))
    story.append(Paragraph(
        "Löscht das Konto des angemeldeten Benutzers sicher aus `auth.users`. Um eine Verletzung von Fremdschlüsselbedingungen "
        "(FK Violation) zu vermeiden, hebt die Funktion zuerst die Koppelung beim Partner auf (setzt dort `partner_id` auf NULL) "
        "und löscht anschließend den User-Datensatz. Kaskadierende Löschungen leeren automatisch verknüpfte Tabellen (Answers, Streaks).",
        body_style
    ))

    story.append(Paragraph("7.3 Streak-Verwaltung: public.update_streak()", h2_style))
    story.append(Paragraph(
        "Ein AFTER INSERT-Trigger auf `public.answers`. Wird eine Antwort gespeichert, ermittelt der Trigger "
        "das aktuelle Datum und prüft den Tag der letzten Antwort. War die letzte Antwort gestern, wird der Streak "
        "inkrementiert und das Datum an die `streak_history` angehängt. Liegt die letzte Antwort länger zurück, "
        "wird die Serie auf 1 zurückgesetzt. Das System stellt sicher, dass Korrekturen am selben Tag den Streak nicht brechen.",
        body_style
    ))

    story.append(Paragraph("7.4 Antwort-Reset: public.reset_today_answers(day_key_param text)", h2_style))
    story.append(Paragraph(
        "Erlaubt es Nutzern, ihre heutigen Antworten zu löschen, um sie neu zu beantworten. Die Funktion implementiert "
        "einen harten 7-Tage-Cooldown. Sie prüft `profiles.last_answer_reset_at`. Liegt der Wert weniger als 7 Tage in der Vergangenheit, "
        "wird die Ausführung mit einer Fehlermeldung (RAISE EXCEPTION) abgebrochen, die dem Nutzer die verbleibenden Tage/Stunden anzeigt.",
        body_style
    ))

    story.append(Paragraph("7.5 Cronjobs (Datenbereinigung & Retry-Queue)", h2_style))
    story.append(Paragraph(
        "• <b>public.cleanup_old_answers():</b> Löscht täglich um 3:00 Uhr alle Antworten, die älter als 90 Tage sind. "
        "Dies schont Speicherressourcen und wahrt die Datensparsamkeit.<br/>"
        "• <b>public.retry_failed_generations():</b> Wird alle 10 Minuten ausgeführt. Sucht in `failed_generations` nach "
        "Fehlversuchen und sendet mittels der PostgreSQL-Erweiterung <i>pg_net</i> einen neuen asynchronen HTTP-POST-Request "
        "an die Edge Function zur Fragengenerierung.",
        body_style
    ))

    story.append(Paragraph("7.6 Meilenstein-Freischaltung: check_and_unlock_milestones()", h2_style))
    story.append(Paragraph(
        "Ein vollautomatisches Daten-Auswertungssystem auf Datenbankebene. Um die historische Unvollständigkeit der Tabelle "
        "<code>answers</code> zu umgehen, erfasst das System alle Fortschritte über persistente Zähler-Felder in der Tabelle <code>profiles</code>. "
        "Diese Felder werden automatisch über verschiedene Trigger gewartet:<br/>"
        "• <b>Antworten & Habits:</b> <code>total_answers</code>, <code>morning_answers_count</code>, <code>night_answers_count</code>, <code>lunch_answers_count</code> und <code>last_minute_answers_count</code> werden bei jedem Antwort-Einfügen (Insert) oder Löschen (Delete) gepflegt (Zeitzone Berlin). Ein 2-Tage-Schwellenwert verhindert das Zurücksetzen bei der automatischen 90-Tage-Bereinigung.<br/>"
        "• <b>Synchronität:</b> <code>time_sync_5min_count</code> und <code>time_sync_1min_count</code> erfassen zeitnahe Beantwortungen des Paars. <code>both_long_answers_count</code> trackt gleichzeitige detaillierte Freitext-Beantwortungen.<br/>"
        "• <b>Kalender & Harmonie:</b> <code>answered_valentines</code>, <code>answered_new_years</code> fangen Feiertage ab. <code>perfect_rankings_count</code> und <code>perfect_match_days_count</code> zählen perfekte inhaltliche Übereinstimmungen.<br/>"
        "• <b>Matches & Tiefe:</b> <code>total_matches</code> wird bei Übereinstimmungen inkrementiert. <code>long_answers_count</code> zählt Antworten &gt; 150 Zeichen.<br/>"
        "• <b>Anstupser & Avatare:</b> <code>nudges_sent</code> und <code>avatar_change_count</code> werden über <code>BEFORE UPDATE</code>-Trigger erfasst.<br/>"
        "• <b>Journal & Rebuilds:</b> <code>journal_views</code> wird via Client-RPC erhöht. <code>streaks_rebuilt</code> wird erhöht, wenn eine fortlaufende Antwortserie nach einem Abbruch wieder auf 7 Tage anwächst.<br/><br/>"
        "Die Meilenstein-Prüfung bewertet alle 20 Metriken parallel und schaltet Auszeichnungen freischaltungsdatum-genau frei.",
        body_style
    ))
    story.append(PageBreak())

    # ==========================================
    # KAPITEL 8: WEB-PUSH & NOTIFICATION SERVER
    # ==========================================
    story.append(Paragraph("8. Web-Push Notifications & Edge Function Integration", h1_style))
    story.append(Paragraph(
        "Die PWA-Push-Infrastruktur nutzt Deno-basierte Supabase Edge Functions für kryptografisch gesicherte Benachrichtigungen.",
        body_style
    ))

    story.append(Paragraph("8.1 Der Push-Notification-Dienst (send-push-notification)", h2_style))
    story.append(Paragraph(
        "Dieser Deno-Dienst empfängt API-Requests vom Client und bereitet das Notification-Payload-JSON (Titel, Nachricht, Ziel-URL) vor. "
        "Die eigentliche Übertragung erfolgt über das standardisierte Web-Push-Protokoll directly an den Push-Service des Empfänger-Browsers (z. B. Google FCM, Mozilla autopush).",
        body_style
    ))

    story.append(Paragraph("8.2 Kryptografische Absicherung (VAPID & AES-128-GCM)", h2_style))
    story.append(Paragraph(
        "Da Deno keine Node.js-Bibliotheken nativ unterstützt, wurde die Web-Push-Verschlüsselung vollständig über die Deno-interne "
        "<b>Web Crypto API</b> realisiert:<br/>"
        "1. <b>VAPID-Signierung (ES256):</b> Ein JSON Web Token (JWT) mit der Ziel-Audienz (Push-Endpoint des Browsers) und einer Ablaufzeit von 12 Stunden "
        "wird mit dem privaten VAPID-Schlüssel (ECDSA P-256) signiert. Der öffentliche VAPID-Schlüssel wird als Header-Information mitgeschickt.<br/>"
        "2. <b>Schlüsselaustausch (ECDH):</b> Die Edge Function generiert ein temporäres ECDH-Schlüsselpaar. Über das empfangene Client-Schlüsselpaar "
        "(p256dh und auth) wird ein gemeinsames Geheimnis (Shared Secret) berechnet.<br/>"
        "3. <b>Schlüsselableitung (HKDF):</b> Das System leitet über HKDF-SHA-256 den symmetrischen Content Encryption Key (CEK) und ein Nonce ab.<br/>"
        "4. <b>Verschlüsselung (AES-128-GCM):</b> Die Payload wird verschlüsselt und als binärer Datenstrom gesendet. "
        "Der Push-Service leitet die Nachricht an das Gerät weiter. Der lokale Service-Worker (<code>sw-push.js</code>) "
        "entschlüsselt die Payload und zeigt den System-Toast an.",
        body_style
    ))
    story.append(PageBreak())

    # ==========================================
    # KAPITEL 9: SYSTEMDATENFLUSS
    # ==========================================
    story.append(Paragraph("9. Systemdatenfluss & Datenarchitektur", h1_style))
    story.append(Paragraph(
        "Nachfolgend wird der typische Ablauf einer Interaktion visuell dargestellt, um das Zusammenspiel zwischen "
        "Frontend-Aktionen, Trigger-Prozessen und Hintergrund-Diensten zu verdeutlichen.",
        body_style
    ))

    flow_data = [
        [Paragraph("<b>Phase</b>", table_text_bold), Paragraph("<b>Akteur</b>", table_text_bold), Paragraph("<b>Aktion & Systemreaktion</b>", table_text_bold)],
        [
            Paragraph("1. Start", table_text_bold),
            Paragraph("Client App.tsx", table_text),
            Paragraph("Prüft Session. Lädt Profildaten. Fragt nach heutigen Fragen in daily_questions. Trigger-Prefetching für morgen.", table_text)
        ],
        [
            Paragraph("2. Beantwortung", table_text_bold),
            Paragraph("Client Questions.tsx", table_text),
            Paragraph("Nutzer beantwortet 3-4 Fragen. UI führt optische Verschlüsselungs-Animation aus und speichert Daten via Supabase Client.", table_text)
        ],
        [
            Paragraph("3. Persistierung", table_text_bold),
            Paragraph("Postgres DB", table_text),
            Paragraph("Speichert Zeile in public.answers. Löst Trigger 'on_answer_update_streak' aus, welcher Streaks & History aktualisiert.", table_text)
        ],
        [
            Paragraph("4. Notification", table_text_bold),
            Paragraph("Edge Function", table_text),
            Paragraph("Questions.tsx ruft 'send-push-notification' auf. VAPID verschlüsselte Push-Nachricht wird an Partner gesendet.", table_text)
        ],
        [
            Paragraph("5. Auswertung", table_text_bold),
            Paragraph("Edge Function", table_text),
            Paragraph("Bei Aufruf von StatsModal.tsx berechnet 'calculate-stats' über gte-small Embeddings & Rangabstände die Beziehungsdaten.", table_text)
        ]
    ]
    t_flow = Table(flow_data, colWidths=[70, 97, 320])
    t_flow.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#EAE5FF")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, bg_light]),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_flow)
    story.append(Spacer(1, 15))

    story.append(Paragraph("9.1 Fazit", h2_style))
    story.append(Paragraph(
        "Dank des Server-Driven UI-Prinzips, der server-seitigen Trigger für geschäftskritische Zustände (Streaks, Koppelungen) "
        "und der Auslagerung komplexer mathematischer Modelle in isolierte, bedarfsgesteuerte Edge Functions ist die Bisou App "
        "extrem ausfallsicher, performant und leicht erweiterbar. Alle Kernkomponenten arbeiten autark und greifen über "
        "sichere RLS-Policing-Mechanismen ineinander.",
        body_style
    ))

    # Dokument generieren
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF erfolgreich erstellt unter: {public_path}")

    # Copy to desktop as well for user convenience
    try:
        desktop_path = os.path.expanduser("~/Desktop")
        desktop_pdf_path = os.path.join(desktop_path, filename)
        import shutil
        shutil.copy2(public_path, desktop_pdf_path)
        print(f"PDF erfolgreich kopiert nach: {desktop_pdf_path}")
    except Exception as e:
        print(f"Konnte PDF nicht auf Desktop kopieren: {e}")

if __name__ == "__main__":
    build_pdf()
