import Link from "next/link";
import { notFound } from "next/navigation";
import { AgreementCard } from "@/components/product/agreement-card";
import { Avatar } from "@/components/product/avatar";
import { SharePanel } from "@/components/product/share-panel";
import { Badge } from "@/components/ui/badge";
import { readSessionUser } from "@/lib/auth/session";
import { getBondDetail } from "@/lib/bonds/service";
import { getDb } from "@/lib/db/client";

const memberTone = {
  invited: "invited",
  accepted: "accepted",
  declined: "declined",
  removed: "removed",
} as const;

export default async function BondPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const user = await readSessionUser(db);
  if (!user) notFound();
  const bond = getBondDetail(db, id, user.id, user.timezone);
  if (!bond) notFound();
  const tone = bond.status === "completed" ? "done" : bond.status === "cancelled" ? "warn" : "open";

  return (
    <main id="main" className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <p className="text-sm font-semibold text-ink-soft">
        <Link href="/" className="font-semibold text-cobalt-deep">
          Home
        </Link>
      </p>
      {bond.demo ? (
        <p className="mt-4 rounded-2xl bg-peach px-4 py-3 text-sm font-semibold text-ink">
          Sample bond. Changes are turned off.
        </p>
      ) : null}
      <div className="mt-4">
        <AgreementCard
          title={bond.title}
          purpose={bond.purpose}
          badge={bond.status === "active" ? "Active" : bond.status === "completed" ? "Completed" : "Cancelled"}
          badgeTone={tone}
          heading="h1"
        >
          <p className="text-sm font-semibold text-ink">
            {bond.doneCount} of {bond.totalCount} done
          </p>
          <div
            className="mt-2 h-2 rounded-full bg-peach"
            role="progressbar"
            aria-valuenow={bond.doneCount}
            aria-valuemin={0}
            aria-valuemax={bond.totalCount}
            aria-label="Commitments done"
          >
            <div
              className="h-2 rounded-full bg-cobalt"
              style={{ width: `${bond.totalCount === 0 ? 0 : Math.round((bond.doneCount / bond.totalCount) * 100)}%` }}
            />
          </div>
          <ul className="mt-5 divide-y divide-line">
            {bond.commitments.map((commitment) => (
              <li key={commitment.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
                <div className="min-w-0">
                  <p className="break-words font-semibold text-ink">{commitment.title}</p>
                  <p className="text-sm text-ink-soft">
                    {commitment.assigneeName} · {commitment.dueLabel}
                  </p>
                </div>
                <Badge tone={commitment.status === "done" ? "done" : "open"}>
                  {commitment.status === "done" ? "Done" : "Open"}
                </Badge>
              </li>
            ))}
          </ul>
        </AgreementCard>
      </div>
      <section className="mt-8" aria-labelledby="people-heading">
        <h2 id="people-heading" className="font-display text-3xl tracking-tight text-ink">
          People
        </h2>
        <ul className="mt-4 space-y-3">
          {bond.members.map((member) => (
            <li key={member.id} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-line">
              <Avatar name={member.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink">
                  {member.name}
                  {member.isYou ? " · You" : ""}
                </p>
                <p className="text-sm capitalize text-ink-soft">{member.role}</p>
              </div>
              <Badge tone={memberTone[member.status as keyof typeof memberTone] ?? "neutral"}>{member.status}</Badge>
            </li>
          ))}
        </ul>
      </section>
      <div className="mt-8">
        <SharePanel path={bond.sharePath} sandbox={bond.shareKeySource === "local-fallback"} />
      </div>
      <section className="mt-8" aria-labelledby="history-heading">
        <h2 id="history-heading" className="font-display text-3xl tracking-tight text-ink">
          History
        </h2>
        {bond.events.length === 0 ? (
          <p className="mt-3 text-base text-ink-soft">No changes yet.</p>
        ) : (
          <ol className="mt-4 space-y-3">
            {bond.events.map((event, index) => (
              <li key={`${index}-${event}`} className="rounded-2xl bg-white px-4 py-3 text-sm leading-6 text-ink ring-1 ring-line">
                {event}
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
