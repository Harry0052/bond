import Link from "next/link";
import { AgreementCard } from "@/components/product/agreement-card";
import { DueTime } from "@/components/product/due-time";
import { NameForm } from "@/components/product/name-form";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { readSessionUser } from "@/lib/auth/session";
import { listHome, readPreview, sampleSharePath } from "@/lib/bonds/service";
import { getDb } from "@/lib/db/client";

export default async function HomePage() {
  const db = getDb();
  const user = await readSessionUser(db);
  const home = user ? listHome(db, user.id, user.timezone) : null;
  const sample = readPreview(db, sampleSharePath().replace("/b/", ""));

  return (
    <main id="main" className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-12">
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)] lg:gap-x-12 lg:gap-y-8">
        <section className="lg:col-start-1">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cobalt-deep">For the group chat</p>
          <h1 className="mt-3 max-w-xl font-display text-[2.6rem] leading-[1.05] tracking-tight text-ink sm:text-6xl">
            Turn the group chat into a bond.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-ink-soft">
            Name who is doing what, and by when. One link is enough for the group to see the same card.
          </p>
          {user ? (
            <p className="mt-5 text-base font-semibold text-ink">
              Welcome back. This browser is saved as {user.displayName}. Due times use {user.timezone}.
            </p>
          ) : (
            <p className="mt-5 text-base leading-7 text-ink-soft">
              Start with a bond, or save the name your group already uses.
            </p>
          )}
          <Link href="/create" className={`${buttonClass("primary")} mt-5`}>
            Make a bond
          </Link>
        </section>
        <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <NameForm initialName={user?.displayName ?? null} initialTimezone={user?.timezone ?? null} />
        </div>
        <ul className="max-w-xl space-y-2 text-base leading-7 text-ink lg:col-start-1">
          <li>Bond will not email, text, or push anyone. Those deliveries are off.</li>
          <li>A bond is not a contract, and Bond does not hold or collect money.</li>
          <li>A commitment stays open until the person named on it accepts it.</li>
        </ul>
      </div>

      <section className="mt-12" aria-labelledby="your-bonds">
        <h2 id="your-bonds" className="font-display text-3xl tracking-tight text-ink">
          Your bonds
        </h2>
        {home && home.active.length > 0 ? (
          <ul className="mt-4 grid gap-4 lg:grid-cols-2">
            {home.active.map((bond) => (
              <li key={bond.id}>
                <Link href={`/bonds/${bond.id}`} className="block rounded-[1.75rem] bg-white ring-1 ring-line">
                  <div className="bg-peach px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="break-words font-display text-3xl tracking-tight text-ink">{bond.title}</h3>
                      <Badge tone="open">Active</Badge>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink">{bond.purpose}</p>
                  </div>
                  <p className="px-5 py-4 text-sm text-ink-soft">
                    {bond.doneCount} of {bond.totalCount} done
                    {bond.nextDueLabel ? ` · Next ${bond.nextDueLabel}` : ""}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4">
            <EmptyState
              title={user ? "No active bonds yet" : "No bonds on this browser yet"}
              body="Make one in about half a minute. It stays on this server, so another device with the same browser session can open it again."
              action={
                <Link href="/create" className={buttonClass("secondary")}>
                  Make a bond
                </Link>
              }
            />
          </div>
        )}
      </section>

      {home && home.upcoming.length > 0 ? (
        <section className="mt-10" aria-labelledby="coming-up">
          <h2 id="coming-up" className="font-display text-3xl tracking-tight text-ink">
            Coming up
          </h2>
          <ul className="mt-4 divide-y divide-line rounded-[1.75rem] bg-white px-5 ring-1 ring-line">
            {home.upcoming.map((item) => (
              <li key={item.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
                <Link href={`/bonds/${item.bondId}`} className="font-semibold text-ink">
                  {item.title}
                </Link>
                <span className="text-sm text-ink-soft">
                  {item.assigneeLabel} · {item.dueLabel}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {home && home.completed.length > 0 ? (
        <section className="mt-10" aria-labelledby="finished-bonds">
          <h2 id="finished-bonds" className="font-display text-3xl tracking-tight text-ink">
            Finished
          </h2>
          <ul className="mt-4 space-y-3">
            {home.completed.map((bond) => (
              <li key={bond.id}>
                <Link href={`/bonds/${bond.id}`} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-line">
                  <span className="font-semibold">{bond.title}</span>
                  <Badge tone="done">Completed</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {sample ? (
        <section className="mt-12" aria-labelledby="sample-bond">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <h2 id="sample-bond" className="font-display text-3xl tracking-tight text-ink">
              What a bond looks like
            </h2>
            <p className="max-w-md text-sm leading-6 text-ink-soft">
              Sample only. It is not your group, and it is not saved as your bond.
            </p>
          </div>
          <AgreementCard title={sample.title} purpose={sample.purpose} badge="Sample">
            <ul className="divide-y divide-line">
              {sample.commitments.map((commitment) => (
                <li key={commitment.title} className="flex flex-wrap items-baseline justify-between gap-2 py-3 first:pt-0 last:pb-0">
                  <span className="font-semibold text-ink">{commitment.title}</span>
                  <span className="text-sm text-ink-soft">
                    {commitment.assigneeLabel} · <DueTime iso={commitment.dueAt} />
                  </span>
                </li>
              ))}
            </ul>
            <Link href={sampleSharePath()} className={`${buttonClass("secondary")} mt-4`}>
              Read the sample
            </Link>
          </AgreementCard>
        </section>
      ) : null}
    </main>
  );
}
