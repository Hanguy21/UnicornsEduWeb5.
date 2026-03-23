"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LESSON_PAYMENT_STATUS_LABELS,
  LESSON_OUTPUT_STATUS_LABELS,
  formatLessonDateOnly,
  formatLessonDateTime,
  formatLessonStaffRoleLabel,
  formatLessonStaffStatusLabel,
  lessonPaymentStatusChipClass,
  lessonOutputStatusChipClass,
} from "@/components/admin/lesson-plans/lessonTaskUi";
import type {
  LessonOutputStaffStatsResponse,
  LessonWorkOutputItem,
} from "@/dtos/lesson.dto";
import { formatCurrency } from "@/lib/class.helpers";
import * as lessonApi from "@/lib/apis/lesson.api";

const RECENT_DAYS = 30;

function getErrorMessage(error: unknown, fallback: string) {
  const message = (error as { response?: { data?: { message?: string | string[] } } })
    ?.response?.data?.message;

  if (Array.isArray(message)) {
    return message.filter(Boolean).join(", ") || fallback;
  }

  if (typeof message === "string" && message.trim()) {
    return message;
  }

  return (error as Error)?.message ?? fallback;
}

function PaymentPill({
  paymentStatus,
  cost,
}: {
  paymentStatus: LessonWorkOutputItem["paymentStatus"];
  cost: number;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${lessonPaymentStatusChipClass(
        paymentStatus,
      )}`}
    >
      {paymentStatus === "pending"
        ? `${LESSON_PAYMENT_STATUS_LABELS[paymentStatus]} · ${formatCurrency(cost)}`
        : LESSON_PAYMENT_STATUS_LABELS[paymentStatus]}
    </span>
  );
}

function OutputStatusPill({ status }: { status: LessonWorkOutputItem["status"] }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ring-1 ${lessonOutputStatusChipClass(
        status,
      )}`}
    >
      {LESSON_OUTPUT_STATUS_LABELS[status]}
    </span>
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
    <article className="rounded-[1.5rem] border border-border-default bg-bg-secondary/70 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-muted">
        {label}
      </p>
      <p className="mt-3 text-lg font-semibold text-text-primary">{value}</p>
      <p className="mt-1 text-sm text-text-secondary">{hint}</p>
    </article>
  );
}

function DetailLink({
  href,
  label,
  external = false,
}: {
  href: string;
  label: string;
  external?: boolean;
}) {
  const className =
    "inline-flex min-h-11 items-center justify-center rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus";

  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {label}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}

