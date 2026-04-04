const DEFAULT_TITLE_CLASS =
  "mb-4 text-sm font-semibold uppercase tracking-wide text-text-muted";

export default function StaffCard({
  title,
  children,
  className = "",
  titleClassName,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  /** Override heading styles (default: muted uppercase label). */
  titleClassName?: string;
}) {
  const titleId = `card-${title.replace(/\s+/g, "-")}`;
  return (
    <section
      className={`rounded-lg border border-border-default bg-bg-surface p-4 shadow-sm transition-colors duration-200 hover:border-border-default sm:p-5 ${className}`}
      aria-labelledby={titleId}
    >
      <h2 id={titleId} className={titleClassName ?? DEFAULT_TITLE_CLASS}>
        {title}
      </h2>
      <div className="text-sm text-text-primary">{children}</div>
    </section>
  );
}
