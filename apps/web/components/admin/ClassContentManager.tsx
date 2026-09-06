"use client";

import { useCallback, useMemo, useState, type CSSProperties } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { GripVertical, Plus, Trash2, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
} from "@/components/ui/ResponsiveDialog";
import type { ClassContentItemDto } from "@/dtos/class-content.dto";
import * as classApi from "@/lib/apis/class.api";

function SortableContentRow({
  item,
  canManage,
  onDelete,
}: {
  item: ClassContentItemDto;
  canManage: boolean;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="transition-colors hover:border-border-focus/50">
        <div className="flex items-center gap-3 p-3.5 sm:p-4">
          {canManage && (
            <button
              type="button"
              className="cursor-grab touch-none text-text-muted hover:text-text-primary p-1 -m-1"
              title="Kéo thả để đổi thứ tự"
              aria-label="Kéo thả để đổi thứ tự"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-5 w-5" />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-text-primary text-sm sm:text-base truncate">
                {item.title}
              </h3>
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                {item.source === "course" ? "Từ khoá" : "Riêng lớp"}
              </span>
              <span className="inline-flex items-center rounded-full bg-bg-secondary px-2 py-0.5 text-[11px] font-medium text-text-secondary">
                {item.kindLabel}
              </span>
              {item.chapterTitle && (
                <span className="text-xs text-text-muted">
                  {item.chapterTitle}
                </span>
              )}
              {item.lectureCount != null && item.lectureCount > 0 && (
                <span className="text-xs text-text-muted">
                  {item.lectureCount} bài học
                </span>
              )}
            </div>
          </div>
          {canManage && (
            <button
              onClick={() => onDelete(item.id)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-destructive/30 px-3 py-1.5 text-xs sm:text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors shrink-0"
            >
              <Trash2 className="size-3.5" />
              <span>Xóa</span>
            </button>
          )}
        </div>
      </Card>
    </div>
  );
}

export default function ClassContentManager({
  classId,
  canManage,
}: {
  classId: string;
  canManage: boolean;
}) {
  const queryClient = useQueryClient();
  const [localItems, setLocalItems] = useState<ClassContentItemDto[]>([]);
  const [hasOrderChanged, setHasOrderChanged] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const { data: serverData, isLoading } = useQuery<ClassContentItemDto[]>({
    queryKey: ["class-content", classId],
    queryFn: () => classApi.getClassContent(classId),
  });

  const allItems = useMemo(
    () => (localItems.length > 0 ? localItems : serverData ?? []),
    [localItems, serverData],
  );

  const reorderMutation = useMutation({
    mutationFn: (orderedIds: string[]) =>
      classApi.reorderClassContent(classId, orderedIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-content", classId] });
      setLocalItems([]);
      setHasOrderChanged(false);
      toast.success("Đã lưu thứ tự");
    },
    onError: () => {
      toast.error("Lỗi sắp xếp lại nội dung lớp");
      queryClient.invalidateQueries({ queryKey: ["class-content", classId] });
      setLocalItems([]);
      setHasOrderChanged(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (itemId: string) =>
      classApi.deleteClassContentItem(classId, itemId),
    onSuccess: (newData) => {
      queryClient.setQueryData(["class-content", classId], newData);
      setLocalItems([]);
      setHasOrderChanged(false);
      toast.success("Đã xóa nội dung");
    },
    onError: () => {
      toast.error("Xóa nội dung lớp thất bại");
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = allItems.findIndex((t) => t.id === active.id);
      const newIndex = allItems.findIndex((t) => t.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(allItems, oldIndex, newIndex);
      setLocalItems(reordered);
      setHasOrderChanged(true);
    },
    [allItems],
  );

  const handleSaveOrder = useCallback(() => {
    if (!hasOrderChanged || localItems.length === 0) return;
    reorderMutation.mutate(localItems.map((t) => t.id));
  }, [hasOrderChanged, localItems, reorderMutation]);

  const handleCancelOrder = useCallback(() => {
    setLocalItems([]);
    setHasOrderChanged(false);
  }, []);

  const handleDelete = useCallback(
    (itemId: string) => {
      if (confirm("Bạn có chắc xóa mục này?")) {
        deleteMutation.mutate(itemId);
      }
    },
    [deleteMutation],
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <>
      {canManage && (
        <div className="flex items-center justify-between mb-4">
          {hasOrderChanged ? (
            <div className="flex gap-2">
              <button
                onClick={handleCancelOrder}
                disabled={reorderMutation.isPending}
                className="cursor-pointer rounded-xl border border-border-default px-4 py-2.5 text-sm font-medium text-text-secondary hover:bg-bg-secondary disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveOrder}
                disabled={reorderMutation.isPending}
                className="cursor-pointer rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover disabled:opacity-50"
              >
                {reorderMutation.isPending ? "Đang lưu..." : "Lưu thứ tự"}
              </button>
            </div>
          ) : (
            <div />
          )}
          <button
            onClick={() => setAddOpen(true)}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-text-inverse shadow-xs transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <Plus className="size-4" />
            Thêm nội dung
          </button>
        </div>
      )}

      <div className="space-y-2.5">
        {allItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border-default bg-bg-secondary/20 p-8 text-center text-sm text-text-muted">
            Chưa có nội dung nào trong lớp học này.
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={allItems.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              {allItems.map((item) => (
                <SortableContentRow
                  key={item.id}
                  item={item}
                  canManage={canManage}
                  onDelete={handleDelete}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      {addOpen && (
        <AddContentDialog
          classId={classId}
          onClose={() => setAddOpen(false)}
          onSuccess={() => {
            setAddOpen(false);
            queryClient.invalidateQueries({
              queryKey: ["class-content", classId],
            });
          }}
        />
      )}
    </>
  );
}

function AddContentDialog({
  classId,
  onClose,
  onSuccess,
}: {
  classId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [title, setTitle] = useState("");
  const [topicId, setTopicId] = useState("");
  const [kind, setKind] = useState<"theory" | "practice">("theory");

  const createMutation = useMutation({
    mutationFn: () =>
      classApi.createClassContent(classId, {
        ...(mode === "existing" ? { topicId: topicId.trim() } : {}),
        ...(mode === "new" ? { title: title.trim(), kind } : {}),
      }),
    onSuccess: () => {
      toast.success("Đã thêm nội dung");
      onSuccess();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err?.response?.data?.message || "Lỗi thêm nội dung");
    },
  });

  const canSubmit =
    (mode === "existing" && topicId.trim()) ||
    (mode === "new" && title.trim());

  return (
    <ResponsiveDialog onBackdropClick={onClose} size="4xl">
      <ResponsiveDialogBody className="flex flex-col p-4 sm:p-6 max-h-[92vh] overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-border-default pb-4 shrink-0">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-text-primary">
              Thêm nội dung vào lớp
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Chọn chuyên đề có sẵn từ khoá hoặc tạo mới cho lớp.
            </p>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-text-muted hover:bg-bg-secondary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            aria-label="Đóng"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-4 pr-1 [scrollbar-width:thin] space-y-4">
          {/* Mode toggle */}
          <div className="inline-flex items-center gap-1 rounded-xl border border-border-default bg-bg-surface p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setMode("new")}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                mode === "new"
                  ? "bg-primary text-text-inverse shadow-xs"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              Tạo mới cho lớp
            </button>
            <button
              type="button"
              onClick={() => setMode("existing")}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                mode === "existing"
                  ? "bg-primary text-text-inverse shadow-xs"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              Thêm từ khoá
            </button>
          </div>

          {mode === "new" ? (
            <>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Tiêu đề <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-border-default bg-bg-surface px-4 py-2.5 text-sm text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus font-medium"
                  placeholder="Ví dụ: Chuyên đề bổ trợ Phương trình bậc 2..."
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Loại chuyên đề
                </label>
                <div className="mt-1.5 inline-flex items-center gap-1 rounded-xl border border-border-default bg-bg-surface p-1 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setKind("theory")}
                    className={`inline-flex cursor-pointer items-center rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                      kind === "theory"
                        ? "bg-primary text-text-inverse shadow-xs"
                        : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    Lý thuyết
                  </button>
                  <button
                    type="button"
                    onClick={() => setKind("practice")}
                    className={`inline-flex cursor-pointer items-center rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                      kind === "practice"
                        ? "bg-primary text-text-inverse shadow-xs"
                        : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    Luyện tập
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                ID Chuyên đề <span className="text-error">*</span>
              </label>
              <p className="text-xs text-text-muted mt-0.5">
                Dán ID chuyên đề có sẵn từ khoá học để thêm vào lớp.
              </p>
              <input
                type="text"
                value={topicId}
                onChange={(e) => setTopicId(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border-default bg-bg-surface px-4 py-2.5 text-sm text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus font-medium"
                placeholder="UUID của chuyên đề..."
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border-default shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-xl border border-border-default px-4 py-2.5 text-sm font-medium text-text-secondary hover:bg-bg-secondary transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() => createMutation.mutate()}
            disabled={!canSubmit || createMutation.isPending}
            className="cursor-pointer rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-text-inverse transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60 shadow-xs"
          >
            {createMutation.isPending ? "Đang thêm..." : "Thêm nội dung"}
          </button>
        </div>
      </ResponsiveDialogBody>
    </ResponsiveDialog>
  );
}
