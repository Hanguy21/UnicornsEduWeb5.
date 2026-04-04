"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getFullProfile, getMyStaffIncomeSummary } from "@/lib/apis/auth.api";
import { formatCurrency } from "@/lib/class.helpers";
import { ROLE_LABELS } from "@/lib/staff.constants";

const RECENT_UNPAID_DAYS = 14;

function getCurrentMonth() {
  const now = new Date();
  return {
    month: String(now.getMonth() + 1).padStart(2, "0"),
    year: String(now.getFullYear()),
  };
}

/* ------------------------------------------------------------------ */
/*  Shared presentational helpers                                      */
/* ------------------------------------------------------------------ */

function DashboardCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
        {title}
      </h2>
      {children}
    </section>
  );
}

function PlaceholderCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <DashboardCard title={title}>
      <div className="rounded-lg border border-dashed border-border-default bg-bg-secondary/40 px-4 py-6 text-center">
        <p className="text-sm font-medium text-text-primary">{title}</p>
        <p className="mt-1 text-xs text-text-muted">{description}</p>
      </div>
    </DashboardCard>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading state                                                      */
/* ------------------------------------------------------------------ */

function StaffRootLoadingState() {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col bg-bg-primary p-4 pb-8 sm:p-6"
      aria-busy="true"
    >
      <div className="mb-6 h-8 w-56 animate-pulse rounded-lg bg-bg-tertiary" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={`staff-root-loading-card-${i}`}
            className="h-28 animate-pulse rounded-2xl border border-border-default bg-bg-surface"
          />
        ))}
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.95fr)]">
        <div className="h-[340px] animate-pulse rounded-[2rem] border border-border-default bg-bg-surface" />
        <div className="h-[340px] animate-pulse rounded-[2rem] border border-border-default bg-bg-surface" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Staff dashboard (mọi nhân sự có hồ sơ, gồm trợ lí)                 */
/* ------------------------------------------------------------------ */

function StaffDashboardOverview({
  staffName,
  staffRoles,
  monthlyTotal,
  monthlyUnpaid,
  monthlyPaid,
  todayClasses,
  incomeDetailHref = "/staff/profile",
}: {
  staffName: string;
  staffRoles: string[];
  monthlyTotal: number;
  monthlyUnpaid: number;
  monthlyPaid: number;
  todayClasses: Array<{ classId: string; className: string; total: number }>;
  /** Trợ lí: `/staff/staffs/:id`; role khác: `/staff/profile`. */
  incomeDetailHref?: string;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-4 pb-8 sm:p-6">
      <header className="mb-6">
        <h1 className="text-lg font-semibold text-text-primary sm:text-xl">
          Xin chào, {staffName}
        </h1>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {staffRoles.map((role) => (
            <span
              key={role}
              className="inline-flex rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary"
            >
              {ROLE_LABELS[role] ?? role}
            </span>
          ))}
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardCard title="Thu nhập tháng này">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Lương tổng</span>
              <span className="tabular-nums text-sm font-semibold text-primary">
                {formatCurrency(monthlyTotal)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Chưa nhận</span>
              <span className="tabular-nums text-sm font-semibold text-error">
                {formatCurrency(monthlyUnpaid)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Đã nhận</span>
              <span className="tabular-nums text-sm font-semibold text-success">
                {formatCurrency(monthlyPaid)}
              </span>
            </div>
          </div>
          <Link
            href={incomeDetailHref}
            className="mt-3 inline-block text-xs font-medium text-primary hover:text-primary-hover"
          >
            Xem chi tiết &rarr;
          </Link>
        </DashboardCard>

        <DashboardCard title="Lớp phụ trách">
          {todayClasses.length === 0 ? (
            <p className="text-sm text-text-muted">Chưa gán lớp nào.</p>
          ) : (
            <ul className="space-y-2">
              {todayClasses.map((c) => (
                <li
                  key={c.classId}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="truncate text-text-primary">
                    {c.className}
                  </span>
                  <span className="shrink-0 tabular-nums font-medium text-primary">
                    {formatCurrency(c.total)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>

        <PlaceholderCard
          title="Thông báo"
          description="Sắp có — thông báo hệ thống sẽ hiển thị ở đây."
        />

        <PlaceholderCard
          title="Cảnh báo trợ cấp tuần"
          description="Sắp có — cảnh báo chưa xác nhận trợ cấp tuần sẽ hiển thị ở đây."
        />

        <PlaceholderCard
          title="Lớp chưa điền lịch / khảo sát"
          description="Sắp có — lớp chưa có lịch học hoặc chưa điền khảo sát sẽ hiển thị ở đây."
        />

        <PlaceholderCard
          title="Lịch hôm nay"
          description="Sắp có — các lớp có giờ hôm nay sẽ hiển thị ở đây."
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Root page                                                          */
/* ------------------------------------------------------------------ */

export default function StaffDashboardPage() {
  const { month, year } = getCurrentMonth();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["auth", "full-profile"],
    queryFn: getFullProfile,
    retry: false,
    staleTime: 60_000,
  });

  const linkedStaffId = profile?.staffInfo?.id ?? "";
  const rawStaffRoles = profile?.staffInfo?.roles;
  const staffRoles = useMemo(() => rawStaffRoles ?? [], [rawStaffRoles]);
  const isAssistant =
    profile?.roleType === "staff" && staffRoles.includes("assistant");

  const { data: incomeSummary } = useQuery({
    queryKey: [
      "staff",
      "self",
      "income-summary",
      year,
      month,
      RECENT_UNPAID_DAYS,
    ],
    queryFn: () =>
      getMyStaffIncomeSummary({ month, year, days: RECENT_UNPAID_DAYS }),
    enabled: !!linkedStaffId,
    staleTime: 30_000,
  });

  const monthlyTotals = incomeSummary?.monthlyIncomeTotals ?? {
    total: 0,
    paid: 0,
    unpaid: 0,
  };
  const classSummaries = incomeSummary?.classMonthlySummaries ?? [];
  const todayClasses = classSummaries.slice(0, 5);

  if (profileLoading) {
    return <StaffRootLoadingState />;
  }

  const staffName =
    profile?.staffInfo?.fullName?.trim() || profile?.email || "Nhân sự";

  const incomeDetailHref =
    isAssistant && linkedStaffId
      ? `/staff/staffs/${encodeURIComponent(linkedStaffId)}`
      : "/staff/profile";

  return (
    <StaffDashboardOverview
      staffName={staffName}
      staffRoles={staffRoles}
      monthlyTotal={monthlyTotals.total}
      monthlyUnpaid={monthlyTotals.unpaid}
      monthlyPaid={monthlyTotals.paid}
      todayClasses={todayClasses}
      incomeDetailHref={incomeDetailHref}
    />
  );
}
