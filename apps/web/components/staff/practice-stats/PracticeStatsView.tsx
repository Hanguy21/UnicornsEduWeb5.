"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Download } from "lucide-react";
import { toast } from "sonner";
import { getPracticeStats } from "@/lib/apis/practice-stats.api";
import type {
  PracticeStatsDto,
  PracticeStatsStudentStatus,
} from "@/dtos/practice-stats.dto";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const LOW_CORRECT_RATE = 0.5;

function errorMessage(error: unknown, fallback: string): string {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ?? fallback
  );
}

function formatOpenAt(iso: string | null): string {
  if (!iso) return "chưa đặt giờ mở";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

function formatDuration(ms: number | null): string {
  if (ms == null) return "—";
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function statusLabel(status: PracticeStatsStudentStatus): string {
  if (status === "graded") return "Đã chấm";
  if (status === "pending_essay") return "Chờ chấm";
  return "Chưa làm";
}

function statusVariant(
  status: PracticeStatsStudentStatus,
): "success" | "warning" | "destructive" {
  if (status === "graded") return "success";
  if (status === "pending_essay") return "warning";
  return "destructive";
}

function downloadCsv(data: PracticeStatsDto) {
  const header = ["Học sinh", "Điểm", "Số lượt", "Thời gian", "Trạng thái"];
  const rows = data.students.map((s) => [
    s.studentName,
    s.score == null ? "" : String(s.score),
    String(s.attemptCount),
    formatDuration(s.durationMs),
    statusLabel(s.status),
  ]);
  const escape = (cell: string) => `"${cell.replaceAll('"', '""')}"`;
  const csv = [header, ...rows].map((r) => r.map(escape).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${data.title || "thong-ke"}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function PracticeStatsView() {
  const params = useParams();
  const classId = params.id as string;
  const assignmentId = params.cid as string;
  const backHref = `/staff/classes/${classId}?tab=content`;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["practice-stats", classId, assignmentId],
    queryFn: () => getPracticeStats(classId, assignmentId),
  });

  useEffect(() => {
    if (isError) {
      toast.error(errorMessage(error, "Không tải được thống kê lần giao."));
    }
  }, [isError, error]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-primary"
        >
          <ChevronLeft className="size-4" />
          Quay lại lớp
        </Link>
        <p className="text-sm text-text-muted">
          Không tải được thống kê lần giao.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 pb-24 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-primary"
          >
            <ChevronLeft className="size-4" />
            Nội dung lớp
          </Link>
          <h1 className="mt-1 text-lg font-semibold tracking-[-0.03em] text-text-primary">
            {data.title || "Thống kê bài luyện tập"}
          </h1>
          <p className="text-sm text-text-muted">
            {data.className} · mở {formatOpenAt(data.openAt)} ·{" "}
            {data.durationMinutes ?? "—"} phút
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            downloadCsv(data);
            toast.success("Đã tải file CSV (mở được bằng Excel).");
          }}
          className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-border-default px-4 text-sm font-medium text-text-secondary hover:bg-bg-secondary sm:w-auto"
        >
          <Download className="size-4" />
          Xuất Excel
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="gap-2 py-4">
          <CardContent>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-text-muted">
              Đã nộp
            </p>
            <p className="mt-1 font-semibold tabular-nums text-text-primary">
              <span className="text-2xl">{data.submittedCount}</span>
              <span className="text-base text-text-muted">
                /{data.rosterCount}
              </span>
            </p>
          </CardContent>
        </Card>
        <Card className="gap-2 py-4">
          <CardContent>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-text-muted">
              Điểm trung bình
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-text-primary">
              {data.averageScore == null ? "—" : data.averageScore}
            </p>
          </CardContent>
        </Card>
        <Card className="gap-2 py-4">
          <CardContent>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-text-muted">
              Chờ chấm tự luận
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-warning">
              {data.pendingEssayCount}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="gap-3 py-5">
        <CardContent className="space-y-3">
          <p className="font-medium text-text-primary">Tỉ lệ đúng theo câu</p>
          {data.questions.length === 0 ? (
            <p className="text-sm text-text-muted">Đề chưa có câu hỏi.</p>
          ) : (
            <ul className="space-y-3">
              {data.questions.map((q) => {
                const pct = Math.round(q.correctRate * 100);
                const low = q.sampleCount > 0 && q.correctRate < LOW_CORRECT_RATE;
                return (
                  <li key={q.questionId}>
                    <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                      <span className="text-text-secondary">Câu {q.order}</span>
                      <span
                        className={`tabular-nums ${low ? "text-error" : "text-text-muted"}`}
                      >
                        {q.sampleCount === 0 ? "—" : `${pct}%`}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-bg-secondary">
                      <div
                        className={`h-full rounded-full ${low ? "bg-error" : "bg-success"}`}
                        style={{ width: `${q.sampleCount === 0 ? 0 : pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-2xl border border-border-default bg-bg-surface">
        <Table className="min-w-[36rem]">
          <TableHeader>
            <TableRow>
              <TableHead>Học sinh</TableHead>
              <TableHead>Điểm ▾</TableHead>
              <TableHead>Số lượt</TableHead>
              <TableHead>Thời gian</TableHead>
              <TableHead>Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.students.map((row) => (
              <TableRow
                key={row.studentId}
                className={
                  row.status === "not_started" ? "bg-error/8 hover:bg-error/12" : undefined
                }
              >
                <TableCell className="font-medium text-text-primary">
                  {row.studentName}
                </TableCell>
                <TableCell className="tabular-nums">
                  {row.score == null ? "—" : row.score}
                </TableCell>
                <TableCell className="tabular-nums">{row.attemptCount}</TableCell>
                <TableCell className="tabular-nums">
                  {formatDuration(row.durationMs)}
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant(row.status)}>
                    {statusLabel(row.status)}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-sm text-text-muted">
        Điểm hiển thị lấy từ lượt cao nhất đã chấm xong.
      </p>
    </div>
  );
}
