type SessionEntityMode = "teacher" | "class" | "none";

type Props = {
  rows?: number;
  entityMode?: SessionEntityMode;
  className?: string;
};

function renderEntityHeader(entityMode: Exclude<SessionEntityMode, "none">): string {
  if (entityMode === "teacher") {
    return "Gia sư";
  }

  return "Lớp";
}

export default function SessionHistoryTableSkeleton({
  rows = 1,
  entityMode = "none",
  className = "",
}: Props) {
  const shouldShowEntity = entityMode !== "none";

  return (
    <div className={`overflow-x-auto ${className}`} aria-hidden>
      <table className="w-full min-w-[520px] border-collapse text-left text-sm table-fixed">
        <thead>
          <tr className="border-b border-border-default bg-bg-secondary">
            <th className="px-4 py-3 font-medium text-text-primary">Ngày học</th>
            <th className="px-4 py-3 font-medium text-text-primary">Giờ học</th>
            {shouldShowEntity ? (
              <th className="px-4 py-3 font-medium text-text-primary">
                {renderEntityHeader(entityMode)}
              </th>
            ) : null}
            <th className="px-4 py-3 font-medium text-text-primary">Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex} className="border-b border-border-default bg-bg-surface">
              <td className="px-4 py-3">
                <span className="inline-block h-5 w-24 animate-pulse rounded bg-bg-tertiary" />
              </td>
              <td className="px-4 py-3">
                <span className="inline-block h-5 w-20 animate-pulse rounded bg-bg-tertiary" />
              </td>
              {shouldShowEntity ? (
                <td className="px-4 py-3">
                  <span className="inline-block h-5 w-28 animate-pulse rounded bg-bg-tertiary" />
                </td>
              ) : null}
              <td className="px-4 py-3">
                <span className="inline-block h-5 w-24 animate-pulse rounded-full bg-bg-tertiary" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
