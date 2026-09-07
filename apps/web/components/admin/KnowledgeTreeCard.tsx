"use client";

import { useCallback, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { courseKeys } from "@/lib/query-keys";
import * as classApi from "@/lib/apis/class.api";
import * as questionApi from "@/lib/apis/question.api";
import { runBackgroundSave } from "@/lib/mutation-feedback";
import MathRichTextEditor from "@/components/ui/MathRichTextEditor";
import MathContent from "@/components/ui/MathContent";
import type {
  Chapter,
  Topic,
  Lecture,
  TopicKind,
} from "@/dtos/topic.dto";
import { PracticeTopicQuestionsCard } from "./PracticeTopicQuestionsCard";

// ─────────────────────────────────────────────────────────────
// Types & ID helpers
// ─────────────────────────────────────────────────────────────

interface ChapterNode {
  chapter: Chapter;
  topics: TopicNode[];
}

interface TopicNode {
  topic: Topic;
  lectures: Lecture[];
}

const CH = "ch:";
const TP = "tp:";
const LC = "lc:";

function chapterId(id: string) {
  return `${CH}${id}`;
}
function topicId(id: string) {
  return `${TP}${id}`;
}
function lectureId(id: string) {
  return `${LC}${id}`;
}

function parseDragId(prefixed: string): { kind: "chapter" | "topic" | "lecture"; raw: string } {
  if (prefixed.startsWith(CH)) return { kind: "chapter", raw: prefixed.slice(CH.length) };
  if (prefixed.startsWith(TP)) return { kind: "topic", raw: prefixed.slice(TP.length) };
  return { kind: "lecture", raw: prefixed.slice(LC.length) };
}

// ─────────────────────────────────────────────────────────────
// Hook: useKnowledgeTree
// ─────────────────────────────────────────────────────────────

function useKnowledgeTree(courseId: string) {
  const queryClient = useQueryClient();

  const { data: chapters = [], isLoading } = useQuery({
    queryKey: courseKeys.knowledgeTree(courseId),
    queryFn: async () => {
      const chs = await classApi.getChapters(courseId);
      const tree: ChapterNode[] = await Promise.all(
        chs.map(async (ch) => {
          const topics = await classApi.getTopicsByChapter(courseId, ch.id);
          const topicNodes: TopicNode[] = await Promise.all(
            topics.map(async (t) => ({
              topic: t,
              lectures:
                t.kind === "theory"
                  ? await classApi.getLectures(t.id)
                  : [],
            })),
          );
          return { chapter: ch, topics: topicNodes };
        }),
      );
      return tree;
    },
    enabled: Boolean(courseId),
  });

  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: courseKeys.knowledgeTree(courseId),
    });
  }, [queryClient, courseId]);

  return { chapters, isLoading, invalidate };
}

// ─────────────────────────────────────────────────────────────
// Sortable item hooks
// ─────────────────────────────────────────────────────────────

function useDndSortable(id: string) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return { setNodeRef, style, attributes, listeners, isDragging };
}

// ─────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────

function DragHandle({ listeners }: { listeners?: Record<string, unknown> }) {
  return (
    <button
      type="button"
      className="shrink-0 cursor-grab rounded p-1 text-text-muted hover:bg-bg-tertiary hover:text-text-secondary active:cursor-grabbing"
      aria-label="Kéo để sắp xếp"
      {...listeners}
    >
      <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
      </svg>
    </button>
  );
}

function LectureItem({
  lecture,
  canEdit,
  onEdit,
  onDelete,
}: {
  lecture: Lecture;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { setNodeRef, style, listeners } = useDndSortable(lectureId(lecture.id));
  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-md border border-border-default/60 bg-bg-primary px-3 py-2"
    >
      {canEdit && <DragHandle listeners={listeners} />}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-text-primary">{lecture.title}</p>
        {lecture.videoUrl ? (
          <p className="truncate text-xs text-text-muted">có video</p>
        ) : null}
      </div>
      {canEdit ? (
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="rounded px-2 py-1 text-xs text-text-secondary hover:bg-bg-tertiary"
          >
            Sửa
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded px-2 py-1 text-xs text-error hover:bg-error/10"
          >
            Xoá
          </button>
        </div>
      ) : null}
    </li>
  );
}

