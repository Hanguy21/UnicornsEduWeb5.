import type { ClassStatus, ClassType } from "@/dtos/class.dto";

export function formatCurrency(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

export function normalizePage(rawPage: string | null): number {
  const parsed = Number(rawPage);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
}

export function normalizeClassStatus(rawStatus: string | null): "" | ClassStatus {
  return rawStatus === "running" || rawStatus === "ended" ? rawStatus : "";
}

export function normalizeClassType(rawType: string | null): "" | ClassType {
  return rawType === "basic" || rawType === "vip" || rawType === "advance" || rawType === "hardcore"
    ? rawType
    : "";
}

function padTimeSegment(value: number): string {
  return String(value).padStart(2, "0");
}

export function normalizeTimeOnly(raw?: string | null): string {
  if (!raw) return "";

  const trimmed = raw.trim();
  const matched = trimmed.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (matched) {
    const [, hours, minutes, seconds = "00"] = matched;
    return `${hours}:${minutes}:${seconds}`;
  }

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return "";

  return `${padTimeSegment(date.getHours())}:${padTimeSegment(date.getMinutes())}:${padTimeSegment(date.getSeconds())}`;
}

/** Từ gói học phí (tổng + số buổi), suy ra học phí mỗi buổi gửi lên API (làm tròn). */
export function computeStudentTuitionPerSessionFromPackage(
  packageTotal: number | undefined,
  packageSessions: number | undefined,
): number | undefined {
  if (packageTotal === undefined || packageSessions === undefined) return undefined;
  if (!Number.isFinite(packageTotal) || !Number.isFinite(packageSessions)) return undefined;
  if (packageSessions < 1 || packageTotal < 0) return undefined;
  return Math.round(packageTotal / packageSessions);
}

export type ParsedTuitionPackage =
  | { ok: true; mode: "empty" }
  | { ok: true; mode: "filled"; total: number; sessions: number }
  | { ok: false; message: string };

/** Khi submit: cả hai ô trống → không gói; chỉ một ô có giá trị → lỗi. */
export function parseTuitionPackageInputs(totalInput: string, sessionsInput: string): ParsedTuitionPackage {
  const tt = totalInput.trim();
  const st = sessionsInput.trim();
  if (tt === "" && st === "") return { ok: true, mode: "empty" };
  if (tt === "" || st === "") {
    return { ok: false, message: "Gói học phí cần nhập đủ tổng tiền và số buổi." };
  }
  const total = Math.floor(Number(tt));
  const sessions = Math.floor(Number(st));
  if (!Number.isFinite(total) || !Number.isFinite(sessions)) {
    return { ok: false, message: "Giá trị gói học phí không hợp lệ." };
  }
  if (sessions < 1) {
    return { ok: false, message: "Số buổi gói học phí phải từ 1 trở lên." };
  }
  if (total < 0) {
    return { ok: false, message: "Tổng gói học phí không được âm." };
  }
  return { ok: true, mode: "filled", total, sessions };
}

/** Một dòng ngắn khi đã tính được học phí/buổi; không hiển thị gợi ý dài. */
export function compactTuitionPerSessionLine(totalInput: string, sessionsInput: string): string | null {
  const tt = totalInput.trim();
  const st = sessionsInput.trim();
  if (tt === "" || st === "") return null;
  const total = Math.floor(Number(tt));
  const sessions = Math.floor(Number(st));
  const per = computeStudentTuitionPerSessionFromPackage(total, sessions);
  if (per == null) return null;
  return `${formatCurrency(per)}/buổi`;
}
