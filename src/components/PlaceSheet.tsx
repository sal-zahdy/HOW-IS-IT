"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { fetchRatings } from "@/lib/data";
import { categoryInfo, type Criterion, type Place, type Rating } from "@/lib/types";
import { RatingForm } from "./RatingForm";
import { SignIn } from "./SignIn";
import { Stars } from "./Stars";

function timeAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(iso).toLocaleDateString();
}

export function PlaceSheet({
  place,
  criteria,
  user,
  onClose,
  onRated,
}: {
  place: Place;
  criteria: Criterion[];
  user: User | null;
  onClose: () => void;
  onRated: () => void;
}) {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [rating, setRating] = useState(false);

  const load = useCallback(() => {
    fetchRatings(createClient(), place.id).then(setRatings).catch(console.error);
  }, [place.id]);

  useEffect(() => {
    setRating(false);
    load();
  }, [load]);

  const info = categoryInfo(place.category);
  const stats = place.stats;
  const mine = user ? ratings.find((r) => r.user_id === user.id) ?? null : null;
  const placeCriteria = criteria.filter((c) => c.category === place.category);
  const where = [place.building?.name, place.floor != null ? `floor ${place.floor}` : null]
    .filter(Boolean)
    .join(", ");

  return (
    <section className="flex max-h-[70vh] flex-col overflow-y-auto rounded-t-2xl bg-white p-4 shadow-2xl sm:rounded-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">
            {info.icon} {info.label.replace(/s$/, "")}
            {where && ` · ${where}`}
          </p>
          <h2 className="text-xl font-semibold">{place.name}</h2>
        </div>
        <button onClick={onClose} aria-label="Close" className="rounded-full px-2 text-2xl text-gray-500">
          ×
        </button>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <Stars value={stats?.avg_overall ?? null} size="text-xl" />
        <span className="text-sm text-gray-600">
          {stats?.rating_count
            ? `${stats.avg_overall} from ${stats.rating_count} rating${stats.rating_count > 1 ? "s" : ""}`
            : "No ratings yet"}
        </span>
      </div>
      {stats?.avg_last_30_days != null && (
        <p className="text-sm text-gray-600">Last 30 days: {stats.avg_last_30_days} / 5</p>
      )}
      {place.description && <p className="mt-2 text-sm text-gray-800">{place.description}</p>}

      {placeCriteria.length > 0 && stats?.rating_count ? (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          {placeCriteria.map((c) => (
            <div key={c.key} className="flex justify-between">
              <dt className="text-gray-600">{c.label}</dt>
              <dd className="font-medium">{stats.aspect_averages?.[c.key] ?? "–"}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <div className="mt-4">
        {!user ? (
          <SignIn />
        ) : rating ? (
          <RatingForm
            place={place}
            criteria={criteria}
            existing={mine}
            onSaved={() => {
              setRating(false);
              load();
              onRated();
            }}
          />
        ) : (
          <button
            onClick={() => setRating(true)}
            className="w-full rounded-lg bg-teal-700 py-2 font-medium text-white"
          >
            {mine ? "Edit my rating" : "Rate this place"}
          </button>
        )}
      </div>

      {ratings.length > 0 && (
        <ul className="mt-4 flex flex-col gap-3 border-t pt-3">
          {ratings.map((r) => (
            <li key={r.id} className="text-sm">
              <div className="flex items-center gap-2">
                <Stars value={r.overall} size="text-sm" />
                <span className="text-gray-500">
                  {r.profile?.display_name ?? "Student"} · {timeAgo(r.created_at)}
                </span>
              </div>
              {r.comment && <p className="mt-1 text-gray-800">{r.comment}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
