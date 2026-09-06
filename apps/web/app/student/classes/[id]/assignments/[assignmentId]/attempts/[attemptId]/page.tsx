"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Send } from "lucide-react";
import { toast } from "sonner";
import {
  getAttempt,
  saveAttemptAnswers,
  submitAttempt,
} from "@/lib/apis/attempt.api";
import type { AttemptQuestionDto } from "@/dtos/attempt.dto";
import { Skeleton } from "@/components/ui/skeleton";
import StudentAttemptTimer from "@/components/student/StudentAttemptTimer";
import StudentAttemptQuestion from "@/components/student/StudentAttemptQuestion";

export default function StudentAttemptPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const classId = params.id as string;
  const assignmentId = params.assignmentId as string;
  const attemptId = params.attemptId as string;
  const autoSubmitted = useRef(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["attempt", classId, attemptId],
    queryFn: () => getAttempt(classId, attemptId),
    refetchInterval: (q) =>
      q.state.data?.status === "in_progress" ? 15_000 : false,
  });

  const [draft, setDraft] = useState<AttemptQuestionDto[] | null>(null);

  const saveMutation = useMutation({
    mutationFn: (questions: AttemptQuestionDto[]) =>
      saveAttemptAnswers(classId, attemptId, {
        answers: questions.map((q) => ({
          questionId: q.questionId,
          choiceIndex: q.choiceIndex,
          essayAnswer: q.essayAnswer,
        })),
      }),
    onSuccess: (next) => {
      queryClient.setQueryData(["attempt", classId, attemptId], next);
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (draft) {
        await saveAttemptAnswers(classId, attemptId, {
          answers: draft.map((q) => ({
            questionId: q.questionId,
            choiceIndex: q.choiceIndex,
            essayAnswer: q.essayAnswer,
          })),
        });
      }
      return submitAttempt(classId, attemptId);
    },
    onSuccess: (next) => {
      queryClient.setQueryData(["attempt", classId, attemptId], next);
      queryClient.invalidateQueries({
        queryKey: ["assignment-lobby", classId, assignmentId],
      });
      if (next.status === "timed_out") {
        toast.success("Hết giờ — bài đã được chốt và chấm phần trắc nghiệm.");
      } else {
        toast.success("Đã nộp bài.");
      }
    },
    onError: () => toast.error("Không nộp được bài. Thử lại."),
  });

  const handleExpire = useCallback(() => {
    if (autoSubmitted.current) return;
    autoSubmitted.current = true;
    submitMutation.mutate(undefined, {
      onError: () => {
        autoSubmitted.current = false;
      },
    });
  }, [submitMutation]);

  const saveTimer = useRef<number | null>(null);
  const queueSave = (questions: AttemptQuestionDto[]) => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      saveMutation.mutate(questions);
    }, 600);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-14 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !data) {
    const message =
      (error as { response?: { data?: { message?: string } } })?.response?.data
        ?.message ?? "Không tải được bài làm.";
    return (
      <div className="space-y-4">
        <Link
          href={`/student/classes/${classId}/assignments/${assignmentId}`}
          className="inline-flex items-center gap-1 text-sm text-text-muted"
        >
          <ChevronLeft className="size-4" />
          Quay lại
        </Link>
        <p className="rounded-2xl border border-error/30 bg-error/10 p-5 text-sm">
          {message}
        </p>
      </div>
    );
  }

  const closed = data.status !== "in_progress";
  const questions = closed || !draft ? data.questions : draft;
  const lobbyHref = `/student/classes/${classId}/assignments/${assignmentId}`;

  return (
    <div className="space-y-4 pb-24">
      <Link
        href={lobbyHref}
        className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-primary"
      >
        <ChevronLeft className="size-4" />
        {data.title}
      </Link>

      {!closed && (
        <StudentAttemptTimer endsAt={data.endsAt} onExpire={handleExpire} />
      )}

      {closed && (
        <div className="rounded-2xl border border-border-default bg-bg-surface p-4">
          <p className="text-sm font-semibold text-text-primary">
            {data.status === "timed_out" ? "Hết giờ — đã chốt bài" : "Đã nộp"}
          </p>
          <p className="mt-1 text-sm text-text-muted">
            Trắc nghiệm: {data.autoGradedScore ?? 0}/{data.autoGradedMax ?? 0}
            {data.hasUngradedEssay ? " · Có câu tự luận chờ chấm" : ""}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {questions.map((q, idx) => (
          <StudentAttemptQuestion
            key={q.questionId}
            question={q}
            index={idx}
            disabled={closed}
            reveal={closed}
            onChange={(val) => {
              const next = questions.map((item) =>
                item.questionId === q.questionId ? { ...item, ...val } : item,
              );
              setDraft(next);
              queueSave(next);
            }}
          />
        ))}
      </div>

      {!closed && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border-default bg-bg-surface/95 p-3 sm:static sm:border-0 sm:bg-transparent sm:p-0">
          <button
            type="button"
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-text-inverse sm:w-auto"
          >
            <Send className="size-4" />
            Nộp bài
          </button>
        </div>
      )}

      {closed && (
        <button
          type="button"
          onClick={() => router.push(lobbyHref)}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border-default px-4 text-sm font-medium"
        >
          Về lần giao
        </button>
      )}
    </div>
  );
}
