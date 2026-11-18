import Link from "next/link";
import { ReminderToggle } from "@/components/product/reminder-toggle";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClass } from "@/components/ui/button";
import { readSessionUser } from "@/lib/auth/session";
import { listActivity } from "@/lib/bonds/progress";
import { getDb } from "@/lib/db/client";
import { syncReminders } from "@/lib/reminders/service";

export const metadata = { title: "Activity" };

export default async function ActivityPage() {
  const db = getDb();
  const user = await readSessionUser(db);
  const reminders = user ? syncReminders(db, user.id) : [];
  const events = user ? listActivity(db, user.id, user.timezone) : [];

  return (
    <main id="main" className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cobalt-deep">What changed</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight text-ink sm:text-5xl">Activity</h1>
      <p className="mt-3 max-w-xl text-lg leading-8 text-ink-soft">
        Reminders appear here only after you turn them on. Times use {user?.timezone ?? "your timezone"}.
      </p>
      {user ? (
        <div className="mt-6 rounded-[1.75rem] bg-white p-5 ring-1 ring-line">
          <ReminderToggle optedIn={user.reminderOptIn} />
        </div>
      ) : (
        <div className="mt-6">
          <EmptyState
            title="Save your name to see activity"
            body="Bond keeps reminders and history with the browser session, not in this page alone."
            action={
              <Link href="/" className={buttonClass("primary")}>
                Go to Home
              </Link>
            }
          />
        </div>
      )}
      {user ? (
        <section className="mt-8" aria-labelledby="reminders-heading">
          <h2 id="reminders-heading" className="font-display text-3xl tracking-tight">
            Reminders
          </h2>
          {!user.reminderOptIn ? (
            <p className="mt-3 text-base leading-7 text-ink-soft">Reminders are off. Nothing is queued.</p>
          ) : reminders.length === 0 ? (
            <p className="mt-3 text-base leading-7 text-ink-soft">
              Nothing is due in the next day. Bond did not invent a reminder.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {reminders.map((reminder) => (
                <li key={reminder.id} className="rounded-2xl bg-white px-4 py-3 ring-1 ring-line">
                  <p className="font-semibold text-ink">{reminder.title}</p>
                  <p className="text-sm text-ink-soft">
                    {reminder.kind === "overdue" ? "Overdue" : "Due soon"} · {reminder.dueLabel} · {reminder.bondTitle}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
      {user ? (
        <section className="mt-8" aria-labelledby="events-heading">
          <h2 id="events-heading" className="font-display text-3xl tracking-tight">
            History
          </h2>
          {events.length === 0 ? (
            <p className="mt-3 text-base leading-7 text-ink-soft">No bond activity for this browser yet.</p>
          ) : (
            <ol className="mt-4 space-y-3">
              {events.map((event) => (
                <li key={event.id}>
                  <Link href={`/bonds/${event.bondId}`} className="block rounded-2xl bg-white px-4 py-3 ring-1 ring-line">
                    <span className="text-sm font-semibold text-cobalt-deep">{event.bondTitle}</span>
                    <span className="mt-1 block text-sm leading-6 text-ink">{event.sentence}</span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>
      ) : null}
    </main>
  );
}
