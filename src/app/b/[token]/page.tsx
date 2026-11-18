import Link from "next/link";
import { AgreementCard } from "@/components/product/agreement-card";
import { DueTime } from "@/components/product/due-time";
import { JoinForm } from "@/components/product/join-form";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { readSessionUser } from "@/lib/auth/session";
import { openSlots } from "@/lib/bonds/join";
import { readPreview } from "@/lib/bonds/service";
import { getDb } from "@/lib/db/client";

export default async function PreviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = getDb();
  const decoded = decodeURIComponent(token);
  const preview = readPreview(db, decoded);
  const sheet = openSlots(db, decoded);
  const user = await readSessionUser(db);
  if (!preview) {
    return (
      <main id="main" className="mx-auto flex w-full max-w-3xl flex-col px-4 py-16">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cobalt-deep">Not invited</p>
        <h1 className="mt-3 font-display text-5xl tracking-tight text-ink">This link does not match a bond</h1>
        <p className="mt-4 max-w-xl text-lg leading-8 text-ink-soft">
          The link is missing, expired, or was replaced. Bond did not show anyone else&apos;s plans.
        </p>
        <Link href="/" className={`${buttonClass("primary")} mt-8 w-fit`}>
          Back to Home
        </Link>
      </main>
    );
  }

  return (
    <main id="main" className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cobalt-deep">Preview</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight text-ink sm:text-5xl">Read this before you join</h1>
      <p className="mt-3 max-w-xl text-base leading-7 text-ink-soft">
        You can read this card. You have not joined. Private history stays with the people already on the bond.
      </p>
      {preview.demo ? (
        <p className="mt-4 rounded-2xl bg-peach px-4 py-3 text-sm font-semibold text-ink">
          Sample bond. It is not your group, and joining it is turned off.
        </p>
      ) : null}
      {preview.shareKeySource === "local-fallback" ? (
        <p className="mt-4 text-sm leading-6 text-warn">
          This link was signed with the local development key.
        </p>
      ) : null}
      <div className="mt-6">
        <AgreementCard
          title={preview.title}
          purpose={preview.purpose}
          badge={preview.demo ? "Sample" : preview.status === "completed" ? "Completed" : "Preview"}
          badgeTone={preview.demo ? "sample" : "neutral"}
        >
          <p className="text-sm text-ink-soft">
            {preview.counts.accepted} accepted · {preview.counts.invited} invited
            {preview.counts.declined > 0 ? ` · ${preview.counts.declined} declined` : ""}
          </p>
          <ul className="mt-4 divide-y divide-line">
            {preview.commitments.map((commitment) => (
              <li key={`${commitment.title}-${commitment.dueAt}`} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
                <div>
                  <p className="font-semibold text-ink">{commitment.title}</p>
                  <p className="text-sm text-ink-soft">
                    {commitment.assigneeLabel} · <DueTime iso={commitment.dueAt} />
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
      {preview.demo || !sheet || preview.status !== "active" ? null : (
        <JoinForm token={decoded} slots={sheet.slots} signedIn={Boolean(user)} />
      )}
    </main>
  );
}
