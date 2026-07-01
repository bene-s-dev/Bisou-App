-- ==========================================
-- Add remaining visual question photo pairs (3–13, 15–19)
-- Pairs 1, 2, 14 already inserted in previous migration.
-- ==========================================

INSERT INTO public.visual_questions_pool (order_index, photo_id_a, photo_id_b, label_a, label_b, topic_hint) VALUES
  (3,  'IculuMoubkQ', 'uy6ZJ7NtABY', 'Stadtleben',              'Landleben',               'Lebensstil: pulsierende Großstadt vs. ruhiges Landleben'),
  (4,  'Zodpw4m7f6U', 'q-Nhcm-TfRY', 'Gemütlich rustikal',      'Modern & industrial',     'Café-Stil: warmes, rustikales Café vs. modernes Industrial-Café'),
  (5,  'QaGDmf5tMiE', 'vWjvnhkjziI', 'Herzhaft',                'Süß & fluffig',           'Frühstück: herzhaftes Frühstück mit Eiern vs. süße Pancakes oder Waffeln'),
  (6,  'MMRr8Glu9Ic', 'znoL1m6MD_k', 'Zuhause kuscheln',        'Draußen aktiv sein',      'Wochenende: entspannt zuhause bleiben vs. aktiv draußen in der Natur'),
  (7,  'Sg3XwuEpybU', 'G7kUPmzi80E', 'Hund',                    'Katze',                   'Haustier-Debatte: Hund vs. Katze – welches Tier passt besser zu euch?'),
  (8,  'DLf3uwkRNPA', 'vmIWr0NnpCQ', 'Rucksack & Abenteuer',   'Luxus & Komfort',         'Reisestil: Backpacking mit Rucksack vs. entspannter Luxusurlaub'),
  (9,  'u5zsb7Olir8', 'ZgREXhl8ER0', 'Zuhause kochen',          'Restaurant-Besuch',       'Abendessen: selber kochen in der eigenen Küche vs. Essen gehen'),
  (10, '6Fjt3zFLf_8', 'HM9m5ZX4ov0', 'Waldpfad',               'Blumenwiese',             'Naturlandschaft: stiller Waldpfad vs. offene Blumenwiese in der Sonne'),
  (11, 'sHfo3WOgGTU', 'NTyBbu66_SI', 'Gym & Kraft',             'Yoga & Ruhe',             'Sport und Bewegung: Krafttraining im Gym vs. Yoga und Meditation'),
  (12, 'vxsUdVoAlUA', 'USXfF_ONUGo', 'Sommer & Sonne',          'Winter & Schnee',         'Lieblingsatmosphäre: warmer Sommertag am Meer vs. verschneite Winterlandschaft'),
  (13, 'BFiv6Wx_l_8', 'JWptMV0DiUU', 'Flohmarkt',               'Shopping Center',         'Einkaufen: stöbern auf dem Vintage-Flohmarkt vs. modernes Shopping Center'),
  (15, 'GggbTXTCxUU', 'cYeCxtKpTTQ', 'Rustikale Holzküche',    'Moderne weiße Küche',     'Küchenstil: warme rustikale Holzküche vs. klare moderne Designerküche'),
  (16, 'DJ_kZaITX78', 'uhso_rLXJjM', 'Romantisch & verträumt', 'Ausgelassen & lachend',   'Paarmomentin: stille romantische Stimmung vs. lautes gemeinsames Lachen'),
  (17, 'l4m_o4aFOn8', 'M0AWNxnLaMw', 'Camper & Roadtrip',      'Fliegen & weit weg',      'Fernweh: gemütlicher Roadtrip im Camper vs. Fernreise mit dem Flugzeug'),
  (18, 'uWNxBHCCQs4', 'PvAAYZx-yf8', 'Lesen & Tee',            'Couch & Serie',           'Feierabend-Ritual: entspanntes Lesen mit Tee vs. gemeinsam Serien schauen'),
  (19, 'SdTKkcdz9mY', 'nQqNjfOVvrs', 'Gesellige Party',         'Romantisches Dinner',     'Abend zu zweit: lebhafte Cocktailparty vs. stilles Dinner bei Kerzenlicht')
ON CONFLICT (order_index) DO NOTHING;
