"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";

export function ReviseForm({
  commitmentId,
  title,
  dueLocal,
  assigneeMemberId,
  people,
}: {
  commitmentId: string;
  title: string;
  dueLocal: string;
  assigneeMemberId: string;
  people: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const toast = useToast();
  const [nextTitle, setNextTitle] = useState(title);
  const [due, setDue] = useState(dueLocal);
  const [assignee, setAssignee] = useState(assigneeMemberId);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/commitments/${commitmentId}/revise`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: nextTitle, dueLocal: due.slice(0, 16), assigneeMemberId: assignee }),
      });
      const body = (await response.json().catch(() => null)) as {
        changed?: boolean;
        error?: { message?: string };
      } | null;
      if (!response.ok) {
        setError(body?.error?.message ?? "Bond could not save that change.");
        return;
      }
      toast(body?.changed ? "Saved. The earlier acceptance no longer counts." : "Nothing material changed.");
      router.refresh();
    } catch {
      setError("Bond could not reach this server. Nothing was saved. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 space-y-3" noValidate>
      <p className="text-sm leading-6 text-ink-soft">
        Changing the task, the time, or who does it asks them to accept again.
      </p>
      <label className="block text-sm font-semibold text-ink" htmlFor={`revise-title-${commitmentId}`}>
        Commitment
      </label>
      <input
        id={`revise-title-${commitmentId}`}
        value={nextTitle}
        onChange={(event) => setNextTitle(event.target.value)}
        className={fieldClass(false)}
        maxLength={80}
        required
      />
      <label className="block text-sm font-semibold text-ink" htmlFor={`revise-who-${commitmentId}`}>
        Who
      </label>
      <select
        id={`revise-who-${commitmentId}`}
        value={assignee}
        onChange={(event) => setAssignee(event.target.value)}
        className={fieldClass(false)}
      >
        {people.map((person) => (
          <option key={person.id} value={person.id}>
            {person.name}
          </option>
        ))}
      </select>
      <label className="block text-sm font-semibold text-ink" htmlFor={`revise-due-${commitmentId}`}>
        Due
      </label>
      <input
        id={`revise-due-${commitmentId}`}
        type="datetime-local"
        value={due}
        onChange={(event) => setDue(event.target.value)}
        className={fieldClass(false)}
        required
      />
      {error ? (
        <p role="alert" className="text-sm font-semibold text-clay">
          {error}
        </p>
      ) : null}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Saving…" : "Save change"}
      </Button>
    </form>
  );
}
