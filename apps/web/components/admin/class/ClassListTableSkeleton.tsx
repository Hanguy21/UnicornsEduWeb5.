export default function ClassListTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="overflow-x-auto" aria-hidden>
      <table className="w-full min-w-[400px] border-collapse text-left text-sm">
        <caption className="sr-only">Đang tải danh sách lớp học</caption>
        <thead>
          <tr className="border-b border-border-default bg-bg-secondary">
            <th scope="col" className="w-8 px-2 py-3" aria-label="Trạng thái" />
            <th scope="col" className="px-4 py-3 font-medium text-text-primary">
              Tên lớp
            </th>
            <th scope="col" className="px-4 py-3 font-medium text-text-primary">
              Loại lớp
            </th>
            <th scope="col" className="px-4 py-3 font-medium text-text-primary">
              Gia sư
            </th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} className="border-b border-border-default bg-bg-surface">
              <td className="w-8 px-2 py-3 align-middle">
                <span className="inline-block size-2 rounded-full bg-bg-tertiary animate-pulse" />
              </td>
              <td className="min-w-0 px-4 py-3">
                <span className="inline-block h-5 w-full max-w-[10rem] animate-pulse rounded bg-bg-tertiary" />
              </td>
              <td className="px-4 py-3">
                <span className="inline-block h-5 w-20 animate-pulse rounded bg-bg-tertiary" />
              </td>
              <td className="px-4 py-3">
                <span className="inline-block h-5 w-full max-w-[8rem] animate-pulse rounded bg-bg-tertiary" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