export default function AdminLessonPlanDetailPage() {
  const params = useParams();
  const staffId = typeof params?.staffId === "string" ? params.staffId : "";
  const [expandedOutputId, setExpandedOutputId] = useState<string | null>(null);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<LessonOutputStaffStatsResponse>({
    queryKey: ["lesson", "output-stats", "staff", staffId, RECENT_DAYS],
    queryFn: () =>
      lessonApi.getLessonOutputStatsByStaff(staffId, {
        days: RECENT_DAYS,
      }),
    enabled: !!staffId,
  });

  if (!staffId) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 sm:p-6">
        <section className="rounded-[2rem] border border-warning/30 bg-warning/10 p-5 shadow-sm lg:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-warning">
            Lesson Plan Locked
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-text-primary">
            Không tìm thấy nhân sự để xem lesson output.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">
            Route `/admin/lesson_plan_detail/[staffId]` cần `staffId` hợp lệ để tải dữ
            liệu thống kê lesson output.
          </p>
        </section>
      </div>
    );
  }

  const summary = data?.summary;
  const outputs = data?.outputs ?? [];
  const staff = summary?.staff;
  const backHref = `/admin/staffs/${encodeURIComponent(staffId)}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 sm:p-6">
      <Link
        href={backHref}
        className="inline-flex min-h-11 w-fit items-center gap-2 rounded-xl border border-border-default bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary shadow-sm transition-colors hover:bg-bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
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
        Quay lại nhân sự
      </Link>

      {isLoading ? (
        <>
          <section className="rounded-[2rem] border border-border-default bg-bg-surface p-5 shadow-sm lg:p-6">
            <div className="h-3 w-40 animate-pulse rounded-full bg-bg-tertiary" />
            <div className="mt-4 h-10 w-full max-w-md animate-pulse rounded-2xl bg-bg-tertiary" />
            <div className="mt-3 h-4 w-full max-w-2xl animate-pulse rounded bg-bg-tertiary" />
            <div className="mt-2 h-4 w-5/6 max-w-xl animate-pulse rounded bg-bg-tertiary" />
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-24 animate-pulse rounded-[1.5rem] border border-border-default bg-bg-secondary/70"
                />
              ))}
            </div>
          </section>
          <section className="rounded-[2rem] border border-border-default bg-bg-surface p-5 shadow-sm lg:p-6">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`lesson-plan-detail-meta-skeleton-${index}`}
                  className="h-28 animate-pulse rounded-[1.5rem] border border-border-default bg-bg-secondary/70"
                />
              ))}
            </div>
            <div className="mt-5 h-72 animate-pulse rounded-[1.5rem] bg-bg-secondary/70" />
          </section>
        </>
      ) : isError ? (
        <section className="rounded-[2rem] border border-error/30 bg-error/8 p-5 shadow-sm lg:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-error">
            Lesson Output Unavailable
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-text-primary">
            Không tải được thống kê lesson output.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">
            {getErrorMessage(
              error,
              "Dữ liệu lesson output cho nhân sự này hiện chưa lấy được.",
            )}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            Tải lại
          </button>
        </section>
      ) : (
        <>
          <section className="overflow-hidden rounded-[2rem] border border-border-default bg-bg-surface shadow-sm">
            <div className="grid gap-6 px-5 py-5 lg:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)] lg:px-6">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary">
                  Lesson Output Workspace
                </p>
                <h1 className="mt-3 text-balance text-2xl font-semibold text-text-primary sm:text-3xl">
                  Bảng lesson output của {staff?.fullName || "nhân sự này"}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">
                  Trang này hiển thị lesson output của nhân sự trong{" "}
                  {summary?.days ?? RECENT_DAYS} ngày gần nhất. Trạng thái thanh toán giờ
                  đọc từ `paymentStatus`, còn `cost` giữ nguyên giá trị trợ cấp của từng
                  output để bảng thống kê không bị mất số đã chi.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <article className="rounded-[1.5rem] border border-border-default bg-bg-secondary/70 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-muted">
                    Nhân sự
                  </p>
                  <p className="mt-3 text-lg font-semibold text-text-primary">
                    {staff?.fullName || "—"}
                  </p>
                </article>

                <article className="rounded-[1.5rem] border border-border-default bg-bg-secondary/70 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-muted">
                    Vai trò
                  </p>
                  <p className="mt-3 text-lg font-semibold text-text-primary">
                    {formatLessonStaffRoleLabel(staff?.roles ?? [])}
                  </p>
                </article>

                <article className="rounded-[1.5rem] border border-border-default bg-bg-secondary/70 p-4 sm:col-span-2 lg:col-span-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-muted">
                    Trạng thái
                  </p>
                  <p className="mt-3 text-lg font-semibold text-primary">
                    {staff ? formatLessonStaffStatusLabel(staff.status) : "—"}
                  </p>
                </article>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-border-default bg-bg-surface p-5 shadow-sm lg:p-6">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <OutputMetaCard
                label="Tổng sản phẩm"
                value={String(summary?.outputCount ?? 0)}
                hint="Số lesson output trong cửa sổ đang xem."
              />
              <OutputMetaCard
                label="Hoàn thành"
                value={String(summary?.completedOutputCount ?? 0)}
                hint="Các output đã ở trạng thái hoàn thành."
              />
              <OutputMetaCard
                label="Chờ xử lý"
                value={String(summary?.pendingOutputCount ?? 0)}
                hint={`Hủy: ${summary?.cancelledOutputCount ?? 0} output.`}
              />
              <OutputMetaCard
                label="Chi phí còn mở"
                value={formatCurrency(summary?.unpaidCostTotal ?? 0)}
                hint="Tổng `cost` của các output còn `pending`."
              />
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">Danh sách lesson output</h2>
                <p className="mt-1 text-sm leading-6 text-text-muted">
                  Mỗi dòng là một output. Bấm nút chi tiết để mở phần metadata và các link
                  thao tác liên quan.
                </p>
              </div>
              <div className="rounded-2xl border border-border-default bg-bg-secondary px-4 py-3 text-sm text-text-secondary">
                <span className="font-semibold text-text-primary">{outputs.length}</span> bản ghi
                đang hiển thị
              </div>
            </div>

            {outputs.length === 0 ? (
              <div className="mt-5 rounded-[1.5rem] border border-dashed border-border-default bg-bg-secondary/70 p-6 text-center text-sm text-text-muted">
                Chưa có lesson output nào trong {summary?.days ?? RECENT_DAYS} ngày qua.
              </div>
            ) : (
              <div className="mt-5 overflow-x-auto rounded-[1.5rem] border border-border-default bg-bg-surface shadow-sm">
                <table className="w-full min-w-[920px] border-collapse text-left text-sm">
                  <caption className="sr-only">
                    Bảng lesson output của nhân sự trong {summary?.days ?? RECENT_DAYS} ngày
                    gần nhất
                  </caption>
                  <thead>
                    <tr className="border-b border-border-default bg-bg-secondary/80">
                      <th scope="col" className="px-4 py-3 font-medium text-text-primary">
                        Tên bài
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium text-text-primary">
                        Công việc
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium text-text-primary">
                        Ngày
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium text-text-primary">
                        Trạng thái
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-right font-medium text-text-primary"
                      >
                        Thanh toán
                      </th>
                      <th
                        scope="col"
                        className="w-28 px-4 py-3 text-right font-medium text-text-primary"
                      >
                        Chi tiết
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {outputs.map((output: LessonWorkOutputItem) => {
                      const isExpanded = expandedOutputId === output.id;
                      const detailRowId = `lesson-output-detail-${output.id}`;

                      return (
                        <Fragment key={output.id}>
                          <tr className="border-b border-border-subtle bg-bg-surface align-top last:border-b-0">
                            <td className="px-4 py-3">
                              <div className="font-medium text-text-primary">
                                {output.lessonName}
                              </div>
                              <div className="mt-1 text-xs text-text-muted">
                                {output.contestUploaded?.trim() || "Chưa cập nhật contest"}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-text-secondary">
                              {output.task?.title || "Chưa gắn công việc"}
                            </td>
                            <td className="px-4 py-3 text-text-secondary">
                              {formatLessonDateOnly(output.date)}
                            </td>
                            <td className="px-4 py-3">
                              <OutputStatusPill status={output.status} />
                            </td>
                            <td className="px-4 py-3 text-right">
                              <PaymentPill
                                paymentStatus={output.paymentStatus}
                                cost={output.cost}
                              />
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                aria-expanded={isExpanded}
                                aria-controls={detailRowId}
                                onClick={() =>
                                  setExpandedOutputId((prev) =>
                                    prev === output.id ? null : output.id,
                                  )
                                }
                                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border-default bg-bg-secondary px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                              >
                                {isExpanded ? "Ẩn" : "Xem"}
                              </button>
                            </td>
                          </tr>

                          {isExpanded ? (
                            <tr
                              id={detailRowId}
                              className="border-b border-border-default bg-bg-secondary/65 last:border-b-0"
                            >
                              <td colSpan={6} className="px-4 py-4">
                                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(240px,0.8fr)]">
                                  <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="rounded-[1.25rem] border border-border-default bg-bg-surface p-3.5">
                                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-text-muted">
                                        Contest
                                      </p>
                                      <p className="mt-2 text-sm text-text-primary">
                                        {output.contestUploaded ?? "Chưa cập nhật"}
                                      </p>
                                    </div>
                                    <div className="rounded-[1.25rem] border border-border-default bg-bg-surface p-3.5">
                                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-text-muted">
                                        Cập nhật
                                      </p>
                                      <p className="mt-2 text-sm text-text-primary">
                                        {formatLessonDateTime(output.updatedAt)}
                                      </p>
                                    </div>
                                    <div className="rounded-[1.25rem] border border-border-default bg-bg-surface p-3.5">
                                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-text-muted">
                                        Level
                                      </p>
                                      <p className="mt-2 text-sm text-text-primary">
                                        {output.level?.trim() || "—"}
                                      </p>
                                    </div>
                                    <div className="rounded-[1.25rem] border border-border-default bg-bg-surface p-3.5">
                                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-text-muted">
                                        Công việc gốc
                                      </p>
                                      <p className="mt-2 text-sm text-text-primary">
                                        {output.task?.title || "Chưa gắn công việc"}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="rounded-[1.35rem] border border-border-default bg-bg-surface p-4">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-muted">
                                      Điều hướng nhanh
                                    </p>
                                    <div className="mt-3 grid gap-2">
                                      <DetailLink
                                        href={`/admin/lesson-plans/outputs/${encodeURIComponent(output.id)}?tab=work`}
                                        label="Mở chi tiết output"
                                      />
                                      {output.task?.id ? (
                                        <DetailLink
                                          href={`/admin/lesson-plans/tasks/${encodeURIComponent(output.task.id)}?tab=work`}
                                          label="Mở công việc gốc"
                                        />
                                      ) : null}
                                      {output.link ? (
                                        <DetailLink
                                          href={output.link}
                                          label="Mở link output"
                                          external
                                        />
                                      ) : null}
                                      {output.originalLink ? (
                                        <DetailLink
                                          href={output.originalLink}
                                          label="Mở link gốc"
                                          external
                                        />
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
