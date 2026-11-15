# Campus Map

A mobile-first map of the college of engineering where students find and rate bathrooms, chill spots, cafeterias and halls.

- **App:** Next.js (App Router) + Tailwind
- **Map:** Leaflet with OpenStreetMap tiles
- **Backend:** Supabase (Postgres, auth by email magic link, auto REST API, row-level security, storage)
- **Hosting:** Vercel

## How it works

Each place is a pin coloured by its rating (green 4+, yellow 3+, red below 3, grey unrated), using the last 30 days when there are recent ratings. Anyone can browse. Signed-in students leave one rating per place (overall plus a few category-specific scores and an optional comment) and can edit it later.

Schema, security rules and seed criteria live in [`supabase/migrations`](supabase/migrations). Tables: `buildings`, `places`, `category_criteria`, `profiles`, `ratings`, `rating_reports`, plus the `place_stats` view.

## Set up

1. Create a Supabase project, then link and push the schema:
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```
2. In Supabase, go to **Authentication > URL Configuration** and add `https://<your-site>/auth/callback` (and `http://localhost:3000/auth/callback`) to the redirect URLs.
3. Copy `.env.example` to `.env.local` and fill in the Supabase URL and anon key, your campus centre, and optionally the allowed email domain.
4. Run it:
   ```bash
   npm install
   npm run dev
   ```

### Local Supabase (optional, needs Docker)

```bash
npx supabase start      # local Postgres, auth and API
npx supabase db reset   # applies migrations and supabase/seed.sql sample places
```

## Adding places and admins

New places start as `pending`. To make someone an admin, run in the Supabase SQL editor:

```sql
update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'you@example.com');
```

Admins can then insert, approve (`status = 'approved'`) or hide places from the Supabase table editor.

## Deploy

Import the repo in Vercel, add the same environment variables, and deploy. Every push to `main` redeploys.
