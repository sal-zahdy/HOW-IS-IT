"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const allowedDomain = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN?.trim().toLowerCase();

export function SignIn({ onDone }: { onDone?: () => void }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const address = email.trim().toLowerCase();
    if (allowedDomain && !address.endsWith(`@${allowedDomain}`)) {
      setError(`Use your @${allowedDomain} email.`);
      return;
    }
    setState("sending");
    const { error } = await createClient().auth.signInWithOtp({
      email: address,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setState("idle");
    } else {
      setState("sent");
    }
  }

  if (state === "sent") {
    return (
      <p className="text-sm text-gray-700">
        Check your inbox for a sign-in link, then come back here.{" "}
        {onDone && (
          <button className="underline" onClick={onDone}>
            Close
          </button>
        )}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <label className="text-sm text-gray-700" htmlFor="email">
        Sign in with your {allowedDomain ? "college " : ""}email to rate places
      </label>
      <div className="flex gap-2">
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={allowedDomain ? `you@${allowedDomain}` : "you@example.com"}
          className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-base"
        />
        <button
          type="submit"
          disabled={state === "sending"}
          className="rounded-lg bg-teal-700 px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          {state === "sending" ? "Sending…" : "Send link"}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
