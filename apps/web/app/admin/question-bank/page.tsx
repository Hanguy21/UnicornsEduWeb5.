"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import type {
  Question,
  CreateQuestionInput,
  QuestionFilter,
} from "@/dtos/question.dto";
import { QuestionTypeDto } from "@/dtos/question.dto";
import QuestionFormFields, {
  type QuestionFormValue,
} from "@/components/admin/question/QuestionFormFields";
import type { Course } from "@/dtos/class.dto";
import { Skeleton } from "@/components/ui/skeleton";
import AiImportModal from "@/components/admin/question-bank/AiImportModal";
import {
  ResponsiveActionFooter,
  ResponsiveDialog,
  ResponsiveDialogBody,
} from "@/components/ui/ResponsiveDialog";
import {
  ConfirmDialog,
  confirmUnsavedClose,
  useConfirmDialog,
} from "@/components/ui/ConfirmDialog";

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
      <div className="flex min-w-0 flex-1 flex-col rounded-xl border border-border-default bg-bg-surface p-3 shadow-sm sm:rounded-lg sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-text-primary md:text-2xl">
          Ngân hàng câu hỏi
        </h1>
        <div className="flex gap-2">
          <span
            className="inline-flex"
            title={!courseFilter ? "Chọn khoá học trước" : undefined}
          >
            <button
              type="button"
              onClick={() => setShowAiImport(true)}
              disabled={!courseFilter}
              className="inline-flex items-center justify-center rounded-md border border-border-default bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary hover:bg-bg-secondary/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Nhập từ AI
            </button>
          </span>
          <button
            onClick={openCreate}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            + Thêm câu hỏi
          </button>
        </div>
      </div>

      {/* Filters — mobile: stacked, md+: row */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <input
          type="text"
          placeholder="Tìm kiếm nội dung..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus md:w-64"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 md:flex-row">
          <UpgradedSelect
            value={courseFilter}
            onValueChange={(v) => {
              setCourseFilter(v);
              setChapterFilter("");
              setDifficultyFilter("");
            }}
            options={courseOptions}
            placeholder="Khoá học"
            ariaLabel="Lọc theo khoá học"
          />
          <UpgradedSelect
            value={chapterFilter}
            onValueChange={setChapterFilter}
            options={chapterOptions}
            placeholder="Chủ đề"
            disabled={!courseFilter}
            ariaLabel="Lọc theo chủ đề"
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

      {/* Table */}
      {isLoading ? (
        <div
          className="space-y-2"
          role="status"
          aria-label="Đang tải danh sách câu hỏi"
        >
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : questions.length === 0 ? (
        <p className="text-text-muted">Chưa có câu hỏi nào.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="hidden md:table-cell">Nội dung</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead className="hidden sm:table-cell">
                Phương án
              </TableHead>
              <TableHead className="hidden sm:table-cell">Đáp án</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {questions.map((q) => (
              <TableRow key={q.id}>
                <TableCell className="hidden max-w-xs truncate md:table-cell">
                  <MathContent
                    content={q.content.slice(0, 120)}
                    className="text-sm"
                  />
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      q.type === "single_choice" ? "info" : "success"
                    }
                  >
                    {q.type === "single_choice" ? "Trắc nghiệm" : "Tự luận"}
                  </Badge>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {q.options ? q.options.length : "—"}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {q.correctIndex !== null
                    ? String.fromCharCode(65 + q.correctIndex)
                    : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <button
                    onClick={() => openEdit(q)}
                    className="mr-2 text-sm text-primary hover:underline"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => setDeleteTarget(q)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Xoá
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
        <QuestionFormPopup
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

// --- Form popup -----------------------------------------------------------

function QuestionFormPopup({
  question,
  onClose,
  onSaved,
}: {
  question: Question | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const queryClient = useQueryClient();
  const initialValue: QuestionFormValue = {
    chapterId: question?.chapterId || "",
    difficultyLevelId: question?.difficultyLevelId || "",
    type: (question?.type ?? QuestionTypeDto.single_choice) as QuestionTypeDto,
    content: question?.content || "",
    options: question?.options || ["", ""],
    correctIndex: question?.correctIndex ?? 0,
    explanation: question?.explanation || "",
    answerGuide: question?.answerGuide || "",
  };
  const [form, setForm] = useState<QuestionFormValue>(initialValue);
  const [courseId, setCourseId] = useState(question?.courseId || "");
  const patchForm = (patch: Partial<QuestionFormValue>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  const { data: courses = [] } = useCourses();

  const saveMutation = useMutation({
    mutationFn: (data: CreateQuestionInput) =>
      question
        ? questionApi.updateQuestion(question.id, data)
        : questionApi.createQuestion(data),
    onSuccess: async () => {
      toast.success(question ? "Đã cập nhật câu hỏi." : "Đã tạo câu hỏi.");
      await invalidateQuestionScopedQueries(queryClient, courseId || undefined);
      onSaved();
    },
    onError: () => {
      toast.error("Không thể lưu câu hỏi.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isChoice = form.type === QuestionTypeDto.single_choice;
    saveMutation.mutate({
      courseId,
      chapterId: form.chapterId,
      difficultyLevelId: form.difficultyLevelId,
      type: form.type,
      content: form.content,
      options: isChoice ? form.options : undefined,
      correctIndex: isChoice ? form.correctIndex : undefined,
      explanation: form.explanation || undefined,
      answerGuide: form.answerGuide || undefined,
    });
  };

  const courseOptions = courses.map((c) => ({ value: c.id, label: c.name }));
  const { confirm, dialog } = useConfirmDialog();
  const isDirty =
    JSON.stringify(form) !== JSON.stringify(initialValue) ||
    courseId !== (question?.courseId || "");

  const requestClose = async () => {
    if (await confirmUnsavedClose(confirm, isDirty)) onClose();
  };

  return (
    <>
    <ResponsiveDialog
      size="3xl"
      labelledBy="question-form-title"
      onBackdropClick={() => void requestClose()}
    >
        <div className="border-b border-border-default px-4 py-3 md:px-6">
          <h2 id="question-form-title" className="text-lg font-bold text-text-primary">
            {question ? "Sửa câu hỏi" : "Thêm câu hỏi mới"}
          </h2>
        </div>
        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
        <ResponsiveDialogBody className="space-y-4">
          <QuestionFormFields
            courseId={courseId}
            value={form}
            onChange={patchForm}
            courseSlot={
              <div>
                <label className="mb-1 block text-xs font-medium text-text-muted">
                  Khoá học
                </label>
                <UpgradedSelect
                  value={courseId}
                  onValueChange={(v) => {
                    setCourseId(v);
                    patchForm({ chapterId: "", difficultyLevelId: "" });
                  }}
                  options={courseOptions}
                  placeholder="Chọn khoá học"
                  ariaLabel="Khoá học"
                />
              </div>
            }
          />
        </ResponsiveDialogBody>
          <ResponsiveActionFooter>
            <button
              type="button"
              onClick={() => void requestClose()}
              className="rounded-md border border-border-default px-4 py-2 text-sm text-text-secondary hover:bg-bg-secondary/40"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-text-inverse hover:bg-primary/90 disabled:opacity-50"
            >
              {saveMutation.isPending ? "Đang lưu..." : "Lưu"}
            </button>
          </ResponsiveActionFooter>
        </form>
    </ResponsiveDialog>
    {dialog}
    </>
  );
}
