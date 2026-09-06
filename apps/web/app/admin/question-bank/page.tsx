"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as questionApi from "@/lib/apis/question.api";
import { questionKeys } from "@/lib/query-keys";
import MathRichTextEditor from "@/components/ui/MathRichTextEditor";
import type {
  Question,
  CreateQuestionInput,
} from "@/dtos/question.dto";
import { QuestionTypeDto } from "@/dtos/question.dto";

export default function QuestionBankPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<QuestionTypeDto | "">("");
  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  const { data: questions = [], isLoading } = useQuery({
    queryKey: questionKeys.list({ search, type: typeFilter }),
    queryFn: () =>
      questionApi.getQuestions({
        search: search || undefined,
        type: (typeFilter as QuestionTypeDto) || undefined,
      }),
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: questionKeys.all });
  };

  const deleteMutation = useMutation({
    mutationFn: questionApi.deleteQuestion,
    onSuccess: async () => {
      toast.success("Đã xoá câu hỏi.");
      await invalidate();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err?.response?.data?.message || "Không thể xoá câu hỏi.");
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">
          Ngân hàng câu hỏi
        </h1>
        <button
          onClick={openCreate}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          + Thêm câu hỏi
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Tìm kiếm nội dung..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as QuestionTypeDto | "")}
          className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus"
        >
          <option value="">Tất cả loại</option>
          <option value="single_choice">Trắc nghiệm</option>
          <option value="essay">Tự luận</option>
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="text-text-muted">Đang tải...</p>
      ) : questions.length === 0 ? (
        <p className="text-text-muted">Chưa có câu hỏi nào.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border-default">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border-default bg-bg-secondary/40 text-xs font-medium uppercase text-text-muted">
              <tr>
                <th className="px-4 py-3">Nội dung</th>
                <th className="px-4 py-3">Loại</th>
                <th className="px-4 py-3">Phương án</th>
                <th className="px-4 py-3">Đáp án</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {questions.map((q) => (
                <tr key={q.id} className="hover:bg-bg-secondary/20">
                  <td className="max-w-xs truncate px-4 py-3 text-text-primary">
                    {q.content.replace(/<[^>]+>/g, "").slice(0, 80)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        q.type === "single_choice"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {q.type === "single_choice" ? "Trắc nghiệm" : "Tự luận"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {q.options ? q.options.length : "—"}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {q.correctIndex !== null ? String.fromCharCode(65 + q.correctIndex) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(q)}
                      className="mr-2 text-sm text-primary hover:underline"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Xoá câu hỏi này?")) {
                          deleteMutation.mutate(q.id);
                        }
                      }}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Xoá
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
    question?.type ?? QuestionTypeDto.single_choice,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-bg-surface p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-text-primary">
          {question ? "Sửa câu hỏi" : "Thêm câu hỏi mới"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* IDs (simplified – in production use pickers) */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">
                Course ID
              </label>
              <input
                required
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none"
                placeholder="UUID"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">
                Chapter ID
              </label>
              <input
                required
                value={chapterId}
                onChange={(e) => setChapterId(e.target.value)}
                className="w-full rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none"
                placeholder="UUID"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">
                Difficulty Level ID
              </label>
              <input
                required
                value={difficultyLevelId}
                onChange={(e) => setDifficultyLevelId(e.target.value)}
                className="w-full rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none"
                placeholder="UUID"
              />
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">
              Loại câu hỏi
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as QuestionTypeDto)}
              className="w-full rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none"
            >
              <option value="single_choice">Trắc nghiệm</option>
              <option value="essay">Tự luận</option>
            </select>
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
                    className="flex-1 rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none"
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
