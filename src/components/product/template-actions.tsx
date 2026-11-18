"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function SaveTemplateButton({ bondId }: { bondId: string }) {
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/templates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ bondId }),
      });
      const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (!response.ok) {
        setError(body?.error?.message ?? "Bond could not save that template.");
        return;
      }
      toast("Template saved on this server.");
    } catch {
      setError("Bond could not reach this server. Nothing was saved. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-4">
      <Button type="button" variant="secondary" onClick={() => void save()} disabled={pending}>
        {pending ? "Saving…" : "Save as template"}
      </Button>
      {error ? (
        <p role="alert" className="mt-2 text-sm font-semibold text-clay">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function UseTemplateButton({ templateId }: { templateId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function makeBond() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/templates/${templateId}/use`, { method: "POST" });
      const body = (await response.json().catch(() => null)) as {
        bondId?: string;
        error?: { message?: string };
      } | null;
      if (!response.ok || !body?.bondId) {
        setError(body?.error?.message ?? "Bond could not make that bond.");
        return;
      }
      toast("A new bond was saved from the template.");
      router.push(`/bonds/${body.bondId}`);
      router.refresh();
    } catch {
      setError("Bond could not reach this server. Nothing was saved. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <Button type="button" variant="secondary" onClick={() => void makeBond()} disabled={pending}>
        {pending ? "Making…" : "Use template"}
      </Button>
      {error ? (
        <p role="alert" className="mt-2 text-sm font-semibold text-clay">
          {error}
        </p>
      ) : null}
    </div>
  );
}
