import StudentInfoCard from "./StudentInfoCard";
import { formatCurrency } from "@/lib/class.helpers";

type Props = {
  balance: number;
  advanceDebt: number;
  pendingTopUp?: number;
  availableAdvance?: number;
  lastUpdated?: string;
  className?: string;
  onTopUp: () => void;
  onAdvance: () => void;
  onRepay: () => void;
};

function formatWalletDateTime(iso?: string): string {
  if (!iso) return "Vừa cập nhật";

  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "Vừa cập nhật";
  }
}

export default function StudentWalletCard({
  balance,
  advanceDebt,
  pendingTopUp = 0,
  availableAdvance,
  lastUpdated,
  className = "",
  onTopUp,
  onAdvance,
  onRepay,
}: Props) {
  const hasAdvanceDebt = advanceDebt > 0;

  return (
    <StudentInfoCard
      title="Tài khoản hiện tại"
      className={`relative overflow-hidden border-primary/10 bg-bg-surface ${className}`}
    >
      <div
        className="pointer-events-none absolute -right-10 top-3 size-28 rounded-full bg-primary/10 blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-0 top-0 h-px w-full bg-primary/20"
        aria-hidden
      />

      <div className="relative">
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">

              <p className="mt-2 break-words text-3xl font-semibold leading-none tracking-[-0.04em] text-text-primary sm:text-[2.6rem]">
                {formatCurrency(balance)}
              </p>

            </div>

          </div>

        </div>

        <div className="mt-8 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={onTopUp}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-text-inverse transition-transform transition-colors duration-200 hover:-translate-y-0.5 hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <svg className="size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m7-7H5" />
            </svg>
            Nạp tiền
          </button>
          <button
            type="button"
            onClick={onAdvance}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border-default bg-bg-surface/85 px-4 py-2.5 text-sm font-medium text-text-primary transition-transform transition-colors duration-200 hover:-translate-y-0.5 hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <svg className="size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7H7m6 5H7m10-8-4 4m0 0 4 4m-4-4h8" />
            </svg>
            Ứng tiền
          </button>
        </div>

        <div className="mt-5 rounded-[1.25rem] border border-border-default bg-error/5 p-3.5 shadow-sm sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                Nợ ứng tiền
              </p>
              <p className="mt-2 text-2xl font-semibold leading-none tracking-[-0.03em] text-error">
                {formatCurrency(advanceDebt)}
              </p>
              <p className="mt-2 text-xs leading-5 text-text-secondary">
                {hasAdvanceDebt
                  ? "Khoản ứng đang mở và cần hoàn trả trước kỳ đối soát tiếp theo."
                  : "Không có khoản ứng nào đang mở."}
              </p>
            </div>
            <button
              type="button"
              onClick={onRepay}
              disabled={!hasAdvanceDebt}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-error/20 bg-bg-surface px-4 py-2.5 text-sm font-medium text-error transition-colors duration-200 hover:bg-error/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:border-border-default disabled:text-text-muted disabled:hover:bg-bg-surface sm:w-auto"
            >
              <svg className="size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12h16m-6-6 6 6-6 6" />
              </svg>
              Thanh toán
            </button>
          </div>
        </div>
      </div>
    </StudentInfoCard>
  );
}
