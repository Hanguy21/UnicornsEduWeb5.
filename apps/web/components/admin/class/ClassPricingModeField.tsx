"use client";

import { Switch } from "@/components/ui/switch";
import type { ClassPricingMode } from "@/dtos/class.dto";

type Props = {
  value: ClassPricingMode;
  onChange: (next: ClassPricingMode) => void;
  disabled?: boolean;
};

export default function ClassPricingModeField({
  value,
  onChange,
  disabled = false,
}: Props) {
  const checked = value === "per_block";

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border-default bg-bg-surface p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium text-text-primary">Chế độ tính tiền</p>
        <p className="text-xs text-text-muted">
          Mặc định theo buổi. Bật block 30 phút chỉ khi lịch lớp cùng thời lượng bội số 30 phút.
          Đổi chế độ tính lại buổi chưa thanh toán; buổi đã thanh toán hoặc cọc giữ nguyên.
        </p>
      </div>
      <label className="flex shrink-0 items-center gap-2 text-sm text-text-secondary">
        <Switch
          checked={checked}
          disabled={disabled}
          aria-label="Tính tiền theo block 30 phút"
          onCheckedChange={(next) => onChange(next ? "per_block" : "per_session")}
        />
        <span className="whitespace-nowrap">{checked ? "Theo block 30 phút" : "Theo buổi"}</span>
      </label>
    </div>
  );
}
