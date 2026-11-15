export type PlaceCategory = "bathroom" | "chill_spot" | "cafeteria" | "hall";

export const CATEGORIES: { value: PlaceCategory; label: string; icon: string }[] = [
  { value: "bathroom", label: "Bathrooms", icon: "🚻" },
  { value: "chill_spot", label: "Chill spots", icon: "🛋️" },
  { value: "cafeteria", label: "Cafeterias", icon: "☕" },
  { value: "hall", label: "Halls", icon: "🎓" },
];

export function categoryInfo(category: PlaceCategory) {
  return CATEGORIES.find((c) => c.value === category)!;
}

export type Building = {
  id: string;
  name: string;
  short_code: string | null;
};

export type PlaceStats = {
  rating_count: number;
  avg_overall: number | null;
  avg_last_30_days: number | null;
  last_rated_at: string | null;
  aspect_averages: Record<string, number>;
};

export type Place = {
  id: string;
  category: PlaceCategory;
  name: string;
  description: string | null;
  floor: number | null;
  lat: number;
  lng: number;
  building: Building | null;
  stats: PlaceStats | null;
};

export type Criterion = {
  category: PlaceCategory;
  key: string;
  label: string;
  sort_order: number;
};

export type Rating = {
  id: string;
  place_id: string;
  user_id: string;
  overall: number;
  aspects: Record<string, number>;
  comment: string | null;
  created_at: string;
  profile: { display_name: string | null } | null;
};

// Pin colour: recent average if there is one, otherwise the all-time average.
export function scoreColor(stats: PlaceStats | null) {
  const score = stats?.avg_last_30_days ?? stats?.avg_overall;
  if (score == null) return "#9ca3af";
  if (score >= 4) return "#16a34a";
  if (score >= 3) return "#eab308";
  return "#dc2626";
}
