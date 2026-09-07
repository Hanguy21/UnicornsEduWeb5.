"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import {
  answersSignature,
  formatSavedAt,
  unansweredQuestionNumbers,
} from "@/lib/attempt-autosave.helpers";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveActionFooter,
  ResponsiveDialog,
  ResponsiveDialogBody,
} from "@/components/ui/ResponsiveDialog";
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
  const saveTimer = useRef<number | null>(null);
  const [draft, setDraft] = useState<AttemptQuestionDto[] | null>(null);
  const [saveQueued, setSaveQueued] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [lastSavedSignature, setLastSavedSignature] = useState<string | null>(
    null,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["attempt", classId, attemptId],
    queryFn: () => getAttempt(classId, attemptId),
    refetchInterval: (q) =>
      q.state.data?.status === "in_progress" ? 15_000 : false,
  });

  const saveMutation = useMutation({
    mutationFn: (questions: AttemptQuestionDto[]) =>
      saveAttemptAnswers(classId, attemptId, {
        answers: questions.map((q) => ({
          questionId: q.questionId,
          choiceIndex: q.choiceIndex,
          essayAnswer: q.essayAnswer,
        })),
      }),
    onSuccess: (next, questions) => {
      queryClient.setQueryData(["attempt", classId, attemptId], next);
      setLastSavedAt(new Date());
      setLastSavedSignature(answersSignature(questions));
    },
    onError: () => {
      toast.error("Không lưu được bài. Kiểm tra mạng rồi thử lại.");
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
    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
      setSaveQueued(false);
    }
    submitMutation.mutate(undefined, {
      onError: () => {
        autoSubmitted.current = false;
      },
    });
  }, [submitMutation]);

  const queueSave = (questions: AttemptQuestionDto[]) => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    setSaveQueued(true);
    saveTimer.current = window.setTimeout(() => {
      setSaveQueued(false);
      saveTimer.current = null;
      saveMutation.mutate(questions);
    }, 600);
  };

  const retrySave = (questions: AttemptQuestionDto[]) => {
    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
      setSaveQueued(false);
    }
    saveMutation.mutate(questions);
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
  const baselineSignature =
    lastSavedSignature ?? answersSignature(data.questions);
  const isDirty = answersSignature(questions) !== baselineSignature;
  const hasUnsaved =
    !closed &&
    (saveQueued || saveMutation.isPending || saveMutation.isError || isDirty);
  const unanswered = unansweredQuestionNumbers(questions);

  return (
    <StudentAttemptInProgress
      closed={closed}
      confirmOpen={confirmOpen}
      dataTitle={data.title}
      dataStatus={data.status}
      autoGradedScore={data.autoGradedScore}
      autoGradedMax={data.autoGradedMax}
      hasUngradedEssay={data.hasUngradedEssay}
      endsAt={data.endsAt}
      questions={questions}
      lobbyHref={lobbyHref}
      hasUnsaved={hasUnsaved}
      lastSavedAt={lastSavedAt}
      unanswered={unanswered}
      savePending={saveMutation.isPending}
      saveQueued={saveQueued}
      saveError={saveMutation.isError}
      submitPending={submitMutation.isPending}
      onExpire={handleExpire}
      onChangeQuestion={(questionId, val) => {
        const next = questions.map((item) =>
          item.questionId === questionId ? { ...item, ...val } : item,
        );
        setDraft(next);
        queueSave(next);
      }}
      onRetrySave={() => retrySave(questions)}
      onRequestSubmit={async () => {
        if (saveTimer.current) {
          window.clearTimeout(saveTimer.current);
          saveTimer.current = null;
          setSaveQueued(false);
        }
        if (saveMutation.isError || isDirty || saveMutation.isPending) {
          try {
            await saveMutation.mutateAsync(questions);
          } catch {
            toast.error("Chưa lưu được bài. Thử lại trước khi nộp.");
            return;
          }
        }
        setConfirmOpen(true);
      }}
      onCancelConfirm={() => setConfirmOpen(false)}
      onConfirmSubmit={() => {
        setConfirmOpen(false);
        submitMutation.mutate();
      }}
      onGoLobby={() => router.push(lobbyHref)}
    />
  );
}

