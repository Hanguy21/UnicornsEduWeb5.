"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import * as questionApi from "@/lib/apis/question.api";
import { api } from "@/lib/client";
import { courseKeys } from "@/lib/query-keys";
import { invalidateQuestionScopedQueries } from "@/lib/query-invalidation";
import UpgradedSelect from "@/components/ui/UpgradedSelect";
import {
  ResponsiveActionFooter,
  ResponsiveDialog,
  ResponsiveDialogBody,
} from "@/components/ui/ResponsiveDialog";
import {
  confirmUnsavedClose,
  useConfirmDialog,
} from "@/components/ui/ConfirmDialog";
import { QuestionTypeDto } from "@/dtos/question.dto";
import type { CreateQuestionInput, QuestionFormInitial } from "@/dtos/question.dto";
import type { Course } from "@/dtos/class.dto";
import QuestionFormFields, {
  type QuestionFormValue,
} from "@/components/admin/question/QuestionFormFields";

function useCourses() {
  return useQuery({
    queryKey: courseKeys.list(false),
    queryFn: async () => {
      const res = await api.get<Course[]>("/courses");
      return res.data;
    },
  });
}

/**
 * Dialog soạn / sửa một câu hỏi trong ngân hàng. Dùng chung cho trang Ngân hàng
 * câu hỏi và cho dialog đề thi ở Thư viện đề thi.
 *
 * `lockedCourseId` khoá cứng khoá học (ẩn ô chọn khoá) — dùng khi mở từ một đề
 * thi, vì câu hỏi của đề luôn thuộc đúng khoá của đề đó.
 */
export default function QuestionFormDialog({
  question,
  lockedCourseId,
  onClose,
  onSaved,
}: {
  question: QuestionFormInitial | null;
  lockedCourseId?: string;
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
  const [courseId, setCourseId] = useState(
    lockedCourseId || question?.courseId || "",
  );
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
  const courseName = courses.find((c) => c.id === courseId)?.name;
  const { confirm, dialog } = useConfirmDialog();
  const isDirty =
    JSON.stringify(form) !== JSON.stringify(initialValue) ||
    courseId !== (lockedCourseId || question?.courseId || "");

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
                {lockedCourseId ? (
                  <p className="rounded-md border border-border-default bg-bg-secondary/40 px-3 py-2 text-sm text-text-secondary">
                    {courseName ?? "Khoá học hiện tại"}
                  </p>
                ) : (
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
                )}
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
