import { NameForm } from "@/components/product/name-form";
import { SampleCard } from "@/components/product/sample-card";
import { readSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";

export default async function HomePage() {
  const user = await readSessionUser(getDb());

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
              Start by saving the name your group already uses. Making a bond comes next, on this same server.
            </p>
          )}
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
      <SampleCard />
    </main>
  );
}
