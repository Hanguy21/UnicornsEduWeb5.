"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
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
import {
  GripVertical,
  Plus,
  Trash2,
  X,
  Clock,
  PenLine,
  BarChart3,
  RotateCcw,
} from "lucide-react";
import { classTimelineKeys } from "@/lib/query-keys";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
} from "@/components/ui/ResponsiveDialog";
import type { ClassContentItemDto } from "@/dtos/class-content.dto";
import type { CourseTopicForClassDto } from "@/dtos/topic.dto";
import type { ClassQuestionDraft } from "@/dtos/class-topic-question.dto";
import * as classApi from "@/lib/apis/class.api";
import * as questionApi from "@/lib/apis/question.api";
import CourseTopicPicker from "./CourseTopicPicker";
import {
  AssignmentScheduleFields,
  defaultAssignmentSchedule,
  fromOpenAtIso,
  toOpenAtIso,
} from "./AssignmentScheduleFields";
import ClassPracticeQuestionComposer from "./ClassPracticeQuestionComposer";

function formatOpenAt(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

function SortableContentRow({
  item,
  classId,
  canManage,
  onHide,
  onRestore,
  onEditSchedule,
}: {
  item: ClassContentItemDto;
  classId: string;
  canManage: boolean;
  onHide: (id: string) => void;
  onRestore: (id: string) => void;
  onEditSchedule: (item: ClassContentItemDto) => void;
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
      <Card className={`transition-colors hover:border-border-focus/50 ${item.hiddenAt ? "opacity-70" : ""}`}>
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
              {item.hiddenAt ? (
                <span className="inline-flex items-center rounded-full bg-error/10 px-2 py-0.5 text-[11px] font-medium text-error">
                  Đã ẩn
                </span>
              ) : null}
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
            {item.topicKind === "practice" && (
              <p className="mt-1 text-xs text-text-muted">
                {item.openAt
                  ? `Mở ${formatOpenAt(item.openAt)} · ${item.durationMinutes ?? "—"} phút`
                  : "Chưa đặt thời điểm mở"}
              </p>
            )}
          </div>
          {canManage && (
            <div className="flex shrink-0 items-center gap-1.5">
              {item.topicKind === "practice" && (
                <>
                  <Link
                    href={`/staff/classes/${classId}/practice/${item.id}/stats`}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border-default px-3 py-1.5 text-xs sm:text-sm font-medium text-text-secondary hover:bg-bg-secondary transition-colors"
                  >
                    <BarChart3 className="size-3.5" />
                    <span className="hidden sm:inline">Thống kê</span>
                  </Link>
                  <Link
                    href={`/staff/classes/${classId}/grading/${item.id}`}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border-default px-3 py-1.5 text-xs sm:text-sm font-medium text-text-secondary hover:bg-bg-secondary transition-colors"
                  >
                    <PenLine className="size-3.5" />
                    <span className="hidden sm:inline">Chấm tự luận</span>
                  </Link>
                </>
              )}
              {item.topicKind === "practice" && (
                <button
                  type="button"
                  onClick={() => onEditSchedule(item)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border-default px-3 py-1.5 text-xs sm:text-sm font-medium text-text-secondary hover:bg-bg-secondary transition-colors"
                >
                  <Clock className="size-3.5" />
                  <span className="hidden xs:inline sm:inline">Lịch giao</span>
                </button>
              )}
              {item.hiddenAt ? (
                <button
                  type="button"
                  onClick={() => onRestore(item.id)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border-default px-3 py-1.5 text-xs sm:text-sm font-medium text-text-secondary hover:bg-bg-secondary transition-colors"
                >
                  <RotateCcw className="size-3.5" />
                  <span>Khôi phục</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onHide(item.id)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-destructive/30 px-3 py-1.5 text-xs sm:text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="size-3.5" />
                  <span>Ẩn</span>
                </button>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

export default function ClassContentManager({
  classId,
  canManage,
  addOnly = false,
  addOpen: addOpenProp,
  onAddOpenChange,
  onChanged,
  autoOpenContentItemId = null,
  autoOpenToken = 0,
}: {
  classId: string;
  canManage: boolean;
  addOnly?: boolean;
  addOpen?: boolean;
  onAddOpenChange?: (open: boolean) => void;
  onChanged?: () => void;
  autoOpenContentItemId?: string | null;
  autoOpenToken?: number;
}) {
  const queryClient = useQueryClient();
  const [localItems, setLocalItems] = useState<ClassContentItemDto[]>([]);
  const [hasOrderChanged, setHasOrderChanged] = useState(false);
  const [uncontrolledAddOpen, setUncontrolledAddOpen] = useState(false);
  const addOpen = addOpenProp ?? uncontrolledAddOpen;
  const setAddOpen = onAddOpenChange ?? setUncontrolledAddOpen;
  const [scheduleItem, setScheduleItem] = useState<ClassContentItemDto | null>(
    null,
  );
  const [viewItem, setViewItem] = useState<ClassContentItemDto | null>(null);

  const { data: serverData, isLoading } = useQuery<ClassContentItemDto[]>({
    queryKey: ["class-content", classId],
    queryFn: () => classApi.getClassContent(classId),
  });

  useEffect(() => {
    if (!autoOpenContentItemId || !serverData) return;
    const item = serverData.find((row) => row.id === autoOpenContentItemId);
    if (!item) return;
    if (canManage && item.topicKind === "practice") {
      setViewItem(null);
      setScheduleItem(item);
      return;
    }
    setScheduleItem(null);
    setViewItem(item);
  }, [autoOpenContentItemId, autoOpenToken, canManage, serverData]);

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
      onChanged?.();
    },
    onError: () => {
      toast.error("Lỗi sắp xếp lại chuyên đề");
      queryClient.invalidateQueries({ queryKey: ["class-content", classId] });
      setLocalItems([]);
      setHasOrderChanged(false);
    },
  });

  const hideMutation = useMutation({
    mutationFn: (itemId: string) =>
      classApi.deleteClassContentItem(classId, itemId),
    onSuccess: (newData) => {
      queryClient.setQueryData(["class-content", classId], newData);
      void queryClient.invalidateQueries({ queryKey: classTimelineKeys.list(classId) });
      setLocalItems([]);
      setHasOrderChanged(false);
      toast.success("Đã ẩn khỏi học sinh");
      onChanged?.();
    },
    onError: () => {
      toast.error("Ẩn chuyên đề thất bại");
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (itemId: string) =>
      classApi.restoreClassContentItem(classId, itemId),
    onSuccess: (newData) => {
      queryClient.setQueryData(["class-content", classId], newData);
      void queryClient.invalidateQueries({ queryKey: classTimelineKeys.list(classId) });
      setLocalItems([]);
      setHasOrderChanged(false);
      toast.success("Đã khôi phục");
      onChanged?.();
    },
    onError: () => {
      toast.error("Khôi phục thất bại");
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

  const handleHide = useCallback(
    (itemId: string) => {
      if (
        confirm(
          "Ẩn mục này khỏi học sinh? Dữ liệu và bài làm vẫn được giữ để tra cứu.",
        )
      ) {
        hideMutation.mutate(itemId);
      }
    },
    [hideMutation],
  );

  const handleRestore = useCallback(
    (itemId: string) => {
      restoreMutation.mutate(itemId);
    },
    [restoreMutation],
  );

  if (isLoading && !addOnly) {
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
      {!addOnly && canManage && (
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
            Thêm chuyên đề
          </button>
        </div>
      )}

      {!addOnly && (
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
                  classId={classId}
                  canManage={canManage}
                  onHide={handleHide}
                  onRestore={handleRestore}
                  onEditSchedule={setScheduleItem}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
      )}

      {addOpen && (
        <AddContentDialog
          classId={classId}
          onClose={() => setAddOpen(false)}
          onSuccess={() => {
            setAddOpen(false);
            queryClient.invalidateQueries({
              queryKey: ["class-content", classId],
            });
            onChanged?.();
          }}
        />
      )}

      {scheduleItem && (
        <EditScheduleDialog
          classId={classId}
          item={scheduleItem}
          onClose={() => setScheduleItem(null)}
          onSuccess={() => {
            setScheduleItem(null);
            queryClient.invalidateQueries({
              queryKey: ["class-content", classId],
            });
            onChanged?.();
          }}
        />
      )}

      {viewItem && (
        <ViewContentDialog
          classId={classId}
          item={viewItem}
          canManage={canManage}
          onClose={() => setViewItem(null)}
          onEditSchedule={() => {
            setViewItem(null);
            setScheduleItem(viewItem);
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
  const queryClient = useQueryClient();
  const [modeTouched, setModeTouched] = useState(false);
  const [userMode, setUserMode] = useState<"new" | "existing">("existing");
  const [title, setTitle] = useState("");
  const [topicId, setTopicId] = useState("");
  const [kind, setKind] = useState<"theory" | "practice">("theory");
  const [existingKind, setExistingKind] = useState<"theory" | "practice">(
    "theory",
  );
  const [step, setStep] = useState<"pick" | "schedule">("pick");
  const defaults = defaultAssignmentSchedule();
  const [openDate, setOpenDate] = useState(defaults.openDate);
  const [openTime, setOpenTime] = useState(defaults.openTime);
  const [durationMinutes, setDurationMinutes] = useState(
    defaults.durationMinutes,
  );
  const [drafts, setDrafts] = useState<ClassQuestionDraft[]>([]);

  const { data: courseTopics } = useQuery<CourseTopicForClassDto[]>({
    queryKey: ["course-topics-for-class", classId],
    queryFn: () => classApi.getCourseTopicsForClass(classId),
  });

  const hasSelectableCourseTopics =
    courseTopics?.some((t) => !t.alreadyAdded) ?? false;
  const derivedMode: "new" | "existing" =
    courseTopics === undefined
      ? "existing"
      : hasSelectableCourseTopics
        ? "existing"
        : "new";
  const mode = modeTouched ? userMode : derivedMode;

  const selectedIsPractice =
    (mode === "new" && kind === "practice") ||
    (mode === "existing" && existingKind === "practice");

  const { data: cls } = useQuery({
    queryKey: ["class", classId],
    queryFn: () => classApi.getClassById(classId),
    enabled: mode === "new",
  });
  const courseId = cls?.courseId ?? "";

  const createMutation = useMutation({
    mutationFn: async () => {
      const created = await classApi.createClassContent(classId, {
        ...(mode === "existing" ? { topicId: topicId.trim() } : {}),
        ...(mode === "new" ? { title: title.trim(), kind } : {}),
        ...(selectedIsPractice
          ? {
              openAt: toOpenAtIso(openDate, openTime),
              durationMinutes: Number(durationMinutes),
            }
          : {}),
      });
      if (mode === "new" && kind === "practice" && drafts.length > 0) {
        for (const draft of drafts) {
          let questionId = draft.questionId;
          if (!questionId && draft.createPayload) {
            const q = await questionApi.createQuestion(draft.createPayload);
            questionId = q.id;
          }
          if (!questionId) continue;
          await classApi.addPracticeTopicQuestion(created.topicId, {
            questionId,
          });
        }
      }
      return created;
    },
    onSuccess: () => {
      toast.success("Đã thêm chuyên đề");
      queryClient.invalidateQueries({
        queryKey: ["course-topics-for-class", classId],
      });
      onSuccess();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err?.response?.data?.message || "Lỗi thêm chuyên đề");
    },
  });

  const canPick =
    (mode === "existing" && topicId.trim()) ||
    (mode === "new" && title.trim());
  const canSubmitSchedule = Boolean(openDate && openTime && durationMinutes);

  const handlePrimary = () => {
    if (selectedIsPractice && step === "pick") {
      setStep("schedule");
      return;
    }
    createMutation.mutate();
  };

  return (
    <ResponsiveDialog onBackdropClick={onClose} size="4xl">
      <ResponsiveDialogBody className="flex flex-col p-4 sm:p-6 max-h-[92vh] overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-border-default pb-4 shrink-0">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-text-primary">
              {step === "schedule" ? "Đặt lần giao" : "Thêm chuyên đề"}
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              {step === "schedule"
                ? "Thời điểm mở bài và thời lượng thuộc lần giao của lớp này, không đụng đề."
                : "Chọn chuyên đề từ khoá học hoặc tạo mới cho lớp."}
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
          {step === "schedule" ? (
            <AssignmentScheduleFields
              openDate={openDate}
              openTime={openTime}
              durationMinutes={durationMinutes}
              onOpenDateChange={setOpenDate}
              onOpenTimeChange={setOpenTime}
              onDurationChange={setDurationMinutes}
            />
          ) : (
            <>
          {/* Mode toggle */}
          <div className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-xl border border-border-default bg-bg-surface p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => {
                setModeTouched(true);
                setUserMode("new");
                setStep("pick");
              }}
              className={`inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                mode === "new"
                  ? "bg-primary text-text-inverse shadow-xs"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              Tạo mới cho lớp
            </button>
            <button
              type="button"
              onClick={() => {
                setModeTouched(true);
                setUserMode("existing");
                setStep("pick");
              }}
              className={`inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
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
                    onClick={() => {
                      setKind("theory");
                      setDrafts([]);
                    }}
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
              {kind === "practice" && courseId ? (
                <>
                  <Alert variant="info">
                    <AlertTitle>Chuyên đề riêng lớp</AlertTitle>
                    <AlertDescription>
                      Chuyên đề này chỉ thuộc lớp — không xuất hiện trong cây
                      kiến thức của khoá.
                    </AlertDescription>
                  </Alert>
                  <Alert variant="warning">
                    <AlertTitle>Câu hỏi dùng chung cấp khoá</AlertTitle>
                    <AlertDescription>
                      Câu hỏi ghi vào ngân hàng của khoá, không phải kho riêng
                      lớp. Đội giáo án vẫn sửa hoặc xoá được.
                    </AlertDescription>
                  </Alert>
                  <ClassPracticeQuestionComposer
                    courseId={courseId}
                    drafts={drafts}
                    onChange={setDrafts}
                  />
                </>
              ) : null}
            </>
          ) : (
            <CourseTopicPicker
              classId={classId}
              selectedTopicId={topicId}
              onSelect={(id, topicKind) => {
                setTopicId(id);
                setExistingKind(topicKind);
              }}
            />
          )}
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border-default shrink-0">
          {step === "schedule" && (
            <button
              type="button"
              onClick={() => setStep("pick")}
              className="mr-auto cursor-pointer rounded-xl border border-border-default px-4 py-2.5 text-sm font-medium text-text-secondary hover:bg-bg-secondary transition-colors"
            >
              Quay lại
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-xl border border-border-default px-4 py-2.5 text-sm font-medium text-text-secondary hover:bg-bg-secondary transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handlePrimary}
            disabled={
              (step === "pick" && !canPick) ||
              (step === "schedule" && !canSubmitSchedule) ||
              createMutation.isPending
            }
            className="cursor-pointer rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-text-inverse transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60 shadow-xs"
          >
            {createMutation.isPending
              ? "Đang thêm..."
              : selectedIsPractice && step === "pick"
                ? "Tiếp theo"
                : selectedIsPractice
                  ? "Giao đề"
                  : "Thêm chuyên đề"}
          </button>
        </div>
      </ResponsiveDialogBody>
    </ResponsiveDialog>
  );
}

function EditScheduleDialog({
  classId,
  item,
  onClose,
  onSuccess,
}: {
  classId: string;
  item: ClassContentItemDto;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const fallback = defaultAssignmentSchedule();
  const parsed = item.openAt
    ? fromOpenAtIso(item.openAt)
    : { date: fallback.openDate, time: fallback.openTime };
  const [openDate, setOpenDate] = useState(parsed.date);
  const [openTime, setOpenTime] = useState(parsed.time);
  const [durationMinutes, setDurationMinutes] = useState(
    String(item.durationMinutes ?? 60),
  );

  const mutation = useMutation({
    mutationFn: () =>
      classApi.updateClassContentSchedule(classId, item.id, {
        openAt: toOpenAtIso(openDate, openTime),
        durationMinutes: Number(durationMinutes),
      }),
    onSuccess: () => {
      toast.success("Đã cập nhật lần giao");
      onSuccess();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err?.response?.data?.message || "Lỗi cập nhật lần giao");
    },
  });

  return (
    <ResponsiveDialog onBackdropClick={onClose} size="lg">
      <ResponsiveDialogBody className="flex flex-col p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3 border-b border-border-default pb-4">
          <div>
            <h2 className="text-lg font-bold text-text-primary">Đặt lần giao</h2>
            <p className="text-xs text-text-muted mt-0.5 truncate">{item.title}</p>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-text-muted hover:bg-bg-secondary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            aria-label="Đóng"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="py-4">
          <AssignmentScheduleFields
            openDate={openDate}
            openTime={openTime}
            durationMinutes={durationMinutes}
            onOpenDateChange={setOpenDate}
            onOpenTimeChange={setOpenTime}
            onDurationChange={setDurationMinutes}
          />
        </div>
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border-default">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-xl border border-border-default px-4 py-2.5 text-sm font-medium text-text-secondary hover:bg-bg-secondary"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={!openDate || !openTime || mutation.isPending}
            className="cursor-pointer rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-text-inverse hover:bg-primary-hover disabled:opacity-60"
          >
            {mutation.isPending ? "Đang lưu..." : "Lưu lần giao"}
          </button>
        </div>
      </ResponsiveDialogBody>
    </ResponsiveDialog>
  );
}

function ViewContentDialog({
  classId,
  item,
  canManage,
  onClose,
  onEditSchedule,
}: {
  classId: string;
  item: ClassContentItemDto;
  canManage: boolean;
  onClose: () => void;
  onEditSchedule: () => void;
}) {
  return (
    <ResponsiveDialog onBackdropClick={onClose} size="lg">
      <ResponsiveDialogBody className="flex flex-col p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3 border-b border-border-default pb-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
              {item.kindLabel}
            </p>
            <h2 className="mt-1 text-lg font-bold text-text-primary">{item.title}</h2>
            <p className="mt-1 text-xs text-text-muted">
              {item.source === "course" ? "Từ khoá" : "Riêng lớp"}
              {item.chapterTitle ? ` · ${item.chapterTitle}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-text-muted hover:bg-bg-secondary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            aria-label="Đóng"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="space-y-2 py-4 text-sm text-text-secondary">
          {item.topicKind === "practice" ? (
            <p>
              {item.openAt
                ? `Mở ${formatOpenAt(item.openAt)} · ${item.durationMinutes ?? "—"} phút`
                : "Chưa đặt thời điểm mở"}
            </p>
          ) : (
            <p>
              {item.lectureCount != null && item.lectureCount > 0
                ? `${item.lectureCount} bài học`
                : "Chuyên đề lý thuyết"}
            </p>
          )}
        </div>
        {canManage && item.topicKind === "practice" ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border-default pt-4">
            <Link
              href={`/staff/classes/${classId}/practice/${item.id}/stats`}
              className="inline-flex min-h-9 items-center rounded-lg border border-border-default px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-bg-secondary"
            >
              Thống kê
            </Link>
            <Link
              href={`/staff/classes/${classId}/grading/${item.id}`}
              className="inline-flex min-h-9 items-center rounded-lg border border-border-default px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-bg-secondary"
            >
              Chấm tự luận
            </Link>
            <button
              type="button"
              onClick={onEditSchedule}
              className="inline-flex min-h-9 items-center rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-text-inverse hover:bg-primary-hover"
            >
              Lịch giao
            </button>
          </div>
        ) : null}
      </ResponsiveDialogBody>
    </ResponsiveDialog>
  );
}
