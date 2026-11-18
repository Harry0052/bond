"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function VotePanel({
  questionId,
  prompt,
  yes,
  no,
  yours,
}: {
  questionId: string;
  prompt: string;
  yes: number;
  no: number;
  yours: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function vote(choice: "yes" | "no") {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/votes/${questionId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ vote: choice }),
      });
      const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (!response.ok) {
        setError(body?.error?.message ?? "Bond could not save that vote.");
        return;
      }
      toast(choice === "yes" ? "You voted yes." : "You voted no.");
      router.refresh();
    } catch {
      setError("Bond could not reach this server. Nothing was saved. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mt-8 rounded-[1.75rem] bg-white p-5 ring-1 ring-line" aria-labelledby="vote-heading">
      <h2 id="vote-heading" className="font-display text-3xl tracking-tight text-ink">
        Question
      </h2>
      <p className="mt-2 text-base leading-7 text-ink">{prompt}</p>
      <p className="mt-2 text-sm text-ink-soft">
        {yes} yes · {no} no. A vote is not a contract, and Bond will not change yours after it is saved.
      </p>
      {yours ? (
        <p className="mt-3 font-semibold text-ink">You voted {yours}.</p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-3">
          <Button type="button" onClick={() => void vote("yes")} disabled={pending}>
            Vote yes
          </Button>
          <Button type="button" variant="secondary" onClick={() => void vote("no")} disabled={pending}>
            Vote no
          </Button>
        </div>
      )}
      {error ? (
        <p role="alert" className="mt-2 text-sm font-semibold text-clay">
          {error}
        </p>
      ) : null}
    </section>
  );
}
