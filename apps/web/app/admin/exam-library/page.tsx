"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as classApi from "@/lib/apis/class.api";
import { api } from "@/lib/client";
import { examLibraryKeys, courseKeys } from "@/lib/query-keys";
import UpgradedSelect from "@/components/ui/UpgradedSelect";
import { PracticeTopicQuestionsCard } from "@/components/admin/PracticeTopicQuestionsCard";
import type { Topic } from "@/dtos/topic.dto";
import type { Course } from "@/dtos/class.dto";

export default function ExamLibraryPage() {
  const queryClient = useQueryClient();
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const skipBlurSaveRef = useRef(false);

  const { data: courses = [] } = useQuery({
    queryKey: courseKeys.list(false),
    queryFn: async () => {
      const res = await api.get<Course[]>("/courses");
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const { data: result, isLoading } = useQuery({
    queryKey: examLibraryKeys.list(selectedCourseId, { search, page }),
    queryFn: () =>
      classApi.getExamLibrary(selectedCourseId, { search, page, limit: 20 }),
    enabled: Boolean(selectedCourseId),
  });

  const exams = result?.data ?? [];
  const total = result?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: examLibraryKeys.list(selectedCourseId),
      }),
      queryClient.invalidateQueries({ queryKey: examLibraryKeys.all }),
    ]);
  };

  const createMutation = useMutation({
    mutationFn: (title: string) =>
      classApi.createExamTopic(selectedCourseId, { kind: "practice", title }),
    onSuccess: () => {
      toast.success("Đã tạo đề thi mới.");
      setShowCreateForm(false);
      setNewTitle("");
      invalidate();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err?.response?.data?.message || "Không thể tạo đề thi.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      classApi.updateExamTopic(selectedCourseId, id, { title }),
    onSuccess: () => {
      toast.success("Đã cập nhật đề thi.");
      setEditingTopic(null);
      invalidate();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err?.response?.data?.message || "Không thể cập nhật.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => classApi.deleteExamTopic(selectedCourseId, id),
    onSuccess: () => {
      toast.success("Đã xóa đề thi.");
      invalidate();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err?.response?.data?.message || "Không thể xóa đề thi.");
    },
  });

  const handleCreate = () => {
    const title = newTitle.trim();
    if (!title) return;
    createMutation.mutate(title);
  };

  const handleUpdate = (topic: Topic) => {
    const title = editTitle.trim();
    if (!title) return;
    updateMutation.mutate({ id: topic.id, title });
  };

  const handleDelete = (topic: Topic) => {
    if (!window.confirm(`Xóa đề thi "${topic.title}"?`)) return;
    deleteMutation.mutate(topic.id);
  };

  const courseOptions = courses.map((c) => ({
    value: c.id,
    label: c.name,
    searchLabel: c.name,
  }));

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-3 pb-8 sm:p-6">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        {/* Header */}
        <section className="relative overflow-hidden rounded-2xl border border-border-default bg-gradient-to-br from-bg-secondary via-bg-surface to-bg-secondary/70 p-4 sm:p-5">
          <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-primary/10 blur-2xl" aria-hidden />
          <div className="relative">
            <h1 className="text-xl font-semibold text-text-primary sm:text-2xl">
              Thư viện đề thi
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              Quản lý đề thi (chuyên đề luyện tập) ở cấp khoá học. Đề thi dùng chung cho mọi lớp thuộc cùng khoá.
            </p>
          </div>
        </section>

        {/* Course selector + search + create */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <UpgradedSelect
              searchable
              value={selectedCourseId}
              onValueChange={(val) => {
                setSelectedCourseId(val);
                setPage(1);
                setExpandedTopicId(null);
              }}
              options={courseOptions}
              placeholder="Chọn khoá học..."
              emptyStateLabel="Không có khoá học nào."
              noResultsLabel="Không tìm thấy khoá học phù hợp."
              buttonClassName="w-full sm:w-72"
            />
          </div>

          {selectedCourseId && (
            <>
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Tìm đề thi..."
                className="min-w-0 flex-1 rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus sm:max-w-xs"
              />
              <button
                type="button"
                onClick={() => setShowCreateForm(true)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-text-inverse shadow-sm transition-colors duration-200 hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface sm:min-h-10"
              >
                <svg className="size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Tạo đề thi
              </button>
            </>
          )}
        </div>

        {/* Create form */}
        {showCreateForm && (
          <section className="rounded-xl border border-primary/30 bg-bg-surface p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-text-primary">Tạo đề thi mới</h3>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreate();
                  }
                  if (e.key === "Escape") setShowCreateForm(false);
                }}
                placeholder="Tên đề thi (VD: Đề thi giữa kỳ 2026)"
                className="min-w-0 flex-1 rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              />
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={!newTitle.trim()}
                  className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-10"
                >
                  Tạo
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="inline-flex min-h-11 items-center justify-center rounded-md border border-border-default px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-tertiary sm:min-h-10"
                >
                  Hủy
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Exam list */}
        {!selectedCourseId ? (
          <div className="rounded-lg border border-dashed border-border-default p-8 text-center text-sm text-text-secondary">
            Chọn một khoá học để xem thư viện đề thi.
          </div>
        ) : isLoading ? (
          <p className="text-sm text-text-secondary">Đang tải...</p>
        ) : exams.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border-default p-8 text-center text-sm text-text-secondary">
            {search
              ? `Không tìm thấy đề thi phù hợp với "${search}".`
              : "Chưa có đề thi nào trong thư viện. Tạo đề thi đầu tiên để bắt đầu."}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {exams.map((exam) => (
              <div
                key={exam.id}
                className="rounded-xl border border-border-default bg-bg-surface shadow-sm"
              >
                {/* Exam row */}
                <div className="flex items-center gap-3 p-3 sm:p-4">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedTopicId(
                        expandedTopicId === exam.id ? null : exam.id,
                      )
                    }
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <svg
                      className={`size-4 shrink-0 text-text-muted transition-transform ${expandedTopicId === exam.id ? "rotate-90" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <div className="min-w-0">
                      {editingTopic?.id === exam.id ? (
                        <div className="w-full" onClick={(e) => e.stopPropagation()}>
                          <input
                            autoFocus
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                e.stopPropagation();
                                if (!editTitle.trim()) return;
                                skipBlurSaveRef.current = true;
                                handleUpdate(exam);
                              }
                              if (e.key === "Escape") {
                                e.preventDefault();
                                e.stopPropagation();
                                skipBlurSaveRef.current = true;
                                setEditingTopic(null);
                                setEditTitle("");
                              }
                            }}
                            onBlur={() => {
                              if (skipBlurSaveRef.current) {
                                skipBlurSaveRef.current = false;
                                return;
                              }
                              handleUpdate(exam);
                            }}
                            className="w-full rounded border border-border-focus bg-bg-surface px-2 py-1 text-sm text-text-primary focus:outline-none"
                            aria-describedby="exam-rename-hint"
                          />
                          <p
                            id="exam-rename-hint"
                            className="mt-1 text-[11px] text-text-muted"
                          >
                            Enter lưu · Escape huỷ · rời ô lưu
                          </p>
                        </div>
                      ) : (
                        <span className="truncate text-sm font-medium text-text-primary">
                          {exam.title}
                        </span>
                      )}
                    </div>
                  </button>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTopic(exam);
                        setEditTitle(exam.title);
                      }}
                      className="rounded-md border border-border-default px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-bg-tertiary"
                    >
                      Sửa tên
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(exam)}
                      className="rounded-md border border-error/30 px-3 py-1.5 text-xs font-medium text-error transition-colors hover:bg-error/10"
                    >
                      Xóa
                    </button>
                  </div>
                </div>

                {/* Expanded: Question links */}
                {expandedTopicId === exam.id && (
                  <div className="border-t border-border-default p-3 sm:p-4">
                    <PracticeTopicQuestionsCard
                      topicId={exam.id}
                      courseId={selectedCourseId}
                      canEdit={true}
                    />
                  </div>
                )}
              </div>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-md border border-border-default px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-tertiary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Trước
                </button>
                <span className="text-xs text-text-secondary">
                  Trang {page} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="rounded-md border border-border-default px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-tertiary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Sau
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
