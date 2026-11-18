"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { COMMON_TIME_ZONES } from "@/lib/time";

type Slot = {
  id: string;
  name: string;
  commitments: Array<{ id: string; title: string; dueAt: string }>;
};

function browserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function JoinForm({ token, slots, signedIn }: { token: string; slots: Slot[]; signedIn: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const detected = useSyncExternalStore(() => () => {}, browserTimeZone, () => "UTC");
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("");
  const [slotId, setSlotId] = useState(slots[0]?.id ?? "");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"accept" | "decline" | null>(null);
  const selected = slots.find((slot) => slot.id === slotId) ?? slots[0];
  const zone = timezone || detected;
  const zones = (COMMON_TIME_ZONES as readonly string[]).includes(zone) ? COMMON_TIME_ZONES : [zone, ...COMMON_TIME_ZONES];

  if (!selected) {
    return (
      <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-base text-ink ring-1 ring-line">
        Every named person has already responded. Ask the organizer to add you.
      </p>
    );
  }

  async function submit(decision: "accept" | "decline") {
    if (!selected) return;
    setError(null);
    if (decision === "accept") {
      const missing = selected.commitments.some((task) => !checked[task.id]);
      if (missing) {
        setError("Tick each commitment on your name, or decline.");
        return;
      }
    }
    setPending(decision);
    try {
      const response = await fetch("/api/bonds/join", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token,
          slotId: selected.id,
          decision,
          commitmentIds: decision === "accept" ? selected.commitments.map((task) => task.id) : [],
          displayName: signedIn ? undefined : name,
          timezone: signedIn ? undefined : zone,
        }),
      });
      const body = (await response.json().catch(() => null)) as {
        bondId?: string;
        access?: boolean;
        error?: { message?: string };
      } | null;
      if (!response.ok || !body?.bondId) {
        setError(body?.error?.message ?? "Bond could not save that.");
        return;
      }
      if (body.access) {
        toast("You accepted your part.");
        router.push(`/bonds/${body.bondId}`);
        router.refresh();
        return;
      }
      toast("You declined. The private history stays hidden.");
      router.refresh();
    } catch {
      setError("Bond could not reach this server. Nothing was saved. Try again.");
    } finally {
      setPending(null);
    }
  }

  return (
    <form
      className="mt-6 rounded-[1.75rem] bg-white p-5 ring-1 ring-line"
      onSubmit={(event) => {
        event.preventDefault();
        void submit("accept");
      }}
      noValidate
    >
      <h2 className="font-display text-3xl tracking-tight text-ink">Take your part</h2>
      <p className="mt-2 text-base leading-7 text-ink-soft">
        Pick the name the organizer used for you, then accept each commitment on it. Nothing is accepted until you do.
      </p>
      {slots.length > 1 ? (
        <fieldset className="mt-4">
          <legend className="text-sm font-semibold text-ink">Which name is yours?</legend>
          <div className="mt-2 space-y-2">
            {slots.map((slot) => (
              <label key={slot.id} className="flex min-h-12 items-center gap-3">
                <input
                  type="radio"
                  name="slot"
                  value={slot.id}
                  checked={slot.id === selected.id}
                  onChange={() => setSlotId(slot.id)}
                />
                <span>{slot.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : (
        <p className="mt-4 font-semibold text-ink">The open name is {selected.name}.</p>
      )}
      {signedIn ? null : (
        <div className="mt-4">
          <label className="block text-sm font-semibold text-ink" htmlFor="join-name">
            Your name
          </label>
          <input
            id="join-name"
            aria-label="What should the group call you?"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={`${fieldClass(false)} mt-2`}
            maxLength={40}
            required
          />
          <label className="mt-3 block text-sm font-semibold text-ink" htmlFor="join-zone">
            Timezone
          </label>
          <select id="join-zone" value={zone} onChange={(event) => setTimezone(event.target.value)} className={`${fieldClass(false)} mt-2`}>
            {zones.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      )}
      {selected.commitments.length > 0 ? (
        <fieldset className="mt-4">
          <legend className="text-sm font-semibold text-ink">Commitments on this name</legend>
          <div className="mt-2 space-y-2">
            {selected.commitments.map((task) => (
              <label key={task.id} className="flex min-h-12 items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 size-5"
                  checked={Boolean(checked[task.id])}
                  onChange={(event) => setChecked((current) => ({ ...current, [task.id]: event.target.checked }))}
                />
                <span>
                  I accept {task.title}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : (
        <p className="mt-4 text-sm text-ink-soft">There is no commitment on this name. Joining only adds you to the bond.</p>
      )}
      {error ? (
        <p role="alert" className="mt-3 text-sm font-semibold text-clay">
          {error}
        </p>
      ) : null}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Button type="submit" disabled={pending !== null}>
          {pending === "accept" ? "Saving…" : "Accept my part"}
        </Button>
        <Button type="button" variant="secondary" disabled={pending !== null} onClick={() => void submit("decline")}>
          {pending === "decline" ? "Saving…" : "Decline"}
        </Button>
      </div>
    </form>
  );
}
