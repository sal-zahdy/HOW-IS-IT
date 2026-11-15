import type { SupabaseClient } from "@supabase/supabase-js";
import type { Criterion, Place, PlaceStats, Rating } from "./types";

export async function fetchPlaces(supabase: SupabaseClient): Promise<Place[]> {
  const [placesRes, statsRes] = await Promise.all([
    supabase
      .from("places")
      .select("id, category, name, description, floor, lat, lng, building:buildings(id, name, short_code)")
      .eq("status", "approved"),
    supabase.from("place_stats").select("*"),
  ]);
  if (placesRes.error) throw placesRes.error;
  if (statsRes.error) throw statsRes.error;

  const statsById = new Map<string, PlaceStats>(
    statsRes.data.map((s) => [s.place_id, s as PlaceStats]),
  );
  return (placesRes.data as unknown as Omit<Place, "stats">[]).map((p) => ({
    ...p,
    stats: statsById.get(p.id) ?? null,
  }));
}

export async function fetchCriteria(supabase: SupabaseClient): Promise<Criterion[]> {
  const { data, error } = await supabase
    .from("category_criteria")
    .select("*")
    .order("sort_order");
  if (error) throw error;
  return data;
}

export async function fetchRatings(supabase: SupabaseClient, placeId: string): Promise<Rating[]> {
  const { data, error } = await supabase
    .from("ratings")
    .select("id, place_id, user_id, overall, aspects, comment, created_at, profile:profiles(display_name)")
    .eq("place_id", placeId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return data as unknown as Rating[];
}
