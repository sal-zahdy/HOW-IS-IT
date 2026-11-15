-- Sample data for local development only (`supabase db reset` loads it).
-- Coordinates sit around NEXT_PUBLIC_MAP_CENTER in .env.example; replace with your real campus.

insert into public.buildings (id, name, short_code, lat, lng) values
  ('b0000000-0000-0000-0000-000000000001', 'Main Building',   'MAIN', 30.0277, 31.2101),
  ('b0000000-0000-0000-0000-000000000002', 'Lecture Halls',   'LH',   30.0283, 31.2112),
  ('b0000000-0000-0000-0000-000000000003', 'Labs Building',   'LAB',  30.0270, 31.2092);

insert into public.places (building_id, category, name, description, floor, lat, lng, status) values
  ('b0000000-0000-0000-0000-000000000001', 'bathroom',   'Main ground floor bathroom', 'Next to the main entrance.', 0, 30.02765, 31.21000, 'approved'),
  ('b0000000-0000-0000-0000-000000000002', 'bathroom',   'Halls 2nd floor bathroom',  null, 2, 30.02838, 31.21128, 'approved'),
  ('b0000000-0000-0000-0000-000000000001', 'cafeteria',  'Main cafeteria',            'Sandwiches, coffee, juice.', 0, 30.02790, 31.21035, 'approved'),
  (null,                                   'chill_spot', 'Garden benches',            'Shaded benches between the buildings.', null, 30.02755, 31.21060, 'approved'),
  ('b0000000-0000-0000-0000-000000000003', 'chill_spot', 'Labs study corner',         'Quiet, has outlets.', 1, 30.02705, 31.20930, 'approved'),
  ('b0000000-0000-0000-0000-000000000002', 'hall',       'Hall 1',                    'Biggest lecture hall.', 0, 30.02826, 31.21108, 'approved'),
  ('b0000000-0000-0000-0000-000000000002', 'hall',       'Hall 4',                    null, 1, 30.02840, 31.21140, 'approved');
