-- ==========================================
-- Visual Questions Pool
-- Stores Unsplash photo pairs for Sunday image-based "Dies oder das" questions.
-- Add more rows here or via the admin panel to extend the pool.
-- ==========================================

CREATE TABLE IF NOT EXISTS public.visual_questions_pool (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_index  INTEGER NOT NULL UNIQUE,   -- determines which Sunday gets which pair (ascending)
  photo_id_a   TEXT NOT NULL,             -- Unsplash photo ID for option A
  photo_id_b   TEXT NOT NULL,             -- Unsplash photo ID for option B
  label_a      TEXT NOT NULL,             -- short label shown under image A (stored as answer)
  label_b      TEXT NOT NULL,             -- short label shown under image B (stored as answer)
  topic_hint   TEXT NOT NULL,             -- hint for Gemini to generate the question text
  used_on      DATE,                      -- NULL = available, DATE = used on that Sunday
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.visual_questions_pool ENABLE ROW LEVEL SECURITY;

-- Service role (edge functions) can do everything
DROP POLICY IF EXISTS "Service role full access visual_questions_pool" ON public.visual_questions_pool;
CREATE POLICY "Service role full access visual_questions_pool"
  ON public.visual_questions_pool FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Authenticated users can read (admin UI etc.)
DROP POLICY IF EXISTS "Authenticated read visual_questions_pool" ON public.visual_questions_pool;
CREATE POLICY "Authenticated read visual_questions_pool"
  ON public.visual_questions_pool FOR SELECT TO authenticated
  USING (true);

-- ==========================================
-- Seed with confirmed Unsplash photo pairs
-- Add more pairs here later, or via the admin panel.
-- URL format: https://images.unsplash.com/photo-{photo_id}?w=400&h=530&fit=crop&q=80
-- ==========================================
INSERT INTO public.visual_questions_pool (order_index, photo_id_a, photo_id_b, label_a, label_b, topic_hint) VALUES
  (1,  'Uxqlfigh6oE', 'Xyj6zbliIIk', 'Minimalistisch', 'Farbenfroh & verspielt',  'Wohnstil: minimalistisch & ruhig vs. bunt & maximal eingerichtet'),
  (2,  'hOhlYhAiizc', '758Km8MAcyI', 'Berge & Natur',  'Strand & Meer',            'Traumurlaub: Bergwandern in der Natur vs. Strand und Meeresrauschen'),
  (3,  'YuN_cc3x29w', 'F2SrBdv9swk', 'Hell & Luftig',  'Dunkel & Kuschelig',       'Schlafzimmer-Atmosphäre: helles, klares Ambiente vs. dunkles, kuscheliges Ambiente')
ON CONFLICT (order_index) DO NOTHING;
