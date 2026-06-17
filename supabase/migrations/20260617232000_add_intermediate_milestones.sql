-- Insert intermediate milestones to fill the gaps in the 3-year timeline
INSERT INTO public.milestones (name, description, icon, trigger_type, trigger_value) VALUES
  -- Days Connected
  ('Neuland-Abenteuer', 'Seit 760 Tagen erfolgreich miteinander gekoppelt.', '🗺️', 'days_connected', 760),
  ('Gemeinsame Höhen', 'Seit 830 Tagen erfolgreich miteinander gekoppelt.', '🧗', 'days_connected', 830),
  ('Sanfte Reife', 'Seit 860 Tagen erfolgreich miteinander gekoppelt.', '🌾', 'days_connected', 860),
  ('Herbstwind-Romantik', 'Seit 930 Tagen erfolgreich miteinander gekoppelt.', '🍁', 'days_connected', 930),
  ('Wärmendes Licht', 'Seit 960 Tagen erfolgreich miteinander gekoppelt.', '🕯️', 'days_connected', 960),
  ('Unerschütterlicher Fels', 'Seit 1030 Tagen erfolgreich miteinander gekoppelt.', '🗻', 'days_connected', 1030),
  ('Großes Funkenspiel', 'Seit 1060 Tagen erfolgreich miteinander gekoppelt.', '🎆', 'days_connected', 1060),

  -- Answer Streaks
  ('Rasanter Gleitflug', 'Haltet eine Antwort-Serie (Streak) von 430 Tagen.', '🛹', 'streak', 430),
  ('Leichtwind-Drachen', 'Haltet eine Antwort-Serie (Streak) von 460 Tagen.', '🪁', 'streak', 460),
  ('Gemeinsames Atelier', 'Haltet eine Antwort-Serie (Streak) von 530 Tagen.', '🎨', 'streak', 530),
  ('Ruhiges Fahrwasser', 'Haltet eine Antwort-Serie (Streak) von 560 Tagen.', '🛶', 'streak', 560),
  ('Eigener Wanderzirkus', 'Haltet eine Antwort-Serie (Streak) von 630 Tagen.', '🎪', 'streak', 630),
  ('Pfeilgerade Liebe', 'Haltet eine Antwort-Serie (Streak) von 660 Tagen.', '🏹', 'streak', 660),
  ('Sicherer Ankerplatz', 'Haltet eine Antwort-Serie (Streak) von 700 Tagen.', '⚓', 'streak', 700),
  ('Berg- und Talfahrt', 'Haltet eine Antwort-Serie (Streak) von 760 Tagen.', '🎢', 'streak', 760),
  ('Unzerstörbarer Kristall', 'Haltet eine Antwort-Serie (Streak) von 800 Tagen.', '💎', 'streak', 800),
  ('Unendliche Umlaufbahn', 'Haltet eine Antwort-Serie (Streak) von 900 Tagen.', '🌌', 'streak', 900),
  ('Sternschnuppenstrom', 'Haltet eine Antwort-Serie (Streak) von 950 Tagen.', '☄️', 'streak', 950),
  ('Liebesschild', 'Haltet eine Antwort-Serie (Streak) von 1030 Tagen.', '🛡️', 'streak', 1030),
  ('Zukunfts-Orakel', 'Haltet eine Antwort-Serie (Streak) von 1060 Tagen.', '🔮', 'streak', 1060),

  -- Answers Count
  ('Großes Abenteuergepäck', 'Beantwortet insgesamt 760 Fragen.', '🎒', 'answers_count', 760),
  ('Bunter Redefluss', 'Beantwortet insgesamt 830 Fragen.', '🦜', 'answers_count', 830),
  ('Klavierkonzert der Worte', 'Beantwortet insgesamt 860 Fragen.', '🎹', 'answers_count', 860),
  ('Karussell der Gedanken', 'Beantwortet insgesamt 930 Fragen.', '🎡', 'answers_count', 930),
  ('Löwenstarke Antworten', 'Beantwortet insgesamt 960 Fragen.', '🦁', 'answers_count', 960),
  ('Ewiger Fragenquell', 'Beantwortet insgesamt 1030 Fragen.', '⛲', 'answers_count', 1030),
  ('Monumentaler Gedankenpalast', 'Beantwortet insgesamt 1060 Fragen.', '🏰', 'answers_count', 1060),

  -- Matches Zähler
  ('Perfekt kombiniert', 'Findet 250 Übereinstimmungen bei euren Antworten.', '🧩', 'total_matches', 250),
  ('Frühlingserwachen der Gedanken', 'Findet 350 Übereinstimmungen bei euren Antworten.', '🌸', 'total_matches', 350),
  ('Seherische Harmonie', 'Findet 400 Übereinstimmungen bei euren Antworten.', '🔮', 'total_matches', 400),
  ('Süße Übereinstimmung', 'Findet 450 Übereinstimmungen bei euren Antworten.', '🍯', 'total_matches', 450),
  ('Leichtigkeit des Verstehens', 'Findet 550 Übereinstimmungen bei euren Antworten.', '🎈', 'total_matches', 550),
  ('Volltreffer-Herzen', 'Findet 600 Übereinstimmungen bei euren Antworten.', '🏹', 'total_matches', 600),
  ('Gemeinsame Sonnenblume', 'Findet 650 Übereinstimmungen bei euren Antworten.', '🌻', 'total_matches', 650),
  ('Fest verankerte Harmonie', 'Findet 700 Übereinstimmungen bei euren Antworten.', '⚓', 'total_matches', 700),
  ('Kosmische Wellenlänge', 'Findet 800 Übereinstimmungen bei euren Antworten.', '🚀', 'total_matches', 800),
  ('Liebes-Umlaufbahn', 'Findet 850 Übereinstimmungen bei euren Antworten.', '🪐', 'total_matches', 850),
  ('Sternenglanz-Einheit', 'Findet 900 Übereinstimmungen bei euren Antworten.', '💫', 'total_matches', 900),
  ('Thron der Kompatibilität', 'Findet 950 Übereinstimmungen bei euren Antworten.', '👑', 'total_matches', 950)
  ON CONFLICT DO NOTHING;

-- Recalculate milestones for all existing profiles to unlock the intermediate milestones
DO $$
DECLARE
    p RECORD;
BEGIN
    TRUNCATE TABLE public.unlocked_milestones CASCADE;
    
    FOR p IN SELECT id FROM public.profiles LOOP
        PERFORM public.check_and_unlock_milestones(p.id);
    END LOOP;
END $$;
