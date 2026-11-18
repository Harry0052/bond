"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { COMMON_TIME_ZONES } from "@/lib/time";

type PersonRow = { key: string; name: string };
type CommitmentRow = { key: string; title: string; assigneeKey: string; dueLocal: string };
type FieldErrors = Record<string, string>;

function browserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function newKey() {
  return crypto.randomUUID();
}

export function CreateBondForm({
  initialName,
  initialTimezone,
}: {
  initialName: string | null;
  initialTimezone: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const idempotencyKey = useRef(typeof crypto !== "undefined" ? crypto.randomUUID() : "pending-key");
  const detected = useSyncExternalStore(() => () => {}, browserTimeZone, () => initialTimezone ?? "UTC");
  const [name, setName] = useState(initialName ?? "");
  const [timezone, setTimezone] = useState(initialTimezone ?? "");
  const selectedZone = timezone || detected;
  const [title, setTitle] = useState("");
  const [purpose, setPurpose] = useState("");
  const [people, setPeople] = useState<PersonRow[]>([{ key: "person-1", name: "" }]);
  const [commitments, setCommitments] = useState<CommitmentRow[]>([
    { key: "task-1", title: "", assigneeKey: "self", dueLocal: "" },
  ]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const zones = selectedZone && !COMMON_TIME_ZONES.includes(selectedZone as (typeof COMMON_TIME_ZONES)[number])
    ? [selectedZone, ...COMMON_TIME_ZONES]
    : [...COMMON_TIME_ZONES];

  function updatePerson(key: string, value: string) {
    setPeople((rows) => rows.map((row) => (row.key === key ? { ...row, name: value } : row)));
  }

  function updateCommitment(key: string, patch: Partial<CommitmentRow>) {
    setCommitments((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const named = people.filter((person) => person.name.trim());
    const nextErrors: FieldErrors = {};
    const commitmentPayload = commitments.map((row) => {
      const assigneeIndex =
        row.assigneeKey === "self" ? null : named.findIndex((person) => person.key === row.assigneeKey);
      if (assigneeIndex !== null && assigneeIndex < 0) {
        nextErrors.commitments = "Choose a person who is still on this bond.";
      }
      return {
        title: row.title,
        assigneeIndex,
        dueLocal: row.dueLocal.slice(0, 16),
      };
    });
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    setPending(true);
    try {
      const response = await fetch("/api/bonds", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": idempotencyKey.current,
        },
        body: JSON.stringify({
          displayName: initialName ? undefined : name,
          timezone: selectedZone,
          title,
          purpose,
          people: named.map((person) => ({ name: person.name.trim() })),
          commitments: commitmentPayload,
        }),
      });
      const body = (await response.json().catch(() => null)) as {
        bond?: { id?: string };
        error?: { message?: string; fields?: FieldErrors };
      } | null;
      if (!response.ok || !body?.bond?.id) {
        setErrors(body?.error?.fields ?? {});
        setFormError(body?.error?.message ?? "Bond could not save that. Nothing new was stored.");
        return;
      }
      toast("Bond saved on this server.");
      router.push(`/bonds/${body.bond.id}`);
      router.refresh();
    } catch {
      setFormError("Bond could not reach this server. Nothing was saved. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8" noValidate>
      {formError ? (
        <p role="alert" className="rounded-2xl bg-clay-bg px-4 py-3 text-sm font-semibold text-clay">
          {formError}
        </p>
      ) : null}
      {initialName ? null : (
        <div>
          <label className="block text-sm font-semibold text-ink" htmlFor="creator-name">
            Your name
          </label>
          <input
            id="creator-name"
            aria-label="What should the group call you?"
            autoComplete="nickname"
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={errors.displayName ? true : undefined}
            aria-describedby={errors.displayName ? "creator-name-error" : undefined}
            className={`${fieldClass(Boolean(errors.displayName))} mt-2`}
            maxLength={40}
            required
          />
          {errors.displayName ? (
            <p id="creator-name-error" className="mt-2 text-sm font-semibold text-clay">
              {errors.displayName}
            </p>
          ) : null}
        </div>
      )}
      <div>
        <label className="block text-sm font-semibold text-ink" htmlFor="bond-timezone">
          Timezone for the times below
        </label>
        <select
          id="bond-timezone"
          value={selectedZone}
          onChange={(event) => setTimezone(event.target.value)}
          className={`${fieldClass(Boolean(errors.timezone))} mt-2`}
        >
          {zones.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </select>
        {errors.timezone ? <p className="mt-2 text-sm font-semibold text-clay">{errors.timezone}</p> : null}
      </div>
      <div>
        <label className="block text-sm font-semibold text-ink" htmlFor="bond-title">
          Bond title
        </label>
        <input
          id="bond-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={errors.title ? "bond-title-error" : undefined}
          className={`${fieldClass(Boolean(errors.title))} mt-2`}
          maxLength={80}
          required
        />
        {errors.title ? (
          <p id="bond-title-error" className="mt-2 text-sm font-semibold text-clay">
            {errors.title}
          </p>
        ) : null}
      </div>
      <div>
        <label className="block text-sm font-semibold text-ink" htmlFor="bond-purpose">
          What is this for?
        </label>
        <textarea
          id="bond-purpose"
          value={purpose}
          onChange={(event) => setPurpose(event.target.value)}
          aria-invalid={errors.purpose ? true : undefined}
          aria-describedby={errors.purpose ? "bond-purpose-error" : undefined}
          className={`${fieldClass(Boolean(errors.purpose))} mt-2 min-h-28 py-3`}
          maxLength={400}
          required
        />
        {errors.purpose ? (
          <p id="bond-purpose-error" className="mt-2 text-sm font-semibold text-clay">
            {errors.purpose}
          </p>
        ) : null}
      </div>
      <fieldset>
        <legend className="text-sm font-semibold text-ink">People besides you</legend>
        <p className="mt-1 text-sm leading-6 text-ink-soft">Leave a row blank if it is just you.</p>
        <div className="mt-3 space-y-3">
          {people.map((person, index) => (
            <div key={person.key} className="flex items-center gap-2">
              <label className="sr-only" htmlFor={`person-${person.key}`}>
                Person {index + 1}
              </label>
              <input
                id={`person-${person.key}`}
                value={person.name}
                onChange={(event) => updatePerson(person.key, event.target.value)}
                placeholder="Name"
                className={fieldClass(false)}
                maxLength={40}
              />
              {people.length > 1 ? (
                <button
                  type="button"
                  className="min-h-12 shrink-0 rounded-full px-3 text-sm font-semibold text-ink-soft"
                  onClick={() => setPeople((rows) => rows.filter((row) => row.key !== person.key))}
                >
                  Remove person {index + 1}
                </button>
              ) : null}
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="secondary"
          className="mt-3"
          onClick={() => setPeople((rows) => [...rows, { key: newKey(), name: "" }])}
        >
          Add a person
        </Button>
      </fieldset>
      <fieldset>
        <legend className="text-sm font-semibold text-ink">Commitments</legend>
        <div className="mt-3 space-y-4">
          {commitments.map((row, index) => (
            <div key={row.key} className="rounded-2xl bg-white p-4 ring-1 ring-line">
              <label className="block text-sm font-semibold text-ink" htmlFor={`task-title-${row.key}`}>
                Commitment {index + 1}
              </label>
              <input
                id={`task-title-${row.key}`}
                value={row.title}
                onChange={(event) => updateCommitment(row.key, { title: event.target.value })}
                className={`${fieldClass(Boolean(errors.commitments))} mt-2`}
                maxLength={80}
                required
              />
              <label className="mt-3 block text-sm font-semibold text-ink" htmlFor={`task-who-${row.key}`}>
                Who
              </label>
              <select
                id={`task-who-${row.key}`}
                value={row.assigneeKey}
                onChange={(event) => updateCommitment(row.key, { assigneeKey: event.target.value })}
                className={`${fieldClass(false)} mt-2`}
              >
                <option value="self">Me</option>
                {people
                  .filter((person) => person.name.trim())
                  .map((person) => (
                    <option key={person.key} value={person.key}>
                      {person.name.trim()}
                    </option>
                  ))}
              </select>
              <label className="mt-3 block text-sm font-semibold text-ink" htmlFor={`task-due-${row.key}`}>
                Due
              </label>
              <input
                id={`task-due-${row.key}`}
                type="datetime-local"
                value={row.dueLocal}
                onChange={(event) => updateCommitment(row.key, { dueLocal: event.target.value })}
                className={`${fieldClass(Boolean(errors.commitments))} mt-2`}
                required
              />
              {commitments.length > 1 ? (
                <button
                  type="button"
                  className="mt-3 min-h-12 text-sm font-semibold text-ink-soft"
                  onClick={() => setCommitments((rows) => rows.filter((item) => item.key !== row.key))}
                >
                  Remove commitment {index + 1}
                </button>
              ) : null}
            </div>
          ))}
        </div>
        {errors.commitments ? <p className="mt-2 text-sm font-semibold text-clay">{errors.commitments}</p> : null}
        <Button
          type="button"
          variant="secondary"
          className="mt-3"
          onClick={() =>
            setCommitments((rows) => [...rows, { key: newKey(), title: "", assigneeKey: "self", dueLocal: "" }])
          }
        >
          Add a commitment
        </Button>
      </fieldset>
      <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
        {pending ? "Saving…" : "Create bond"}
      </Button>
    </form>
  );
}
