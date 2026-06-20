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
            return  # Seite 1 ohne Kopf-/Fußzeile
        
        self.saveState()
        self.setFont("Helvetica-Bold", 9)
        self.setFillColor(colors.HexColor("#5F27CD"))
        
        # Kopfzeile
        self.drawString(45, 805, "Bisou App - Handbuch & Technische Systemdokumentation")
        self.setStrokeColor(colors.HexColor("#5F27CD"))
        self.setLineWidth(1)
        self.line(45, 795, 550, 795)
        
        # Fußzeile
        self.setFont("Helvetica", 9)
        self.setFillColor(colors.HexColor("#2F3542"))
        page_text = f"Seite {self._pageNumber} von {page_count}"
        self.drawRightString(550, 35, page_text)
        self.drawString(45, 35, "Bisou App • Handbuch & Spezifikations-Dokument")
        self.setStrokeColor(colors.HexColor("#FF4757"))
        self.setLineWidth(0.5)
        self.line(45, 48, 550, 48)
        
        self.restoreState()

def build_pdf(filename="Bisou_App_Systemdokumentation.pdf"):
    current_dir = os.path.dirname(os.path.abspath(__file__))
    public_path = os.path.join(current_dir, "public", filename)
    
    # Ensure public folder exists
    os.makedirs(os.path.join(current_dir, "public"), exist_ok=True)
    
    # Printable area: 505pt width (margins reduced to 45pt for better mobile flow and breathing room)
    doc = SimpleDocTemplate(
        public_path,
        pagesize=A4,
        rightMargin=45,
        leftMargin=45,
        topMargin=60,
        bottomMargin=60
    )

    styles = getSampleStyleSheet()
    
    # Strong, vibrant brand colors
    primary = colors.HexColor("#FF4757")   # Vibrant Red/Rose
    secondary = colors.HexColor("#5F27CD") # Vibrant Purple/Violet
    text_main = colors.HexColor("#2F3542") # Dark Slate Gray (for high contrast)
    text_muted = colors.HexColor("#57606F")# Slate Gray
    bg_light = colors.HexColor("#F1F2F6")  # Light cool gray
    accent_box = colors.HexColor("#FFEAEF")# Vibrant Rose light tint
    
    # Mobile-optimized styles (larger sizes and line spacing)
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=secondary,
        alignment=TA_LEFT,
        spaceAfter=6
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        textColor=primary,
        alignment=TA_LEFT,
        spaceAfter=12
    )
    
    h1_style = ParagraphStyle(
        'H1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=secondary,
        spaceBefore=16,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'H2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        textColor=primary,
        spaceBefore=10,
        spaceAfter=5,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=text_main,
        spaceAfter=5
    )

    code_style = ParagraphStyle(
        'Code',
        parent=styles['Normal'],
        fontName='Courier-Bold',
        fontSize=8,
        leading=10.5,
        textColor=colors.HexColor("#1e293b"),
        spaceAfter=5
    )
    
    table_text_bold = ParagraphStyle(
        'TableTextBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=text_main
    )

    table_text = ParagraphStyle(
        'TableText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=9.5,
        textColor=text_muted
    )

    story = []

    # ==========================================
    # SEITE 1: TITEL & AUSFÜHRLICHES BENUTZERHANDBUCH
    # ==========================================
    
    # 1. Titel-Header mit farbigem Akzent-Balken
    t_header_data = [
        [Paragraph("Bisou App", title_style)],
        [Paragraph("Das umfassende Handbuch & Technische Systemdokumentation", subtitle_style)],
        [Paragraph("<b>Version:</b> 9.0 (Mobil-Optimiert) • <b>Datum:</b> 1. Juni 2026 • <b>Entwickler:</b> Benedikt S.", ParagraphStyle('MetaLine', parent=body_style, fontSize=8, textColor=text_muted))]
    ]
    t_header = Table(t_header_data, colWidths=[505])
    t_header.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), bg_light),
        ('PADDING', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,2), (-1,2), 12),
        ('LINELEFT', (0,0), (0,-1), 4, secondary),
    ]))
    story.append(t_header)
    story.append(Spacer(1, 10))
    
    # Inhaltsverzeichnis (TOC) - Benutzerhandbuch ist nun offizieller Teil des TOC
    story.append(Paragraph("System-Inhaltsverzeichnis", ParagraphStyle('H1_TOC', parent=h1_style, fontSize=11, spaceBefore=4, spaceAfter=4)))
    toc_data = [
        [Paragraph("<b>Abschnitt / Kapitel</b>", table_text_bold), Paragraph("<b>Beschreibung der App-Komponenten</b>", table_text_bold), Paragraph("<b>Seite</b>", table_text_bold)],
        [Paragraph("1. Ausführliches Benutzerhandbuch (Laien)", table_text_bold), Paragraph("Ausführliche Erklärung aller Alltags-Funktionen (Fragen, Spionschutz, Streaks, Freeze, Score).", table_text), Paragraph("1", table_text)],
        [Paragraph("2. Das Fragensystem & KI-Generierung", table_text_bold), Paragraph("Struktur der daily_questions, Gemini-Prompts und failed_generations Retry-Queue.", table_text), Paragraph("2", table_text)],
        [Paragraph("3. Beantwortungsprozess & Serialisierung", table_text_bold), Paragraph("Wizard-Schritte, LocalStorage-Zustandssicherung und Signatur-Vergleich.", table_text), Paragraph("3", table_text)],
        [Paragraph("4. Der Kompatibilitäts-Algorithmus", table_text_bold), Paragraph("Kosinus-Ähnlichkeit (gte-small), Spearman-Rangabstand und dynamische Gewichtung.", table_text), Paragraph("4", table_text)],
        [Paragraph("5. Streak- & Freeze-Zustandsmaschine", table_text_bold), Paragraph("check_and_freeze_streak, automatische Freezes und Erhalt der streak_history.", table_text), Paragraph("5", table_text)],
        [Paragraph("6. Erfolge- & Meilenstein-Zählersystem", table_text_bold), Paragraph("Die 20+ persistenten Zähler, Feiertags-Flags und clientseitige Deduplizierung.", table_text), Paragraph("6", table_text)],
        [Paragraph("7. Server-Driven UI & Ankündigungen", table_text_bold), Paragraph("Ankündigungen-Parser (renderAnnouncementContent) für Listen und Textzeilen.", table_text), Paragraph("7", table_text)],
        [Paragraph("8. Frontend-Architektur & Tab-Sync", table_text_bold), Paragraph("Virtual-Canvas responsive Skalierung, SafeAuthChannel (BroadcastChannel) für iOS.", table_text), Paragraph("7", table_text)],
        [Paragraph("9. Designkonzept & Micro-Animations", table_text_bold), Paragraph("HSL-Farbvariablen, Fraunces/Jakarta Sans, Keyframe-Effekte (flicker, wobble).", table_text), Paragraph("8", table_text)],
        [Paragraph("10. Datenbankschema & RLS Policies", table_text_bold), Paragraph("PostgreSQL DDL-Matrix (profiles, answers, streaks, failed_generations, announcements).", table_text), Paragraph("9", table_text)],
        [Paragraph("11. PL/pgSQL Funktionen & RPCs", table_text_bold), Paragraph("Partnerkopplung link_partners, unlink_partners, Account-Löschung, Antwort-Reset.", table_text), Paragraph("10", table_text)],
        [Paragraph("12. Web-Push & Deno Edge Functions", table_text_bold), Paragraph("Kryptografische PWA Push-Zustellung (ES256 VAPID, ECDH, AES-128-GCM).", table_text), Paragraph("11", table_text)],
        [Paragraph("13. Systemdatenfluss & Datenarchitektur", table_text_bold), Paragraph("Visuelle Datenmatrix vom Client über Trigger bis zur Edge-Function.", table_text), Paragraph("12", table_text)],
    ]
    t_toc = Table(toc_data, colWidths=[145, 325, 35])
    t_toc.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), accent_box),
        ('GRID', (0,0), (-1,-1), 0.75, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, bg_light]),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('ALIGN', (2,0), (2,-1), 'CENTER'),
    ]))
    story.append(t_toc)
    story.append(Spacer(1, 8))

    # Start von Kapitel 1 direkt auf Seite 1 (für mobile Ansicht fließend)
    story.append(Paragraph("1. Ausführliches Benutzerhandbuch: Funktionsweise der Bisou App (Laien-Erklärung)", h1_style))
    story.append(Paragraph(
        "Die Bisou App ist eine private PWA (Progressive Web App) für Paare, die ein tägliches Ritual der Nähe "
        "und des Austauschs pflegen wollen. Die Bedienung ist denkbar einfach und auf Langlebigkeit ausgelegt:<br/><br/>"
        "• <b>Das tägliche Ritual:</b> Jeden Tag um 12:00 Uhr mittags stellt die App vier neue Fragen bereit. "
        "Diese decken unterschiedliche emotionale Dimensionen ab: <i>Dies oder Das</i> (Entscheidung), <i>Prioritäten-Ranking</i> (Sortierung), "
        "<i>Freitext</i> (offene Frage zum Tippen) und <i>Wer würde eher</i> (wwe - spielerischer Partnervergleich).<br/>"
        "• <b>Der Spionschutz (Abschreibschutz):</b> Damit eure Antworten ehrlich und unbeeinflusst bleiben, "
        "sind die Antworten des Partners für den heutigen Tag mit einem Schloss gesperrt. Erst wenn du deine eigenen Fragen "
        "vollständig beantwortet hast, wird die Auswertung freigeschaltet und du siehst die Gedanken deines Partners.<br/>"
        "• <b>Die Antwortserie (Streak) & Streak-Freeze:</b> Für jeden Tag, an dem ihr beide antwortet, erhöht sich euer Streak (die Flamme). "
        "Vergesst ihr einmal zu antworten, erlischt der Streak normalerweise. Die App besitzt jedoch ein automatisches <b>Streak-Freeze-System</b>. "
        "Wenn ihr einen Tag verpasst, wird die Serie eingefroren (maximal zweimal im Monat), sodass eure Flamme beim nächsten Antworten nicht erlischt.<br/>"
        "• <b>Der Kompatibilitäts-Score (Bisou Score):</b> Eure Antworten der letzten 30 Tage werden miteinander abgeglichen. "
        "Daraus wird täglich ein Score von 0.0 bis 10.0 berechnet, der eure Ähnlichkeit und Harmonie widerspiegelt. Ein Trendpfeil zeigt an, "
        "ob euer Score steigt oder sinkt.<br/>"
        "• <b>Meilensteine & Trophäen:</b> Besondere Ereignisse (z. B. das erste Mal anstupsen, eine 7-Tage-Serie oder das Beantworten "
        "am Valentinstag oder zu Weihnachten) schalten Meilensteine frei. Das Dashboard feiert dies mit einem großen Konfetti-Regen. "
        "Alle Erfolge sind in eurem Profil im Popup 'Erfolge' golden markiert.<br/>"
        "• <b>Tagebuch:</b> Im Tagebuch könnt ihr bis zu 60 Tage zurückblättern, um alte Fragen und eure damaligen Antworten noch einmal zu lesen.",
        body_style
    ))
    story.append(PageBreak())

    # ==========================================
    # KAPITEL 2: DAS FRAGENSYSTEM & KI-GENERIERUNG
    # ==========================================
    story.append(Paragraph("2. Das Fragensystem & die Gemini-KI-Generierung", h1_style))
    story.append(Paragraph(
        "Die tägliche Interaktion basiert auf vier verschiedenen Fragentypen. Die Bereitstellung der Fragen erfolgt vollautomatisch über eine Supabase Edge Function "
        "(<code>generate-questions</code>), die über einen täglichen Cron-Job (mittels <code>pg_cron</code> auf der Datenbank) "
        "um 12:00 Uhr mittags getriggert wird.",
        body_style
    ))
    
    story.append(Paragraph("2.1 JSON-Struktur der täglichen Fragen", h2_style))
    story.append(Paragraph(
        "In der Tabelle <code>daily_questions</code> werden die Fragen im Feld <code>questions</code> als strukturiertes "
        "JSONB-Dokument gespeichert. Ein valides JSON-Dokument besitzt folgendes Schema:",
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

    story.append(Paragraph("2.2 Der Prompt-Algorithmus der Gemini API", h2_style))
    story.append(Paragraph(
        "Falls für ein angefordertes Datum (<code>day_key</code>) noch kein Fragen-Datensatz existiert, formuliert die Edge Function "
        "einen detaillierten System-Prompt an das Modell <code>gemini-1.5-flash</code>. Der Prompt instruiert die KI wie folgt:<br/>"
        "• Generiere genau 4 Fragen mit den Typen <code>tot</code> (Dies oder Das mit 2 Optionen), <code>ranking</code> (mit exakt 4 Optionen), "
        "<code>text</code> (offene Freitextfrage) und <code>wwe</code> (Wer würde eher).<br/>"
        "• Die Fragen müssen sich auf die Themen Partnerschaft, Alltag, Träume und gemeinsame Zukunft beziehen. "
        "Erzwinge die Ausgabe als reines, valides JSON-Dokument ohne Markdown-Formatting (keine Backticks wie ```json), "
        "damit der Deno-Server die Antwort direkt in die Datenbank schreiben kann.",
        body_style
    ))

    story.append(Paragraph("2.3 Robuste Fallbacks & failed_generations Retry-Queue", h2_style))
    story.append(Paragraph(
        "Um einen Systemausfall bei API-Drosselungen oder Netzwerkstörungen der Google API zu verhindern, implementiert die Funktion "
        "ein mehrstufiges Sicherheitsnetz:<br/>"
        "1. <b>Lokale Fallback-Datenbank:</b> Im Code der Edge Function ist eine statische Konstante <code>FALLBACK_QUESTIONS</code> mit vordefinierten "
        "Beispielfragen hinterlegt. Schlägt der Gemini-Aufruf fehl, greift das System auf diese zurück, sodass der Benutzer "
        "keine Fehlermeldung sieht.<br/>"
        "2. <b>Wiederholungs-Warteschlange (Retry-Queue):</b> Schlägt die Generierung fehl, schreibt die Funktion einen Datensatz in die Tabelle <code>failed_generations</code>. "
        "Ein Datenbank-Cronjob (<code>retry_failed_generations</code>) prüft diese Tabelle stündlich und versucht, die fehlenden Fragen asynchron im Hintergrund erneut per KI zu generieren. "
        "Ist dies erfolgreich, wird der Queue-Eintrag gelöscht.",
        body_style
    ))
    story.append(PageBreak())

    # ==========================================
    # KAPITEL 3: DER BEANTWORTUNGSPROZESS
    # ==========================================
    story.append(Paragraph("3. Der Beantwortungsprozess & die Datenserialisierung", h1_style))
    story.append(Paragraph(
        "Der Beantwortungsprozess im Client wird über einen Wizard gesteuert. Die App stellt sicher, dass "
        "Teilantworten lokal geschützt sind und dass die Antworten beider Partner sicher miteinander verglichen werden können.",
        body_style
    ))
    
    story.append(Paragraph("3.1 Clientseitige Zustandssicherung (LocalStorage-Cache)", h2_style))
    story.append(Paragraph(
        "Während der Benutzer die Fragen beantwortet, speichert die Komponente <code>Questions.tsx</code> nach jedem Einzelschritt "
        "den aktuellen Zustand im LocalStorage (Schlüssel: <code>quiz_progress_{dayKey}</code>). Das Objekt speichert den aktuellen "
        "Index des Schritts (0 bis 3) und ein Array mit den bisherigen Antworten. Dadurch wird verhindert, dass der Benutzer bei einem "
        "Verbindungsabbruch seinen Fortschritt verliert. "
        "Sobald der letzte Schritt vollendet und die Antworten erfolgreich an die Supabase-Datenbank übermittelt wurden, "
        "wird dieser LocalStorage-Eintrag bereinigt.",
        body_style
    ))

    story.append(Paragraph("3.2 Das serielle Antwort-String-Format & Signaturen", h2_style))
    story.append(Paragraph(
        "Die Antworten eines Benutzers für einen Tag werden nicht als separate Spalten oder Zeilen abgelegt, sondern als ein einziger, "
        "strukturiert serialisierter Text-String in der Spalte <code>choice</code> der Tabelle <code>answers</code> gespeichert. "
        "Das Format ist wie folgt aufgebaut:<br/>"
        "<code>Antwort1 | Antwort2 | Antwort3 | Antwort4 [Frage1][Frage2][Frage3][Frage4]</code><br/><br/>"
        "<b>Beispiel für einen echten Datenbank-Eintrag:</b><br/>"
        "<code>Sofa & Netflix | Offene Kommunikation > Körperliche Nähe > Hobbys | Zusammen kochen | Partner [tot:Was macht ihr sonntags?][ranking:Sortiert nach Prio...][text:Lieblingsgericht?][wwe:Wer ist ungeduldiger?]</code><br/><br/>"
        "<b>Der Zweck der Signatur-Klammern (Spionschutz & Integrität):</b><br/>"
        "Die am Ende angehängten Signatur-Klammern <code>[...]</code> enthalten den exakten Fragetext zum Zeitpunkt der Beantwortung. "
        "Da die Fragen theoretisch im Laufe des Tages regeneriert werden könnten, "
        "dient die Signatur als Validierung. Die Auswertungs-Function <code>calculate-stats</code> vergleicht die Signaturen beider Partner. "
        "Stimmen die Signaturen nicht überein, erkennt das System, dass die Partner auf unterschiedliche Fragen geantwortet haben. "
        "Dies verhindert Berechnungsfehler und falsche Auswertungen bei asynchronen Datumswechseln.",
        body_style
    ))

    story.append(Paragraph("3.3 Ablauf beim Absenden der Daten", h2_style))
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
    # KAPITEL 4: DER AUSWERTUNGS- ALGORITHMUS
    # ==========================================
    story.append(Paragraph("4. Der Kompatibilitäts- & Matching-Algorithmus (calculate-stats)", h1_style))
    story.append(Paragraph(
        "Die Berechnung der Übereinstimmungswerte erfolgt in der Deno Edge Function <code>calculate-stats</code>. "
        "Sie analysiert die letzten 30 Tage der Beziehung und wendet für jeden Fragentyp spezifische mathematische Verfahren an.",
        body_style
    ))
    
    story.append(Paragraph("4.1 Die vier Abgleich-Methoden im Detail", h2_style))
    story.append(Paragraph(
        "• <b>Dies oder Das (tot) - Binär-Matching:</b> Ein einfacher String-Vergleich. Stimmen die ausgewählten Optionen überein, "
        "beträgt der Match-Wert für diesen Tag 100%, andernfalls 0%.<br/>"
        "• <b>Ranking-Frage - Spearman-Distanz mit Wurzel-Dämpfung:</b> Die Partner sortieren 4 Optionen. Die Abweichung wird über die Summe "
        "der quadrierten Differenzen der Ränge (1 bis 4) berechnet. Der maximal mögliche quadratische Abstand bei 4 Elementen "
        "beträgt d^2_max = 20. Um eine Überstrafung kleiner Abweichungen zu verhindern "
        "und Paare psychologisch zu ermutigen, wird die Ähnlichkeit über eine Wurzelfunktion geglättet:<br/>"
        "<code>Score = Wurzel(1 - (Summe(Rang_A - Rang_B)^2 / 20)) * 100</code><br/>"
        "• <b>Freitext-Frage - Semantische Kosinus-Ähnlichkeit:</b> Die Texte werden durch das in der Edge Function ausgeführte Embedding-Modell "
        "<code>gte-small</code> in 384-dimensionale Vektor-Arrays konvertiert. Die mathematische Ähnlichkeit ist das Skalarprodukt der "
        "normierten Vektoren:<br/>"
        "<code>CosineSimilarity = (A · B) / (||A|| * ||B||)</code><br/>"
        "Das System mappt den Bereich [0.3; 0.9] linear auf [0%; 100%]. Schlägt die Vektor-Erstellung fehl, berechnet das System als Fallback den Jaccard-Koeffizienten (Schnittmenge der Wörter geteilt durch die Vereinigungsmenge).<br/>"
        "• <b>Wer würde eher (wwe) - Komplementär-Abgleich:</b> Da sich Partner bei WWE-Fragen einig sind, "
        "wenn einer 'Ich' und der andere 'Partner' wählt, liegt ein Match vor, wenn die Antwort-Strings <i>ungleich</i> sind: "
        "<code>choice_A !== choice_B</code> (Match: 100%, sonst 0%).",
        body_style
    ))

    story.append(Paragraph("4.2 Dynamische Gewichtung & Berechnung des Bisou-Scores", h2_style))
    story.append(Paragraph(
        "Der Gesamt-Bisou-Score liegt auf einer Skala von 0.0 bis 10.0. Jede der vier Fragenkategorien hat das gleiche Gewicht von 25% (Faktor 0.25). "
        "Um verfälschte Ergebnisse bei unvollständigen Daten zu vermeiden, wendet die Funktion eine <b>dynamische Gewichtungs-Normalisierung</b> an:<br/>"
        "• Es werden nur Kategorien in die Berechnung einbezogen, bei denen für die betrachteten Tage tatsächlich Antworten beider Partner vorliegen.<br/>"
        "• Die Summe der Übereinstimmungsprozente der aktiven Kategorien wird durch die Anzahl der tatsächlich aktiven Kategorien geteilt.<br/>"
        "• Der resultierende Prozentwert wird durch 10 geteilt und mathematisch auf eine Dezimalstelle gerundet (z.B. 84.3% Übereinstimmung = Score 8.4).",
        body_style
    ))

    story.append(Paragraph("4.3 Trendberechnung und Trendpfeile", h2_style))
    story.append(Paragraph(
        "Das Dashboard zeigt neben dem Bisou-Score einen Trendpfeil (Up/Down) an. Um diesen zu ermitteln, berechnet die Edge Function "
        "zwei Werte parallel: Den aktuellen Bisou-Score der letzten 30 Tage (inklusive heute) und den vorherigen Bisou-Score (indem der "
        "allerneueste gemeinsame Antworttag aus der Berechnung ausgeschlossen wird). Ist der aktuelle Score höher als der vorherige, "
        "wird ein steigender Trend signalisiert, andernfalls ein fallender.",
        body_style
    ))
    story.append(PageBreak())

    # ==========================================
    # KAPITEL 5: STREAK SYSTEM & STREAK FREEZE
    # ==========================================
    story.append(Paragraph("5. Streak-Verwaltung & Streak-Freeze System", h1_style))
    story.append(Paragraph(
        "Das Halten einer Antwortserie (Streak) ist ein wesentlicher Motivationsfaktor der App. Um unverschuldete "
        "Serienverluste abzufedern, implementiert die App eine ausgeklügelte "
        "Zustandsmaschine zur automatischen Streak-Einfrierung.",
        body_style
    ))

    story.append(Paragraph("5.1 Funktionsweise von check_and_freeze_streak()", h2_style))
    story.append(Paragraph(
        "Jedes Mal, wenn ein Benutzer die App öffnet, triggert der Client die RPC-Datenbankfunktion "
        "<code>check_and_freeze_streak(p_today)</code>. Die Funktion arbeitet wie folgt:<br/>"
        "1. Sie prüft, ob der Streak des Nutzers aktiv ist. Ist das letzte Antwortdatum (<code>last_answer_date</code>) heute "
        "oder gestern, bleibt der Streak unberührt.<br/>"
        "2. Hat der Nutzer gestern nicht geantwortet, ermittelt das System, ob ein <b>Streak-Freeze</b> angewendet werden kann. "
        "Dazu analysiert die Funktion das Array <code>freeze_history</code>. Sie zählt die verbrauchten Freezes im Kalendermonat "
        "des Vortages. Liegt die Anzahl bei <b>unter 2</b>, wird das gestrige Datum in die <code>freeze_history</code> eingetragen "
        "und der Streak bleibt erhalten (eingefroren).<br/>"
        "3. Sind bereits 2 Freezes für diesen Monat verbraucht, bricht der Streak ab und wird auf 0 zurückgesetzt.",
        body_style
    ))

    story.append(Paragraph("5.2 Integration in update_streak() & Erhalt der Streak-Historie", h2_style))
    story.append(Paragraph(
        "Der AFTER INSERT-Trigger <code>update_streak</code> auf Antworten integriert diese Logik nahtlos. Gibt ein Benutzer eine Antwort ab, "
        "wird geprüft, ob er gestern verpasst hat. Ist dies der Fall und ein Freeze steht zur Verfügung, wird der Streak "
        "fortgeführt (+2 Tage addiert für den Freeze-Tag und heute) und das verpasste Datum in die <code>freeze_history</code> eingetragen. "
        "<b>Wichtiger Erhalt der Historie:</b> Bricht der Streak ab oder wird er zurückgesetzt (oder korrigiert der Nutzer seine Antworten), "
        "überschreibt die Funktion <code>streak_history</code> nicht mehr mit dem heutigen Tag, sondern hängt das Datum an. "
        "Dies verhindert Datenverluste und sichert die Validität der historischen Antwortstatistiken.",
        body_style
    ))
    story.append(PageBreak())

    # ==========================================
    # KAPITEL 6: ACHIEVEMENTS & MILESTONES ZÄHLER
    # ==========================================
    story.append(Paragraph("6. Erfolge & Meilenstein-Zählersystem", h1_style))
    story.append(Paragraph(
        "Das Achievement-System der Bisou App ist vollständig entkoppelt von der temporären Tabelle `answers` (die nach 90 Tagen bereinigt wird). "
        "Es basiert auf persistenten Zählerfeldern direkt in der Tabelle <code>profiles</code>, die synchron bei Antwort-Interaktionen gewartet werden.",
        body_style
    ))

    story.append(Paragraph("6.1 Die synchronisierten Datenbank-Metriken", h2_style))
    story.append(Paragraph(
        "Die folgenden 20+ persistenten Metriken werden in <code>public.profiles</code> gepflegt:<br/>"
        "• <code>total_answers</code>: Erfasst alle jemals eingereichten Antworten des Benutzers.<br/>"
        "• <code>total_matches</code>: Zählt die Übereinstimmungen aller Dies-oder-Das- und Ranking-Antworten.<br/>"
        "• <code>perfect_tot_days_count</code>: Zählt Tage mit perfekter Übereinstimmung bei Dies-oder-Das (tot) Fragen.<br/>"
        "• <code>perfect_match_days_count</code>: Tage, an denen alle Auswahlfragen (tot & wwe) absolut identisch beantwortet wurden.<br/>"
        "• <code>perfect_rankings_count</code>: Erzielt durch 100%-Übereinstimmungen im Prioritäten-Ranking.<br/>"
        "• <code>time_sync_5min_count</code> / <code>time_sync_1min_count</code>: Erfasst, wie oft Partner innerhalb von 5 Minuten bzw. 60 Sekunden nacheinander geantwortet haben.<br/>"
        "• <code>morning_answers_count</code> / <code>night_answers_count</code> / <code>lunch_answers_count</code> / <code>last_minute_answers_count</code>: Zeitbasierte Beantwortungsmuster.<br/>"
        "• <code>long_answers_count</code>: Freitext-Antworten mit mehr als 150 Zeichen.<br/>"
        "• <code>both_long_answers_count</code>: Tage, an denen beide Partner eine lange Freitext-Antwort (&gt; 200 Zeichen) abgegeben haben.<br/>"
        "• <code>avatar_change_count</code>: Zählt Profilbild-Aktualisierungen.<br/>"
        "• <code>nudges_sent</code>: Gesamtzahl aller an den Partner übermittelten Anstupser (nudge).<br/>"
        "• <code>journal_views</code>: Erfasst das interest der Partner am Archiv.<br/>"
        "• <code>streaks_rebuilt</code>: Zählt, wie oft ein abgebrochener Streak wieder auf 7 Tage aufgebaut wurde.",
        body_style
    ))

    story.append(Paragraph("6.2 Feiertags-Trigger & Meilenstein-Deduplizierung", h2_style))
    story.append(Paragraph(
        "• <b>Feiertags-Trigger (Boolean-Flags):</b> Die Tabelle <code>profiles</code> hält dedizierte Flags für Feiertage: "
        "<code>answered_valentines</code> (14. Feb), <code>answered_new_years</code> (1. Jan), <code>answered_christmas</code> (24.-26. Dez), "
        "<code>answered_halloween</code> (31. Okt), <code>answered_labor_day</code> (1. Mai), <code>answered_unity_day</code> (3. Okt), "
        "<code>answered_leap_day</code> (29. Feb) und <code>answered_anniversary</code> (am Jahrestag der Kopplung). "
        "Diese Trigger schalten die speziellen Event-Meilensteine frei.<br/>"
        "• <b>Clientseitige Toast-Deduplizierung:</b> Um wiederholtes Anzeigen desselben Meilenstein-Banners zu unterbinden, "
        "liest der Client die Liste bereits gesehener Meilensteine beim Start in ein lokales Set (<code>seen_milestones_{userId}</code>) ein. "
        "Nur wenn ein neu eingelesener Erfolg nicht in diesem Set existiert, wird der Dashboard-Toast gerendert, Konfetti ausgelöst "
        "und die ID dem Set hinzugefügt. Dies entlastet das Backend von wiederholten Sichtbarkeits-Updates.",
        body_style
    ))
    story.append(PageBreak())

    # ==========================================
    # KAPITEL 7: SERVER-DRIVEN UI & ANNOUNCEMENTS
    # ==========================================
    story.append(Paragraph("7. Server-Driven UI & Systemankündigungen", h1_style))
    story.append(Paragraph(
        "Das Ankündigungssystem ermöglicht es, Benachrichtigungen mit strukturiertem Inhalt direkt aus der Datenbank zu steuern. "
        "Dazu wertet die Client-seitige Funktion <code>renderAnnouncementContent(text)</code> in <code>App.tsx</code> das Textfeld <code>content</code> der Tabelle <code>announcements</code> zeilenweise aus:<br/><br/>"
        "• <b>Listenpunkte (Bullet-Points):</b> Zeilen, die mit einem der Sonderzeichen <b>•</b>, <b>-</b> oder <b>*</b> beginnen, werden automatisch erkannt. Das System entfernt das Sonderzeichen sowie führende Leerzeichen und gruppiert alle direkt aufeinanderfolgenden Listenpunkte in eine linksbündige ungeordnete HTML-Liste (<code>&lt;ul&gt;</code> und <code>&lt;li&gt;</code>) mit Standard-Aufzählungspunkten.<br/>"
        "• <b>Standard-Text:</b> Normale Textzeilen werden als zentrierte Textabsätze (<code>&lt;p&gt;</code>) dargestellt.<br/>"
        "• <b>Absätze & Zeilenumbrüche:</b> Leere Zeilen im Text erzeugen einen kleinen vertikalen Abstand zur visuellen Gliederung.",
        body_style
    ))
    story.append(PageBreak())

    # ==========================================
    # KAPITEL 8: FRONTEND-DETAILS, TAB-SYNC & DIALOGS
    # ==========================================
    story.append(Paragraph("8. Frontend-Architektur, Tab-Sync & Dialog-System", h1_style))
    story.append(Paragraph(
        "Die Client-Architektur fokussiert sich auf eine immersive PWA-Erfahrung, die auch unter restriktiven Bedingungen stabil läuft.",
        body_style
    ))

    story.append(Paragraph("8.1 Der SafeAuthChannel für resilienten Tab-Sync", h2_style))
    story.append(Paragraph(
        "Um An- und Abmeldungen über mehrere offene Browser-Tabs hinweg synchron zu halten, verwendet die App normalerweise die native "
        "<code>BroadcastChannel</code>-API. In restriktiven Umgebungen (wie iOS In-App-Browsern in Instagram, Telegram oder WebViews) "
        "kann die Initialisierung der BroadcastChannel-API jedoch zu harten JavaScript-Abstürzen führen. Die App kapselt den Aufruf daher in der Klasse "
        "<code>SafeAuthChannel</code>. Tritt beim Erstellen des Kanals oder Senden von Nachrichten ein Fehler auf, wird dieser abgefangen, "
        "protokolliert und ein stummer Fallback aktiviert. Dadurch bleibt die App auf allen Endgeräten voll einsatzbereit.",
        body_style
    ))

    story.append(Paragraph("8.2 Responsive UI-Skalierung (Virtual-Canvas)", h2_style))
    story.append(Paragraph(
        "Die gesamte Anwendung nutzt einen <code>ScalingContainer</code>. Dieser verhält sich wie eine virtuelle Canvas, die das Layout "
        "bei extremen Auflösungen oder Seitenverhältnissen (wie iPhone SE oder großen Tablets) proportional skaliert. "
        "Dadurch wird das Abschnippeln von Steuerungselementen oder der Dock-Navigationsleiste am unteren Bildschirmrand effektiv verhindert.",
        body_style
    ))

    story.append(Paragraph("8.3 Das anpassbare DialogProvider-System", h2_style))
    story.append(Paragraph(
        "Die klassischen JavaScript-Funktionen <code>alert()</code> und <code>confirm()</code> wurden vollständig durch React-Modals ersetzt:<br/>"
        "• <code>showAlert(message, type)</code>: Blendet ein unaufdringliches, aber unübersehbares Overlay mit dem Nachrichtext ein.<br/>"
        "• <code>showConfirm(message, onConfirm, options)</code>: Rendert eine Ja/Nein-Abfrage (z. B. beim Zurücksetzen von Antworten) mit anpassbaren Button-Labels.",
        body_style
    ))
    story.append(PageBreak())

    # ==========================================
    # KAPITEL 9: DESIGNKONZEPT
    # ==========================================
    story.append(Paragraph("9. Designkonzept, HSL-Theme & Micro-Animations", h1_style))
    story.append(Paragraph(
        "Das visuelle Design der Bisou App zeichnet sich durch weiche Verläufe, harmonische Farbtöne und intuitive Bedienung aus.",
        body_style
    ))

    story.append(Paragraph("9.1 HSL-Theme Farbvariablen", h2_style))
    story.append(Paragraph(
        "Das CSS-Theme steuert alle Farben über native HSL-Variablen, um eine nahtlose Umschaltung zwischen Hell- und Dunkelmodus "
        "zu ermöglichen. Die Primärfarbe (Rose/Rot) vermittelt Wärme, während die Sekundärfarbe (Soft Lila) für Vertrauen steht.",
        body_style
    ))

    design_colors = [
        [Paragraph("<b>CSS Variable</b>", table_text_bold), Paragraph("<b>Light Theme</b>", table_text_bold), Paragraph("<b>Dark Theme</b>", table_text_bold), Paragraph("<b>Semantischer Nutzen</b>", table_text_bold)],
        [Paragraph("--primary", table_text_bold), Paragraph("#FF4757 (Vibrant Red)", table_text), Paragraph("#FF4757 (Vibrant Red)", table_text), Paragraph("Streaks, Buttons, Akzente", table_text)],
        [Paragraph("--secondary", table_text_bold), Paragraph("#5F27CD (Vibrant Purple)", table_text), Paragraph("#B4AFFF (Hell-Lila)", table_text), Paragraph("Buttons, Meilensteine", table_text)],
        [Paragraph("--bg", table_text_bold), Paragraph("#F1F2F6 (Cool-White)", table_text), Paragraph("#0C0A15 (Tief-Schwarz)", table_text), Paragraph("Hintergrundfarbe", table_text)],
        [Paragraph("--text-main", table_text_bold), Paragraph("#2F3542 (Dark Slate)", table_text), Paragraph("#F5F3FF (Off-White)", table_text), Paragraph("Überschriften und Fließtext", table_text)],
        [Paragraph("--card-border", table_text_bold), Paragraph("#E2DFFF (Hell-Grau-Lila)", table_text), Paragraph("#231E3D (Dunkel-Violett)", table_text), Paragraph("Ränder von Karten & Feldern", table_text)]
    ]
    t_colors = Table(design_colors, colWidths=[95, 105, 105, 182])
    t_colors.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), accent_box),
        ('GRID', (0,0), (-1,-1), 0.75, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, bg_light]),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(t_colors)

    story.append(Paragraph("9.2 Typografie & Micro-Animations", h2_style))
    story.append(Paragraph(
        "• <b>Fraunces & Plus Jakarta Sans:</b> Fraunces (Serif) wird im Header für das Logo verwendet, um Intimität zu vermitteln. "
        "Plus Jakarta Sans dient dank breiter geometrischer Formen als Hauptschriftart für die UI.<br/>"
        "• <b>Flame Wobble & Flicker (`.animate-flicker`):</b> Animiert die Flammen-Icons bei aktiven Antwortserien mit zufallsnahen "
        "Rotationsänderungen (±3 Grad), um das Flackern einer echten Kerze nachzuahmen.",
        body_style
    ))
    story.append(PageBreak())

    # ==========================================
    # KAPITEL 10: DATENBANKSCHEMA
    # ==========================================
    story.append(Paragraph("10. Datenbank-Struktur & Schema-Referenz", h1_style))
    story.append(Paragraph(
        "Die PostgreSQL-Datenbank strukturiert alle Relationen, Integritätsbedingungen (Foreign Keys) und Trigger.",
        body_style
    ))

    # Profiles Table Schema
    story.append(Paragraph("10.1 Profile-Tabelle (public.profiles) mit neuen Spalten", h2_style))
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
  perfect_rankings_count integer DEFAULT 0 NOT NULL,
  perfect_match_days_count integer DEFAULT 0 NOT NULL,
  perfect_tot_days_count integer DEFAULT 0 NOT NULL,
  answered_valentines boolean DEFAULT false NOT NULL,
  answered_new_years boolean DEFAULT false NOT NULL,
  answered_christmas boolean DEFAULT false NOT NULL,
  answered_halloween boolean DEFAULT false NOT NULL,
  answered_labor_day boolean DEFAULT false NOT NULL,
  answered_unity_day boolean DEFAULT false NOT NULL,
  answered_anniversary boolean DEFAULT false NOT NULL,
  answered_leap_day boolean DEFAULT false NOT NULL
);"""
    story.append(Paragraph(profiles_sql.replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style))

    # Answers Table Schema
    story.append(Paragraph("10.2 Antworten-Tabelle (public.answers)", h2_style))
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
    story.append(Paragraph("10.3 Streaks-Tabelle (public.streaks)", h2_style))
    streaks_sql = """CREATE TABLE public.streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  partner_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_streak integer DEFAULT 0 NOT NULL,
  longest_streak integer DEFAULT 0 NOT NULL,
  last_answer_date date,
  streak_history jsonb DEFAULT '[]'::jsonb NOT NULL,
  freeze_history jsonb DEFAULT '[]'::jsonb NOT NULL,
  CONSTRAINT streaks_user_id_partner_id_key UNIQUE (user_id, partner_id)
);"""
    story.append(Paragraph(streaks_sql.replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style))
    story.append(PageBreak())

    # Additional Tables Specification
    story.append(Paragraph("10.4 Zusätzliche Tabellen-Spezifikationen & failed_generations", h1_style))
    
    other_tables_sql = """-- failed_generations (Retry-Queue)
