export default function ClassCard({
  title,
  action,
  children,
  className = "",
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-lg border border-border-default bg-bg-surface p-3 shadow-sm transition-colors duration-200 hover:border-border-default sm:p-4 ${className}`}
      aria-labelledby={`card-${title.replace(/\s+/g, "-")}`}
    >
      <div className="mb-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2
          id={`card-${title.replace(/\s+/g, "-")}`}
          className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted"
        >
          {title}
        </h2>
        {action ? <div className="w-full shrink-0 sm:w-auto">{action}</div> : null}
      </div>
      <div className="text-sm leading-snug text-text-primary">{children}</div>
    </section>
  );
}
