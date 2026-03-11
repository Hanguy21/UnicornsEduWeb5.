"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import * as staffApi from "@/lib/apis/staff.api";

type StaffStatus = "active" | "inactive";

interface StaffDetail {
  id: string;
  fullName: string;
  birthDate?: string | null;
  university?: string | null;
  highSchool?: string | null;
  specialization?: string | null;
  bankAccount?: string | null;
  bankQrLink?: string | null;
  roles: string[];
  status: StaffStatus;
  createdAt?: string;
  updatedAt?: string;
  user?: {
    id: string;
    email: string;
    province?: string | null;
  } | null;
  classTeachers?: Array<{ class: { id: string; name: string } }>;
  monthlyStats?: Array<{ month: string; totalUnpaidAll?: number | null }>;
}

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

function formatCurrency(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

const STATUS_LABELS: Record<StaffStatus, string> = {
  active: "Hoạt động",
  inactive: "Ngừng",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  teacher: "Giáo viên",
  lesson_plan: "Giáo án",
  lesson_plan_head: "Trưởng nhóm giáo án",
  accountant: "Kế toán",
  communication: "Truyền thông",
  communication_head: "Trưởng truyền thông",
  customer_care: "CSKH",
  customer_care_head: "Trưởng CSKH",
};

function Card({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-lg border border-border-default bg-bg-surface p-4 shadow-sm transition-colors hover:border-border-default sm:p-5 ${className}`}
      aria-labelledby={`card-${title.replace(/\s+/g, "-")}`}
    >
      <h2
        id={`card-${title.replace(/\s+/g, "-")}`}
        className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-muted"
      >
        {title}
      </h2>
      <div className="text-sm text-text-primary">{children}</div>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 first:pt-0 last:pb-0 sm:flex-row sm:gap-4">
      <dt className="shrink-0 font-medium text-text-secondary sm:w-36">{label}</dt>
      <dd className="min-w-0 text-text-primary">{value ?? "—"}</dd>
    </div>
  );
}

export default function AdminStaffDetailPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const [staff, setStaff] = useState<StaffDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError("Thiếu mã nhân sự.");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    staffApi
      .getStaffById(id)
      .then((data) => {
        if (!cancelled) setStaff(data as StaffDetail);
      })
      .catch((err) => {
        if (!cancelled) {
          const msg =
            err?.response?.data?.message ?? err?.message ?? "Không tải được thông tin nhân sự.";
          setError(msg);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-4 sm:p-6">
        <div className="mb-4 h-8 w-48 animate-pulse rounded bg-bg-tertiary" />
        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
          <div className="h-64 animate-pulse rounded-lg border border-border-default bg-bg-surface" />
          <div className="h-64 animate-pulse rounded-lg border border-border-default bg-bg-surface" />
        </div>
        <p className="sr-only" aria-live="polite" aria-busy="true">
          Đang tải…
        </p>
      </div>
    );
  }

  if (error || !staff) {
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-4 sm:p-6">
        <Link
          href="/admin/staff"
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
        >
          <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Quay lại danh sách nhân sự
        </Link>
        <div className="rounded-lg border border-error/30 bg-error/10 px-4 py-6 text-error" role="alert">
          <p>{error ?? "Không tìm thấy nhân sự."}</p>
        </div>
      </div>
    );
  }

  const province = staff.user?.province?.trim() || "—";
  const classes = staff.classTeachers?.map((ct) => ct.class.name).filter(Boolean) || [];
  const latestUnpaid = staff.monthlyStats?.[0]?.totalUnpaidAll;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-4 sm:p-6">
      <Link
        href="/admin/staff"
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
      >
        <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Quay lại danh sách nhân sự
      </Link>

      <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`inline-block size-3 shrink-0 rounded-full ${
              staff.status === "active" ? "bg-warning" : "bg-text-muted"
            }`}
            title={STATUS_LABELS[staff.status]}
            aria-hidden
          />
          <h1 className="text-xl font-semibold text-text-primary">
            {staff.fullName?.trim() || "Nhân sự"}
          </h1>
        </div>
      </header>

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Thông tin cơ bản">
          <dl className="divide-y divide-border-subtle">
            <DetailRow label="Họ và tên" value={staff.fullName?.trim()} />
            <DetailRow label="Ngày sinh" value={formatDate(staff.birthDate)} />
            <DetailRow label="Trường ĐH" value={staff.university?.trim()} />
            <DetailRow label="THPT" value={staff.highSchool?.trim()} />
            <DetailRow label="Chuyên ngành" value={staff.specialization?.trim()} />
            <DetailRow label="Tỉnh / Thành phố" value={province} />
            <DetailRow
              label="Trạng thái"
              value={
                <span
                  className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                    staff.status === "active"
                      ? "border-success/30 bg-success/15 text-success"
                      : "border-border-subtle bg-bg-tertiary text-text-muted"
                  }`}
                >
                  {STATUS_LABELS[staff.status]}
                </span>
              }
            />
            {staff.roles?.length > 0 && (
              <DetailRow
                label="Vai trò"
                value={
                  <div className="flex flex-wrap gap-1.5">
                    {staff.roles.map((r) => (
                      <span
                        key={r}
                        className="rounded-md border border-border-subtle bg-bg-secondary px-2 py-0.5 text-xs text-text-secondary"
                      >
                        {ROLE_LABELS[r] ?? r}
                      </span>
                    ))}
                  </div>
                }
              />
            )}
          </dl>
        </Card>

        <Card title="Tài khoản đăng nhập">
          <dl className="divide-y divide-border-subtle">
            <DetailRow label="Email" value={staff.user?.email} />
            <DetailRow
              label="Cập nhật hồ sơ"
              value={staff.updatedAt ? formatDate(staff.updatedAt) : "—"}
            />
          </dl>
          <p className="mt-3 text-xs text-text-muted">
            Chỉnh sửa thông tin đăng nhập (mật khẩu, email) sẽ được bổ sung sau.
          </p>
        </Card>

        <Card title="Lớp phụ trách" className="lg:col-span-2">
          {classes.length === 0 ? (
            <p className="text-text-muted">Chưa gán lớp nào.</p>
          ) : (
            <ul className="flex flex-wrap gap-2" role="list">
              {classes.map((name) => (
                <li
                  key={name}
                  className="rounded-md border border-border-default bg-bg-secondary px-3 py-1.5 text-sm text-text-primary"
                >
                  {name}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Chưa thanh toán (gần nhất)">
          <p className="text-lg font-semibold tabular-nums text-text-primary">
            {formatCurrency(latestUnpaid)}
          </p>
          <p className="mt-1 text-xs text-text-muted">
            Lấy từ tháng gần nhất trong báo cáo thống kê.
          </p>
          {staff.monthlyStats && staff.monthlyStats.length > 1 && (
            <ul className="mt-3 space-y-1 text-sm text-text-secondary">
              {staff.monthlyStats.slice(0, 3).map((stat) => (
                <li key={stat.month} className="flex justify-between gap-4">
                  <span>{stat.month}</span>
                  <span className="tabular-nums">{formatCurrency(stat.totalUnpaidAll)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