CREATE TABLE public.failed_generations (
  day_key date PRIMARY KEY,
  failed_at timestamptz DEFAULT now() NOT NULL,
  retry_count integer DEFAULT 0 NOT NULL
);

-- Ankündigungen (Server-Driven Popups)
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
);"""
    story.append(Paragraph(other_tables_sql.replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style))
    story.append(PageBreak())

    # ==========================================
    # KAPITEL 11: PL/PGSQL RPC FUNCTIONS
    # ==========================================
    story.append(Paragraph("11. PL/pgSQL Funktionen, Trigger & RPCs", h1_style))
    
    story.append(Paragraph("11.1 Partnerkopplung: public.link_partners()", h2_style))
    story.append(Paragraph(
        "Führt eine atomare, bidirektionale Verknüpfung zweier Profile durch. Die Funktion nimmt den `partner_code_to_link` "
        "entgegen, sucht die zugehörige UUID und setzt gegenseitig `partner_id` sowie `partner_since` auf den aktuellen Zeitstempel.",
        body_style
    ))
    
    story.append(Paragraph("11.2 Kontolöschung: public.delete_user_account()", h2_style))
    story.append(Paragraph(
        "Löscht das Konto des angemeldeten Benutzers sicher aus `auth.users`. Um eine Verletzung von Fremdschlüsselbedingungen "
        "zu vermeiden, hebt die Funktion zuerst die Koppelung beim Partner auf (setzt dort `partner_id` auf NULL) "
        "und löscht anschließend den User-Datensatz.",
        body_style
    ))

    story.append(Paragraph("11.3 Streak-Verwaltung: public.update_streak()", h2_style))
    story.append(Paragraph(
        "Ein AFTER INSERT-Trigger auf <code>public.answers</code>. Wird eine Antwort gespeichert, ermittelt der Trigger "
        "das aktuelle Datum und prüft den Tag der letzten Antwort. War die letzte Antwort gestern, wird der Streak "
        "inkrementiert und das Datum an die <code>streak_history</code> angehängt. Liegt die letzte Antwort länger zurück, "
        "wird die Serie auf 1 zurückgesetzt. <b>Historie-Schutz:</b> Wenn der Streak zurückgesetzt wird, wird die Historie "
        "nicht überschrieben, sondern der heutige Tag wird angehängt. Dies stellt sicher, dass die vollständige Antwort-Historie "
        "in <code>streak_history</code> erhalten bleibt.",
        body_style
    ))

    story.append(Paragraph("11.4 Antwort-Reset: public.reset_today_answers(day_key_param text)", h2_style))
    story.append(Paragraph(
        "Erlaubt es Nutzern, ihre heutigen Antworten zu löschen, um sie neu zu beantworten. Die Funktion implementiert "
        "einen harten 7-Tage-Cooldown. Sie prüft `profiles.last_answer_reset_at`. Liegt der Wert weniger als 7 Tage in der Vergangenheit, "
        "wird die Ausführung mit einer Fehlermeldung (RAISE EXCEPTION) abgebrochen.",
        body_style
    ))

    story.append(Paragraph("11.5 Cronjobs (Datenbereinigung & Retry-Queue)", h2_style))
    story.append(Paragraph(
        "• <b>public.cleanup_old_answers():</b> Löscht täglich um 3:00 Uhr alle Antworten, die älter als 90 Tage sind.<br/>"
        "• <b>public.retry_failed_generations():</b> Wird stündlich ausgeführt. Sucht in `failed_generations` nach "
        "Fehlversuchen und sendet mittels der PostgreSQL-Erweiterung <i>pg_net</i> einen neuen asynchronen HTTP-POST-Request "
        "an die Edge Function zur Fragengenerierung.",
        body_style
    ))

    story.append(Paragraph("11.6 Meilenstein-Freischaltung: check_and_unlock_milestones()", h2_style))
    story.append(Paragraph(
        "Ein vollautomatisches Daten-Auswertungssystem auf Datenbankebene. Um die historische Unvollständigkeit der Tabelle "
        "<code>answers</code> zu umgehen, erfasst das System alle Fortschritte über persistente Zähler-Felder in der Tabelle <code>profiles</code>. "
        "Diese Felder werden automatisch über verschiedene Trigger gewartet (inklusive der neuen Spalten für Feiertage).",
        body_style
    ))
    story.append(PageBreak())

    # ==========================================
    # KAPITEL 12: WEB-PUSH & NOTIFICATION SERVER
    # ==========================================
    story.append(Paragraph("12. Web-Push Notifications & Edge Function Integration", h1_style))
    story.append(Paragraph(
        "Die PWA-Push-Infrastruktur nutzt Deno-basierte Supabase Edge Functions für kryptografisch gesicherte Benachrichtigungen.",
        body_style
    ))

    story.append(Paragraph("12.1 Der Push-Notification-Dienst (send-push-notification)", h2_style))
    story.append(Paragraph(
        "Dieser Deno-Dienst empfängt API-Requests vom Client und bereitet das Payload-JSON vor. Die Übertragung "
        "erfolgt über das Web-Push-Protokoll direkt an den Push-Service des Empfänger-Browsers.",
        body_style
    ))

    story.append(Paragraph("12.2 Kryptografische Absicherung (VAPID & AES-128-GCM)", h2_style))
    story.append(Paragraph(
        "Die Push-Verschlüsselung wird vollständig über die Deno-interne Web Crypto API realisiert:<br/>"
        "1. <b>VAPID-Signierung (ES256):</b> Ein JWT mit der Ziel-Audienz und Ablaufzeit von 12 Stunden wird mit dem privaten VAPID-Schlüssel (ECDSA P-256) signiert.<br/>"
        "2. <b>Schlüsselaustausch (ECDH):</b> Deno generiert ein temporäres ECDH-Schlüsselpaar und berechnet über Diffie-Hellman-Schlüsselaustausch mit dem Client ein Shared Secret.<br/>"
        "3. <b>Schlüsselableitung (HKDF):</b> Das System leitet den symmetrischen Content Encryption Key (CEK) und ein Nonce ab.<br/>"
        "4. <b>Verschlüsselung (AES-128-GCM):</b> Die Payload wird verschlüsselt und als binärer Datenstrom gesendet.",
        body_style
    ))
    story.append(PageBreak())

    # ==========================================
    # KAPITEL 13: SYSTEMDATENFLUSS
    # ==========================================
    story.append(Paragraph("13. Systemdatenfluss & Datenarchitektur", h1_style))
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
            Paragraph("Questions.tsx ruft 'send-push-notification' auf. VAPID-verschlüsselte Push-Nachricht wird an Partner gesendet.", table_text)
        ],
        [
            Paragraph("5. Auswertung", table_text_bold),
            Paragraph("Edge Function", table_text),
            Paragraph("Bei Aufruf von StatsModal.tsx berechnet 'calculate-stats' über gte-small Embeddings & Rangabstände die Beziehungsdaten.", table_text)
        ]
    ]
    t_flow = Table(flow_data, colWidths=[70, 97, 338])
    t_flow.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), accent_box),
        ('GRID', (0,0), (-1,-1), 0.75, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, bg_light]),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
    ]))
    story.append(t_flow)
    story.append(Spacer(1, 10))

    story.append(Paragraph("13.1 Fazit", h2_style))
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
