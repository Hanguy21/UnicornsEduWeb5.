"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { LessonWorkOutputItem, LessonWorkResponse } from "@/dtos/lesson.dto";
import * as lessonApi from "@/lib/apis/lesson.api";
import LessonWorkNewLessonPanel from "./LessonWorkNewLessonPanel";
import LessonWorkQuickFilters, {
  type LessonWorkFilterDraft,
} from "./LessonWorkQuickFilters";

const WORK_PAGE_SIZE = 10;

function normalizePositiveInt(value: string | null, fallback = 1) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}

function normalizeMonthYear(
  yearRaw: string | null,
  monthRaw: string | null,
): { year: number; month: number } {
  const now = new Date();
  const defaultYear = now.getFullYear();
  const defaultMonth = now.getMonth() + 1;

  const year = Number(yearRaw);
  const month = Number(monthRaw);

  const y =
    Number.isFinite(year) && year >= 2000 && year <= 2100 ? year : defaultYear;
  const m =
    Number.isFinite(month) && month >= 1 && month <= 12 ? month : defaultMonth;

  return { year: y, month: m };
}

function getErrorMessage(error: unknown, fallback: string) {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ??
    (error as Error)?.message ??
    fallback
  );
}

function buildOutputHref(outputId: string, workPage: number, year: number, month: number) {
  const params = new URLSearchParams();
  params.set("tab", "work");
  params.set("workPage", String(workPage));
  params.set("workYear", String(year));
  params.set("workMonth", String(month));
  return `/admin/lesson-plans/outputs/${encodeURIComponent(outputId)}?${params.toString()}`;
}

function formatMonthLabel(year: number, month: number) {
  const m = String(month).padStart(2, "0");
  return `Tháng ${m}/${year}`;
}

function LevelPill({ level }: { level: string | null }) {
  if (!level?.trim()) {
    return <span className="text-sm text-text-muted">—</span>;
  }

  const text = /level/i.test(level) ? level.trim() : `Level ${level.trim()}`;

  return (
    <span className="inline-flex max-w-[8rem] truncate rounded-full bg-primary/12 px-2.5 py-1 text-xs font-semibold text-primary ring-1 ring-primary/20">
      {text}
    </span>
  );
}

