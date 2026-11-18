import { AgreementCard } from "@/components/product/agreement-card";

const rows = [
  { title: "Buy oat milk", who: "Riley", when: "Sat 18:00" },
  { title: "Book the table", who: "Sam", when: "Fri 12:00" },
];

export function SampleCard() {
  return (
    <section className="mt-12" aria-labelledby="sample-bond">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h2 id="sample-bond" className="font-display text-3xl tracking-tight text-ink">
          What a bond looks like
        </h2>
        <p className="max-w-md text-sm leading-6 text-ink-soft">
          Sample only. It is not your group, and it is not saved as your bond.
        </p>
      </div>
      <AgreementCard
        title="Saturday groceries"
        purpose="A picture of the card two roommates would share. Joining and editing this sample are turned off."
        badge="Sample"
      >
        <ul className="divide-y divide-line">
          {rows.map((row) => (
            <li key={row.title} className="flex flex-wrap items-baseline justify-between gap-2 py-3 first:pt-0 last:pb-0">
              <span className="font-semibold text-ink">{row.title}</span>
              <span className="text-sm text-ink-soft">
                {row.who} · {row.when}
              </span>
            </li>
          ))}
        </ul>
      </AgreementCard>
    </section>
  );
}
