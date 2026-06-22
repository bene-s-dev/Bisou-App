-- Update milestone descriptions from 'Beziehungs-Statistiken' to 'Bisou-Statistik'
UPDATE public.milestones
SET description = 'Schaue dir zum 1. Mal eure Bisou-Statistik an.'
WHERE name = 'Statistik-Lehrling';

UPDATE public.milestones
SET description = 'Schaue dir zum 5. Mal eure Bisou-Statistik an.'
WHERE name = 'Daten-Analyst';

UPDATE public.milestones
SET description = 'Schaue dir zum 15. Mal eure Bisou-Statistik an.'
WHERE name = 'Nachwuchs-Forscher';

UPDATE public.milestones
SET description = 'Schaue dir zum 30. Mal eure Bisou-Statistik an.'
WHERE name = 'Beziehungs-Wissenschaftler';

UPDATE public.milestones
SET description = 'Schaue dir zum 50. Mal eure Bisou-Statistik an.'
WHERE name = 'Professor der Liebe';
