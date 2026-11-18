import { cn } from "@/lib/cn";

const tones = {
  neutral: "bg-paper text-ink ring-1 ring-line",
  sample: "bg-peach text-ink",
  invited: "bg-peach text-ink",
  accepted: "bg-cobalt text-white",
  declined: "bg-white text-ink-soft ring-1 ring-line",
  removed: "bg-clay-bg text-clay",
  open: "bg-ink text-white",
  done: "bg-good-bg text-good",
  warn: "bg-warn-bg text-warn",
};

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: keyof typeof tones;
}) {
  return (
    <span className={cn("inline-flex min-h-7 items-center rounded-full px-2.5 text-xs font-semibold", tones[tone])}>
      {children}
    </span>
  );
}
