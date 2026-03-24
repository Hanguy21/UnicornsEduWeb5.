"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import LessonDeleteConfirmPopup from "@/components/admin/lesson-plans/LessonDeleteConfirmPopup";
import LessonOutputEditorForm from "@/components/admin/lesson-plans/LessonOutputEditorForm";
import {
  formatLessonDateOnly,
  formatLessonDateTime,
  formatLessonStaffRoleLabel,
  LESSON_PAYMENT_STATUS_LABELS,
  LESSON_OUTPUT_STATUS_LABELS,
  LESSON_TASK_PRIORITY_LABELS,
  LESSON_TASK_STATUS_LABELS,
  lessonPaymentStatusChipClass,
  lessonOutputStatusChipClass,
  lessonTaskPriorityChipClass,
  lessonTaskStatusChipClass,
} from "@/components/admin/lesson-plans/lessonTaskUi";
import type {
  CreateLessonOutputPayload,
  LessonOutputItem,
  LessonTaskOption,
} from "@/dtos/lesson.dto";
import * as lessonApi from "@/lib/apis/lesson.api";

function normalizePositiveInt(value: string | null, fallback = 1) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}

type SearchParamsLike = {
  get(name: string): string | null;
  toString(): string;
};

function buildLessonContextParams(searchParams: SearchParamsLike | null | undefined) {
  const nextParams = new URLSearchParams(searchParams?.toString() ?? "");
  const tab = searchParams?.get("tab");
  if (tab === "overview" || tab === "work" || tab === "exercises") {
    nextParams.set("tab", tab);
  } else if (!nextParams.get("tab")) {
    nextParams.set("tab", "work");
  }
  if (!nextParams.get("resourcePage")) {
    nextParams.set(
      "resourcePage",
      String(normalizePositiveInt(searchParams?.get("resourcePage") ?? null)),
    );
  }
  if (!nextParams.get("taskPage")) {
    nextParams.set(
      "taskPage",
      String(normalizePositiveInt(searchParams?.get("taskPage") ?? null)),
    );
  }
  if (!nextParams.get("workPage")) {
    nextParams.set(
      "workPage",
      String(normalizePositiveInt(searchParams?.get("workPage") ?? null)),
    );
  }

  return nextParams;
}

function getErrorMessage(error: unknown, fallback: string) {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ??
    (error as Error)?.message ??
    fallback
  );
}

function OutputMetaCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <article className="rounded-[1.35rem] border border-border-default bg-bg-surface p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-muted">
        {label}
      </p>
      <p className="mt-3 text-lg font-semibold text-text-primary">{value}</p>
      <p className="mt-1 text-sm text-text-secondary">{hint}</p>
    </article>
  );
}

function normalizeCurrentTaskOption(
  output: LessonOutputItem | undefined,
): LessonTaskOption | null {
  const taskId = output?.lessonTaskId ?? output?.task?.id ?? null;
  if (!taskId) {
    return null;
  }

  return {
    id: taskId,
    title: output?.task?.title ?? null,
    status: output?.task?.status ?? "pending",
    priority: output?.task?.priority ?? "medium",
    dueDate: null,
  };
}

