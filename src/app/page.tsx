"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { fetchCriteria, fetchPlaces } from "@/lib/data";
import { CATEGORIES, type Criterion, type Place, type PlaceCategory } from "@/lib/types";
import { PlaceSheet } from "@/components/PlaceSheet";

// Leaflet touches `window`, so the map only renders in the browser.
const CampusMap = dynamic(() => import("@/components/CampusMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-gray-100" />,
});

export default function Home() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [filter, setFilter] = useState<PlaceCategory | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPlaces = useCallback(() => {
    fetchPlaces(createClient())
      .then(setPlaces)
      .catch((e) => setError(e.message ?? "Could not load the map."));
  }, []);

  useEffect(() => {
    const supabase = createClient();
    loadPlaces();
    fetchCriteria(supabase).then(setCriteria).catch(console.error);
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) =>
      setUser(session?.user ?? null),
    );
    return () => sub.subscription.unsubscribe();
  }, [loadPlaces]);

  const visible = useMemo(
    () => (filter ? places.filter((p) => p.category === filter) : places),
    [places, filter],
  );
  const selected = places.find((p) => p.id === selectedId) ?? null;

  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <CampusMap places={visible} onSelect={(p) => setSelectedId(p.id)} />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-[1000] flex flex-col gap-2 p-3">
        <div className="pointer-events-auto flex items-center justify-between rounded-xl bg-white/95 px-3 py-2 shadow">
          <h1 className="text-lg font-semibold">Campus Map</h1>
          {user && (
            <button
              className="text-sm text-gray-600 underline"
              onClick={() => createClient().auth.signOut()}
            >
              Sign out
            </button>
          )}
        </div>
        <nav className="pointer-events-auto flex gap-2 overflow-x-auto pb-1" aria-label="Filter by type">
          <FilterChip active={filter === null} onClick={() => setFilter(null)}>
            All
          </FilterChip>
          {CATEGORIES.map((c) => (
            <FilterChip key={c.value} active={filter === c.value} onClick={() => setFilter(c.value)}>
              {c.icon} {c.label}
            </FilterChip>
          ))}
        </nav>
        {error && (
          <p className="pointer-events-auto rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
      </header>

      {selected && (
        <div className="absolute inset-x-0 bottom-0 z-[1000] sm:bottom-4 sm:left-4 sm:right-auto sm:w-96">
          <PlaceSheet
            place={selected}
            criteria={criteria}
            user={user}
            onClose={() => setSelectedId(null)}
            onRated={loadPlaces}
          />
        </div>
      )}
    </main>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium shadow ${
        active ? "bg-teal-700 text-white" : "bg-white text-gray-800"
      }`}
    >
      {children}
    </button>
  );
}
