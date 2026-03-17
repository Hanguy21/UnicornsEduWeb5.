export default function StudentListTableSkeleton({ rows = 10 }: { rows?: number }) {
  const cardRows = Math.min(rows, 5);

  return (
    <>
      <div className="block space-y-3 md:hidden" aria-hidden>
        {Array.from({ length: cardRows }).map((_, index) => (
          <div
            key={index}
            className="rounded-xl border border-border-default bg-bg-surface p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="inline-block size-2 shrink-0 animate-pulse rounded-full bg-bg-tertiary" />
                  <span className="h-5 w-36 animate-pulse rounded bg-bg-tertiary" />
                </div>
                <span className="mt-2 block h-4 w-40 animate-pulse rounded bg-bg-tertiary" />
              </div>
              <span className="h-6 w-24 animate-pulse rounded-full bg-bg-tertiary" />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <span className="h-12 animate-pulse rounded-lg bg-bg-secondary" />
              <span className="h-12 animate-pulse rounded-lg bg-bg-secondary" />
              <span className="h-12 animate-pulse rounded-lg bg-bg-secondary" />
              <span className="h-12 animate-pulse rounded-lg bg-bg-secondary" />
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="h-5 w-20 animate-pulse rounded-full bg-bg-tertiary" />
              <span className="h-5 w-24 animate-pulse rounded-full bg-bg-tertiary" />
              <span className="h-5 w-16 animate-pulse rounded-full bg-bg-tertiary" />
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block" aria-hidden>
        <table className="w-full min-w-[920px] table-fixed border-collapse text-left text-sm">
          <caption className="sr-only">Đang tải danh sách học sinh</caption>
          <thead>
            <tr className="border-b border-border-default bg-bg-secondary">
              <th scope="col" className="w-12 px-2 py-3" aria-label="Trạng thái" />
              <th scope="col" className="px-4 py-3 font-medium text-text-primary">Học sinh</th>
              <th scope="col" className="w-32 px-4 py-3 font-medium text-text-primary">Số dư</th>
              <th scope="col" className="w-24 px-4 py-3 font-medium text-text-primary">Giới tính</th>
              <th scope="col" className="w-36 px-4 py-3 font-medium text-text-primary">Tỉnh</th>
              <th scope="col" className="w-52 px-4 py-3 font-medium text-text-primary">Lớp</th>
              <th scope="col" className="w-44 px-4 py-3 font-medium text-text-primary">Trường</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, index) => (
              <tr key={index} className="border-b border-border-default bg-bg-surface">
                <td className="px-2 py-3">
                  <span className="inline-block size-2 animate-pulse rounded-full bg-bg-tertiary" />
                </td>
                <td className="px-4 py-3">
                  <span className="block h-5 w-40 animate-pulse rounded bg-bg-tertiary" />
                  <span className="mt-2 block h-4 w-48 animate-pulse rounded bg-bg-tertiary" />
                </td>
                <td className="px-4 py-3">
                  <span className="ml-auto block h-5 w-24 animate-pulse rounded bg-bg-tertiary" />
                </td>
                <td className="px-4 py-3">
                  <span className="block h-5 w-16 animate-pulse rounded-full bg-bg-tertiary" />
                </td>
                <td className="px-4 py-3">
                  <span className="block h-5 w-24 animate-pulse rounded bg-bg-tertiary" />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    <span className="h-5 w-16 animate-pulse rounded-full bg-bg-tertiary" />
                    <span className="h-5 w-20 animate-pulse rounded-full bg-bg-tertiary" />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="block h-5 w-32 animate-pulse rounded bg-bg-tertiary" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