function PaymentPill({ cost }: { cost: number }) {
  const unpaid = cost > 0;
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${unpaid
        ? "bg-error text-text-inverse"
        : "bg-success/15 text-success ring-1 ring-success/25"
        }`}
    >
      {unpaid ? "Chưa thanh toán" : "Đã thanh toán"}
    </span>
  );
}

function WorkPagination({
  page,
  totalPages,
  total,
  isPending,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  isPending: boolean;
  onPageChange: (nextPage: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-border-default pt-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-text-secondary">
          {total} bài trong tháng đang xem
        </p>
        {isPending ? (
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-text-muted">
            Đang chuyển trang
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || isPending}
          className="rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-50"
        >
          Trước
        </button>
        <span className="rounded-xl border border-border-default bg-bg-secondary px-3 py-2 text-sm font-medium text-text-secondary">
          Trang {page}/{totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || isPending}
          className="rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-50"
        >
          Sau
        </button>
      </div>
    </div>
  );
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border-default">
      <div className="overflow-x-auto">
        <table className="min-w-[56rem] border-collapse text-left">
          <thead className="bg-bg-secondary">
            <tr className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              <th className="w-10 px-3 py-3" scope="col" />
              <th className="px-3 py-3" scope="col">
                Tag
              </th>
              <th className="px-3 py-3" scope="col">
                Level
              </th>
              <th className="min-w-[14rem] px-3 py-3" scope="col">
                Tên bài
              </th>
              <th className="px-3 py-3" scope="col">
                Trạng thái
              </th>
              <th className="min-w-[10rem] px-3 py-3" scope="col">
                Contest
              </th>
              <th className="w-28 px-3 py-3 text-right" scope="col">
                Link
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <tr key={`sk-${i}`} className="border-t border-border-default">
                <td className="px-3 py-4">
                  <div className="h-4 w-4 animate-pulse rounded bg-bg-tertiary" />
                </td>
                <td className="px-3 py-4">
                  <div className="flex flex-wrap gap-1">
                    <div className="h-6 w-14 animate-pulse rounded-full bg-bg-tertiary" />
                    <div className="h-6 w-16 animate-pulse rounded-full bg-bg-tertiary/80" />
                  </div>
                </td>
                <td className="px-3 py-4">
                  <div className="h-6 w-16 animate-pulse rounded-full bg-bg-tertiary" />
                </td>
                <td className="px-3 py-4">
                  <div className="h-4 w-full max-w-md animate-pulse rounded bg-bg-tertiary" />
                </td>
                <td className="px-3 py-4">
                  <div className="h-6 w-24 animate-pulse rounded-full bg-bg-tertiary" />
                </td>
                <td className="px-3 py-4">
                  <div className="h-4 w-32 animate-pulse rounded bg-bg-tertiary" />
                </td>
                <td className="px-3 py-4 text-right">
                  <div className="ml-auto flex justify-end gap-1">
                    <div className="size-8 animate-pulse rounded-lg bg-bg-tertiary" />
                    <div className="size-8 animate-pulse rounded-lg bg-bg-tertiary/80" />
                    <div className="size-8 animate-pulse rounded-lg bg-bg-tertiary/60" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function LessonWorkTab() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const workPage = normalizePositiveInt(searchParams.get("workPage"));
  const { year: workYear, month: workMonth } = normalizeMonthYear(
    searchParams.get("workYear"),
    searchParams.get("workMonth"),
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterOpen, setFilterOpen] = useState(true);

  const workSearch = searchParams.get("workSearch") ?? "";
  const workTag = searchParams.get("workTag") ?? "";
  const workOutputStatus = searchParams.get("workOutputStatus") ?? "all";
  const workStaffId = searchParams.get("workStaffId") ?? "";
  const workDateFrom = searchParams.get("workDateFrom") ?? "";
  const workDateTo = searchParams.get("workDateTo") ?? "";

  const [filterDraft, setFilterDraft] = useState<LessonWorkFilterDraft>(() => ({
    search: workSearch,
    tag: workTag,
    outputStatus: workOutputStatus || "all",
    staffId: workStaffId,
    dateFrom: workDateFrom,
    dateTo: workDateTo,
  }));

  useEffect(() => {
    setFilterDraft({
      search: workSearch,
      tag: workTag,
      outputStatus: workOutputStatus || "all",
      staffId: workStaffId,
      dateFrom: workDateFrom,
      dateTo: workDateTo,
    });
  }, [
    workSearch,
    workTag,
    workOutputStatus,
    workStaffId,
    workDateFrom,
    workDateTo,
  ]);

  const { data: staffFilterOptions = [] } = useQuery({
    queryKey: ["lesson", "output-staff-options", "work-filter"],
    queryFn: () =>
      lessonApi.searchLessonOutputStaffOptions({
        limit: 80,
      }),
  });

  const syncWorkParams = useCallback(
    (patch: Record<string, string | number | null | undefined>) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.set("tab", "work");
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === undefined || value === "") {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      }
      router.replace(`/admin/lesson-plans?${params.toString()}`, {
        scroll: false,
      });
    },
    [router, searchParams],
  );

  const applyFilters = useCallback(() => {
    syncWorkParams({
      workSearch: filterDraft.search.trim() || null,
      workTag: filterDraft.tag.trim() || null,
      workOutputStatus:
        filterDraft.outputStatus === "all" || !filterDraft.outputStatus.trim()
          ? null
          : filterDraft.outputStatus.trim(),
      workStaffId: filterDraft.staffId.trim() || null,
      workDateFrom: filterDraft.dateFrom.trim() || null,
      workDateTo: filterDraft.dateTo.trim() || null,
      workPage: 1,
    });
    setSelected(new Set());
  }, [filterDraft, syncWorkParams]);

  const clearFilters = useCallback(() => {
    setFilterDraft({
      search: "",
      tag: "",
      outputStatus: "all",
      staffId: "",
      dateFrom: "",
      dateTo: "",
    });
    syncWorkParams({
      workSearch: null,
      workTag: null,
      workOutputStatus: null,
      workStaffId: null,
      workDateFrom: null,
      workDateTo: null,
      workPage: 1,
    });
    setSelected(new Set());
  }, [syncWorkParams]);

  const handleMonthStep = (delta: number) => {
    const d = new Date(Date.UTC(workYear, workMonth - 1 + delta, 1));
    syncWorkParams({
      workYear: d.getUTCFullYear(),
      workMonth: d.getUTCMonth() + 1,
      workPage: 1,
      workDateFrom: null,
      workDateTo: null,
    });
    setFilterDraft((prev) => ({ ...prev, dateFrom: "", dateTo: "" }));
    setSelected(new Set());
  };

  const handlePageChange = (page: number) => {
    syncWorkParams({ workPage: page });
  };

  const queryKey = useMemo(
    () =>
      [
        "lesson",
        "work",
        workPage,
        workYear,
        workMonth,
        workSearch,
        workTag,
        workOutputStatus,
        workStaffId,
        workDateFrom,
        workDateTo,
      ] as const,
    [
      workPage,
      workYear,
      workMonth,
      workSearch,
      workTag,
      workOutputStatus,
      workStaffId,
      workDateFrom,
      workDateTo,
    ],
  );

  const { data, isLoading, isFetching, isError, error, refetch } =
    useQuery<LessonWorkResponse>({
      queryKey,
      queryFn: () =>
        lessonApi.getLessonWork({
          page: workPage,
          limit: WORK_PAGE_SIZE,
          year: workYear,
          month: workMonth,
          search: workSearch || undefined,
          tag: workTag || undefined,
          outputStatus:
            workOutputStatus && workOutputStatus !== "all"
              ? workOutputStatus
              : undefined,
          staffId: workStaffId || undefined,
          dateFrom: workDateFrom || undefined,
          dateTo: workDateTo || undefined,
        }),
      placeholderData: (previousData) => previousData,
    });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => lessonApi.deleteLessonOutput(id),
    onSuccess: () => {
      toast.success("Đã xóa bài giáo án.");
      void queryClient.invalidateQueries({ queryKey: ["lesson", "work"] });
      void queryClient.invalidateQueries({ queryKey: ["lesson", "overview"] });
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Không xóa được bản ghi."));
    },
  });

  const outputs = data?.outputs ?? [];
  const pageIds = useMemo(() => outputs.map((o) => o.id), [outputs]);
  const allSelected =
    pageIds.length > 0 && pageIds.every((id) => selected.has(id));

  const toggleAllPage = () => {
    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        pageIds.forEach((id) => next.delete(id));
        return next;
      });
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      pageIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const copyText = async (text: string, label: string) => {
    if (!text.trim()) {
      toast.error("Không có nội dung để sao chép.");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`Đã sao chép ${label}.`);
    } catch {
      toast.error("Không sao chép được.");
    }
  };

  const openExternal = (url: string) => {
    const u = url.trim();
    if (!u) {
      toast.error("Chưa có liên kết.");
      return;
    }
    try {
      const href = u.startsWith("http") ? u : `https://${u}`;
      window.open(href, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Không mở được liên kết.");
    }
  };

  const confirmDelete = (output: LessonWorkOutputItem) => {
    const ok = window.confirm(
      `Xóa bài “${output.lessonName.trim() || output.id}”? Hành động không hoàn tác.`,
    );
    if (!ok) {
      return;
    }
    deleteMutation.mutate(output.id);
  };

  if (isLoading && !data) {
    return (
      <section
        id="lesson-panel-work"
        role="tabpanel"
        aria-labelledby="lesson-tab-work"
        className="space-y-4"
      >
        <TableSkeleton rows={6} />
      </section>
    );
  }

  if (isError || !data) {
    return (
      <section
        id="lesson-panel-work"
        role="tabpanel"
        aria-labelledby="lesson-tab-work"
        className="space-y-6"
      >
        <section className="rounded-xl border border-border-default bg-bg-surface p-5 shadow-sm sm:p-6">
          <div className="rounded-xl border border-dashed border-border-default bg-bg-secondary/40 px-5 py-12 text-center">
            <p className="text-base font-semibold text-text-primary">
              Không tải được danh sách công việc (tab Công việc).
            </p>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
              {getErrorMessage(error, "Đã có lỗi khi tải tab Công việc.")}
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              Tải lại
            </button>
          </div>
        </section>
      </section>
    );
  }

  return (
    <section
      id="lesson-panel-work"
      role="tabpanel"
      aria-labelledby="lesson-tab-work"
      className="space-y-4"
    >
      <LessonWorkQuickFilters
        open={filterOpen}
        onOpenChange={setFilterOpen}
        draft={filterDraft}
        onDraftChange={(patch) =>
          setFilterDraft((prev) => ({ ...prev, ...patch }))
        }
        onApply={applyFilters}
        onClear={clearFilters}
        staffOptions={staffFilterOptions}
      />

      <LessonWorkNewLessonPanel />

      <div className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 border-b border-border-default pb-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold text-text-primary sm:text-xl">
            Bài giáo án đã làm
          </h3>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleMonthStep(-1)}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-border-default bg-bg-surface text-text-primary transition-colors hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              aria-label="Tháng trước"
            >
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="min-w-[10rem] text-center text-sm font-semibold tabular-nums text-text-primary">
              {formatMonthLabel(workYear, workMonth)}
            </span>
            <button
              type="button"
              onClick={() => handleMonthStep(1)}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-border-default bg-bg-surface text-text-primary transition-colors hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              aria-label="Tháng sau"
            >
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        <div className="mt-4">
          {outputs.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-border-default">
              <div className="overflow-x-auto">
                <table className="min-w-[56rem] border-collapse text-left">
                  <thead className="bg-bg-secondary">
                    <tr className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                      <th className="w-12 px-3 py-3" scope="col">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={() => toggleAllPage()}
                          className="size-4 rounded border-border-default text-primary focus:ring-border-focus"
                          aria-label="Chọn tất cả trên trang này"
                        />
                      </th>
                      <th className="px-3 py-3" scope="col">
                        Tag
                      </th>
                      <th className="px-3 py-3" scope="col">
                        Level
                      </th>
                      <th className="min-w-[14rem] px-3 py-3" scope="col">
                        Tên bài
                      </th>
                      <th className="px-3 py-3" scope="col">
                        Trạng thái
                      </th>
                      <th className="min-w-[10rem] px-3 py-3" scope="col">
                        Contest
                      </th>
                      <th className="w-32 px-3 py-3 text-right" scope="col">
                        Link
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {outputs.map((output) => {
                      const detailHref = buildOutputHref(
                        output.id,
                        workPage,
                        workYear,
                        workMonth,
                      );
                      const linkUrl = output.link?.trim() ?? "";

                      return (
                        <tr
                          key={output.id}
                          className="cursor-pointer border-t border-border-default bg-bg-surface transition-colors hover:bg-bg-secondary/40"
                          onClick={() => router.push(detailHref)}
                        >
                          <td className="px-3 py-3 align-middle" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selected.has(output.id)}
                              onChange={() => toggleOne(output.id)}
                              className="size-4 rounded border-border-default text-primary focus:ring-border-focus"
                              aria-label={`Chọn ${output.lessonName}`}
                            />
                          </td>
                          <td className="px-3 py-3 align-top">
                            <div className="flex max-w-[14rem] flex-wrap gap-1">
                              {output.tags.length > 0 ? (
                                output.tags.map((tag) => (
                                  <span
                                    key={`${output.id}-${tag}`}
                                    className="rounded-full border border-border-default bg-bg-secondary px-2 py-0.5 text-[11px] font-medium text-text-secondary"
                                  >
                                    {tag}
                                  </span>
                                ))
                              ) : (
                                <span className="text-sm text-text-muted">—</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3 align-top">
                            <LevelPill level={output.level} />
                          </td>
                          <td className="px-3 py-3 align-top">
                            <p className="max-w-xl text-sm font-semibold uppercase leading-snug text-text-primary">
                              {output.lessonName}
                            </p>
                          </td>
                          <td className="px-3 py-3 align-top">
                            <PaymentPill cost={output.cost} />
                          </td>
                          <td className="px-3 py-3 align-top text-sm text-text-secondary">
                            <span className="line-clamp-2">
                              {output.contestUploaded?.trim() || "—"}
                            </span>
                          </td>
                          <td className="px-3 py-3 align-top text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-0.5">
                              <button
                                type="button"
                                title="Sao chép liên kết"
                                disabled={!linkUrl}
                                onClick={() => void copyText(linkUrl, "liên kết")}
                                className="rounded-lg p-2 text-text-muted transition-colors hover:bg-bg-secondary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                title="Mở liên kết"
                                disabled={!linkUrl}
                                onClick={() => openExternal(linkUrl)}
                                className="rounded-lg p-2 text-text-muted transition-colors hover:bg-bg-secondary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                title="Xóa"
                                disabled={deleteMutation.isPending}
                                onClick={() => confirmDelete(output)}
                                className="rounded-lg p-2 text-text-muted transition-colors hover:bg-error/15 hover:text-error disabled:opacity-50"
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
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border-default bg-bg-secondary/35 px-5 py-12 text-center">
              <p className="text-base font-semibold text-text-primary">
                Chưa có bài giáo án trong tháng này.
              </p>
              <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
                Thử đổi tháng hoặc tạo sản phẩm từ tab Tổng quan / chi tiết công việc.
              </p>
            </div>
          )}
        </div>

        {outputs.length > 0 ? (
          <div className="mt-6">
            <WorkPagination
              page={data.outputsMeta.page}
              totalPages={data.outputsMeta.totalPages}
              total={data.outputsMeta.total}
              isPending={isFetching && data.outputsMeta.page !== workPage}
              onPageChange={handlePageChange}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
