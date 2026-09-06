"use client";

import { DateInput } from "@/components/ui/DateInput";
import { TimeInput } from "@/components/ui/TimeInput";
import UpgradedSelect from "@/components/ui/UpgradedSelect";
import { currentTimePrefillValue } from "@/components/ui/time-input.helpers";

export const ASSIGNMENT_DURATION_OPTIONS = [
  { value: "15", label: "15 phút" },
  { value: "30", label: "30 phút" },
  { value: "45", label: "45 phút" },
  { value: "60", label: "60 phút" },
  { value: "90", label: "90 phút" },
  { value: "120", label: "120 phút" },
  { value: "150", label: "150 phút" },
  { value: "180", label: "180 phút" },
];

const inputClass =
  "mt-1.5 w-full rounded-xl border border-border-default bg-bg-surface px-4 py-2.5 text-sm text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus font-medium";

export function todayDateValue(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function defaultAssignmentSchedule() {
  return {
    openDate: todayDateValue(),
    openTime: currentTimePrefillValue(),
    durationMinutes: "60",
  };
}

export function toOpenAtIso(date: string, time: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute, 0).toISOString();
}

export function fromOpenAtIso(iso: string): { date: string; time: string } {
  const parsed = new Date(iso);
  const fallback = defaultAssignmentSchedule();
  if (Number.isNaN(parsed.getTime())) {
    return { date: fallback.openDate, time: fallback.openTime };
  }
  const date = todayDateValue(parsed);
  const hh = String(parsed.getHours()).padStart(2, "0");
  const mm = String(Math.floor(parsed.getMinutes() / 15) * 15).padStart(2, "0");
  return { date, time: `${hh}:${mm}:00` };
}

export function AssignmentScheduleFields({
  openDate,
  openTime,
  durationMinutes,
  onOpenDateChange,
  onOpenTimeChange,
  onDurationChange,
}: {
  openDate: string;
  openTime: string;
  durationMinutes: string;
  onOpenDateChange: (value: string) => void;
  onOpenTimeChange: (value: string) => void;
  onDurationChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="sm:col-span-1">
        <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          Ngày mở bài <span className="text-error">*</span>
        </label>
        <DateInput
          value={openDate}
          onChange={(event) => onOpenDateChange(event.target.value)}
          className={inputClass}
        />
      </div>
      <div className="sm:col-span-1">
        <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          Giờ mở bài <span className="text-error">*</span>
        </label>
        <TimeInput
          value={openTime}
          onChange={(event) => onOpenTimeChange(event.target.value)}
          className={inputClass}
        />
      </div>
      <div className="sm:col-span-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          Thời lượng làm bài <span className="text-error">*</span>
        </label>
        <div className="mt-1.5">
          <UpgradedSelect
            value={durationMinutes}
            onValueChange={onDurationChange}
            options={ASSIGNMENT_DURATION_OPTIONS}
            placeholder="Chọn thời lượng"
          />
        </div>
      </div>
    </div>
  );
}
