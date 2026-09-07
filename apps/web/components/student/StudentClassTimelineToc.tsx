"use client";

import { BookOpen, CalendarDays, ClipboardList, Dumbbell, Lock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ClassTimelineKind } from "@/dtos/class-timeline.dto";

export interface TimelineTocEntry {
  id: string;
  index: number;
  title: string;
  kind: ClassTimelineKind;
  topicKind: "theory" | "practice" | null;
  locked: boolean;
}

function entryIcon(entry: TimelineTocEntry): LucideIcon {
  if (entry.kind === "session") return CalendarDays;
  if (entry.kind === "class_survey") return ClipboardList;
  return entry.topicKind === "practice" ? Dumbbell : BookOpen;
}

/**
 * Mục lục timeline lớp học: danh sách rút gọn để nhảy nhanh tới từng mục.
 * Component thuần presentational — state active/scroll do phía gọi quản lý.
 */
export default function StudentClassTimelineToc({
  entries,
  activeId,
  onSelect,
  className,
}: {
  entries: TimelineTocEntry[];
  activeId: string | null;
  onSelect: (id: string) => void;
  className?: string;
}) {
  if (!entries.length) return null;

  return (
    <nav aria-label="Mục lục nội dung lớp học" className={className}>
      <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
        Mục lục ({entries.length})
      </p>
      <ul className="space-y-0.5">
        {entries.map((entry) => {
          const Icon = entryIcon(entry);
          const active = entry.id === activeId;
          return (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => onSelect(entry.id)}
                aria-current={active ? "true" : undefined}
                className={`flex w-full items-center gap-2 rounded-lg border-l-2 py-1.5 pl-2 pr-2 text-left text-xs transition-colors ${
                  active
                    ? "border-primary bg-primary/10 font-semibold text-primary"
                    : "border-transparent text-text-secondary hover:bg-bg-secondary/60 hover:text-text-primary"
                }`}
              >
                <span className="w-4 shrink-0 text-right font-mono text-[10px] text-text-muted">
                  {entry.index}
                </span>
                <Icon className="size-3.5 shrink-0" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{entry.title}</span>
                {entry.locked ? (
                  <Lock className="size-3 shrink-0 text-text-muted" aria-label="Chưa mở" />
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
