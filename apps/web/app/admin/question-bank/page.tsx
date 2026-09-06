"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as questionApi from "@/lib/apis/question.api";
import { api } from "@/lib/client";
import { questionKeys, courseKeys } from "@/lib/query-keys";
import MathRichTextEditor from "@/components/ui/MathRichTextEditor";
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
  QuestionTypeDto,
} from "@/dtos/question.dto";

// --- Types for related entities -------------------------------------------

interface Course {
  id: string;
  name: string;
}
interface Chapter {
  id: string;
  title: string;
}
interface DifficultyLevel {
  id: string;
  name: string;
}

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

function useChapters(courseId: string | undefined) {
  return useQuery({
    queryKey: [...courseKeys.all, "chapters", courseId],
    queryFn: async () => {
      if (!courseId) return [] as Chapter[];
      const res = await api.get<Chapter[]>(
        `/course/${courseId}/chapters`,
      );
      return res.data;
    },
    enabled: !!courseId,
  });
}

function useDifficultyLevels(courseId: string | undefined) {
  return useQuery({
    queryKey: courseKeys.difficultyLevels(courseId ?? ""),
    queryFn: async () => {
      if (!courseId) return [] as DifficultyLevel[];
      const res = await api.get<DifficultyLevel[]>(
        `/courses/${courseId}/difficulty-levels`,
      );
      return res.data;
    },
    enabled: !!courseId,
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
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Question | null>(null);

  const { data: courses = [] } = useCourses();
  const { data: chapters = [] } = useChapters(courseFilter || undefined);
  const { data: difficultyLevels = [] } = useDifficultyLevels(
    courseFilter || undefined,
  );

  const filter: QuestionFilter = {
    search: search || undefined,
    type: (typeFilter as QuestionTypeDto) || undefined,
    chapterId: chapterFilter || undefined,
    difficultyLevelId: difficultyFilter || undefined,
  };

  const { data: questions = [], isLoading } = useQuery({
    queryKey: questionKeys.list(filter as Record<string, unknown>),
    queryFn: () => questionApi.getQuestions(filter),
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: questionKeys.all });
  };

  const deleteMutation = useMutation({
    mutationFn: questionApi.deleteQuestion,
    onSuccess: async () => {
      toast.success("Đã xoá câu hỏi.");
      setDeleteTarget(null);
      await invalidate();
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
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-text-primary md:text-2xl">
          Ngân hàng câu hỏi
        </h1>
        <button
          onClick={openCreate}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          + Thêm câu hỏi
        </button>
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
        <p className="text-text-muted">Đang tải...</p>
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

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-bg-surface p-6 shadow-xl">
            <h2 className="mb-2 text-lg font-bold text-text-primary">
              Xác nhận xoá
            </h2>
            <p className="mb-4 text-sm text-text-secondary">
              Bạn có chắc muốn xoá câu hỏi này? Hành động này không thể hoàn
              tác.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-md border border-border-default px-4 py-2 text-sm text-text-secondary hover:bg-bg-secondary/40"
              >
                Huỷ
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? "Đang xoá..." : "Xoá"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form popup */}
      {showForm && (
        <QuestionFormPopup
          question={editingQuestion}
          onClose={() => {
            setShowForm(false);
            setEditingQuestion(null);
          }}
          onSaved={async () => {
            setShowForm(false);
            setEditingQuestion(null);
            await invalidate();
          }}
        />
      )}
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
  const [content, setContent] = useState(question?.content || "");
  const [type, setType] = useState<QuestionTypeDto>(
    (question?.type ?? "single_choice") as QuestionTypeDto,
  );
  const [options, setOptions] = useState<string[]>(
    question?.options || ["", ""],
  );
  const [correctIndex, setCorrectIndex] = useState<number>(
    question?.correctIndex ?? 0,
  );
  const [explanation, setExplanation] = useState(question?.explanation || "");
  const [answerGuide, setAnswerGuide] = useState(question?.answerGuide || "");
  const [courseId, setCourseId] = useState(question?.courseId || "");
  const [chapterId, setChapterId] = useState(question?.chapterId || "");
  const [difficultyLevelId, setDifficultyLevelId] = useState(
    question?.difficultyLevelId || "",
  );

  const { data: courses = [] } = useCourses();
  const { data: chapters = [] } = useChapters(courseId || undefined);
  const { data: difficultyLevels = [] } = useDifficultyLevels(
    courseId || undefined,
  );

  const saveMutation = useMutation({
    mutationFn: (data: CreateQuestionInput) =>
      question
        ? questionApi.updateQuestion(question.id, data)
        : questionApi.createQuestion(data),
    onSuccess: async () => {
      toast.success(question ? "Đã cập nhật câu hỏi." : "Đã tạo câu hỏi.");
      await queryClient.invalidateQueries({ queryKey: questionKeys.all });
      onSaved();
    },
    onError: () => {
      toast.error("Không thể lưu câu hỏi.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      courseId,
      chapterId,
      difficultyLevelId,
      type,
      content,
      options: type === "single_choice" ? options : undefined,
      correctIndex: type === "single_choice" ? correctIndex : undefined,
      explanation: explanation || undefined,
      answerGuide: answerGuide || undefined,
    });
  };

  const updateOption = (index: number, value: string) => {
    const next = [...options];
    next[index] = value;
    setOptions(next);
  };

  const addOption = () => {
    if (options.length < 6) setOptions([...options, ""]);
  };

  const removeOption = (index: number) => {
    if (options.length > 2) setOptions(options.filter((_, i) => i !== index));
  };

  const courseOptions = courses.map((c) => ({ value: c.id, label: c.name }));
  const chapterOptions = chapters.map((ch) => ({
    value: ch.id,
    label: ch.title,
  }));
  const difficultyOptions = difficultyLevels.map((d) => ({
    value: d.id,
    label: d.name,
  }));
  const typeOptions = [
    { value: "single_choice", label: "Trắc nghiệm" },
    { value: "essay", label: "Tự luận" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-bg-surface p-4 shadow-xl md:p-6">
        <h2 className="mb-4 text-lg font-bold text-text-primary">
          {question ? "Sửa câu hỏi" : "Thêm câu hỏi mới"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Course / Chapter / Difficulty pickers */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">
                Khoá học
              </label>
              <UpgradedSelect
                value={courseId}
                onValueChange={(v) => {
                  setCourseId(v);
                  setChapterId("");
                  setDifficultyLevelId("");
                }}
                options={courseOptions}
                placeholder="Chọn khoá học"
                ariaLabel="Khoá học"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">
                Chủ đề
              </label>
              <UpgradedSelect
                value={chapterId}
                onValueChange={setChapterId}
                options={chapterOptions}
                placeholder="Chọn chủ đề"
                disabled={!courseId}
                ariaLabel="Chủ đề"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">
                Độ khó
              </label>
              <UpgradedSelect
                value={difficultyLevelId}
                onValueChange={setDifficultyLevelId}
                options={difficultyOptions}
                placeholder="Chọn độ khó"
                disabled={!courseId}
                ariaLabel="Độ khó"
              />
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">
              Loại câu hỏi
            </label>
            <UpgradedSelect
              value={type}
              onValueChange={(v) => setType(v as QuestionTypeDto)}
              options={typeOptions}
              ariaLabel="Loại câu hỏi"
            />
          </div>

          {/* Content (TipTap + math) */}
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">
              Nội dung câu hỏi (hỗ trợ LaTeX: $x^2$)
            </label>
            <MathRichTextEditor
              value={content}
              onChange={setContent}
              placeholder="Nhập nội dung câu hỏi..."
              minHeight="min-h-[120px]"
            />
          </div>

          {/* Options (single_choice only) */}
          {type === "single_choice" && (
            <div className="space-y-2">
              <label className="mb-1 block text-xs font-medium text-text-muted">
                Phương án ({options.length}/6)
              </label>
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-6 text-center text-sm font-bold text-text-muted">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <input
                    value={opt}
                    onChange={(e) => updateOption(i, e.target.value)}
                    className="flex-1 rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    placeholder={`Phương án ${String.fromCharCode(65 + i)}`}
                  />
                  <input
                    type="radio"
                    name="correctIndex"
                    checked={correctIndex === i}
                    onChange={() => setCorrectIndex(i)}
                    className="accent-primary"
                    title="Đáp án đúng"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(i)}
                      className="text-red-500 hover:text-red-700"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {options.length < 6 && (
                <button
                  type="button"
                  onClick={addOption}
                  className="text-sm text-primary hover:underline"
                >
                  + Thêm phương án
                </button>
              )}
            </div>
          )}

          {/* Explanation */}
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">
              Giải thích (tuỳ chọn)
            </label>
            <MathRichTextEditor
              value={explanation}
              onChange={setExplanation}
              placeholder="Giải thích đáp án..."
              minHeight="min-h-[80px]"
            />
          </div>

          {/* Answer guide (essay) */}
          {type === "essay" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">
                Hướng dẫn trả lời (tuỳ chọn)
              </label>
              <MathRichTextEditor
                value={answerGuide}
                onChange={setAnswerGuide}
                placeholder="Hướng dẫn cho câu tự luận..."
                minHeight="min-h-[80px]"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border-default px-4 py-2 text-sm text-text-secondary hover:bg-bg-secondary/40"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {saveMutation.isPending ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
