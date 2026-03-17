import StudentDetailRow from "./StudentDetailRow";
import StudentInfoCard from "./StudentInfoCard";
import { formatCurrency } from "@/lib/class.helpers";

type Props = {
  balance: number;
  className?: string;
  onTopUp: () => void;
  onWithdraw: () => void;
};

export default function StudentWalletCard({
  balance,
  className = "",
  onTopUp,
  onWithdraw,
}: Props) {
  const isNegativeBalance = balance < 0;
  const isZeroBalance = balance === 0;
  const balanceLabel = isNegativeBalance
    ? "Âm tài khoản"
    : isZeroBalance
      ? "Về mức 0"
      : "Sẵn sàng sử dụng";
  const balanceDescription = isNegativeBalance
    ? "Tài khoản đang âm. Nên nạp thêm để tiếp tục bù trừ các khoản phát sinh của học sinh."
    : isZeroBalance
      ? "Tài khoản hiện không còn số dư. Giao dịch tiếp theo sẽ cần nạp thêm trước khi rút tiền."
      : "Số dư đang khả dụng để điều phối học phí, khoản thu bổ sung và các giao dịch nội bộ tiếp theo.";
  const balanceHint = isNegativeBalance
    ? "Ưu tiên nạp bù"
    : isZeroBalance
      ? "Cần theo dõi sát"
      : "Có thể tiếp tục sử dụng";
  const statusChipClass = isNegativeBalance
    ? "bg-error/10 text-error ring-error/20"
    : isZeroBalance
      ? "bg-warning/15 text-text-primary ring-warning/20"
      : "bg-primary/10 text-primary ring-primary/20";
  const statusDotClass = isNegativeBalance
    ? "bg-error"
    : isZeroBalance
      ? "bg-warning"
      : "bg-primary";
  const amountClass = isNegativeBalance ? "text-error" : "text-text-primary";

  return (
    <StudentInfoCard title="Tài khoản hiện tại" className={className}>
      <dl className="divide-y divide-border-subtle">
        <StudentDetailRow
          label="Số dư"
          value={
            <span className={`text-base font-semibold tabular-nums sm:text-lg ${amountClass}`}>
              {formatCurrency(balance)}
            </span>
          }
        />
        <StudentDetailRow
          label="Trạng thái"
          value={
            <span
              className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${statusChipClass}`}
            >
              <span className={`size-2 rounded-full ${statusDotClass}`} aria-hidden />
              {balanceLabel}
            </span>
          }
        />
        <StudentDetailRow label="Ghi chú" value={balanceDescription} />
        <StudentDetailRow label="Ưu tiên" value={balanceHint} />
      </dl>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
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
          onClick={onWithdraw}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border-default bg-bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition-transform transition-colors duration-200 hover:-translate-y-0.5 hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          <svg className="size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H8m0 0 5-5m-5 5 5 5" />
          </svg>
          Rút tiền
        </button>
      </div>
    </StudentInfoCard>
  );
}
