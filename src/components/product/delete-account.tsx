"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function DeleteAccount() {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function remove() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (!response.ok) {
        setError(body?.error?.message ?? "Bond could not delete that data.");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Bond could not reach this server. Nothing was deleted. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mt-8" aria-labelledby="delete-heading">
      <h2 id="delete-heading" className="font-display text-3xl tracking-tight">
        Delete my data
      </h2>
      <p className="mt-2 text-base leading-7 text-ink-soft">
        This removes your session, your templates, and your access to bonds on this server. Other people keep the
        bonds you already shared. Bond does not email a confirmation.
      </p>
      <label className="mt-4 flex min-h-12 items-center gap-3 text-sm font-semibold text-ink">
        <input type="checkbox" className="size-5" checked={confirm} onChange={(event) => setConfirm(event.target.checked)} />
        I understand this removes my access
      </label>
      <Button type="button" variant="danger" className="mt-3" disabled={!confirm || pending} onClick={() => void remove()}>
        {pending ? "Deleting…" : "Delete my data on this server"}
      </Button>
      {error ? (
        <p role="alert" className="mt-2 text-sm font-semibold text-clay">
          {error}
        </p>
      ) : null}
    </section>
  );
}
