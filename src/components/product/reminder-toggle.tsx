"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";

export function ReminderToggle({ optedIn }: { optedIn: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [checked, setChecked] = useState(optedIn);
  const [error, setError] = useState<string | null>(null);

  async function onChange(next: boolean) {
    setChecked(next);
    setError(null);
    try {
      const response = await fetch("/api/reminders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ optedIn: next }),
      });
      const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (!response.ok) {
        setChecked(!next);
        setError(body?.error?.message ?? "Bond could not save that choice.");
        return;
      }
      toast(next ? "In-app reminders are on." : "In-app reminders are off.");
      router.refresh();
    } catch {
      setChecked(!next);
      setError("Bond could not reach this server. Nothing was saved. Try again.");
    }
  }

  return (
    <div>
      <label className="flex min-h-12 items-center gap-3 text-base font-semibold text-ink">
        <input
          type="checkbox"
          className="size-5"
          checked={checked}
          onChange={(event) => void onChange(event.target.checked)}
        />
        Remind me in Bond about due times
      </label>
      <p className="mt-2 text-sm leading-6 text-ink-soft">
        This stays inside Bond. Email, text, and phone alerts are off.
      </p>
      {error ? (
        <p role="alert" className="mt-2 text-sm font-semibold text-clay">
          {error}
        </p>
      ) : null}
    </div>
  );
}
