"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  StudentBalancePopup,
  StudentDetailRow,
  StudentExamCard,
  StudentInfoCard,
  StudentWalletCard,
  StudentWalletHistoryPopup,
} from "@/components/admin/student";
import type { StudentGender, StudentSelfDetail, StudentStatus } from "@/dtos/student.dto";
import {
  getMyStudentDetail,
  getMyStudentWalletHistory,
  updateMyStudentAccountBalance,
} from "@/lib/apis/auth.api";
import { formatCurrency } from "@/lib/class.helpers";

const STATUS_LABELS: Record<StudentStatus, string> = {
  active: "Đang học",
  inactive: "Ngừng theo dõi",
};

const GENDER_LABELS: Record<StudentGender, string> = {
  male: "Nam",
  female: "Nữ",
};

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

function normalizeStatus(status?: StudentStatus): StudentStatus {
  return status === "inactive" ? "inactive" : "active";
}

function normalizeGender(gender?: StudentGender): StudentGender {
  return gender === "female" ? "female" : "male";
}

function statusBadgeClass(status: StudentStatus): string {
  return status === "active"
    ? "bg-success/10 text-success ring-success/20"
    : "bg-error/10 text-error ring-error/20";
}

export default function StudentSelfPage() {
  const [balancePopupMode, setBalancePopupMode] = useState<"topup" | "withdraw" | null>(null);
  const [walletHistoryOpen, setWalletHistoryOpen] = useState(false);

  const {
    data: student,
    isLoading,
    isError,
    error,
  } = useQuery<StudentSelfDetail>({
    queryKey: ["student", "self", "detail"],
    queryFn: getMyStudentDetail,
    retry: false,
    staleTime: 60_000,
  });

  const classItems = useMemo(
    () =>
      [...(student?.studentClasses ?? [])].sort((a, b) =>
        (a.class?.name ?? "").localeCompare(b.class?.name ?? "", "vi"),
      ),
    [student],
  );

  if (isLoading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col" aria-busy="true">
        <div className="mb-4 h-8 w-44 animate-pulse rounded bg-bg-tertiary" />
        <div className="rounded-[1.75rem] border border-border-default bg-bg-surface p-4 shadow-sm sm:p-5">
          <div className="h-24 animate-pulse rounded-2xl bg-bg-secondary" />
          <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <div className="h-56 animate-pulse rounded-2xl bg-bg-secondary" />
              <div className="h-52 animate-pulse rounded-2xl bg-bg-secondary" />
            </div>
            <div className="space-y-4">
              <div className="h-40 animate-pulse rounded-2xl bg-bg-secondary" />
              <div className="h-64 animate-pulse rounded-2xl bg-bg-secondary" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !student) {
    const message =
      (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
      "Không tải được thông tin học sinh hiện tại.";

    return (
      <div className="rounded-[1.75rem] border border-error/30 bg-error/10 px-5 py-6 shadow-sm">
        <p className="text-sm font-medium text-error">{message}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border-default bg-bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            Về trang chủ
          </Link>
          <Link
            href="/user-profile"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            Xem hồ sơ chung
          </Link>
        </div>
      </div>
    );
  }

  const normalizedStatus = normalizeStatus(student.status);
  const normalizedGender = normalizeGender(student.gender);
  const primaryChipClass = statusBadgeClass(normalizedStatus);
  const initials = (student.fullName?.trim() || student.email || "?").charAt(0).toUpperCase();
  const contactEmail = student.email?.trim() || "Chưa có email";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <StudentBalancePopup
        key={`${student.id}-${balancePopupMode ?? "closed"}`}
        open={balancePopupMode !== null}
        mode={balancePopupMode ?? "topup"}
        onClose={() => setBalancePopupMode(null)}
        student={student}
        submitBalanceChange={(amount) => updateMyStudentAccountBalance({ amount })}
        invalidateQueryKeys={[
          ["student", "self", "detail"],
          ["student", "self", "wallet-history"],
        ]}
        allowNegativeBalance={false}
        successTargetLabel="tài khoản của bạn"
        errorMessages={{
          topup: "Không thể nạp tiền vào tài khoản của bạn.",
          withdraw: "Không thể rút tiền khỏi tài khoản của bạn.",
        }}
        blockedNegativeBalanceMessage="Số dư hiện tại không đủ để thực hiện giao dịch rút tiền này."
        copyOverrides={{
          topup: {
            description: "Số tiền nhập vào sẽ được cộng trực tiếp vào số dư hiện tại của bạn.",
          },
          withdraw: {
            description:
              "Số tiền nhập vào sẽ được trừ trực tiếp khỏi số dư hiện tại của bạn. Hệ thống sẽ chặn nếu ví không đủ tiền.",
          },
        }}
      />
      <StudentWalletHistoryPopup
        key={`${student.id}-wallet-history-${walletHistoryOpen ? "open" : "closed"}`}
        open={walletHistoryOpen}
        onClose={() => setWalletHistoryOpen(false)}
        studentId={student.id}
        studentName={student.fullName?.trim() || "Tài khoản của bạn"}
        currentBalance={student.accountBalance ?? 0}
        queryKeyBase={["student", "self", "wallet-history"]}
        loadTransactions={({ limit }) => getMyStudentWalletHistory({ limit })}
        emptyDescription="Ví của bạn chưa có giao dịch nào được ghi nhận."
        errorDescription="Hệ thống chưa đọc được lịch sử ví của bạn."
      />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-border-default bg-bg-surface/90 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted shadow-sm">
          <span className="size-2 rounded-full bg-primary" aria-hidden />
          Hồ sơ học sinh cá nhân
        </div>
        <Link
          href="/user-profile"
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border-default bg-bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          Mở hồ sơ chung
        </Link>
      </div>

      <section className="relative overflow-hidden rounded-[1.5rem] border border-border-default bg-bg-surface p-3.5 shadow-sm sm:rounded-[1.75rem] sm:p-5">
        <div className="pointer-events-none absolute -left-16 top-6 size-40 rounded-full bg-primary/10 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute bottom-0 right-0 size-52 rounded-full bg-info/10 blur-3xl" aria-hidden />

        <div className="relative">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 flex-1 items-start gap-3.5 sm:gap-4">
              <div className="relative shrink-0">
                <div className="flex size-14 items-center justify-center rounded-[1.25rem] border border-border-default bg-bg-secondary text-lg font-semibold text-text-primary shadow-sm sm:size-20 sm:rounded-2xl sm:text-3xl">
                  {initials}
                </div>
                <span
                  className={`absolute -bottom-1 -right-1 block size-3.5 rounded-full border-2 border-bg-surface ${
                    normalizedStatus === "active" ? "bg-success" : "bg-error"
                  }`}
                  aria-hidden
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-muted">
                  Thông tin học sinh
                </p>
                <div className="mt-2 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <h1 className="min-w-0 text-2xl font-semibold leading-tight text-text-primary sm:truncate">
                      {student.fullName?.trim() || "Học sinh"}
                    </h1>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${primaryChipClass}`}>
                      {STATUS_LABELS[normalizedStatus]}
                    </span>
                    <span className="inline-flex rounded-full bg-bg-tertiary px-2.5 py-1 text-xs font-medium text-text-secondary ring-1 ring-border-default">
                      {GENDER_LABELS[normalizedGender]}
                    </span>
                    <span className="inline-flex rounded-full bg-secondary/35 px-2.5 py-1 text-xs font-medium text-text-secondary ring-1 ring-border-default">
                      Chế độ tự phục vụ
                    </span>
                  </div>
                </div>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-text-secondary">
                  Bạn chỉ nhìn thấy dữ liệu thuộc hồ sơ của chính mình. Các cấu hình nội bộ như
                  học phí và gói thu tiền đã được ẩn khỏi màn hình này.
                </p>
                <div className="mt-4 grid gap-2 sm:hidden">
                  <div className="rounded-2xl border border-border-default bg-bg-primary/80 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                      Liên hệ chính
                    </p>
                    <p className="mt-1 break-all text-sm font-medium text-text-primary">
                      {contactEmail}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="hidden shrink-0 items-center gap-2 sm:flex xl:flex-col xl:items-stretch">
              <div className="rounded-xl border border-border-default bg-bg-surface px-3 py-2.5 text-sm text-text-secondary">
                {contactEmail}
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3.5 sm:mt-5 sm:gap-4">
            <div className="grid gap-3.5 lg:grid-cols-2 xl:grid-cols-[0.95fr_0.95fr_1.1fr] sm:gap-4">
              <StudentInfoCard title="Thông tin cơ bản">
                <dl className="divide-y divide-border-subtle">
                  <StudentDetailRow label="Email" value={student.email?.trim() || "—"} />
                  <StudentDetailRow label="Trường" value={student.school?.trim() || "—"} />
                  <StudentDetailRow label="Tỉnh / Thành phố" value={student.province?.trim() || "—"} />
                  <StudentDetailRow label="Năm sinh" value={student.birthYear ?? "—"} />
                  <StudentDetailRow label="Cập nhật gần nhất" value={formatDate(student.updatedAt)} />
                  <StudentDetailRow label="Mục tiêu học tập" value={student.goal?.trim() || "—"} />
                </dl>
              </StudentInfoCard>

              <StudentInfoCard title="Liên hệ phụ huynh">
                <dl className="divide-y divide-border-subtle">
                  <StudentDetailRow label="Họ tên" value={student.parentName?.trim() || "—"} />
                  <StudentDetailRow label="Số điện thoại" value={student.parentPhone?.trim() || "—"} />
                  <StudentDetailRow
                    label="Trạng thái"
                    value={
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${primaryChipClass}`}>
                        {STATUS_LABELS[normalizedStatus]}
                      </span>
                    }
                  />
                </dl>
              </StudentInfoCard>

              <div className="space-y-3.5 lg:col-span-2 xl:col-span-1 sm:space-y-4">
                <StudentWalletCard
                  balance={student.accountBalance ?? 0}
                  onTopUp={() => setBalancePopupMode("topup")}
                  onWithdraw={() => setBalancePopupMode("withdraw")}
                  onOpenHistory={() => setWalletHistoryOpen(true)}
                />
                <StudentExamCard studentId={student.id} />
              </div>
            </div>

            <div className="rounded-[1.25rem] border border-border-default bg-bg-secondary/50 p-3.5 sm:rounded-2xl sm:p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-text-muted sm:mb-4 sm:text-xs">
                    Danh sách lớp học
                  </h2>
                  <p className="text-sm leading-6 text-text-secondary">
                    Chỉ hiển thị lớp bạn đang tham gia và số buổi đã vào học. Gói học phí nội bộ
                    được ẩn trên chế độ học sinh.
                  </p>
                </div>
                <span className="inline-flex self-start rounded-full border border-border-default bg-bg-surface px-3 py-1 text-xs font-medium text-text-secondary">
                  Ẩn học phí
                </span>
              </div>

              {classItems.length > 0 ? (
                <>
                  <div className="mt-4 space-y-3 md:hidden">
                    {classItems.map((item) => (
                      <div
                        key={item.class.id}
                        className="rounded-[1.1rem] border border-border-default bg-bg-surface px-3.5 py-3 shadow-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-block size-2 shrink-0 rounded-full ${
                              item.class.status === "running"
                                ? "bg-success"
                                : item.class.status === "ended"
                                  ? "bg-error"
                                  : "bg-border-default"
                            }`}
                            aria-hidden
                          />
                          <p className="font-medium text-text-primary">{item.class.name}</p>
                        </div>
                        <div className="mt-3 grid gap-2 text-sm text-text-secondary">
                          <div className="flex items-center justify-between gap-3">
                            <span>Trạng thái lớp</span>
                            <span className="font-medium text-text-primary">
                              {item.class.status === "running"
                                ? "Đang mở"
                                : item.class.status === "ended"
                                  ? "Đã kết thúc"
                                  : "—"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span>Số buổi đã vào học</span>
                            <span className="font-medium tabular-nums text-text-primary">
                              {item.totalAttendedSession ?? "—"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 hidden overflow-hidden rounded-[1.1rem] border border-border-default bg-bg-surface md:block">
                    <div className="grid grid-cols-[minmax(0,1.4fr)_180px_180px] gap-3 border-b border-border-default bg-bg-secondary/60 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                      <span>Lớp học</span>
                      <span>Trạng thái</span>
                      <span className="text-right">Số buổi đã vào học</span>
                    </div>
                    <div className="divide-y divide-border-subtle">
                      {classItems.map((item) => (
                        <div
                          key={item.class.id}
                          className="grid grid-cols-[minmax(0,1.4fr)_180px_180px] gap-3 px-4 py-3 text-sm"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <span
                              className={`inline-block size-2 shrink-0 rounded-full ${
                                item.class.status === "running"
                                  ? "bg-success"
                                  : item.class.status === "ended"
                                    ? "bg-error"
                                    : "bg-border-default"
                              }`}
                              aria-hidden
                            />
                            <span className="truncate font-medium text-text-primary">{item.class.name}</span>
                          </div>
                          <span className="text-text-secondary">
                            {item.class.status === "running"
                              ? "Đang mở"
                              : item.class.status === "ended"
                                ? "Đã kết thúc"
                                : "—"}
                          </span>
                          <span className="text-right font-medium tabular-nums text-text-primary">
                            {item.totalAttendedSession ?? "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="mt-4 rounded-[1.1rem] border border-border-default bg-bg-surface px-4 py-8 text-center">
                  <p className="text-sm font-medium text-text-primary">
                    Hiện chưa có lớp học nào được liên kết với hồ sơ của bạn.
                  </p>
                  <p className="mt-1 text-sm text-text-muted">
                    Khi hệ thống gán lớp, danh sách ở đây sẽ tự cập nhật theo dữ liệu backend.
                  </p>
                </div>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.15rem] border border-border-default bg-bg-surface px-4 py-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                  Số dư hiện tại
                </p>
                <p className={`mt-2 text-lg font-semibold tabular-nums ${(student.accountBalance ?? 0) < 0 ? "text-error" : "text-text-primary"}`}>
                  {formatCurrency(student.accountBalance ?? 0)}
                </p>
              </div>
              <div className="rounded-[1.15rem] border border-border-default bg-bg-surface px-4 py-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                  Lớp đang liên kết
                </p>
                <p className="mt-2 text-lg font-semibold text-text-primary">
                  {classItems.length}
                </p>
              </div>
              <div className="rounded-[1.15rem] border border-border-default bg-bg-surface px-4 py-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                  Cập nhật hồ sơ
                </p>
                <p className="mt-2 text-sm font-medium text-text-primary">
                  {formatDate(student.updatedAt)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
