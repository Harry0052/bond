export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-[1.75rem] border border-dashed border-line bg-white px-5 py-8">
      <h2 className="font-display text-3xl tracking-tight text-ink">{title}</h2>
      <p className="mt-2 max-w-xl text-base leading-7 text-ink-soft">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