function StudentAttemptInProgress({
  closed,
  confirmOpen,
  dataTitle,
  dataStatus,
  autoGradedScore,
  autoGradedMax,
  hasUngradedEssay,
  endsAt,
  questions,
  lobbyHref,
  hasUnsaved,
  lastSavedAt,
  unanswered,
  savePending,
  saveQueued,
  saveError,
  submitPending,
  onExpire,
  onChangeQuestion,
  onRetrySave,
  onRequestSubmit,
  onCancelConfirm,
  onConfirmSubmit,
  onGoLobby,
}: {
  closed: boolean;
  confirmOpen: boolean;
  dataTitle: string;
  dataStatus: string;
  autoGradedScore: number | null;
  autoGradedMax: number | null;
  hasUngradedEssay: boolean;
  endsAt: string;
  questions: AttemptQuestionDto[];
  lobbyHref: string;
  hasUnsaved: boolean;
  lastSavedAt: Date | null;
  unanswered: number[];
  savePending: boolean;
  saveQueued: boolean;
  saveError: boolean;
  submitPending: boolean;
  onExpire: () => void;
  onChangeQuestion: (
    questionId: string,
    val: { choiceIndex?: number | null; essayAnswer?: string | null },
  ) => void;
  onRetrySave: () => void;
  onRequestSubmit: () => void | Promise<void>;
  onCancelConfirm: () => void;
  onConfirmSubmit: () => void;
  onGoLobby: () => void;
}) {
  useEffect(() => {
    if (closed || !hasUnsaved) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [closed, hasUnsaved]);

  const saveLabel =
    savePending || saveQueued
      ? "Đang lưu…"
      : saveError
        ? "Lưu lỗi — thử lại"
        : lastSavedAt
          ? `Đã lưu lúc ${formatSavedAt(lastSavedAt)}`
          : null;

  return (
    <div className="space-y-4 pb-24">
      <Link
        href={lobbyHref}
        className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-primary"
      >
        <ChevronLeft className="size-4" />
        {dataTitle}
      </Link>

      {!closed && (
        <StudentAttemptTimer endsAt={endsAt} onExpire={onExpire} />
      )}

      {saveLabel ? (
        <p className="text-xs text-text-muted" aria-live="polite">
          {saveError ? (
            <button
              type="button"
              onClick={onRetrySave}
              className="font-medium text-error underline-offset-2 hover:underline"
            >
              {saveLabel}
            </button>
          ) : (
            saveLabel
          )}
        </p>
      ) : null}

      {closed && (
        <div className="rounded-2xl border border-border-default bg-bg-surface p-4">
          <p className="text-sm font-semibold text-text-primary">
            {dataStatus === "timed_out" ? "Hết giờ — đã chốt bài" : "Đã nộp"}
          </p>
          <p className="mt-1 text-sm text-text-muted">
            Trắc nghiệm: {autoGradedScore ?? 0}/{autoGradedMax ?? 0}
            {hasUngradedEssay ? " · Có câu tự luận chờ chấm" : ""}
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
            onChange={(val) => onChangeQuestion(q.questionId, val)}
          />
        ))}
      </div>

      {!closed && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border-default bg-bg-surface/95 p-3 sm:static sm:border-0 sm:bg-transparent sm:p-0">
          <button
            type="button"
            onClick={() => void onRequestSubmit()}
            disabled={submitPending || savePending}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-text-inverse sm:w-auto disabled:opacity-60"
          >
            <Send className="size-4" />
            {submitPending ? "Đang nộp…" : "Nộp bài"}
          </button>
        </div>
      )}

      {closed && (
        <button
          type="button"
          onClick={onGoLobby}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border-default px-4 text-sm font-medium"
        >
          Về lần giao
        </button>
      )}

      {confirmOpen ? (
        <ResponsiveDialog
          size="sm"
          labelledBy="submit-attempt-title"
          onBackdropClick={onCancelConfirm}
        >
          <ResponsiveDialogBody>
            <h2
              id="submit-attempt-title"
              className="text-base font-semibold text-text-primary"
            >
              Nộp bài?
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              {unanswered.length > 0
                ? `Còn ${unanswered.length} câu chưa trả lời (câu ${unanswered.join(", ")}). Bạn vẫn có thể nộp.`
                : "Bạn đã trả lời hết các câu."}
            </p>
          </ResponsiveDialogBody>
          <ResponsiveActionFooter>
            <button
              type="button"
              onClick={onCancelConfirm}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border-default px-4 text-sm font-medium text-text-secondary"
            >
              Ở lại làm bài
            </button>
            <button
              type="button"
              onClick={onConfirmSubmit}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-text-inverse"
            >
              Nộp bài
            </button>
          </ResponsiveActionFooter>
        </ResponsiveDialog>
      ) : null}
    </div>
  );
}
