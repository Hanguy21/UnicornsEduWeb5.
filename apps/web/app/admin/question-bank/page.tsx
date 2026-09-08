"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import * as questionApi from "@/lib/apis/question.api";
import { api } from "@/lib/client";
import { questionKeys, courseKeys } from "@/lib/query-keys";
import { invalidateQuestionScopedQueries } from "@/lib/query-invalidation";
import { useCourseChapters } from "@/lib/hooks/useCourseChapters";
import { useCourseDifficultyLevels } from "@/lib/hooks/useCourseDifficultyLevels";
import MathContent from "@/components/ui/MathContent";
import UpgradedSelect from "@/components/ui/UpgradedSelect";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import type { Question, QuestionFilter } from "@/dtos/question.dto";
import { QuestionTypeDto } from "@/dtos/question.dto";
import QuestionFormDialog from "@/components/admin/question/QuestionFormDialog";
import type { Course } from "@/dtos/class.dto";
import { Skeleton } from "@/components/ui/skeleton";
import AiImportModal from "@/components/admin/question-bank/AiImportModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

// --- Data fetching hooks --------------------------------------------------

function useCourses() {
  return useQuery({
    queryKey: courseKeys.list(false),
    queryFn: async () => {
      const res = await api.get<Course[]>("/courses");
      return res.data;
    },
  });
}

// --- Page component -------------------------------------------------------

