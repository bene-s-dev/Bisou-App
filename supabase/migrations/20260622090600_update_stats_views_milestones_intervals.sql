-- 1. Delete old stats_views milestones and their unlocks
DELETE FROM public.unlocked_milestones
WHERE milestone_id IN (
    SELECT id FROM public.milestones WHERE trigger_type = 'stats_views'
);

DELETE FROM public.milestones
WHERE trigger_type = 'stats_views';

-- 2. Seed new stats_views milestones (every 10 views, up to 100)
INSERT INTO public.milestones (name, description, icon, trigger_type, trigger_value)
VALUES
  ('Statistik-Lehrling', 'Schaue dir zum 10. Mal eure Bisou-Statistik an.', '🧪', 'stats_views', 10),
  ('Daten-Analyst', 'Schaue dir zum 20. Mal eure Bisou-Statistik an.', '📊', 'stats_views', 20),
  ('Zahlengenie', 'Schaue dir zum 30. Mal eure Bisou-Statistik an.', '🧮', 'stats_views', 30),
  ('Muster-Erkenner', 'Schaue dir zum 40. Mal eure Bisou-Statistik an.', '🔍', 'stats_views', 40),
  ('Nachwuchs-Forscher', 'Schaue dir zum 50. Mal eure Bisou-Statistik an.', '🔬', 'stats_views', 50),
  ('Liebes-Statistiker', 'Schaue dir zum 60. Mal eure Bisou-Statistik an.', '📈', 'stats_views', 60),
  ('Daten-Detektiv', 'Schaue dir zum 70. Mal eure Bisou-Statistik an.', '🕵️‍♂️', 'stats_views', 70),
  ('Beziehungs-Wissenschaftler', 'Schaue dir zum 80. Mal eure Bisou-Statistik an.', '🧠', 'stats_views', 80),
  ('Zukunfts-Prognostiker', 'Schaue dir zum 90. Mal eure Bisou-Statistik an.', '🔮', 'stats_views', 90),
  ('Professor der Liebe', 'Schaue dir zum 100. Mal eure Bisou-Statistik an.', '🎓', 'stats_views', 100);
