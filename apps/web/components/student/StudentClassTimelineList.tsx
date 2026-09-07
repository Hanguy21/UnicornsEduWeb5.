"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Lock } from "lucide-react";
import { getStudentClassTimeline } from "@/lib/apis/class.api";
import { classTimelineKeys } from "@/lib/query-keys";
import type { ClassTimelineItemDto } from "@/dtos/class-timeline.dto";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import StudentSessionDetailDialog from "./StudentSessionDetailDialog";
import StudentSurveyDetailDialog from "./StudentSurveyDetailDialog";
import type { StudentSessionItem, StudentSurveyItem } from "@/dtos/student-class.dto";

function mapSession(item: ClassTimelineItemDto): StudentSessionItem | null {
  if (item.kind !== "session" || !item.session) return null;
  return {
    id: item.session.id,
    teacherId: "",
    classId: "",
    date: new Date(item.session.date),
    startTime: item.session.startTime,
    endTime: item.session.endTime,
    lessonContent: item.session.lessonContent,
    homework: item.session.homework,
    tutorial: item.session.tutorial,
    recordingUrl: item.session.recordingUrl,
    coefficient: 1,
    attendance: item.session.myAttendanceStatus
      ? [
          {
            id: "me",
            studentId: "me",
            status: item.session.myAttendanceStatus,
            notes: item.session.myAttendanceNotes,
          },
        ]
      : [],
    teacher: {
      id: "",
      user: {
        first_name: item.session.teacherName,
        last_name: null,
      },
    },
  };
}

function mapSurvey(item: ClassTimelineItemDto): StudentSurveyItem | null {
  if (item.kind !== "class_survey" || !item.survey) return null;
  return {
    id: item.survey.id,
    classId: null,
    surveyId: null,
    teacherId: null,
    reportDate: new Date(item.survey.reportDate),
    knowledgeAssessment: null,
    survey: {
      id: item.survey.id,
      name: item.survey.surveyName,
      startDate: item.survey.startDate ? new Date(item.survey.startDate) : null,
      endDate: item.survey.endDate ? new Date(item.survey.endDate) : null,
    },
    studentAssessments: [],
  };
}

export default function StudentClassTimelineList({ classId }: { classId: string }) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<ClassTimelineItemDto | null>(null);

  const query = useInfiniteQuery({
    queryKey: classTimelineKeys.student(classId),
    queryFn: ({ pageParam }) =>
      getStudentClassTimeline(classId, {
        cursor: pageParam,
        limit: 20,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const items = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
  );

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !query.hasNextPage || query.isFetchingNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void query.fetchNextPage();
        }
      },
      { rootMargin: "240px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [query.hasNextPage, query.isFetchingNextPage, query.fetchNextPage]);

  if (query.isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="rounded-xl border border-dashed border-border-default bg-bg-secondary/20 p-8 text-center text-sm text-text-muted">
        Chưa có nội dung trên timeline lớp.
      </div>
    );
  }

  const session = selected ? mapSession(selected) : null;
  const survey = selected ? mapSurvey(selected) : null;

  return (
    <>
      <div className="space-y-3">
        {items.map((item, index) => {
          const locked =
            item.kind === "content_item" &&
            item.topicKind === "practice" &&
            item.isOpen === false;
          const href =
            item.kind === "content_item" && item.classContentItemId && item.topicId
              ? item.topicKind === "practice"
                ? `/student/classes/${classId}/assignments/${item.classContentItemId}`
                : `/student/classes/${classId}/topics/${item.topicId}`
              : null;

          const inner = (
            <>
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                {index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate font-semibold text-text-primary">
                    {item.title}
                  </h3>
                  <Badge variant="secondary">{item.kindLabel}</Badge>
                  {locked ? <Lock className="size-3.5 text-text-muted" /> : null}
                </div>
              </div>
            </>
          );

          if (href && !locked) {
            return (
              <Link
                key={item.id}
                href={href}
                className="flex items-center gap-3 rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm hover:border-primary/40"
              >
                {inner}
              </Link>
            );
          }

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (item.kind === "session" || item.kind === "class_survey") {
                  setSelected(item);
                }
              }}
              className="flex w-full items-center gap-3 rounded-xl border border-border-default bg-bg-surface p-4 text-left shadow-sm hover:border-primary/40"
            >
              {inner}
            </button>
          );
        })}
        <div ref={sentinelRef} />
        {query.isFetchingNextPage ? (
          <p className="text-center text-xs text-text-muted">Đang tải thêm…</p>
        ) : null}
      </div>
      {session ? (
        <StudentSessionDetailDialog
          session={session}
          onClose={() => setSelected(null)}
        />
      ) : null}
      {survey ? (
        <StudentSurveyDetailDialog
          survey={survey}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </>
  );
}
