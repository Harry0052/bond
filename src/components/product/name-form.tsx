"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { COMMON_TIME_ZONES } from "@/lib/time";

function browserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function NameForm({
  initialName,
  initialTimezone,
}: {
  initialName: string | null;
  initialTimezone: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(initialName ?? "");
  const detected = useSyncExternalStore(
    () => () => {},
    browserTimeZone,
    () => initialTimezone ?? "UTC",
  );
  const [timezone, setTimezone] = useState(initialTimezone ?? "");
  const selectedZone = timezone || detected;
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const describedBy = error ? "name-error" : "name-hint";

  const zones = useMemo(() => {
    const list: string[] = [...COMMON_TIME_ZONES];
    if (!list.includes(selectedZone)) list.unshift(selectedZone);
    return list;
  }, [selectedZone]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName: name, timezone: selectedZone }),
      });
      const body = (await response.json().catch(() => null)) as {
        error?: { message?: string; fields?: { displayName?: string; timezone?: string } };
        user?: { displayName?: string; timezone?: string };
      } | null;
      if (!response.ok || !body?.user?.displayName) {
        setError(body?.error?.fields?.displayName ?? body?.error?.fields?.timezone ?? body?.error?.message ?? "Bond could not save that name.");
        return;
      }
      setName(body.user.displayName);
      if (body.user.timezone) setTimezone(body.user.timezone);
      toast(`Saved on this server as ${body.user.displayName}.`);
      router.refresh();
    } catch {
      setError("Bond could not reach this server. Nothing was saved. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-line sm:p-6" noValidate>
      <h2 className="font-display text-3xl tracking-tight text-ink">
        {initialName ? "Your name on this server" : "What should the group call you?"}
      </h2>
      <p id="name-hint" className="mt-2 text-base leading-7 text-ink-soft">
        Bond stores this name with this browser. It is not checked against an email address or a phone number.
      </p>
      <label className="mt-5 block text-sm font-semibold text-ink" htmlFor="display-name">
        Name
      </label>
      <input
        id="display-name"
        name="displayName"
        aria-label="What should the group call you?"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        autoComplete="nickname"
        value={name}
        onChange={(event) => setName(event.target.value)}
        className={`${fieldClass(Boolean(error))} mt-2`}
        maxLength={40}
        required
      />
      <label className="mt-4 block text-sm font-semibold text-ink" htmlFor="timezone">
        Timezone for due times
      </label>
      <select
        id="timezone"
        name="timezone"
        value={selectedZone}
        onChange={(event) => setTimezone(event.target.value)}
        className={`${fieldClass(false)} mt-2`}
      >
        {zones.map((zone) => (
          <option key={zone} value={zone}>
            {zone}
          </option>
        ))}
      </select>
      {error ? (
        <p id="name-error" role="alert" className="mt-2 text-sm font-semibold text-clay">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="mt-5 w-full sm:w-auto" disabled={pending}>
        {pending ? "Saving…" : "Save name"}
      </Button>
    </form>
  );
}
