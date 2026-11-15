-- Initial schema for the campus map: buildings, places, ratings and the stats the map reads.

create type public.place_category as enum ('bathroom', 'chill_spot', 'cafeteria', 'hall');
create type public.place_status as enum ('pending', 'approved', 'hidden');
create type public.user_role as enum ('student', 'admin');

-- Buildings -----------------------------------------------------------------

create table public.buildings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_code text unique,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  created_at timestamptz not null default now()
);

-- Profiles (one per auth user, created automatically) ----------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 50),
  role public.user_role not null default 'student',
  created_at timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

-- Places --------------------------------------------------------------------

create table public.places (
  id uuid primary key default gen_random_uuid(),
  building_id uuid references public.buildings (id) on delete set null,
  category public.place_category not null,
  name text not null check (char_length(name) between 1 and 80),
  description text check (char_length(description) <= 500),
  floor smallint,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  photo_path text,
  status public.place_status not null default 'pending',
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index places_building_id_idx on public.places (building_id);
create index places_category_status_idx on public.places (category, status);
create index places_created_by_idx on public.places (created_by);

-- What each category is rated on, besides the overall score -----------------

create table public.category_criteria (
  category public.place_category not null,
  key text not null check (key ~ '^[a-z_]+$'),
  label text not null,
  sort_order smallint not null default 0,
  primary key (category, key)
);

insert into public.category_criteria (category, key, label, sort_order) values
  ('bathroom',   'cleanliness', 'Cleanliness',     1),
  ('bathroom',   'supplies',    'Soap and paper',  2),
  ('bathroom',   'privacy',     'Privacy',         3),
  ('chill_spot', 'quiet',       'Quiet',           1),
  ('chill_spot', 'seating',     'Seating',         2),
  ('chill_spot', 'outlets',     'Power outlets',   3),
  ('chill_spot', 'wifi',        'Wi-Fi',           4),
  ('cafeteria',  'food',        'Food',            1),
  ('cafeteria',  'price',       'Price',           2),
  ('cafeteria',  'queue',       'Short queue',     3),
  ('cafeteria',  'seating',     'Seating',         4),
  ('hall',       'seats',       'Seats',           1),
  ('hall',       'ac',          'AC / temperature', 2),
  ('hall',       'sound',       'Sound',           3),
  ('hall',       'visibility',  'Board visibility', 4);

-- Ratings: one per student per place ----------------------------------------

create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  overall smallint not null check (overall between 1 and 5),
  -- Scores per criteria key, e.g. {"cleanliness": 4, "supplies": 2}; each 1 to 5.
  aspects jsonb not null default '{}'::jsonb check (jsonb_typeof(aspects) = 'object'),
  comment text check (char_length(comment) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (place_id, user_id)
);

create index ratings_user_id_idx on public.ratings (user_id);
create index ratings_place_created_idx on public.ratings (place_id, created_at desc);

create function public.validate_rating()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  aspect record;
  place_cat public.place_category;
begin
  select category into place_cat from public.places where id = new.place_id;
  for aspect in select * from jsonb_each(new.aspects) loop
    if not exists (
      select 1 from public.category_criteria
      where category = place_cat and key = aspect.key
    ) then
      raise exception 'Unknown criterion "%" for category %', aspect.key, place_cat;
    end if;
    if jsonb_typeof(aspect.value) <> 'number'
       or (aspect.value)::numeric not in (1, 2, 3, 4, 5) then
      raise exception 'Criterion "%" must be a whole number from 1 to 5', aspect.key;
    end if;
  end loop;
  new.updated_at := now();
  return new;
end;
$$;

create trigger ratings_validate
  before insert or update on public.ratings
  for each row execute function public.validate_rating();

-- Reports on abusive ratings -------------------------------------------------

create table public.rating_reports (
  id uuid primary key default gen_random_uuid(),
  rating_id uuid not null references public.ratings (id) on delete cascade,
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  reason text not null check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default now(),
  unique (rating_id, reporter_id)
);

create index rating_reports_reporter_id_idx on public.rating_reports (reporter_id);

-- Stats the map pins read ----------------------------------------------------

create view public.place_stats
with (security_invoker = true)
as
select
  p.id as place_id,
  count(r.id)::int as rating_count,
  round(avg(r.overall), 2) as avg_overall,
  round(avg(r.overall) filter (where r.created_at > now() - interval '30 days'), 2) as avg_last_30_days,
  max(r.created_at) as last_rated_at,
  (
    select coalesce(jsonb_object_agg(a.key, a.avg_score), '{}'::jsonb)
    from (
      select e.key, round(avg(e.value::numeric), 2) as avg_score
      from public.ratings r2, jsonb_each_text(r2.aspects) e
      where r2.place_id = p.id
      group by e.key
    ) a
  ) as aspect_averages
from public.places p
left join public.ratings r on r.place_id = p.id
where p.status = 'approved'
group by p.id;

-- Row-level security ---------------------------------------------------------

alter table public.buildings enable row level security;
alter table public.profiles enable row level security;
alter table public.places enable row level security;
alter table public.category_criteria enable row level security;
alter table public.ratings enable row level security;
alter table public.rating_reports enable row level security;

-- Anyone can browse.
create policy "Buildings are public" on public.buildings
  for select to anon, authenticated using (true);
create policy "Criteria are public" on public.category_criteria
  for select to anon, authenticated using (true);
create policy "Profiles are public" on public.profiles
  for select to anon, authenticated using (true);
create policy "Approved places are public" on public.places
  for select to anon, authenticated
  using (status = 'approved' or created_by = (select auth.uid()) or (select public.is_admin()));
create policy "Ratings on approved places are public" on public.ratings
  for select to anon, authenticated
  using (exists (select 1 from public.places p where p.id = place_id and p.status = 'approved'));

-- Students manage their own profile name and ratings, and suggest places.
create policy "Users update own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()) and role = (select role from public.profiles where id = (select auth.uid())));
create policy "Users suggest places" on public.places
  for insert to authenticated
  with check (created_by = (select auth.uid()) and status = 'pending');
create policy "Users add own rating" on public.ratings
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.places p where p.id = place_id and p.status = 'approved')
  );
create policy "Users edit own rating" on public.ratings
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "Users delete own rating, admins delete any" on public.ratings
  for delete to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "Users report ratings" on public.rating_reports
  for insert to authenticated
  with check (reporter_id = (select auth.uid()));

-- Admins run the map.
create policy "Admins manage buildings" on public.buildings
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins manage places" on public.places
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins manage criteria" on public.category_criteria
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins read reports" on public.rating_reports
  for select to authenticated
  using ((select public.is_admin()) or reporter_id = (select auth.uid()));
create policy "Admins clear reports" on public.rating_reports
  for delete to authenticated
  using ((select public.is_admin()));

-- Photos bucket: public to read, admins upload.
insert into storage.buckets (id, name, public) values ('place-photos', 'place-photos', true);

create policy "Admins upload place photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'place-photos' and (select public.is_admin()));
create policy "Admins manage place photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'place-photos' and (select public.is_admin()));
