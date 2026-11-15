"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Criterion, Place, Rating } from "@/lib/types";
import { StarInput } from "./Stars";

export function RatingForm({
  place,
  criteria,
  existing,
  onSaved,
}: {
  place: Place;
  criteria: Criterion[];
  existing: Rating | null;
  onSaved: () => void;
}) {
  const [overall, setOverall] = useState(existing?.overall ?? 0);
  const [aspects, setAspects] = useState<Record<string, number>>(existing?.aspects ?? {});
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const placeCriteria = criteria.filter((c) => c.category === place.category);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (overall === 0) {
      setError("Pick an overall score first.");
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("ratings").upsert(
      {
        place_id: place.id,
        user_id: auth.user?.id,
        overall,
        aspects,
        comment: comment.trim() || null,
      },
      { onConflict: "place_id,user_id" },
    );
    setSaving(false);
    if (error) setError(error.message);
    else onSaved();
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-3 rounded-xl bg-gray-50 p-3">
      <StarInput label="Overall" value={overall} onChange={setOverall} />
      {placeCriteria.map((c) => (
        <StarInput
          key={c.key}
          label={c.label}
          value={aspects[c.key] ?? 0}
          onChange={(v) => setAspects({ ...aspects, [c.key]: v })}
        />
      ))}
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={1000}
        rows={2}
        placeholder="Anything others should know? (optional)"
        className="rounded-lg border border-gray-300 px-3 py-2 text-base"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-teal-700 py-2 font-medium text-white disabled:opacity-50"
      >
        {saving ? "Saving…" : existing ? "Update my rating" : "Submit rating"}
      </button>
    </form>
  );
}