function TopicItem({
  node,
  canEdit,
  courseId,
  onEdit,
  onDelete,
  onAddLecture,
  onEditLecture,
  onDeleteLecture,
}: {
  node: TopicNode;
  canEdit: boolean;
  courseId: string;
  onEdit: () => void;
  onDelete: () => void;
  onAddLecture: () => void;
  onEditLecture: (lecture: Lecture) => void;
  onDeleteLecture: (lecture: Lecture) => void;
}) {
  const { setNodeRef, style, listeners } = useDndSortable(topicId(node.topic.id));
  const kindLabel = node.topic.kind === "theory" ? "Lý thuyết" : "Luyện tập";
  const kindColor =
    node.topic.kind === "theory"
      ? "bg-blue-50 text-blue-600"
      : "bg-amber-50 text-amber-600";
  const [questionsExpanded, setQuestionsExpanded] = useState(false);

  return (
    <li ref={setNodeRef} style={style} className="rounded-lg border border-border-default bg-bg-surface">
      <div className="flex items-center gap-2 px-3 py-2.5">
        {canEdit && <DragHandle listeners={listeners} />}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-text-primary">
              {node.topic.title}
            </span>
            <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${kindColor}`}>
              {kindLabel}
            </span>
          </div>
        </div>
        {canEdit ? (
          <div className="flex shrink-0 items-center gap-1">
            {node.topic.kind === "theory" ? (
              <button
                type="button"
                onClick={onAddLecture}
                className="rounded px-2 py-1 text-xs text-primary hover:bg-primary/10"
              >
                + Bài học
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setQuestionsExpanded(!questionsExpanded)}
                className={`rounded px-2 py-1 text-xs hover:bg-primary/10 ${
                  questionsExpanded ? "text-primary font-medium" : "text-primary"
                }`}
              >
                {questionsExpanded ? "Thu gọn" : "Câu hỏi"}
              </button>
            )}
            <button
              type="button"
              onClick={onEdit}
              className="rounded px-2 py-1 text-xs text-text-secondary hover:bg-bg-tertiary"
            >
              Sửa
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="rounded px-2 py-1 text-xs text-error hover:bg-error/10"
            >
              Xoá
            </button>
          </div>
        ) : null}
      </div>
      {node.topic.kind === "theory" && node.lectures.length > 0 ? (
        <ul className="space-y-1.5 border-t border-border-default/60 px-3 py-2">
          <SortableContext
            items={node.lectures.map((l) => lectureId(l.id))}
            strategy={verticalListSortingStrategy}
          >
            {node.lectures.map((l) => (
              <LectureItem
                key={l.id}
                lecture={l}
                canEdit={canEdit}
                onEdit={() => onEditLecture(l)}
                onDelete={() => onDeleteLecture(l)}
              />
            ))}
          </SortableContext>
        </ul>
      ) : null}
      {node.topic.kind === "practice" && questionsExpanded ? (
        <div className="border-t border-border-default/60 px-3 py-2">
          <PracticeTopicQuestionsCard
            topicId={node.topic.id}
            courseId={courseId}
            canEdit={canEdit}
          />
        </div>
      ) : null}
    </li>
  );
}

function ChapterItem({
  node,
  canEdit,
  courseId,
  onEdit,
  onDelete,
  onAddTopic,
  onEditTopic,
  onDeleteTopic,
  onAddLecture,
  onEditLecture,
  onDeleteLecture,
}: {
  node: ChapterNode;
  canEdit: boolean;
  courseId: string;
  onEdit: () => void;
  onDelete: () => void;
  onAddTopic: () => void;
  onEditTopic: (topic: Topic) => void;
  onDeleteTopic: (topic: Topic) => void;
  onAddLecture: (topicId: string) => void;
  onEditLecture: (topicId: string, lecture: Lecture) => void;
  onDeleteLecture: (topicId: string, lecture: Lecture) => void;
}) {
  const { setNodeRef, style, listeners } = useDndSortable(chapterId(node.chapter.id));
  const [collapsed, setCollapsed] = useState(false);

  return (
    <li ref={setNodeRef} style={style} className="rounded-xl border border-border-default bg-bg-surface shadow-sm">
      <div className="flex items-center gap-2 px-4 py-3">
        {canEdit && <DragHandle listeners={listeners} />}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="shrink-0 rounded p-1 text-text-muted hover:bg-bg-tertiary"
          aria-label={collapsed ? "Mở rộng" : "Thu gọn"}
        >
          <svg
            className={`size-4 transition-transform ${collapsed ? "" : "rotate-90"}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <span className="text-sm font-semibold text-text-primary">
            {node.chapter.title}
          </span>
          <span className="ml-2 text-xs text-text-muted">
            {node.topics.length} chuyên đề
          </span>
        </div>
        {canEdit ? (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={onAddTopic}
              className="rounded px-2 py-1 text-xs text-primary hover:bg-primary/10"
            >
              + Chuyên đề
            </button>
            <button
              type="button"
              onClick={onEdit}
              className="rounded px-2 py-1 text-xs text-text-secondary hover:bg-bg-tertiary"
            >
              Sửa
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="rounded px-2 py-1 text-xs text-error hover:bg-error/10"
            >
              Xoá
            </button>
          </div>
        ) : null}
      </div>
      {!collapsed && node.topics.length > 0 ? (
        <ul className="space-y-2 border-t border-border-default/60 px-4 py-3">
          <SortableContext
            items={node.topics.map((t) => topicId(t.topic.id))}
            strategy={verticalListSortingStrategy}
          >
            {node.topics.map((t) => (
              <TopicItem
                key={t.topic.id}
                node={t}
                canEdit={canEdit}
                courseId={courseId}
                onEdit={() => onEditTopic(t.topic)}
                onDelete={() => onDeleteTopic(t.topic)}
                onAddLecture={() => onAddLecture(t.topic.id)}
                onEditLecture={(l) => onEditLecture(t.topic.id, l)}
                onDeleteLecture={(l) => onDeleteLecture(t.topic.id, l)}
              />
            ))}
          </SortableContext>
        </ul>
      ) : null}
    </li>
  );
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

export function KnowledgeTreeCard({
  courseId,
  canEdit,
}: {
  courseId: string;
  canEdit: boolean;
}) {
  const { chapters, isLoading, invalidate } = useKnowledgeTree(courseId);
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  // ── Chapter CRUD ──
  const [newChapterName, setNewChapterName] = useState("");
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editingChapterName, setEditingChapterName] = useState("");

  const addChapter = () => {
    const title = newChapterName.trim();
    if (!title) return;
    setNewChapterName("");
    runBackgroundSave({
      loadingMessage: "Đang thêm chủ đề...",
      successMessage: "Đã thêm chủ đề.",
      errorMessage: "Không thể thêm chủ đề.",
      action: () => classApi.createChapter(courseId, { title }),
      onSuccess: invalidate,
    });
  };

  const saveChapterEdit = (ch: Chapter) => {
    const title = editingChapterName.trim();
    if (!title) return;
    setEditingChapterId(null);
    runBackgroundSave({
      loadingMessage: "Đang cập nhật...",
      successMessage: "Đã cập nhật.",
      errorMessage: "Không thể cập nhật.",
      action: () => classApi.updateChapter(courseId, ch.id, { title }),
      onSuccess: invalidate,
    });
  };

  const deleteChapter = (ch: Chapter) => {
    if (!window.confirm(`Xoá chủ đề "${ch.title}"?`)) return;
    runBackgroundSave({
      loadingMessage: "Đang xoá...",
      successMessage: "Đã xoá.",
      errorMessage: "Không thể xoá.",
      action: () => classApi.deleteChapter(courseId, ch.id),
      onSuccess: invalidate,
    });
  };

  // ── Topic CRUD ──
  const [newTopicChapterId, setNewTopicChapterId] = useState<string | null>(null);
  const [newTopicName, setNewTopicName] = useState("");
  const [newTopicKind, setNewTopicKind] = useState<TopicKind>("theory");
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editingTopicName, setEditingTopicName] = useState("");

  const addTopic = (chapterId: string) => {
    const title = newTopicName.trim();
    if (!title) return;
    setNewTopicName("");
    setNewTopicChapterId(null);
    runBackgroundSave({
      loadingMessage: "Đang thêm chuyên đề...",
      successMessage: "Đã thêm chuyên đề.",
      errorMessage: "Không thể thêm chuyên đề.",
      action: () =>
        classApi.createTopic(courseId, chapterId, {
          kind: newTopicKind,
          title,
        }),
      onSuccess: invalidate,
    });
  };

  const saveTopicEdit = (topic: Topic) => {
    const title = editingTopicName.trim();
    if (!title || !topic.chapterId) return;
    setEditingTopicId(null);
    runBackgroundSave({
      loadingMessage: "Đang cập nhật...",
      successMessage: "Đã cập nhật.",
      errorMessage: "Không thể cập nhật.",
      action: () =>
        classApi.updateTopic(courseId, topic.chapterId!, topic.id, { title }),
      onSuccess: invalidate,
    });
  };

  const deleteTopic = (topic: Topic) => {
    if (!window.confirm(`Xoá chuyên đề "${topic.title}"?`)) return;
    if (!topic.chapterId) return;
    runBackgroundSave({
      loadingMessage: "Đang xoá...",
      successMessage: "Đã xoá.",
      errorMessage: "Không thể xoá.",
      action: () => classApi.deleteTopic(courseId, topic.chapterId!, topic.id),
      onSuccess: invalidate,
    });
  };

  // ── Lecture CRUD ──
  const [newLectureTopicId, setNewLectureTopicId] = useState<string | null>(null);
  const [newLectureName, setNewLectureName] = useState("");
  const [editingLecture, setEditingLecture] = useState<{
    topicId: string;
    lecture: Lecture;
  } | null>(null);
  const [editingLectureName, setEditingLectureName] = useState("");
  const [editingLectureVideoUrl, setEditingLectureVideoUrl] = useState("");
  const [editingLectureContent, setEditingLectureContent] = useState("");
  const [editingLectureQuizIds, setEditingLectureQuizIds] = useState<string[]>([]);

  // Quiz question bank for the course
  const { data: courseQuestions = [] } = useQuery({
    queryKey: ["course-questions", courseId],
    queryFn: () => questionApi.getQuestions({}, 0, 200),
    enabled: !!courseId && !!editingLecture,
  });

  // Currently linked quizzes for the editing lecture
  const { data: linkedQuizzes = [], isSuccess: linkedQuizzesReady } = useQuery({
    queryKey: ["lecture-quizzes", editingLecture?.lecture.id],
    queryFn: () =>
      editingLecture
        ? classApi.getLectureQuizzes(editingLecture.topicId, editingLecture.lecture.id)
        : Promise.resolve([]),
    enabled: !!editingLecture,
  });

  // Re-seed quiz IDs on every dialog open (same lecture id included).
  // Guard is the lecture id of *this open*, reset in openLectureEdit/closeLectureEdit.
  const quizIdsInitialized = editingLecture?.lecture.id ?? null;
  const [initializedQuizLectureId, setInitializedQuizLectureId] = useState<string | null>(null);
  if (
    quizIdsInitialized &&
    linkedQuizzesReady &&
    initializedQuizLectureId !== quizIdsInitialized
  ) {
    setInitializedQuizLectureId(quizIdsInitialized);
    setEditingLectureQuizIds(linkedQuizzes.map((q) => q.questionId));
  }

  const closeLectureEdit = () => {
    setEditingLecture(null);
    setInitializedQuizLectureId(null);
    setEditingLectureQuizIds([]);
  };

  const openLectureEdit = (topicId: string, lecture: Lecture) => {
    setEditingLecture({ topicId, lecture });
    setEditingLectureName(lecture.title);
    setEditingLectureVideoUrl(lecture.videoUrl || "");
    setEditingLectureContent(lecture.content || "");
    setEditingLectureQuizIds([]);
    setInitializedQuizLectureId(null);
  };

  const addLecture = (topicId: string) => {
    const title = newLectureName.trim();
    if (!title) return;
    setNewLectureName("");
    setNewLectureTopicId(null);
    runBackgroundSave({
      loadingMessage: "Đang thêm bài học...",
      successMessage: "Đã thêm bài học.",
      errorMessage: "Không thể thêm bài học.",
      action: () => classApi.createLecture(topicId, { title }),
      onSuccess: invalidate,
    });
  };

  const saveLectureEdit = () => {
    if (!editingLecture) return;
    const title = editingLectureName.trim();
    if (!title) return;
    const { topicId: tid, lecture } = editingLecture;
    const videoUrl = editingLectureVideoUrl.trim() || null;
    const content = editingLectureContent.trim() || null;
    const currentQuizIds = linkedQuizzes.map((q) => q.questionId);
    const toAdd = editingLectureQuizIds.filter((id) => !currentQuizIds.includes(id));
    const toRemove = currentQuizIds.filter((id) => !editingLectureQuizIds.includes(id));
    if (
      toRemove.length > 0 &&
      !window.confirm(
        `Sẽ gỡ ${toRemove.length} bài tập khỏi bài học này. Tiếp tục?`,
      )
    ) {
      return;
    }
    closeLectureEdit();

    runBackgroundSave({
      loadingMessage: "Đang cập nhật bài học...",
      successMessage: "Đã cập nhật bài học.",
      errorMessage: "Không thể cập nhật bài học.",
      action: async () => {
        await classApi.updateLecture(tid, lecture.id, { title, videoUrl, content });
        if (toAdd.length) {
          await classApi.linkQuizQuestions(tid, lecture.id, toAdd);
        }
        for (const qid of toRemove) {
          await classApi.unlinkQuizQuestion(tid, lecture.id, qid);
        }
      },
      onSuccess: async () => {
        await invalidate();
        await queryClient.invalidateQueries({
          queryKey: ["lecture-quizzes", lecture.id],
        });
      },
    });
  };

  const deleteLecture = (topicId: string, lecture: Lecture) => {
    if (!window.confirm(`Xoá bài học "${lecture.title}"?`)) return;
    runBackgroundSave({
      loadingMessage: "Đang xoá...",
      successMessage: "Đã xoá.",
      errorMessage: "Không thể xoá.",
      action: () => classApi.deleteLecture(topicId, lecture.id),
      onSuccess: invalidate,
    });
  };

  // ── Single drag-end handler ──
  // ponytail: single handler with ID-prefix routing instead of per-level closures
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const a = parseDragId(String(active.id));
    const o = parseDragId(String(over.id));

    if (a.kind === "chapter" && o.kind === "chapter") {
      const oldIdx = chapters.findIndex((c) => c.chapter.id === a.raw);
      const newIdx = chapters.findIndex((c) => c.chapter.id === o.raw);
      if (oldIdx === -1 || newIdx === -1) return;
      const reordered = arrayMove(chapters, oldIdx, newIdx);
      runBackgroundSave({
        loadingMessage: "Đang sắp xếp...",
        successMessage: "Đã sắp xếp.",
        errorMessage: "Không thể sắp xếp.",
        action: () =>
          classApi.reorderChapters(
            courseId,
            reordered.map((c) => c.chapter.id),
          ),
        onSuccess: invalidate,
      });
      return;
    }

    if (a.kind === "topic" && o.kind === "topic") {
      for (const ch of chapters) {
        const ids = ch.topics.map((t) => topicId(t.topic.id));
        const ai = ids.indexOf(String(active.id));
        const oi = ids.indexOf(String(over.id));
        if (ai !== -1 && oi !== -1) {
          const reordered = arrayMove(ch.topics, ai, oi);
          runBackgroundSave({
            loadingMessage: "Đang sắp xếp...",
            successMessage: "Đã sắp xếp.",
            errorMessage: "Không thể sắp xếp.",
            action: () =>
              classApi.reorderTopics(
                courseId,
                ch.chapter.id,
                reordered.map((t) => t.topic.id),
              ),
            onSuccess: invalidate,
          });
          return;
        }
      }
      return;
    }

    if (a.kind === "lecture" && o.kind === "lecture") {
      for (const ch of chapters) {
        for (const tn of ch.topics) {
          const ids = tn.lectures.map((l) => lectureId(l.id));
          const ai = ids.indexOf(String(active.id));
          const oi = ids.indexOf(String(over.id));
          if (ai !== -1 && oi !== -1) {
            const reordered = arrayMove(tn.lectures, ai, oi);
            runBackgroundSave({
              loadingMessage: "Đang sắp xếp...",
              successMessage: "Đã sắp xếp.",
              errorMessage: "Không thể sắp xếp.",
              action: () =>
                classApi.reorderLectures(
                  tn.topic.id,
                  reordered.map((l) => l.id),
                ),
              onSuccess: invalidate,
            });
            return;
          }
        }
      }
    }
  };

  if (isLoading) {
    return (
      <section className="rounded-xl border border-border-default bg-bg-surface p-5 shadow-sm">
        <p className="text-sm text-text-secondary">Đang tải cây tri thức...</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border-default bg-bg-surface p-3 shadow-sm sm:rounded-lg sm:p-5">
      <h2 className="text-base font-semibold text-text-primary">Cây tri thức</h2>
      <p className="mt-0.5 text-sm text-text-secondary">
        Quản lý Chủ đề → Chuyên đề → Bài học. Kéo để sắp xếp thứ tự.
      </p>

      {canEdit ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={newChapterName}
            onChange={(e) => setNewChapterName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addChapter();
              }
            }}
            placeholder="Tên chủ đề mới..."
            className="min-w-0 flex-1 rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          />
          <button
            type="button"
            onClick={addChapter}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors duration-200 hover:bg-primary-hover sm:min-h-10"
          >
            <svg className="size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Thêm chủ đề
          </button>
        </div>
      ) : null}

      {chapters.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-border-default p-4 text-sm text-text-secondary">
          Chưa có chủ đề nào. Thêm chủ đề đầu tiên để bắt đầu.
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <ul className="mt-4 space-y-3">
            <SortableContext
              items={chapters.map((c) => chapterId(c.chapter.id))}
              strategy={verticalListSortingStrategy}
            >
              {chapters.map((node) => (
                <ChapterItem
                  key={node.chapter.id}
                  node={node}
                  canEdit={canEdit}
                  courseId={courseId}
                  onEdit={() => {
                    setEditingChapterId(node.chapter.id);
                    setEditingChapterName(node.chapter.title);
                  }}
                  onDelete={() => deleteChapter(node.chapter)}
                  onAddTopic={() => {
                    setNewTopicChapterId(node.chapter.id);
                    setNewTopicName("");
                  }}
                  onEditTopic={(topic) => {
                    setEditingTopicId(topic.id);
                    setEditingTopicName(topic.title);
                  }}
                  onDeleteTopic={deleteTopic}
                  onAddLecture={(topicId) => {
                    setNewLectureTopicId(topicId);
                    setNewLectureName("");
                  }}
                  onEditLecture={openLectureEdit}
                  onDeleteLecture={deleteLecture}
                />
              ))}
            </SortableContext>
          </ul>
        </DndContext>
      )}

      {/* Inline new-topic form */}
      {newTopicChapterId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setNewTopicChapterId(null)}>
          <div className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-text-primary">Thêm chuyên đề</h3>
            <div className="mt-3 flex flex-col gap-2">
              <input
                autoFocus
                value={newTopicName}
                onChange={(e) => setNewTopicName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTopic(newTopicChapterId);
                  }
                }}
                placeholder="Tên chuyên đề..."
                className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setNewTopicKind("theory")}
                  className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                    newTopicKind === "theory"
                      ? "bg-blue-500 text-white"
                      : "border border-border-default text-text-secondary hover:bg-bg-tertiary"
                  }`}
                >
                  Lý thuyết
                </button>
                <button
                  type="button"
                  onClick={() => setNewTopicKind("practice")}
                  className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                    newTopicKind === "practice"
                      ? "bg-amber-500 text-white"
                      : "border border-border-default text-text-secondary hover:bg-bg-tertiary"
                  }`}
                >
                  Luyện tập
                </button>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setNewTopicChapterId(null)}
                  className="rounded-md border border-border-default px-3 py-1.5 text-xs font-medium text-text-secondary"
                >
                  Huỷ
                </button>
                <button
                  type="button"
                  onClick={() => addTopic(newTopicChapterId)}
                  disabled={!newTopicName.trim()}
                  className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-text-inverse disabled:opacity-60"
                >
                  Thêm
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Inline new-lecture form */}
      {newLectureTopicId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setNewLectureTopicId(null)}>
          <div className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-text-primary">Thêm bài học</h3>
            <div className="mt-3 flex flex-col gap-2">
              <input
                autoFocus
                value={newLectureName}
                onChange={(e) => setNewLectureName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addLecture(newLectureTopicId);
                  }
                }}
                placeholder="Tên bài học..."
                className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setNewLectureTopicId(null)}
                  className="rounded-md border border-border-default px-3 py-1.5 text-xs font-medium text-text-secondary"
                >
                  Huỷ
                </button>
                <button
                  type="button"
                  onClick={() => addLecture(newLectureTopicId)}
                  disabled={!newLectureName.trim()}
                  className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-text-inverse disabled:opacity-60"
                >
                  Thêm
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Inline edit chapter form */}
      {editingChapterId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setEditingChapterId(null)}>
          <div className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-text-primary">Sửa chủ đề</h3>
            <div className="mt-3 flex flex-col gap-2">
              <input
                autoFocus
                value={editingChapterName}
                onChange={(e) => setEditingChapterName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const ch = chapters.find((c) => c.chapter.id === editingChapterId);
                    if (ch) saveChapterEdit(ch.chapter);
                  }
                }}
                className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingChapterId(null)}
                  className="rounded-md border border-border-default px-3 py-1.5 text-xs font-medium text-text-secondary"
                >
                  Huỷ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const ch = chapters.find((c) => c.chapter.id === editingChapterId);
                    if (ch) saveChapterEdit(ch.chapter);
                  }}
                  className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-text-inverse"
                >
                  Lưu
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Inline edit topic form */}
      {editingTopicId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setEditingTopicId(null)}>
          <div className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-text-primary">Sửa chuyên đề</h3>
            <div className="mt-3 flex flex-col gap-2">
              <input
                autoFocus
                value={editingTopicName}
                onChange={(e) => setEditingTopicName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    for (const ch of chapters) {
                      const found = ch.topics.find((t) => t.topic.id === editingTopicId);
                      if (found) {
                        saveTopicEdit(found.topic);
                        break;
                      }
                    }
                  }
                }}
                className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTopicId(null)}
                  className="rounded-md border border-border-default px-3 py-1.5 text-xs font-medium text-text-secondary"
                >
                  Huỷ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    for (const ch of chapters) {
                      const found = ch.topics.find((t) => t.topic.id === editingTopicId);
                      if (found) {
                        saveTopicEdit(found.topic);
                        break;
                      }
                    }
                  }}
                  className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-text-inverse"
                >
                  Lưu
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Inline edit lecture form */}
      {editingLecture ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={closeLectureEdit}>
          <div
            key={editingLecture.lecture.id}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border-default bg-bg-surface p-4 shadow-lg sm:p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-text-primary">Sửa bài học</h3>
            <div className="mt-3 flex flex-col gap-4">
              {/* Title */}
              <div>
                <label className="mb-1 block text-xs font-medium text-text-muted">Tiêu đề</label>
                <input
                  autoFocus
                  value={editingLectureName}
                  onChange={(e) => setEditingLectureName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      saveLectureEdit();
                    }
                  }}
                  className="w-full rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                />
              </div>

              {/* Video URL */}
              <div>
                <label className="mb-1 block text-xs font-medium text-text-muted">Link video YouTube (tuỳ chọn)</label>
                <input
                  value={editingLectureVideoUrl}
                  onChange={(e) => setEditingLectureVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                />
              </div>

              {/* Content (TipTap + Math) */}
              <div>
                <label className="mb-1 block text-xs font-medium text-text-muted">
                  Nội dung lý thuyết (hỗ trợ LaTeX: $x^2$)
                </label>
                <MathRichTextEditor
                  value={editingLectureContent}
                  onChange={setEditingLectureContent}
                  placeholder="Nhập nội dung bài học..."
                  minHeight="min-h-[120px]"
                />
              </div>

              {/* Quiz Question Picker */}
              <div>
                <label className="mb-1 block text-xs font-medium text-text-muted">
                  Bài tập ôn nhẹ ({editingLectureQuizIds.length} câu đã chọn)
                </label>
                <p className="mb-2 text-xs text-text-muted">
                  Chọn câu hỏi từ ngân hàng câu hỏi của khoá học.
                </p>
                {courseQuestions.length === 0 ? (
                  <p className="text-xs text-text-muted italic">Chưa có câu hỏi nào trong ngân hàng.</p>
                ) : (
                  <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-md border border-border-default p-2">
                    {courseQuestions.map((q) => {
                      const isSelected = editingLectureQuizIds.includes(q.id);
                      return (
                        <label
                          key={q.id}
                          className={`flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-xs transition-colors ${
                            isSelected ? "bg-primary/5" : "hover:bg-bg-secondary/50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              setEditingLectureQuizIds((prev) =>
                                isSelected
                                  ? prev.filter((id) => id !== q.id)
                                  : [...prev, q.id]
                              );
                            }}
                            className="mt-0.5 accent-primary"
                          />
                          <span className="min-w-0 flex-1">
                            <MathContent
                              content={q.content.slice(0, 100)}
                              className="text-xs"
                            />
                            <span className="ml-1 text-text-muted">
                              ({q.type === "single_choice" ? "Trắc nghiệm" : "Tự luận"})
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeLectureEdit}
                  className="rounded-md border border-border-default px-3 py-1.5 text-xs font-medium text-text-secondary"
                >
                  Huỷ
                </button>
                <button
                  type="button"
                  onClick={saveLectureEdit}
                  className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-text-inverse"
                >
                  Lưu
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