export default function AdminLessonOutputDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const outputId = typeof params?.outputId === "string" ? params.outputId : "";
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [taskSearch, setTaskSearch] = useState("");
  const [taskDraft, setTaskDraft] = useState<LessonTaskOption | null>(null);
  const isManageDetailsOrigin = searchParams.get("origin") === "manage-details";
  const originTaskId =
    searchParams.get("origin") === "task" && searchParams.get("taskId")
      ? searchParams.get("taskId")
      : null;
  const deferredTaskSearch = useDeferredValue(taskSearch.trim());

  const backHref = useMemo(() => {
    const nextParams = buildLessonContextParams(searchParams);
    nextParams.delete("origin");
    nextParams.delete("taskId");
    if (originTaskId) {
      return `/admin/lesson-plans/tasks/${encodeURIComponent(originTaskId)}?${nextParams.toString()}`;
    }
    const backBasePath = isManageDetailsOrigin
      ? "/admin/lesson-manage-details"
      : "/admin/lesson-plans";
    return `${backBasePath}?${nextParams.toString()}`;
  }, [isManageDetailsOrigin, originTaskId, searchParams]);

  const backLabel = originTaskId
    ? "Quay lại công việc"
    : "Quay lại danh sách Giáo Án";

  const {
    data: output,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<LessonOutputItem>({
    queryKey: ["lesson", "output", outputId],
    queryFn: () => lessonApi.getLessonOutputById(outputId),
    enabled: !!outputId,
  });

  const { data: taskOptions = [], isFetching: isTaskOptionsFetching } = useQuery<
    LessonTaskOption[]
  >({
    queryKey: ["lesson", "task-options", deferredTaskSearch],
    queryFn: () =>
      lessonApi.searchLessonTaskOptions({
        search: deferredTaskSearch || undefined,
        limit: 3,
      }),
    enabled: !!outputId,
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    setTaskDraft(normalizeCurrentTaskOption(output));
    setTaskSearch("");
  }, [
    output?.id,
    output?.lessonTaskId,
    output?.task?.id,
    output?.task?.title,
    output?.task?.status,
    output?.task?.priority,
    output?.updatedAt,
  ]);

  const buildTaskDetailHref = useMemo(() => {
    return (taskId: string) => {
      const nextParams = buildLessonContextParams(searchParams);
      return `/admin/lesson-plans/tasks/${encodeURIComponent(taskId)}?${nextParams.toString()}`;
    };
  }, [searchParams]);

  const invalidateOutputQueries = async (
    previousTaskId: string | null | undefined,
    nextTaskId: string | null | undefined,
  ) => {
    const invalidations = [
      queryClient.invalidateQueries({ queryKey: ["lesson", "output", outputId] }),
      queryClient.invalidateQueries({ queryKey: ["lesson", "work"] }),
      queryClient.invalidateQueries({ queryKey: ["lesson", "exercises"] }),
      queryClient.invalidateQueries({ queryKey: ["lesson", "overview"] }),
    ];

    const relatedTaskIds = Array.from(
      new Set(
        [previousTaskId, nextTaskId, originTaskId].filter(
          (value): value is string => typeof value === "string" && value.trim().length > 0,
        ),
      ),
    );

    for (const taskId of relatedTaskIds) {
      invalidations.push(
        queryClient.invalidateQueries({
          queryKey: ["lesson", "task", taskId],
        }),
      );
    }

    await Promise.all(invalidations);
  };

  const taskChangeDirty = (output?.lessonTaskId ?? null) !== (taskDraft?.id ?? null);

  const taskOptionsSummary = useMemo(() => {
    if (isTaskOptionsFetching) {
      return "Đang tải task…";
    }

    if (taskOptions.length === 0) {
      return deferredTaskSearch
        ? "Không có task khớp tiêu đề."
        : "Gợi ý 6 task cập nhật gần đây.";
    }

    return deferredTaskSearch
      ? `Có ${taskOptions.length} task khớp tìm kiếm hiện tại.`
      : `Có ${taskOptions.length} task gần nhất để gắn nhanh.`;
  }, [deferredTaskSearch, isTaskOptionsFetching, taskOptions.length]);

  const updateOutputMutation = useMutation({
    mutationFn: (payload: CreateLessonOutputPayload) =>
      lessonApi.updateLessonOutput(outputId, payload),
    onSuccess: async (updatedOutput) => {
      await invalidateOutputQueries(output?.lessonTaskId, updatedOutput.lessonTaskId);
      toast.success("Đã cập nhật sản phẩm bài học.");
    },
    onError: (mutationError) => {
      toast.error(
        getErrorMessage(mutationError, "Không thể cập nhật sản phẩm bài học."),
      );
    },
  });

  const updateOutputTaskMutation = useMutation({
    mutationFn: (lessonTaskId: string | null) =>
      lessonApi.updateLessonOutput(outputId, { lessonTaskId }),
    onSuccess: async (updatedOutput) => {
      await invalidateOutputQueries(output?.lessonTaskId, updatedOutput.lessonTaskId);
      toast.success(
        updatedOutput.lessonTaskId
          ? "Đã cập nhật task gốc cho output."
          : "Đã gỡ task gốc khỏi output.",
      );
    },
    onError: (mutationError) => {
      toast.error(getErrorMessage(mutationError, "Không thể cập nhật task gốc."));
    },
  });

  const deleteOutputMutation = useMutation({
    mutationFn: () => lessonApi.deleteLessonOutput(outputId),
    onSuccess: async () => {
      await invalidateOutputQueries(output?.lessonTaskId, null);
      await queryClient.invalidateQueries({ queryKey: ["lesson"] });
      toast.success("Đã xóa sản phẩm bài học.");
      router.push(backHref);
    },
    onError: (mutationError) => {
      toast.error(getErrorMessage(mutationError, "Không thể xóa sản phẩm bài học."));
    },
  });

  if (!outputId) {
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-4 sm:p-6">
        <div className="mx-auto w-full max-w-5xl rounded-[1.75rem] border border-border-default bg-bg-surface p-5 shadow-sm">
          <p className="text-base font-semibold text-text-primary">
            Không tìm thấy sản phẩm bài học.
          </p>
          <Link
            href={backHref}
            className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            {backLabel}
          </Link>
        </div>
      </div>
    );
  }

  const currentTask = normalizeCurrentTaskOption(output);
  const isTaskMutationPending = updateOutputTaskMutation.isPending;
  const isAnySavePending =
    updateOutputMutation.isPending || updateOutputTaskMutation.isPending;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-3 pb-8 sm:p-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 rounded-xl border border-border-default bg-bg-surface p-3 shadow-sm sm:rounded-lg sm:p-5">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Link
            href={backHref}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border-default bg-bg-secondary px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <svg
              className="size-4 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            {backLabel}
          </Link>
        </div>

        {isLoading ? (
          <>
            <section className="h-56 animate-pulse rounded-[2rem] border border-border-default bg-bg-surface" />
            <div className="grid gap-3 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`output-meta-skeleton-${index}`}
                  className="h-28 animate-pulse rounded-[1.35rem] border border-border-default bg-bg-surface"
                />
              ))}
            </div>
          </>
        ) : isError || !output ? (
          <section className="rounded-[1.75rem] border border-border-default bg-bg-surface p-5 shadow-sm sm:p-6">
            <div className="rounded-[1.5rem] border border-dashed border-border-default bg-bg-secondary/40 px-5 py-12 text-center">
              <p className="text-base font-semibold text-text-primary">
                Không tải được sản phẩm bài học.
              </p>
              <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
                {getErrorMessage(error, "Đã có lỗi khi tải dữ liệu.")}
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => void refetch()}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  Tải lại
                </button>
                <Link
                  href={backHref}
                  className="rounded-xl border border-border-default bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  {backLabel}
                </Link>
              </div>
            </div>
          </section>
        ) : (
          <>
            <section className="relative overflow-hidden rounded-[2rem] border border-border-default bg-bg-surface p-5 shadow-sm sm:p-6">
              <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.12),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.12),_transparent_34%)]"
                aria-hidden
              />

              <div className="relative flex flex-col gap-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-3xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-text-muted">
                      Chi tiết sản phẩm bài học
                    </p>
                    <h1 className="mt-3 text-3xl font-semibold tracking-tight text-text-primary text-balance sm:text-4xl">
                      {output.lessonName || "Chưa đặt tên sản phẩm"}
                    </h1>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ring-1 ${lessonOutputStatusChipClass(
                          output.status,
                        )}`}
                      >
                        {LESSON_OUTPUT_STATUS_LABELS[output.status]}
                      </span>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ring-1 ${lessonPaymentStatusChipClass(
                          output.paymentStatus,
                        )}`}
                      >
                        {LESSON_PAYMENT_STATUS_LABELS[output.paymentStatus]}
                      </span>
                      {output.task ? (
                        <span className="rounded-full border border-border-default bg-bg-surface px-3 py-1 text-xs font-medium text-text-secondary">
                          Task cha: {output.task.title ?? output.task.id}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-4 max-w-2xl text-sm leading-6 text-text-secondary">
                      {output.originalTitle?.trim() ||
                        "Chưa có tiêu đề gốc — có thể bổ sung ở form bên dưới."}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setDeleteOpen(true)}
                      className="inline-flex min-h-11 items-center rounded-xl border border-error/30 bg-error/8 px-4 py-2 text-sm font-medium text-error transition-colors hover:bg-error/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    >
                      Xóa sản phẩm
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-5">
                  <OutputMetaCard
                    label="Cuộc thi / đề"
                    value={output.contestUploaded ?? "Chưa ghi"}
                    hint="Mã contest hoặc bộ đề đã gắn."
                  />
                  <OutputMetaCard
                    label="Ngày"
                    value={formatLessonDateOnly(output.date)}
                    hint="Mốc ngày hệ thống dùng để sắp xếp output."
                  />
                  <OutputMetaCard
                    label="Chi phí"
                    value={`${output.cost.toLocaleString("vi-VN")} đ`}
                    hint="Giá trị trợ cấp đang lưu trên record output."
                  />
                  <OutputMetaCard
                    label="Thanh toán"
                    value={LESSON_PAYMENT_STATUS_LABELS[output.paymentStatus]}
                    hint="Tách riêng khỏi `cost` để giữ lịch sử trợ cấp."
                  />
                  <OutputMetaCard
                    label="Cập nhật"
                    value={formatLessonDateTime(output.updatedAt)}
                    hint="Thời điểm thay đổi gần nhất của output."
                  />
                </div>
              </div>
            </section>

            <div className="grid gap-6 flex flex-col">
              <section className="relative overflow-hidden rounded-[1.75rem] border border-border-default bg-bg-surface p-5 shadow-sm sm:p-6">
                <div
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(14,165,233,0.1),_transparent_32%),radial-gradient(circle_at_bottom_left,_rgba(37,99,235,0.08),_transparent_36%)]"
                  aria-hidden
                />

                <div className="relative">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
                        Liên kết gốc
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold text-text-primary">
                        Điều chỉnh task gốc
                      </h2>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">
                        Chuyển output sang task khác hoặc tách ra thành record độc
                        lập mà không phải sửa toàn bộ metadata của bài.
                      </p>
                    </div>
                    <p className="text-xs text-text-muted" aria-live="polite">
                      {taskOptionsSummary}
                    </p>
                  </div>

                  <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
                    <div className="space-y-4">
                      <div className="rounded-[1.35rem] border border-border-default bg-bg-secondary/45 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                          Task hiện tại
                        </p>
                        {currentTask ? (
                          <div className="mt-3 space-y-3">
                            <div>
                              <p className="text-base font-semibold text-text-primary">
                                {currentTask.title?.trim() || "Task chưa đặt tên"}
                              </p>
                              <p className="mt-1 text-xs text-text-muted">
                                ID: {currentTask.id}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ring-1 ${lessonTaskStatusChipClass(
                                  currentTask.status,
                                )}`}
                              >
                                {LESSON_TASK_STATUS_LABELS[currentTask.status]}
                              </span>
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ring-1 ${lessonTaskPriorityChipClass(
                                  currentTask.priority,
                                )}`}
                              >
                                {LESSON_TASK_PRIORITY_LABELS[currentTask.priority]}
                              </span>
                            </div>
                            <Link
                              href={buildTaskDetailHref(currentTask.id)}
                              className="inline-flex min-h-10 items-center rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                            >
                              Mở task hiện tại
                            </Link>
                          </div>
                        ) : (
                          <div className="mt-3 rounded-[1.15rem] border border-dashed border-border-default bg-bg-surface/70 px-4 py-5 text-sm text-text-muted">
                            Output này đang đứng độc lập, chưa gắn task nào.
                          </div>
                        )}
                      </div>

                      <div className="rounded-[1.35rem] border border-border-default bg-bg-surface p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                              Task sẽ lưu
                            </p>
                            <p className="mt-2 text-sm text-text-secondary">
                              Bản nháp đang chờ áp dụng cho output này.
                            </p>
                          </div>
                          {taskChangeDirty ? (
                            <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                              Có thay đổi
                            </span>
                          ) : (
                            <span className="rounded-full border border-border-default bg-bg-secondary px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                              Đồng bộ
                            </span>
                          )}
                        </div>

                        {taskDraft ? (
                          <div className="mt-4 space-y-3 rounded-[1.15rem] border border-border-default bg-bg-secondary/40 p-4">
                            <div>
                              <p className="text-base font-semibold text-text-primary">
                                {taskDraft.title?.trim() || "Task chưa đặt tên"}
                              </p>
                              <p className="mt-1 text-xs text-text-muted">
                                ID: {taskDraft.id}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ring-1 ${lessonTaskStatusChipClass(
                                  taskDraft.status,
                                )}`}
                              >
                                {LESSON_TASK_STATUS_LABELS[taskDraft.status]}
                              </span>
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ring-1 ${lessonTaskPriorityChipClass(
                                  taskDraft.priority,
                                )}`}
                              >
                                {LESSON_TASK_PRIORITY_LABELS[taskDraft.priority]}
                              </span>
                              <span className="rounded-full border border-border-default bg-bg-surface px-3 py-1 text-xs font-medium text-text-secondary">
                                Hạn: {formatLessonDateOnly(taskDraft.dueDate)}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-4 rounded-[1.15rem] border border-dashed border-border-default bg-bg-secondary/25 px-4 py-6 text-sm text-text-muted">
                            Sau khi lưu, output sẽ không còn liên kết với task nào.
                          </div>
                        )}

                        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                          <button
                            type="button"
                            onClick={() => {
                              if (taskDraft) {
                                setTaskDraft(null);
                                return;
                              }

                              if (currentTask) {
                                setTaskDraft(currentTask);
                              }
                            }}
                            disabled={(!taskDraft && !currentTask) || isAnySavePending}
                            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border-default bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-50"
                          >
                            {taskDraft ? "Gỡ task" : "Khôi phục task hiện tại"}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void updateOutputTaskMutation.mutateAsync(taskDraft?.id ?? null)
                            }
                            disabled={!taskChangeDirty || isAnySavePending}
                            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-50"
                          >
                            {isTaskMutationPending ? "Đang lưu task…" : "Lưu task gốc"}
                          </button>
                        </div>
                      </div>
                    </div>

                    <section className="rounded-[1.35rem] border border-border-default bg-bg-surface p-4 shadow-sm">
                      <div className="flex flex-col gap-3 border-b border-border-default pb-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-text-primary">
                            Tìm task để gắn lại
                          </p>
                          <p className="mt-1 text-xs leading-5 text-text-secondary">
                            Tìm theo tiêu đề task, hoặc để trống để xem các task cập nhật gần nhất.
                          </p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="flex flex-col gap-1 text-sm text-text-secondary">
                          <span>Tìm theo tiêu đề</span>
                          <input
                            type="search"
                            value={taskSearch}
                            onChange={(event) => setTaskSearch(event.target.value)}
                            placeholder="Ví dụ: Soạn outline buổi 1"
                            className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-3 py-2.5 text-text-primary shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                          />
                        </label>
                      </div>

                      <div className="mt-4 grid gap-3">
                        {taskOptions.length > 0 ? (
                          taskOptions.map((task) => {
                            const isSelected = taskDraft?.id === task.id;

                            return (
                              <article
                                key={task.id}
                                className={`rounded-[1.2rem] border p-4 transition-colors ${isSelected
                                  ? "border-primary/30 bg-primary/6"
                                  : "border-border-default bg-bg-secondary/35"
                                  }`}
                              >
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-text-primary">
                                      {task.title?.trim() || "Task chưa đặt tên"}
                                    </p>
                                    <p className="mt-1 text-xs text-text-muted">
                                      ID: {task.id}
                                    </p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                      <span
                                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ring-1 ${lessonTaskStatusChipClass(
                                          task.status,
                                        )}`}
                                      >
                                        {LESSON_TASK_STATUS_LABELS[task.status]}
                                      </span>
                                      <span
                                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ring-1 ${lessonTaskPriorityChipClass(
                                          task.priority,
                                        )}`}
                                      >
                                        {LESSON_TASK_PRIORITY_LABELS[task.priority]}
                                      </span>
                                      <span className="rounded-full border border-border-default bg-bg-surface px-3 py-1 text-xs font-medium text-text-secondary">
                                        Hạn: {formatLessonDateOnly(task.dueDate)}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex flex-col gap-2 sm:items-end">
                                    <button
                                      type="button"
                                      onClick={() => setTaskDraft(task)}
                                      disabled={isAnySavePending}
                                      className={`inline-flex min-h-10 items-center justify-center rounded-xl px-3 py-2 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus ${isSelected
                                        ? "border border-primary/25 bg-primary/12 text-primary"
                                        : "border border-border-default bg-bg-surface text-text-primary hover:bg-bg-tertiary"
                                        }`}
                                    >
                                      {isSelected ? "Đang chọn" : "Chọn task này"}
                                    </button>
                                    <Link
                                      href={buildTaskDetailHref(task.id)}
                                      className="text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                                    >
                                      Mở chi tiết task
                                    </Link>
                                  </div>
                                </div>
                              </article>
                            );
                          })
                        ) : (
                          <div className="rounded-[1.2rem] border border-dashed border-border-default bg-bg-secondary/30 px-4 py-8 text-sm text-text-muted">
                            Chưa có task phù hợp truy vấn hiện tại.
                          </div>
                        )}
                      </div>
                    </section>
                  </div>
                </div>
              </section>

              <section className="rounded-[1.75rem] border border-border-default bg-bg-surface p-5 shadow-sm sm:p-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
                    Bối cảnh
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-text-primary">
                    Thông tin điều phối
                  </h2>
                </div>

                <div className="mt-4 space-y-4">
                  <div className="rounded-[1.35rem] border border-border-default bg-bg-secondary/40 p-4">
                    <p className="text-sm font-semibold text-text-primary">
                      Nhân sự phụ trách
                    </p>
                    {output.staff ? (
                      <>
                        <p className="mt-2 text-sm font-medium text-text-primary">
                          {output.staff.fullName}
                        </p>
                        <p className="mt-1 text-sm text-text-secondary">
                          {formatLessonStaffRoleLabel(output.staff.roles)}
                        </p>
                      </>
                    ) : (
                      <p className="mt-2 text-sm text-text-muted">
                        Chưa gán nhân sự cho output này.
                      </p>
                    )}
                  </div>

                  <div className="rounded-[1.35rem] border border-border-default bg-bg-secondary/40 p-4">
                    <p className="text-sm font-semibold text-text-primary">
                      Liên kết
                    </p>
                    <div className="mt-3 space-y-2">
                      {output.originalLink ? (
                        <a
                          href={output.originalLink}
                          target="_blank"
                          rel="noreferrer"
                          className="block truncate text-sm text-primary underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                        >
                          Link gốc: {output.originalLink}
                        </a>
                      ) : null}
                      {output.link ? (
                        <a
                          href={output.link}
                          target="_blank"
                          rel="noreferrer"
                          className="block truncate text-sm text-primary underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                        >
                          Link output: {output.link}
                        </a>
                      ) : null}
                      {!output.originalLink && !output.link ? (
                        <p className="text-sm text-text-muted">
                          Chưa có link nào được gắn cho output này.
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-[1.75rem] border border-border-default bg-bg-surface p-5 shadow-sm sm:p-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
                    Chỉnh sửa
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-text-primary">
                    Form sản phẩm bài học
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">
                    Cập nhật đầy đủ thông tin sản phẩm tại đây (thay cho chỉnh sửa
                    nhanh trên danh sách tab Công việc).
                  </p>
                </div>

                <div className="mt-5">
                  <LessonOutputEditorForm
                    mode="edit"
                    initialData={output}
                    allowTasklessOutput={!output.lessonTaskId}
                    isSubmitting={isAnySavePending}
                    submitLabel="Lưu sản phẩm"
                    onSubmit={async (payload) => {
                      await updateOutputMutation.mutateAsync(payload);
                    }}
                  />
                </div>
              </section>
            </div>
          </>
        )}
      </div>

      <LessonDeleteConfirmPopup
        open={deleteOpen}
        title="Xóa sản phẩm bài học?"
        description={`Thao tác này sẽ xóa “${output?.lessonName ?? "chưa đặt tên"}”. Dữ liệu sẽ biến mất khỏi công việc liên quan và tab Công việc.`}
        confirmLabel="Xóa"
        onClose={() => {
          if (deleteOutputMutation.isPending) return;
          setDeleteOpen(false);
        }}
        onConfirm={async () => {
          await deleteOutputMutation.mutateAsync();
        }}
        isSubmitting={deleteOutputMutation.isPending}
      />
    </div>
  );
}
