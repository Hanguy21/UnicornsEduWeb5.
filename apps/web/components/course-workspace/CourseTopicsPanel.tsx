"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as classApi from "@/lib/apis/class.api";
import { courseKeys } from "@/lib/query-keys";
import { invalidateCoursePracticeTopicQueries } from "@/lib/query-invalidation";
import { Skeleton } from "@/components/ui/skeleton";
import {
  confirmOrderDirtyLeave,
  useConfirmDialog,
} from "@/components/ui/ConfirmDialog";
import type { Topic } from "@/dtos/topic.dto";
import { RowActionsMenu } from "@/components/course-workspace/RowActionsMenu";
import {
  OrderSaveBar,
  SortableOrderList,
  SortableRow,
  useOrderDraft,
} from "@/components/course-workspace/SortableOrderList";

function topicMeta(topic: Topic): string {
  if (topic.kind === "theory") {
    const n = topic.lectureCount ?? 0;
    return `${n} bài học`;
  }
  const n = topic.questionCount ?? 0;
  return `${n} câu hỏi`;
}

export function CourseTopicsPanel({
  courseId,
  chapterId,
  canEdit,
  onBack,
  onOpenTopic,
  onCreateTopic,
  onOrderDirtyChange,
}: {
  courseId: string;
  chapterId: string;
  canEdit: boolean;
  onBack: () => void;
  onOpenTopic: (topic: Topic) => void;
  onCreateTopic: () => void;
  onOrderDirtyChange?: (dirty: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { confirm, dialog } = useConfirmDialog();

  const { data: chapter, isLoading: chapterLoading } = useQuery({
    queryKey: courseKeys.chapter(courseId, chapterId),
    queryFn: () => classApi.getChapter(courseId, chapterId),
    enabled: Boolean(courseId && chapterId),
  });

  const { data: topics = [], isLoading: topicsLoading } = useQuery({
    queryKey: courseKeys.topics(courseId, chapterId),
    queryFn: () => classApi.getTopicsByChapter(courseId, chapterId),
    enabled: Boolean(courseId && chapterId),
  });

  const { items, orderDirty, applyDrag, discard } = useOrderDraft(
    topics,
    `${courseId}:${chapterId}`,
  );

  useEffect(() => {
    onOrderDirtyChange?.(orderDirty);
    return () => onOrderDirtyChange?.(false);
  }, [orderDirty, onOrderDirtyChange]);

  const invalidate = () => invalidateCoursePracticeTopicQueries(queryClient, courseId);

  const deleteMutation = useMutation({
    mutationFn: (topicId: string) =>
      classApi.deleteTopic(courseId, chapterId, topicId),
    onSuccess: () => {
      toast.success("Đã xoá chuyên đề.");
      discard();
      void invalidate();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err?.response?.data?.message || "Không thể xoá chuyên đề.");
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (topicIds: string[]) =>
      classApi.reorderTopics(courseId, chapterId, topicIds),
    onSuccess: () => {
      toast.success("Đã lưu thứ tự chuyên đề.");
      discard();
      void invalidate();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err?.response?.data?.message || "Không thể sắp xếp chuyên đề.");
    },
  });

  const goBack = async () => {
    if (!(await confirmOrderDirtyLeave(confirm, orderDirty))) return;
    discard();
    onBack();
  };

  const openTopic = async (topic: Topic) => {
    if (!(await confirmOrderDirtyLeave(confirm, orderDirty))) return;
    discard();
    onOpenTopic(topic);
  };

  const createTopic = async () => {
    if (!(await confirmOrderDirtyLeave(confirm, orderDirty))) return;
    discard();
    onCreateTopic();
  };

  const requestDelete = async (topic: Topic) => {
    const ok = await confirm({
      title: "Xoá chuyên đề?",
      description: `Xoá chuyên đề "${topic.title}"? Không xoá được nếu lớp đang dùng nội dung này.`,
      confirmLabel: "Xoá",
      variant: "destructive",
    });
    if (!ok) return;
    deleteMutation.mutate(topic.id);
  };

  const isLoading = chapterLoading || topicsLoading;
  const canReorder = canEdit && items.length > 1;

  if (isLoading) {
    return (
      <section className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm sm:p-5">
        <Skeleton className="h-5 w-40" />
        <div className="mt-4 space-y-2" role="status" aria-label="Đang tải chuyên đề">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      </section>
    );
  }

  if (!chapter) {
    return (
      <section className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm sm:p-5">
        <p className="text-sm text-error">Không tìm thấy chủ đề.</p>
        <button
          type="button"
          onClick={onBack}
          className="mt-3 text-sm text-primary underline"
        >
          Quay lại danh sách chủ đề
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border-default bg-bg-surface p-3 shadow-sm sm:p-5">
      <button
        type="button"
        onClick={() => void goBack()}
        className="mb-2 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
      >
        <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Chủ đề
      </button>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-text-primary">{chapter.title}</h2>
          <p className="mt-0.5 text-sm text-text-secondary">
            Bấm một chuyên đề để soạn. Kéo tay cầm để đổi thứ tự.
          </p>
        </div>
        {canEdit ? (
          <button
            type="button"
            onClick={() => void createTopic()}
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-text-inverse hover:bg-primary-hover sm:min-h-10"
          >
            Thêm chuyên đề
          </button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-border-default p-4 text-sm text-text-secondary">
          Chủ đề này chưa có chuyên đề. Thêm chuyên đề lý thuyết (bài học) hoặc luyện tập (câu hỏi).
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          <SortableOrderList items={items} canReorder={canReorder} onReorder={applyDrag}>
            {(topic) => {
              const kindLabel = topic.kind === "theory" ? "Lý thuyết" : "Luyện tập";
              const kindClass =
                topic.kind === "theory"
                  ? "bg-blue-50 text-blue-700"
                  : "bg-amber-50 text-amber-700";
              return (
                <SortableRow
                  id={topic.id}
                  canReorder={canReorder}
                  rowLabel={`Mở chuyên đề ${topic.title}`}
                  onRowClick={() => void openTopic(topic)}
                  menu={
                    canEdit ? (
                      <RowActionsMenu
                        label={`Thao tác chuyên đề ${topic.title}`}
                        actions={[
                          {
                            label: "Xoá",
                            variant: "danger",
                            onSelect: () => void requestDelete(topic),
                          },
                        ]}
                      />
                    ) : null
                  }
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium text-text-primary">
                        {topic.title}
                      </p>
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${kindClass}`}
                      >
                        {kindLabel}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted">{topicMeta(topic)}</p>
                  </div>
                  <svg
                    className="size-4 shrink-0 text-text-muted"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </SortableRow>
              );
            }}
          </SortableOrderList>
          {canEdit ? (
            <OrderSaveBar
              dirty={orderDirty}
              saving={reorderMutation.isPending}
              onSave={() => {
                if (!orderDirty || reorderMutation.isPending) return;
                reorderMutation.mutate(items.map((row) => row.id));
              }}
              onDiscard={discard}
            />
          ) : null}
        </div>
      )}
      {dialog}
    </section>
  );
}
