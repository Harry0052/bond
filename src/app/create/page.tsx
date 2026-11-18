import { CreateBondForm } from "@/components/product/create-bond-form";
import { readSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";

export const metadata = { title: "Create" };

export default async function CreatePage() {
  const user = await readSessionUser(getDb());
  return (
    <main id="main" className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cobalt-deep">New bond</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight text-ink sm:text-5xl">Make a bond</h1>
      <p className="mt-3 text-lg leading-8 text-ink-soft">
        Title, why you are doing it, who is involved, and what each person would take on. Nothing is accepted until
        that person accepts it.
      </p>
      <div className="mt-8">
        <CreateBondForm initialName={user?.displayName ?? null} initialTimezone={user?.timezone ?? null} />
      </div>
    </main>
  );
}