export default function QuestionBankPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [courseFilter, setCourseFilter] = useState<string>("");
  const [chapterFilter, setChapterFilter] = useState<string>("");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [showAiImport, setShowAiImport] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Question | null>(null);

  const { data: courses = [] } = useCourses();
  const { data: chapters = [] } = useCourseChapters(courseFilter || undefined);
  const { data: difficultyLevels = [] } = useCourseDifficultyLevels(
    courseFilter || undefined,
  );

  const filter: QuestionFilter = {
    courseId: courseFilter || undefined,
    search: search || undefined,
    type: (typeFilter as QuestionTypeDto) || undefined,
    chapterId: chapterFilter || undefined,
    difficultyLevelId: difficultyFilter || undefined,
  };

  const { data: questions = [], isLoading } = useQuery({
    queryKey: questionKeys.list(filter as Record<string, unknown>),
    queryFn: () => questionApi.getQuestions(filter),
  });

  const invalidate = async (scopeCourseId?: string) => {
    await invalidateQuestionScopedQueries(
      queryClient,
      scopeCourseId || courseFilter || undefined,
    );
  };

  const deleteMutation = useMutation({
    mutationFn: questionApi.deleteQuestion,
    onSuccess: async () => {
      const scopedId = deleteTarget?.courseId || courseFilter || undefined;
      toast.success("Đã xoá câu hỏi.");
      setDeleteTarget(null);
      await invalidate(scopedId);
    },
    onError: (err: {
      response?: { data?: { message?: string; usedBy?: string[] } };
    }) => {
      const data = err?.response?.data;
      if (data?.usedBy?.length) {
        toast.error(
          `Câu hỏi đang được dùng ở ${data.usedBy.length} chuyên đề. Không thể xoá.`,
        );
      } else {
        toast.error(data?.message || "Không thể xoá câu hỏi.");
      }
    },
  });

  const openCreate = () => {
    setEditingQuestion(null);
    setShowForm(true);
  };

  const openEdit = (q: Question) => {
    setEditingQuestion(q);
    setShowForm(true);
  };

  const courseOptions = [
    { value: "", label: "Tất cả khoá học" },
    ...courses.map((c) => ({ value: c.id, label: c.name })),
  ];
  const chapterOptions = [
    { value: "", label: "Tất cả chủ đề" },
    ...chapters.map((ch) => ({ value: ch.id, label: ch.title })),
  ];
  const difficultyOptions = [
    { value: "", label: "Tất cả độ khó" },
    ...difficultyLevels.map((d) => ({ value: d.id, label: d.name })),
  ];
  const typeOptions = [
    { value: "", label: "Tất cả loại" },
    { value: "single_choice", label: "Trắc nghiệm" },
    { value: "essay", label: "Tự luận" },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-3 pb-8 sm:p-6">
      {/* `gap-4` ở đây là khoảng cách chung giữa header / bộ lọc / danh sách —
          trước đó card không có gap nên ba khối dính sát nhau. */}
      <div className="flex min-w-0 flex-1 flex-col gap-4 rounded-xl border border-border-default bg-bg-surface p-3 shadow-sm sm:rounded-lg sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-bold text-text-primary md:text-2xl">
            Ngân hàng câu hỏi
          </h1>
          {/* Mobile: hai nút chia đôi hàng; sm+: co lại theo nội dung. */}
          <div className="flex flex-wrap gap-2">
            <span
              className="inline-flex flex-1 sm:flex-none"
              title={!courseFilter ? "Chọn khoá học trước" : undefined}
            >
              <button
                type="button"
                onClick={() => setShowAiImport(true)}
                disabled={!courseFilter}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-border-default bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary hover:bg-bg-secondary/40 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-10 sm:w-auto"
              >
                Nhập từ AI
              </button>
            </span>
            <button
              onClick={openCreate}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 sm:min-h-10 sm:flex-none"
            >
              + Thêm câu hỏi
            </button>
          </div>
        </div>

        {/* Filters — mobile: xếp dọc; sm: 2 cột; xl: 4 cột cạnh ô tìm kiếm. */}
        <div className="flex flex-col gap-3 md:flex-row md:items-start">
          <input
            type="text"
            placeholder="Tìm kiếm nội dung..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-h-11 w-full rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus md:w-64 md:shrink-0"
          />
          <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <UpgradedSelect
              value={courseFilter}
              onValueChange={(v) => {
                setCourseFilter(v);
                setChapterFilter("");
                setDifficultyFilter("");
              }}
              searchable
              options={courseOptions}
              placeholder="Khoá học"
              ariaLabel="Lọc theo khoá học"
              noResultsLabel="Không tìm thấy khoá học phù hợp."
            />
            <UpgradedSelect
              value={chapterFilter}
              onValueChange={setChapterFilter}
              searchable
              options={chapterOptions}
              placeholder="Chủ đề"
              disabled={!courseFilter}
              ariaLabel="Lọc theo chủ đề"
              noResultsLabel="Không tìm thấy chủ đề phù hợp."
            />
            <UpgradedSelect
              value={difficultyFilter}
              onValueChange={setDifficultyFilter}
              options={difficultyOptions}
              placeholder="Độ khó"
              disabled={!courseFilter}
              ariaLabel="Lọc theo độ khó"
            />
            <UpgradedSelect
              value={typeFilter}
              onValueChange={setTypeFilter}
              options={typeOptions}
              placeholder="Loại câu hỏi"
              ariaLabel="Lọc theo loại"
            />
          </div>
        </div>

        {/* Danh sách — mobile: card đọc được nội dung; md+: bảng. */}
        {isLoading ? (
          <div
            className="space-y-2"
            role="status"
            aria-label="Đang tải danh sách câu hỏi"
          >
            <Skeleton className="h-20 w-full md:h-10" />
            <Skeleton className="h-20 w-full md:h-10" />
            <Skeleton className="h-20 w-full md:h-10" />
            <Skeleton className="h-20 w-full md:h-10" />
            <Skeleton className="h-20 w-full md:h-10" />
          </div>
        ) : questions.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border-default p-6 text-center text-sm text-text-muted">
            Chưa có câu hỏi nào.
          </p>
        ) : (
          <>
            {/* Mobile: bảng ẩn gần hết cột nên nội dung câu hỏi biến mất —
                dùng card để vẫn đọc được câu hỏi và thao tác bằng ngón tay. */}
            <ul className="flex flex-col gap-3 md:hidden">
              {questions.map((q) => (
                <li
                  key={q.id}
                  role="button"
                  tabIndex={0}
                  className="group relative cursor-pointer rounded-lg border border-border-default bg-bg-primary p-3 transition-colors hover:bg-bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  onClick={() => openEdit(q)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openEdit(q);
                    }
                  }}
                  aria-label="Sửa câu hỏi"
                >
                  <button
                    type="button"
                    className="absolute right-2 top-2 rounded-lg p-2 text-text-muted transition-colors hover:bg-error/10 hover:text-error focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    aria-label="Xoá câu hỏi"
                    title="Xoá"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(q);
                    }}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                  <MathContent
                    content={q.content}
                    className="line-clamp-4 pr-10 text-sm text-text-primary"
                  />
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                    <Badge variant={q.type === "single_choice" ? "info" : "success"}>
                      {q.type === "single_choice" ? "Trắc nghiệm" : "Tự luận"}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nội dung</TableHead>
                    <TableHead className="w-28">Loại</TableHead>
                    <TableHead className="w-12">
                      <span className="sr-only">Xoá</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questions.map((q) => (
                    <TableRow
                      key={q.id}
                      role="button"
                      tabIndex={0}
                      className="group cursor-pointer"
                      onClick={() => openEdit(q)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openEdit(q);
                        }
                      }}
                      aria-label="Sửa câu hỏi"
                    >
                      <TableCell className="max-w-xs">
                        <MathContent
                          content={q.content}
                          className="line-clamp-2 text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant={q.type === "single_choice" ? "info" : "success"}>
                          {q.type === "single_choice" ? "Trắc nghiệm" : "Tự luận"}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className="text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="rounded-lg p-2 text-text-muted opacity-0 transition-all group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-error/10 hover:text-error focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                          aria-label="Xoá câu hỏi"
                          title="Xoá"
                          onClick={() => setDeleteTarget(q)}
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

      {deleteTarget && (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          title="Xác nhận xoá"
          description="Bạn có chắc muốn xoá câu hỏi này? Hành động này không thể hoàn tác."
          confirmLabel="Xoá"
          cancelLabel="Huỷ"
          variant="destructive"
          confirmPending={deleteMutation.isPending}
          onConfirm={() => {
            deleteMutation.mutate(deleteTarget.id);
            setDeleteTarget(null);
          }}
        />
      )}

      {/* Form popup */}
      {showForm && (
        <QuestionFormDialog
          question={editingQuestion}
          onClose={() => {
            setShowForm(false);
            setEditingQuestion(null);
          }}
          onSaved={() => {
            setShowForm(false);
            setEditingQuestion(null);
          }}
        />
      )}

      {/* AI Import modal */}
      {showAiImport && courseFilter && (
        <AiImportModal
          courseId={courseFilter}
          onClose={() => setShowAiImport(false)}
          onImported={async () => {
            setShowAiImport(false);
            await invalidate();
          }}
        />
      )}
      </div>
    </div>
  );
}
