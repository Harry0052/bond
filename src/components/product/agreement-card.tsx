import { Badge } from "@/components/ui/badge";

export function AgreementCard({
  title,
  purpose,
  badge,
  badgeTone = "sample",
  heading = "h2",
  children,
}: {
  title: string;
  purpose: string;
  badge: string;
  badgeTone?: "sample" | "open" | "done" | "warn" | "neutral";
  heading?: "h1" | "h2";
  children?: React.ReactNode;
}) {
  const Title = heading;
  return (
    <article className="overflow-hidden rounded-[1.75rem] bg-white shadow-[0_16px_40px_rgba(30,35,64,0.06)] ring-1 ring-line">
      <div className="bg-peach px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex items-start justify-between gap-3">
          <Title className="min-w-0 break-words font-display text-3xl tracking-tight text-ink sm:text-4xl">{title}</Title>
          <Badge tone={badgeTone}>{badge}</Badge>
        </div>
        <p className="mt-3 max-w-2xl text-base leading-7 text-ink">{purpose}</p>
      </div>
      {children ? <div className="px-5 py-5 sm:px-7">{children}</div> : null}
    </article>
  );
}
