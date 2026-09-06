"use client";

import { useCallback, useEffect, useState } from "react";
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { courseKeys } from "@/lib/query-keys";
import * as classApi from "@/lib/apis/class.api";
import { runBackgroundSave } from "@/lib/mutation-feedback";
import type {
  Chapter,
  Topic,
  Lecture,
  TopicKind,
} from "@/dtos/topic.dto";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface ChapterNode {
  chapter: Chapter;
  topics: TopicNode[];
}

interface TopicNode {
  topic: Topic;
  lectures: Lecture[];
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
  topicId,
  canEdit,
  onEdit,
  onDelete,
}: {
  lecture: Lecture;
  topicId: string;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { setNodeRef, style, attributes, listeners } = useDndSortable(lecture.id);
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
  onEdit,
  onDelete,
  onAddLecture,
  onEditLecture,
  onDeleteLecture,
}: {
  node: TopicNode;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onAddLecture: () => void;
  onEditLecture: (lecture: Lecture) => void;
  onDeleteLecture: (lecture: Lecture) => void;
}) {
  const { setNodeRef, style, attributes, listeners } = useDndSortable(node.topic.id);
  const kindLabel = node.topic.kind === "theory" ? "Lý thuyết" : "Luyện tập";
  const kindColor =
    node.topic.kind === "theory"
      ? "bg-blue-50 text-blue-600"
      : "bg-amber-50 text-amber-600";

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
            ) : null}
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
            items={node.lectures.map((l) => l.id)}
            strategy={verticalListSortingStrategy}
          >
            {node.lectures.map((l) => (
              <LectureItem
                key={l.id}
                lecture={l}
                topicId={node.topic.id}
                canEdit={canEdit}
                onEdit={() => onEditLecture(l)}
                onDelete={() => onDeleteLecture(l)}
              />
            ))}
          </SortableContext>
        </ul>
      ) : null}
    </li>
  );
}

function ChapterItem({
  node,
  canEdit,
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
  onEdit: () => void;
  onDelete: () => void;
  onAddTopic: () => void;
  onEditTopic: (topic: Topic) => void;
  onDeleteTopic: (topic: Topic) => void;
  onAddLecture: (topicId: string) => void;
  onEditLecture: (topicId: string, lecture: Lecture) => void;
  onDeleteLecture: (topicId: string, lecture: Lecture) => void;
}) {
  const { setNodeRef, style, attributes, listeners } = useDndSortable(node.chapter.id);
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
            items={node.topics.map((t) => t.topic.id)}
            strategy={verticalListSortingStrategy}
          >
            {node.topics.map((t) => (
              <TopicItem
                key={t.topic.id}
                node={t}
                canEdit={canEdit}
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
    const { topicId, lecture } = editingLecture;
    setEditingLecture(null);
    runBackgroundSave({
      loadingMessage: "Đang cập nhật...",
      successMessage: "Đã cập nhật.",
      errorMessage: "Không thể cập nhật.",
      action: () => classApi.updateLecture(topicId, lecture.id, { title }),
      onSuccess: invalidate,
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

  // ── Drag end handlers ──
  const handleChapterDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = chapters.findIndex((c) => c.chapter.id === active.id);
    const newIdx = chapters.findIndex((c) => c.chapter.id === over.id);
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
  };

  const handleTopicDragEnd = (chapterId: string, topics: TopicNode[]) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = topics.findIndex((t) => t.topic.id === active.id);
    const newIdx = topics.findIndex((t) => t.topic.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove(topics, oldIdx, newIdx);
    runBackgroundSave({
      loadingMessage: "Đang sắp xếp...",
      successMessage: "Đã sắp xếp.",
      errorMessage: "Không thể sắp xếp.",
      action: () =>
        classApi.reorderTopics(
          courseId,
          chapterId,
          reordered.map((t) => t.topic.id),
        ),
      onSuccess: invalidate,
    });
  };

  const handleLectureDragEnd = (topicId: string, lectures: Lecture[]) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = lectures.findIndex((l) => l.id === active.id);
    const newIdx = lectures.findIndex((l) => l.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove(lectures, oldIdx, newIdx);
    runBackgroundSave({
      loadingMessage: "Đang sắp xếp...",
      successMessage: "Đã sắp xếp.",
      errorMessage: "Không thể sắp xếp.",
      action: () =>
        classApi.reorderLectures(
          topicId,
          reordered.map((l) => l.id),
        ),
      onSuccess: invalidate,
    });
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
        <ul className="mt-4 space-y-3">
          <SortableContext
            items={chapters.map((c) => c.chapter.id)}
            strategy={verticalListSortingStrategy}
          >
            {chapters.map((node) => (
              <ChapterItem
                key={node.chapter.id}
                node={node}
                canEdit={canEdit}
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
                onEditLecture={(topicId, lecture) => {
                  setEditingLecture({ topicId, lecture });
                  setEditingLectureName(lecture.title);
                }}
                onDeleteLecture={deleteLecture}
              />
            ))}
          </SortableContext>
        </ul>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setEditingLecture(null)}>
          <div className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-text-primary">Sửa bài học</h3>
            <div className="mt-3 flex flex-col gap-2">
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
                className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingLecture(null)}
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
