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
import { GripVertical, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
                <span className="text-xs text-text-muted">{item.chapterTitle}</span>
              )}
              {item.lectureCount != null && item.lectureCount > 0 && (
                <span className="text-xs text-text-muted">{item.lectureCount} bài học</span>
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

  const { data: serverData, isLoading } = useQuery<ClassContentItemDto[]>({
    queryKey: ["class-content", classId],
    queryFn: () => classApi.getClassContent(classId) as Promise<ClassContentItemDto[]>,
  });

  const allItems = useMemo(
    () => (localItems.length > 0 ? localItems : serverData ?? []),
    [localItems, serverData],
  );

  const reorderMutation = useMutation({
    mutationFn: (orderedIds: string[]) => classApi.reorderClassContent(classId, orderedIds),
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
    mutationFn: (itemId: string) => classApi.deleteClassContentItem(classId, itemId),
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
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
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
      {canManage && hasOrderChanged && (
        <div className="flex gap-2 mb-4">
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
    </>
  );
}
