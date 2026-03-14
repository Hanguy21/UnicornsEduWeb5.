"use client";

import { SessionItem } from "@/dtos/session.dto";

type SessionEntityMode = "teacher" | "class" | "none";
type SessionStatusMode = "payment" | "timeline";

type Props = {
  sessions: SessionItem[];
  entityMode?: SessionEntityMode;
  statusMode?: SessionStatusMode;
  emptyText?: string;
  className?: string;
};

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function extractDateKey(raw?: string | null): string | null {
  if (!raw) return null;

  const matched = raw.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  if (matched) return matched[1];

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return formatDateKey(date);
}

function formatDateOnly(raw?: string | null): string {
  const dateKey = extractDateKey(raw);
  if (dateKey) {
    const [, year, month, day] = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/) ?? [];
    if (year && month && day) {
      return `${day}/${month}/${year}`;
    }
  }

  return "—";
}

function formatTimeOnly(raw?: string | null): string {
  if (!raw) return "—";

  const directMatch = raw.trim().match(/^(\d{2}):(\d{2})(?::\d{2})?$/);
  if (directMatch) {
    return `${directMatch[1]}:${directMatch[2]}`;
  }

  const isoMatch = raw.trim().match(/T(\d{2}:\d{2})(?::\d{2})?/);
  if (isoMatch) {
    return isoMatch[1];
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "—";

  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function renderSessionTime(session: SessionItem): string {
  const start = formatTimeOnly(session.startTime ?? null);
  const end = formatTimeOnly(session.endTime ?? null);

  if (start === "—" && end === "—") {
    return "—";
  }

  if (start !== "—" && end !== "—") {
    return `${start} – ${end}`;
  }

  return start !== "—" ? start : end;
}

function renderSessionStatus(
  session: SessionItem,
  statusMode: SessionStatusMode,
): { label: string; className: string } {
  if (statusMode === "timeline") {
    const sessionDateKey = extractDateKey(session.date);
    if (!sessionDateKey) {
      return {
        label: "Chưa xác định",
        className: "bg-text-muted/15 text-text-muted",
      };
    }

    const todayDateKey = formatDateKey(new Date());
    if (sessionDateKey <= todayDateKey) {
      return {
        label: "Đã hoàn thành",
        className: "bg-success/15 text-success",
      };
    }

    return {
      label: "Đã lên lịch",
      className: "bg-warning/15 text-warning",
    };
  }

  const paymentStatus = (session.teacherPaymentStatus ?? "").toLowerCase();
  if (paymentStatus === "paid") {
    return {
      label: "Đã thanh toán",
      className: "bg-success/15 text-success",
    };
  }

  if (paymentStatus === "unpaid" || paymentStatus === "") {
    return {
      label: "Chưa thanh toán",
      className: "bg-warning/15 text-warning",
    };
  }

  return {
    label: paymentStatus,
    className: "bg-text-muted/15 text-text-muted",
  };
}

function renderEntityCell(session: SessionItem, entityMode: SessionEntityMode): string {
  if (entityMode === "teacher") {
    return session.teacher?.fullName?.trim() || "—";
  }

  if (entityMode === "class") {
    return session.class?.name?.trim() || "—";
  }

  return "—";
}

function renderEntityHeader(entityMode: SessionEntityMode): string {
  if (entityMode === "teacher") {
    return "Gia sư";
  }

  if (entityMode === "class") {
    return "Lớp";
  }

  return "";
}

export default function SessionHistoryTable({
  sessions,
  entityMode = "none",
  statusMode = "payment",
  emptyText = "Chưa có buổi học nào.",
  className = "",
}: Props) {

  const shouldShowEntity = entityMode !== "none";

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full min-w-[520px] border-collapse text-left text-sm table-fixed">
        <caption className="sr-only">Lịch sử buổi học</caption>
        <thead>
          <tr className="border-b border-border-default bg-bg-secondary">
            <th scope="col" className="px-4 py-3 font-medium text-text-primary">
              Ngày học
            </th>
            <th scope="col" className="px-4 py-3 font-medium text-text-primary">
              Giờ học
            </th>
            {shouldShowEntity ? (
              <th scope="col" className="px-4 py-3 font-medium text-text-primary">
                {renderEntityHeader(entityMode)}
              </th>
            ) : null}
            <th scope="col" className="px-4 py-3 font-medium text-text-primary">
              Trạng thái thanh toán
            </th>
          </tr>
        </thead>
        <tbody>
          {sessions.length > 0 ? sessions.map((session) => {
            const status = renderSessionStatus(session, statusMode);
            return (
              <tr
                key={session.id}
                className="border-b border-border-default bg-bg-surface transition-colors duration-200 hover:bg-bg-secondary"
              >
                <td className="px-4 py-3 text-text-primary">{formatDateOnly(session.date)}</td>
                <td className="px-4 py-3 font-mono text-text-primary">{renderSessionTime(session)}</td>
                {shouldShowEntity ? (
                  <td className="px-4 py-3 text-text-primary">{renderEntityCell(session, entityMode)}</td>
                ) : null}
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>
                    {status.label}
                  </span>
                </td>
              </tr>
            );
          }) : (
            <tr>
              <td colSpan={shouldShowEntity ? 4 : 3} className="px-4 py-3 text-center text-text-muted">
                {emptyText}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
