"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function CompleteButton({ commitmentId }: { commitmentId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function complete() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/commitments/${commitmentId}/complete`, { method: "POST" });
      const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (!response.ok) {
        setError(body?.error?.message ?? "Bond could not mark that done.");
        return;
      }
      toast("Marked done. The time is saved with your name.");
      router.refresh();
    } catch {
      setError("Bond could not reach this server. Nothing was saved. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <Button type="button" onClick={() => void complete()} disabled={pending}>
        {pending ? "Saving…" : "Mark done"}
      </Button>
      {error ? (
        <p role="alert" className="mt-2 text-sm font-semibold text-clay">
          {error}
        </p>
      ) : null}
    </div>
  );
}
