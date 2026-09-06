"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Search, BookOpen, Dumbbell } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  getCourseTopicsForClass,
  type CourseTopicForClassDto,
} from "@/lib/apis/class.api";

interface CourseTopicPickerProps {
  classId: string;
  selectedTopicId: string;
  onSelect: (topicId: string) => void;
}

export default function CourseTopicPicker({
  classId,
  selectedTopicId,
  onSelect,
}: CourseTopicPickerProps) {
  const [search, setSearch] = useState("");

  const { data: topics, isLoading } = useQuery<CourseTopicForClassDto[]>({
    queryKey: ["course-topics-for-class", classId],
    queryFn: () => getCourseTopicsForClass(classId),
  });

  const filtered = useMemo(() => {
    if (!topics) return [];
    if (!search.trim()) return topics;
    const q = search.toLowerCase();
    return topics.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.chapterTitle.toLowerCase().includes(q),
    );
  }, [topics, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, CourseTopicForClassDto[]>();
    for (const t of filtered) {
      const arr = map.get(t.chapterTitle) ?? [];
      arr.push(t);
      map.set(t.chapterTitle, arr);
    }
    return map;
  }, [filtered]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!topics || topics.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border-default bg-bg-secondary/20 p-6 text-center text-sm text-text-muted">
        Khoá học này chưa có chuyên đề nào. Hãy tạo chuyên đề trong quản trị
        khoá học trước.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm chuyên đề..."
          className="w-full rounded-xl border border-border-default bg-bg-surface pl-9 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        />
      </div>

      <div className="max-h-[50vh] overflow-y-auto overscroll-contain space-y-3 [scrollbar-width:thin]">
        {filtered.length === 0 && (
          <div className="py-6 text-center text-sm text-text-muted">
            Không tìm thấy chuyên đề phù hợp.
          </div>
        )}

        {Array.from(grouped.entries()).map(([chapterTitle, chapterTopics]) => (
          <div key={chapterTitle}>
            <div className="text-xs font-semibold uppercase tracking-wider text-text-muted px-1 mb-1.5">
              {chapterTitle}
            </div>
            <div className="space-y-1.5">
              {chapterTopics.map((topic) => (
                <TopicRow
                  key={topic.id}
                  topic={topic}
                  isSelected={topic.id === selectedTopicId}
                  onSelect={onSelect}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopicRow({
  topic,
  isSelected,
  onSelect,
}: {
  topic: CourseTopicForClassDto;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => !topic.alreadyAdded && onSelect(topic.id)}
      disabled={topic.alreadyAdded}
      className={cn(
        "w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-colors",
        topic.alreadyAdded
          ? "border-border-default bg-bg-secondary/30 opacity-60 cursor-not-allowed"
          : isSelected
            ? "border-primary bg-primary/5 cursor-pointer"
            : "border-border-default hover:border-border-focus/50 cursor-pointer",
      )}
    >
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg",
          topic.kind === "theory"
            ? "bg-primary/10 text-primary"
            : "bg-accent/10 text-accent",
        )}
      >
        {topic.kind === "theory" ? (
          <BookOpen className="size-4" />
        ) : (
          <Dumbbell className="size-4" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-text-primary truncate">
          {topic.title}
        </div>
        <div className="text-xs text-text-muted">
          {topic.kind === "theory" ? "Lý thuyết" : "Luyện tập"}
          {topic.lectureCount > 0 && ` · ${topic.lectureCount} bài học`}
        </div>
      </div>
      {topic.alreadyAdded ? (
        <span className="shrink-0 text-xs font-medium text-text-muted">
          Đã thêm
        </span>
      ) : (
        isSelected && (
          <Check className="size-4 shrink-0 text-primary" />
        )
      )}
    </button>
  );
}
