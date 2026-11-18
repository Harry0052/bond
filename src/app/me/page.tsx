import Link from "next/link";
import { DeleteAccount } from "@/components/product/delete-account";
import { NameForm } from "@/components/product/name-form";
import { UseTemplateButton } from "@/components/product/template-actions";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClass } from "@/components/ui/button";
import { readSessionUser } from "@/lib/auth/session";
import { flags } from "@/lib/flags";
import { getDb } from "@/lib/db/client";
import { listTemplates } from "@/lib/templates/service";

export const metadata = { title: "Me" };

const disabled = [
  ["Email", flags.emailDelivery],
  ["SMS", flags.smsDelivery],
  ["Push alerts", flags.pushNotifications],
  ["Contacts sync", flags.contactsSync],
  ["Calendar account sync", flags.calendarAccountSync],
  ["Payments and escrow", flags.payments || flags.escrow],
] as const;

export default async function MePage() {
  const db = getDb();
  const user = await readSessionUser(db);
  const templates = user ? listTemplates(db, user.id) : [];

  return (
    <main id="main" className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cobalt-deep">This browser</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight text-ink sm:text-5xl">Me</h1>
      <div className="mt-6">
        {user ? (
          <NameForm initialName={user.displayName} initialTimezone={user.timezone} />
        ) : (
          <EmptyState
            title="No name saved yet"
            body="Save a name on Home. Bond does not ask for an email address."
            action={
              <Link href="/" className={buttonClass("primary")}>
                Go to Home
              </Link>
            }
          />
        )}
      </div>
      <section className="mt-8" aria-labelledby="templates-heading">
        <h2 id="templates-heading" className="font-display text-3xl tracking-tight">
          Templates
        </h2>
        {templates.length === 0 ? (
          <p className="mt-3 text-base leading-7 text-ink-soft">
            Save a bond as a template from its page. Using it makes a new bond with new due times.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {templates.map((template) => (
              <li key={template.id} className="rounded-2xl bg-white px-4 py-4 ring-1 ring-line">
                <p className="font-semibold text-ink">{template.title}</p>
                <p className="mt-1 text-sm leading-6 text-ink-soft">{template.purpose}</p>
                <div className="mt-3">
                  <UseTemplateButton templateId={template.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="mt-8" aria-labelledby="disabled-heading">
        <h2 id="disabled-heading" className="font-display text-3xl tracking-tight">
          Not connected
        </h2>
        <ul className="mt-4 divide-y divide-line rounded-[1.75rem] bg-white px-5 ring-1 ring-line">
          {disabled.map(([label, enabled]) => (
            <li key={label} className="flex items-center justify-between gap-3 py-3">
              <span className="font-semibold text-ink">{label}</span>
              <span className="text-sm font-semibold text-ink-soft">{enabled ? "On" : "Off"}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm leading-6 text-ink-soft">
          A calendar file can be downloaded from a bond. Bond does not sign into a calendar account.
        </p>
      </section>
      {user ? (
        <section className="mt-8" aria-labelledby="export-heading">
          <h2 id="export-heading" className="font-display text-3xl tracking-tight">
            Download my data
          </h2>
          <p className="mt-2 text-base leading-7 text-ink-soft">
            A JSON file of your profile and the bonds you can still open. Share links are not included.
          </p>
          <a className={`${buttonClass("secondary")} mt-4`} href="/api/account/export">
            Download JSON
          </a>
          <DeleteAccount />
        </section>
      ) : null}
    </main>
  );
}
