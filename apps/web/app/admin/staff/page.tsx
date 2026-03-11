"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import * as staffApi from "@/lib/apis/staff.api";

type StaffStatus = "active" | "inactive";

interface StaffListItem {
  id: string;
  fullName: string;
  status: StaffStatus;
  user?: { province?: string | null } | null;
  classTeachers?: Array<{ class: { id: string; name: string } }>;
  monthlyStats?: Array<{ totalUnpaidAll?: number | null }>;
}

const PAGE_SIZE = 20;

const STATUS_OPTIONS: { value: "" | StaffStatus; label: string }[] = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "active", label: "Hoạt động" },
  { value: "inactive", label: "Ngừng" },
];

function formatCurrency(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-x-auto overscroll-contain" aria-hidden>
      <table className="w-full min-w-[520px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border-default bg-bg-secondary">
            <th className="w-8 px-2 py-3" />
            <th className="px-4 py-3 font-medium text-text-primary">Tên</th>
            <th className="px-4 py-3 font-medium text-text-primary">Tỉnh</th>
            <th className="px-4 py-3 font-medium text-text-primary">Lớp</th>
            <th className="px-4 py-3 font-medium text-text-primary">Chưa thanh toán</th>
            <th className="w-20 px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} className="border-b border-border-default bg-bg-surface">
              {Array.from({ length: 6 }).map((_, j) => (
                <td key={j} className="px-4 py-3">
                  <span className="inline-block h-5 w-full max-w-[6rem] animate-pulse rounded bg-bg-tertiary" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminStaffPage() {
  const router = useRouter();
  const [list, setList] = useState<StaffListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | StaffStatus>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchStaff = () => {
    setLoading(true);
    setError(null);
    staffApi
      .getStaff()
      .then((data) => setList(Array.isArray(data) ? data : []))
      .catch((err) => {
        const msg =
          err?.response?.data?.message ?? err?.message ?? "Không tải được danh sách nhân sự.";
        setError(msg);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((s) => {
      const matchSearch = !q || (s.fullName ?? "").toLowerCase().includes(q);
      const matchStatus = !statusFilter || s.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [list, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const statusDotColor = (status: StaffStatus) =>
    status === "active" ? "bg-warning" : "bg-text-muted";

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Bạn có chắc muốn xóa nhân sự "${name}"?`)) return;
    setDeletingId(id);
    try {
      await staffApi.deleteStaffById(id);
      toast.success("Đã xóa nhân sự.");
      fetchStaff();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err as Error)?.message ??
        "Không thể xóa.";
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-4 sm:p-6">
      <div className="flex min-w-0 flex-1 flex-col rounded-lg border border-border-default bg-bg-surface p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-semibold text-text-primary">Nhân sự</h1>
          <button
            type="button"
            className="rounded-md border border-border-default bg-secondary px-4 py-2 text-sm font-medium text-text-primary transition hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface disabled:opacity-50"
            disabled
            aria-label="Thêm nhân sự (sắp ra mắt)"
            title="Thêm nhân sự (sắp ra mắt)"
          >
            Thêm nhân sự
          </button>
        </div>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center">
            <span className="shrink-0 text-sm font-medium text-text-secondary sm:w-24">Tìm kiếm</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Theo tên…"
              className="min-w-0 flex-1 rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"
              aria-label="Tìm theo tên"
            />
          </label>
          <label className="flex shrink-0 flex-col gap-1 sm:flex-row sm:items-center">
            <span className="shrink-0 text-sm font-medium text-text-secondary sm:w-24">Trạng thái</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter((e.target.value || "") as "" | StaffStatus)}
              className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"
              aria-label="Lọc theo trạng thái"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value || "all"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="min-w-0 flex-1 overflow-auto">
          {loading ? (
            <TableSkeleton rows={5} />
          ) : error ? (
            <div className="py-16 text-center text-error" role="alert" aria-live="assertive">
              <p className="text-sm">{error}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-text-muted" aria-live="polite">
              <p className="text-sm">
                {list.length === 0 ? "Chưa có nhân sự nào." : "Không có kết quả phù hợp bộ lọc."}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto overscroll-contain">
                <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                  <caption className="sr-only">Danh sách nhân sự (staff_info)</caption>
                  <thead>
                    <tr className="border-b border-border-default bg-bg-secondary">
                      <th scope="col" className="w-8 px-2 py-3" aria-label="Trạng thái" />
                      <th scope="col" className="px-4 py-3 font-medium text-text-primary">Tên</th>
                      <th scope="col" className="px-4 py-3 font-medium text-text-primary">Tỉnh</th>
                      <th scope="col" className="px-4 py-3 font-medium text-text-primary">Lớp</th>
                      <th scope="col" className="px-4 py-3 font-medium text-text-primary">Chưa thanh toán</th>
                      <th scope="col" className="w-24 px-4 py-3">
                        <span className="sr-only">Xóa</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRows.map((row) => {
                    const unpaid = row.monthlyStats?.[0]?.totalUnpaidAll;
                    const classes = row.classTeachers?.map((ct) => ct.class.name).filter(Boolean).join(", ") || "—";
                    const province = row.user?.province?.trim() || "—";
                    return (
                      <tr
                        key={row.id}
                        role="button"
                        tabIndex={0}
                        className="group cursor-pointer border-b border-border-default bg-bg-surface transition-colors hover:bg-bg-secondary focus-within:bg-bg-secondary"
                        onClick={() => router.push(`/admin/staff/${row.id}`)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            router.push(`/admin/staff/${row.id}`);
                          }
                        }}
                        aria-label={`Xem chi tiết ${row.fullName?.trim() || "nhân sự"}`}
                      >
                        <td className="px-2 py-3 align-middle">
                          <span
                            className={`inline-block size-2 shrink-0 rounded-full ${statusDotColor(row.status)}`}
                            title={row.status === "active" ? "Hoạt động" : "Ngừng"}
                            aria-hidden
                          />
                        </td>
                        <td className="min-w-0 px-4 py-3 text-text-primary">
                          <span className="truncate">{row.fullName?.trim() || "—"}</span>
                        </td>
                        <td className="min-w-0 px-4 py-3 text-text-secondary">
                          <span className="truncate">{province}</span>
                        </td>
                        <td className="min-w-0 px-4 py-3 text-text-secondary">
                          <span className="truncate">{classes}</span>
                        </td>
                        <td className="px-4 py-3 tabular-nums text-text-primary">
                          {formatCurrency(unpaid ?? undefined)}
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100">
                            <button
                              type="button"
                              className="rounded p-1.5 text-text-muted transition hover:bg-error/15 hover:text-error focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface disabled:opacity-50"
                              aria-label={`Xóa ${row.fullName}`}
                              title="Xóa"
                              disabled={!!deletingId}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(row.id, row.fullName?.trim() || "");
                              }}
                            >
                              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <nav
                  className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border-default pt-4"
                  aria-label="Phân trang"
                >
                  <p className="text-sm text-text-muted" aria-live="polite">
                    Hiển thị {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} trong {filtered.length} nhân sự
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm font-medium text-text-primary transition hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={currentPage <= 1}
                      aria-label="Trang trước"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                      Trước
                    </button>
                    <span className="tabular-nums text-sm text-text-secondary">
                      Trang {currentPage} / {totalPages}
                    </span>
                    <button
                      type="button"
                      className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm font-medium text-text-primary transition hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={currentPage >= totalPages}
                      aria-label="Trang sau"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Sau
                    </button>
                  </div>
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
