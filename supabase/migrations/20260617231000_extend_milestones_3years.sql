-- Insert new milestones to support a 3-year timeline (1095 days)
INSERT INTO public.milestones (name, description, icon, trigger_type, trigger_value) VALUES
  -- 1. Days Connected
  ('Gemeinsamer Kompass', 'Seit 800 Tagen erfolgreich miteinander gekoppelt.', '🧭', 'days_connected', 800),
  ('Beständiges Holz', 'Seit 900 Tagen erfolgreich miteinander gekoppelt.', '🪵', 'days_connected', 900),
  ('Tausendundeine Liebe', 'Seit 1000 Tagen erfolgreich miteinander gekoppelt.', '🌋', 'days_connected', 1000),
  ('Drei Jahre Bisou!', 'Ihr seid seit drei vollen Jahren (1095 Tage) gekoppelt. Ein unschlagbares Team!', '👑', 'days_connected', 1095),

  -- 2. Answer Streaks
  ('400 Tage im Karussell', 'Haltet eine Antwort-Serie (Streak) von 400 Tagen.', '🎡', 'streak', 400),
  ('Die 500-Tage-Festung', 'Haltet eine Antwort-Serie (Streak) von 500 Tagen.', '🏰', 'streak', 500),
  ('Kometenhafte Serie', 'Haltet eine Antwort-Serie (Streak) von 600 Tagen.', '☄️', 'streak', 600),
  ('Zwei Jahre Dauerfeuer!', 'Ihr habt zwei volle Jahre (730 Tage) lang jeden Tag eure Fragen beantwortet!', '💍', 'streak', 730),
  ('Kosmisches Band', 'Haltet eine Antwort-Serie (Streak) von 850 Tagen.', '🌌', 'streak', 850),
  ('Die magische Tausend', 'Haltet eine Antwort-Serie (Streak) von 1000 Tagen.', '💫', 'streak', 1000),
  ('Drei Jahre Dauerfeuer!', 'Ihr habt drei volle Jahre (1095 Tage) lang jeden Tag ohne Unterbrechung geantwortet!', '🏆', 'streak', 1095),

  -- 3. Answers Count
  ('Riesige Bibliothek', 'Beantwortet insgesamt 800 Fragen.', '📚', 'answers_count', 800),
  ('Umfangreicher Speicher', 'Beantwortet insgesamt 900 Fragen.', '💾', 'answers_count', 900),
  ('Das Beziehungs-Archiv', 'Beantwortet insgesamt 1000 Fragen.', '🏛️', 'answers_count', 1000),
  ('Drei Jahre Weisheit', 'Beantwortet insgesamt 1095 Fragen (3 Jahre täglich!).', '👑', 'answers_count', 1095),

  -- 4. Matches Zähler
  ('In vollkommener Harmonie', 'Findet 300 Übereinstimmungen bei euren Antworten.', '☯️', 'total_matches', 300),
  ('Gedankenübertragung der Extraklasse', 'Findet 500 Übereinstimmungen bei euren Antworten.', '🔮', 'total_matches', 500),
  ('Galaktische Verbindung', 'Findet 750 Übereinstimmungen bei euren Antworten.', '🌌', 'total_matches', 750),
  ('Die absolute Seelenverwandtschaft', 'Findet 1000 Übereinstimmungen bei euren Antworten.', '👑', 'total_matches', 1000),

  -- 5. Nudges / Stupser
  ('Ständiges Klingeln', 'Sende deinem Partner insgesamt 250 Anstupser.', '🔔', 'nudges_sent', 250),
  ('Magnetische Anziehung', 'Sende deinem Partner insgesamt 400 Anstupser.', '🧲', 'nudges_sent', 400),
  ('Großmeister des Anstupsens', 'Sende deinem Partner insgesamt 600 Anstupser.', '👑', 'nudges_sent', 600),

  -- 6. Gewohnheiten (Morning / Night / Lunch / Last Minute)
  ('Morgen-Botschafter', 'Beantworte 150 Fragen morgens vor 7:00 Uhr.', '🌅', 'morning_answers', 150),
  ('Sonnenkönig', 'Beantworte 300 Fragen morgens vor 7:00 Uhr.', '☀️', 'morning_answers', 300),
  ('Mitternachts-Chronist', 'Beantworte 150 Fragen nachts nach 23:00 Uhr.', '🦉', 'night_answers', 150),
  ('Herrscher der Nacht', 'Beantworte 300 Fragen nachts nach 23:00 Uhr.', '🌌', 'night_answers', 300),
  ('Mittags-Routine', 'Beantwortet die Fragen an 30 Tagen genau in der Mittagspause (12:00 - 13:30 Uhr).', '🥪', 'lunch_answers', 30),
  ('Kaffeeklatsch', 'Beantwortet die Fragen an 75 Tagen genau in der Mittagspause (12:00 - 13:30 Uhr).', '☕', 'lunch_answers', 75),
  ('Nerven aus Stahl', 'Beantworte die Fragen an 15 Tagen in den letzten 15 Minuten vor dem Reset.', '⏰', 'last_minute_answers', 15),
  ('Die Rettungs-Elite', 'Beantworte die Fragen an 30 Tagen in den letzten 15 Minuten vor dem Reset.', '🚒', 'last_minute_answers', 30),

  -- 7. Journal Besuche
  ('Chronist der Liebe', 'Besuche das Journal insgesamt 150-mal.', '📜', 'journal_views', 150),
  ('Museumsleiter', 'Besuche das Journal insgesamt 300-mal.', '🏛️', 'journal_views', 300),

  -- 8. Streaks retten / wiederaufbauen
  ('Stehauf-Profis', 'Baue zum 10. Mal eine 7-Tage-Serie nach einer Pause auf.', '🧩', 'streaks_rebuilt', 10),
  ('Unzerbrechliche Kette', 'Baue zum 20. Mal eine 7-Tage-Serie nach einer Pause auf.', '🔗', 'streaks_rebuilt', 20),

  -- 9. Synchronität
  ('Taktgeber', 'Beantwortet die Fragen an 10 Tagen innerhalb von 5 Minuten nacheinander.', '⏱️', 'time_sync_5min', 10),
  ('Perfektes Timing', 'Beantwortet die Fragen an 25 Tagen innerhalb von 5 Minuten nacheinander.', '⚡', 'time_sync_5min', 25),
  ('Im Gleichschritt', 'Beantwortet die Fragen an 50 Tagen innerhalb von 5 Minuten nacheinander.', '🔥', 'time_sync_5min', 50),
  ('Telepathisches Paar', 'Beantwortet die Fragen an 5 Tagen innerhalb von 60 Sekunden nacheinander.', '🧠', 'time_sync_1min', 5),
  ('Ein Gedanke zur gleichen Zeit', 'Beantwortet die Fragen an 15 Tagen innerhalb von 60 Sekunden nacheinander.', '⚡', 'time_sync_1min', 15),

  -- 10. Poeten (Textlänge)
  ('Schriftsteller der Liebe', 'Verfasse an 50 Tagen ausführliche Freitext-Antworten (über 150 Zeichen).', '✍️', 'long_answers', 50),
  ('Lebenswerk', 'Verfasse an 100 Tagen ausführliche Freitext-Antworten (über 150 Zeichen).', '📚', 'long_answers', 100),
  ('Briefwechsel', 'Beide Partner schreiben an 10 Tagen ausführliche Antworten (über 200 Zeichen).', '📜', 'both_long_answers', 10),
  ('Zwiegespräch', 'Beide Partner schreiben an 25 Tagen ausführliche Antworten (über 200 Zeichen).', '📖', 'both_long_answers', 25),

  -- 11. Perfekte Übereinstimmungen
  ('Harmonie-Meister', 'Erzielt an 15 Tagen eine Ranking-Ähnlichkeit von exakt 100%.', '🧩', 'perfect_rankings', 15),
  ('Ein Geist', 'Erzielt an 30 Tagen eine Ranking-Ähnlichkeit von exakt 100%.', '☯️', 'perfect_rankings', 30),
  ('Die Liebes-Akademie', 'Erreicht an 15 Tagen eine vollständige Übereinstimmung aller Choice-Fragen.', '🏰', 'perfect_match_days', 15),
  ('Der Beziehungs-Zenit', 'Erreicht an 30 Tagen eine vollständige Übereinstimmung aller Choice-Fragen.', '👑', 'perfect_match_days', 30),
  ('Gleichgesinnte', 'Erzielt an 15 Tagen eine Übereinstimmung von 100% bei den Dies-oder-Das-Fragen.', '👯', 'perfect_tot_days', 15),
  ('Die Zwillinge', 'Erzielt an 30 Tagen eine Übereinstimmung von 100% bei den Dies-oder-Das-Fragen.', '🌟', 'perfect_tot_days', 30)
  ON CONFLICT DO NOTHING;

-- Recalculate milestones for all existing profiles to unlock the new milestones
DO $$
DECLARE
    p RECORD;
BEGIN
    TRUNCATE TABLE public.unlocked_milestones CASCADE;
    
    FOR p IN SELECT id FROM public.profiles LOOP
        PERFORM public.check_and_unlock_milestones(p.id);
    END LOOP;
END $$;
