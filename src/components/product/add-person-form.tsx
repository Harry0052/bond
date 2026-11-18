"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";

export function AddPersonForm({ bondId }: { bondId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/bonds/${bondId}/people`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (!response.ok) {
        setError(body?.error?.message ?? "Bond could not add that person.");
        return;
      }
      setName("");
      toast("Added. They can use the same link.");
      router.refresh();
    } catch {
      setError("Bond could not reach this server. Nothing was saved. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 rounded-2xl bg-paper p-4" noValidate>
      <label className="block text-sm font-semibold text-ink" htmlFor="add-person">
        Add another person
      </label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          id="add-person"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={fieldClass(Boolean(error))}
          maxLength={40}
          required
        />
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Saving…" : "Add"}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-sm font-semibold text-clay">
          {error}
        </p>
      ) : null}
    </form>
  );
}
