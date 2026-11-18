"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function RemoveMemberButton({ bondId, memberId, name }: { bondId: string; memberId: string; name: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/bonds/${bondId}/members/${memberId}/remove`, { method: "POST" });
      const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (!response.ok) {
        setError(body?.error?.message ?? "Bond could not remove that person.");
        return;
      }
      toast(`${name} can no longer see the private activity.`);
      router.refresh();
    } catch {
      setError("Bond could not reach this server. Nothing was saved. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <Button type="button" variant="danger" onClick={() => void remove()} disabled={pending}>
        {pending ? "Removing…" : `Remove ${name}`}
      </Button>
      {error ? (
        <p role="alert" className="mt-2 text-sm font-semibold text-clay">
          {error}
        </p>
      ) : null}
    </div>
  );
}
