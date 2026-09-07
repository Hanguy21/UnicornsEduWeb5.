"use client";

import { useState, useMemo, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as questionApi from "@/lib/apis/question.api";
import { api } from "@/lib/client";
import { questionKeys, courseKeys } from "@/lib/query-keys";
import {
  allQuestionsReviewed,
  importDisabledReason,
  remapReviewedAfterRemove,
  remainingReviewLabel,
  revalidateAiQuestion,
  summarizeInvalidQuestions,
  unreviewedCount,
  validateAiJson,
} from "@/lib/ai-import-review.helpers";
import MathContent from "@/components/ui/MathContent";
import UpgradedSelect from "@/components/ui/UpgradedSelect";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveDialog,
} from "@/components/ui/ResponsiveDialog";
import {
  confirmUnsavedClose,
  useConfirmDialog,
} from "@/components/ui/ConfirmDialog";
import type { Course, CourseDifficultyLevel } from "@/dtos/class.dto";
import type { Chapter } from "@/dtos/topic.dto";
import {
  AiImportStep,
  type ValidatedAiQuestion,
  type Question,
} from "@/dtos/question.dto";

interface AiImportModalProps {
  courseId: string;
  onClose: () => void;
  onImported: () => void;
  variant?: "modal" | "inline";
  onImportedQuestions?: (questions: Question[]) => void;
}

const STEP_LABEL: Record<AiImportStep, string> = {
  [AiImportStep.prompt]: "Lấy prompt",
  [AiImportStep.paste]: "Dán JSON",
  [AiImportStep.review]: "Soát câu",
};

export default function AiImportModal({
  courseId,
  onClose,
  onImported,
  variant = "modal",
  onImportedQuestions,
}: AiImportModalProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<AiImportStep>(AiImportStep.prompt);
  const [topic, setTopic] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [rawJson, setRawJson] = useState("");
  const [items, setItems] = useState<ValidatedAiQuestion[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviewed, setReviewed] = useState<Set<number>>(() => new Set());

  const { data: course } = useQuery({
    queryKey: courseKeys.detail(courseId),
    queryFn: async () => {
      const res = await api.get<Course>(`/courses/${courseId}`);
      return res.data;
    },
  });

  const { data: difficultyLevels = [] } = useQuery({
    queryKey: courseKeys.difficultyLevels(courseId),
    queryFn: async () => {
      const res = await api.get<CourseDifficultyLevel[]>(
        `/courses/${courseId}/difficulty-levels`,
      );
      return res.data;
    },
  });

  const { data: chapters = [] } = useQuery({
    queryKey: [...courseKeys.all, "chapters", courseId],
    queryFn: async () => {
      const res = await api.get<Chapter[]>(`/course/${courseId}/chapters`);
      return res.data;
    },
  });

  const difficultyNames = useMemo(
    () => difficultyLevels.map((level) => level.name),
    [difficultyLevels],
  );

  const resolveDifficultyId = useCallback(
    (name: string): string => {
      const level = difficultyLevels.find(
        (entry) => entry.name.trim() === name.trim(),
      );
      return level?.id ?? "";
    },
    [difficultyLevels],
  );

  const prompt = useMemo(() => {
    const courseName = course?.name ?? "N/A";
    const diffList = difficultyNames.length
      ? difficultyNames.map((name) => `  - ${name}`).join("\n")
      : "  (chưa có level)";
    return `Bạn là trợ lý soạn câu hỏi cho khoá ${courseName} của Unicorns Edu.

NHIỆM VỤ
Sinh ${questionCount} câu hỏi về: ${topic || "(nhập chủ đề)"}.

ĐỊNH DẠNG ĐẦU RA — BẮT BUỘC
Chỉ in ra một JSON array. Không markdown, không rào \`\`\`json,
không lời dẫn, không giải thích nào ngoài JSON.

Mỗi phần tử là một object:
{
  "type": "single_choice" | "essay",
  "content": "Nội dung câu hỏi",
  "options": ["...", "...", "...", "..."],
  "correctIndex": 0,
  "explanation": "Lời giải ngắn gọn",
  "answerGuide": "Barem/ý chính cần có",
  "difficulty": "Nhận biết"
}

QUY TẮC TỪNG TRƯỜNG
- type          bắt buộc. Chỉ nhận "single_choice" hoặc "essay".
- content       bắt buộc, không được rỗng.
- options       CHỈ có ở single_choice. Từ 2 đến 6 phương án.
                Không tự đánh A/B/C/D hay 1./2. ở đầu phương án.
- correctIndex  CHỈ có ở single_choice. Số nguyên đếm từ 0,
                phải nhỏ hơn số phần tử của options.
- explanation   tuỳ chọn, dùng cho single_choice.
- answerGuide   CHỈ có ở essay. Ý chính để gia sư chấm.
- difficulty    bắt buộc. Phải trùng KHỚP TUYỆT ĐỐI một trong:
${diffList}
Không thêm bất kỳ trường nào khác.

CÔNG THỨC TOÁN
- Viết LaTeX đặt giữa hai dấu $, ví dụ: $y = x^3 - 3x + 2$.
- Trong chuỗi JSON, gạch chéo ngược nhân đôi:
  đúng   "$\\\\frac{1}{2}$"
  sai    "$\\frac{1}{2}$"

TỶ LỆ ĐỘ KHÓ
Mỗi câu nên theo tỷ lệ hợp lý giữa các mức độ khó.

TỰ KIỂM TRA TRƯỚC KHI TRẢ LỜI
1. Kết quả parse được bằng JSON.parse.
2. Mỗi single_choice có options hợp lệ và correctIndex trong khoảng.
3. Mỗi essay KHÔNG có options và KHÔNG có correctIndex.
4. Mỗi difficulty nằm trong danh sách đã cho.
5. Ký tự đầu tiên là [ và ký tự cuối cùng là ]`;
  }, [course?.name, difficultyNames, questionCount, topic]);

  const markViewed = (index: number) => {
    setReviewed((prev) => {
      if (prev.has(index)) return prev;
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  };

  const goToIndex = (index: number) => {
    if (items.length === 0) return;
    const clamped = Math.min(Math.max(index, 0), items.length - 1);
    setCurrentIndex(clamped);
    markViewed(clamped);
  };

  const enterReview = (nextItems: ValidatedAiQuestion[]) => {
    setItems(nextItems);
    setCurrentIndex(0);
    setReviewed(nextItems.length > 0 ? new Set([0]) : new Set());
    setStep(AiImportStep.review);
  };

  const handleValidate = () => {
    const result = validateAiJson(rawJson, difficultyNames);
    if (result.parseError) {
      toast.error(result.parseError);
      return;
    }
    const resolved = result.items.map((item) => ({
      ...item,
      difficultyLevelId: resolveDifficultyId(item.difficultyName),
    }));
    enterReview(resolved);
    const invalidLines = summarizeInvalidQuestions(resolved);
    const validCount = resolved.filter((item) => item._valid).length;
    if (invalidLines.length > 0) {
      toast.error(
        `Phát hiện ${validCount} câu hợp lệ, ${invalidLines.length} câu lỗi. ${invalidLines[0]}`,
      );
    } else {
      toast.success(`Phát hiện ${validCount} câu hợp lệ. Soát từng câu trước khi lưu.`);
    }
  };

  const updateItem = (index: number, patch: Partial<ValidatedAiQuestion>) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        return revalidateAiQuestion({ ...item, ...patch }, difficultyNames);
      }),
    );
  };

  const removeItem = (index: number) => {
    const nextLength = items.length - 1;
    const nextIndex =
      nextLength <= 0
        ? 0
        : currentIndex > index
          ? currentIndex - 1
          : Math.min(currentIndex, nextLength - 1);
    setItems((prev) => prev.filter((_, i) => i !== index));
    setReviewed((prev) => {
      const remapped = remapReviewedAfterRemove(prev, index);
      if (nextLength > 0) remapped.add(nextIndex);
      return remapped;
    });
    setCurrentIndex(nextIndex);
  };

  const currentQuestionIndex =
    items.length === 0
      ? 0
      : Math.min(Math.max(currentIndex, 0), items.length - 1);
  const currentItem = items[currentQuestionIndex];

  const importMutation = useMutation({
    mutationFn: () => {
      const validItems = items.filter((item) => item._valid);
      return questionApi.bulkCreateQuestions({
        courseId,
        chapterId: selectedChapterId,
        questions: validItems.map((item) => ({
          type: item.type,
          content: item.content,
          options: item.options,
          correctIndex: item.correctIndex,
          explanation: item.explanation,
          answerGuide: item.answerGuide,
          difficultyLevelId: item.difficultyLevelId,
        })),
      });
    },
    onSuccess: (res) => {
      toast.success(`Đã nhập thành công ${res.count} câu hỏi.`);
      void queryClient.invalidateQueries({
        queryKey: questionKeys.course(courseId),
      });
      onImportedQuestions?.(res.questions ?? []);
      onImported();
    },
    onError: () => {
      toast.error("Lỗi khi nhập câu hỏi. Vui lòng thử lại.");
    },
  });

  const validItems = items.filter((item) => item._valid);
  const invalidItems = items.filter((item) => !item._valid);
  const remainingUnreviewed = unreviewedCount(items.length, reviewed);
  const reviewComplete = allQuestionsReviewed(items.length, reviewed);
  const disabledReason = importDisabledReason({
    remainingUnreviewed,
    chapterId: selectedChapterId,
    validCount: validItems.length,
    isPending: importMutation.isPending,
  });
  const canImport = disabledReason === null;
  const reviewedPercent =
    items.length === 0
      ? 0
      : Math.round(((items.length - remainingUnreviewed) / items.length) * 100);

  const handleCopy = async (): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(prompt);
      toast.success("Đã sao chép prompt.");
      return true;
    } catch {
      toast.error("Không sao chép được prompt. Hãy chọn và sao chép thủ công.");
      return false;
    }
  };

  const chapterOptions = chapters.map((chapter) => ({
    value: chapter.id,
    label: chapter.title,
  }));

  const isInline = variant === "inline";
  const { confirm, dialog } = useConfirmDialog();
  const isDirty =
    step !== AiImportStep.prompt ||
    topic.trim() !== "" ||
    questionCount !== 10 ||
    rawJson.trim() !== "" ||
    items.length > 0;

  const requestClose = async () => {
    if (await confirmUnsavedClose(confirm, isDirty)) onClose();
  };

  const inner = (
    <>
        <div className="flex items-center justify-between border-b border-border-default px-4 py-3 md:px-6">
          <h2 id="ai-import-title" className="text-lg font-bold text-text-primary">
            Nhập câu hỏi từ AI
          </h2>
          <button
            type="button"
            onClick={() => void requestClose()}
            className="inline-flex size-11 items-center justify-center text-text-muted hover:text-text-primary"
            aria-label="Đóng"
          >
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-border-default px-4 py-2 md:px-6">
          {(
            [AiImportStep.prompt, AiImportStep.paste, AiImportStep.review] as const
          ).map((entry, idx) => (
            <button
              key={entry}
              type="button"
              onClick={() => {
                if (entry === AiImportStep.prompt) setStep(AiImportStep.prompt);
                if (entry === AiImportStep.paste && rawJson) setStep(AiImportStep.paste);
                if (entry === AiImportStep.review && items.length > 0) {
                  setStep(AiImportStep.review);
                  markViewed(currentQuestionIndex);
                }
              }}
              className={`min-h-11 rounded-full px-3 py-1 text-xs font-medium ${
                step === entry
                  ? "bg-primary text-text-inverse"
                  : "bg-bg-secondary text-text-muted"
              }`}
            >
              {idx + 1}. {STEP_LABEL[entry]}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
          {step === AiImportStep.prompt && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-muted">
                    Số câu hỏi
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={questionCount}
                    onChange={(e) =>
                      setQuestionCount(
                        Math.max(1, Math.min(50, Number(e.target.value) || 1)),
                      )
                    }
                    className="w-full rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-muted">
                    Chủ đề / Yêu cầu thêm
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="VD: Đạo hàm, Tích phân, Xác suất..."
                    className="w-full rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-medium text-text-muted">
                    Prompt (nhấn Sao chép để copy)
                  </label>
                  <span className="text-xs text-text-muted">
                    {difficultyNames.length} mức độ khó
                  </span>
                </div>
                <textarea
                  readOnly
                  value={prompt}
                  className="h-64 w-full rounded-md border border-border-default bg-bg-secondary/50 p-3 font-mono text-xs text-text-primary"
                />
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
                <button
                  type="button"
                  onClick={() => void requestClose()}
                  className="min-h-11 rounded-md border border-border-default px-4 py-2 text-sm text-text-secondary hover:bg-bg-secondary/40"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleCopy().then((copied) => {
                      if (copied) setStep(AiImportStep.paste);
                    });
                  }}
                  className="min-h-11 rounded-md bg-primary px-4 py-2 text-sm font-medium text-text-inverse hover:bg-primary/90"
                >
                  Sao chép & Tiếp tục
                </button>
              </div>
            </div>
          )}

          {step === AiImportStep.paste && (
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">
                Dán kết quả JSON từ ChatGPT/Claude vào dưới đây. Hệ thống sẽ
                validate ngay tại client và báo rõ câu nào, trường nào sai.
              </p>
              <textarea
                value={rawJson}
                onChange={(e) => setRawJson(e.target.value)}
                placeholder='[{"type":"single_choice","content":"...","options":["A","B","C","D"],"correctIndex":0,"difficulty":"Nhận biết"}]'
                className="h-64 w-full rounded-md border border-border-default bg-bg-surface p-3 font-mono text-xs text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none"
              />
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
                <button
                  type="button"
                  onClick={() => setStep(AiImportStep.prompt)}
                  className="min-h-11 rounded-md border border-border-default px-4 py-2 text-sm text-text-secondary hover:bg-bg-secondary/40"
                >
                  Quay lại
                </button>
                <button
                  type="button"
                  onClick={handleValidate}
                  disabled={!rawJson.trim()}
                  className="min-h-11 rounded-md bg-primary px-4 py-2 text-sm font-medium text-text-inverse hover:bg-primary/90 disabled:opacity-50"
                >
                  Validate
                </button>
              </div>
            </div>
          )}

          {step === AiImportStep.review && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <Badge variant="success">{validItems.length} hợp lệ</Badge>
                {invalidItems.length > 0 && (
                  <Badge variant="destructive">{invalidItems.length} lỗi</Badge>
                )}
                <span className="text-xs text-text-muted">
                  Đã xem {items.length - remainingUnreviewed}/{items.length}
                </span>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-text-muted">
                    Tiến độ đã review
                  </span>
                  <span className="text-xs text-text-muted">{reviewedPercent}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-bg-secondary">
                  <div
                    className="h-full bg-primary transition-[width]"
                    style={{ width: `${reviewedPercent}%` }}
                    role="progressbar"
                    aria-valuenow={items.length - remainingUnreviewed}
                    aria-valuemin={0}
                    aria-valuemax={items.length}
                    aria-label="Tiến độ đã review"
                  />
                </div>
              </div>

              {items.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-medium text-text-muted">
                    Tổng quan
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {items.map((item, index) => {
                      const viewed = reviewed.has(index);
                      const isCurrent = index === currentQuestionIndex;
                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => goToIndex(index)}
                          title={
                            viewed
                              ? `Câu ${index + 1}: đã xem`
                              : `Câu ${index + 1}: chưa xem`
                          }
                          aria-current={isCurrent ? "step" : undefined}
                          aria-label={`Câu ${index + 1}${viewed ? ", đã xem" : ", chưa xem"}${item._valid ? "" : ", có lỗi"}`}
                          className={`inline-flex size-9 items-center justify-center rounded-md border text-xs font-semibold sm:size-10 ${
                            isCurrent
                              ? "border-primary bg-primary text-text-inverse"
                              : viewed
                                ? item._valid
                                  ? "border-success/40 bg-success/10 text-success"
                                  : "border-error/40 bg-error/10 text-error"
                                : "border-border-default bg-bg-surface text-text-muted"
                          }`}
                        >
                          {index + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-text-muted">
                  Gắn vào Chủ đề (bắt buộc)
                </label>
                <UpgradedSelect
                  value={selectedChapterId}
                  onValueChange={setSelectedChapterId}
                  options={chapterOptions}
                  placeholder="Chọn chủ đề"
                  ariaLabel="Chọn chủ đề để gắn câu hỏi"
                />
              </div>

              {currentItem ? (
                <div className="space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-medium text-text-primary">
                      Câu {currentQuestionIndex + 1} / {items.length}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => goToIndex(currentQuestionIndex - 1)}
                        disabled={currentQuestionIndex === 0}
                        className="min-h-11 flex-1 rounded-md border border-border-default px-3 py-2 text-sm text-text-secondary hover:bg-bg-secondary/40 disabled:opacity-40 sm:flex-none"
                      >
                        Trước
                      </button>
                      <button
                        type="button"
                        onClick={() => goToIndex(currentQuestionIndex + 1)}
                        disabled={currentQuestionIndex >= items.length - 1}
                        className="min-h-11 flex-1 rounded-md border border-border-default px-3 py-2 text-sm text-text-secondary hover:bg-bg-secondary/40 disabled:opacity-40 sm:flex-none"
                      >
                        Sau
                      </button>
                    </div>
                  </div>

                  <QuestionReviewCard
                    item={currentItem}
                    index={currentQuestionIndex}
                    viewed={reviewed.has(currentQuestionIndex)}
                    difficultyLevels={difficultyLevels}
                    onUpdate={(patch) =>
                      updateItem(currentQuestionIndex, patch)
                    }
                    onRemove={() => removeItem(currentQuestionIndex)}
                  />
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-border-default p-4 text-center text-sm text-text-secondary">
                  Không còn câu nào để soát. Quay lại bước dán JSON.
                </p>
              )}
            </div>
          )}
        </div>

        {step === AiImportStep.review && (
          <div className="flex flex-col gap-2 border-t border-border-default px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-6">
            <button
              type="button"
              onClick={() => setStep(AiImportStep.paste)}
              className="min-h-11 rounded-md border border-border-default px-4 py-2 text-sm text-text-secondary hover:bg-bg-secondary/40"
            >
              Quay lại
            </button>
            <div className="flex min-w-0 flex-col items-stretch gap-1 sm:items-end">
              {disabledReason && !importMutation.isPending && (
                <p className="text-xs text-text-muted">{disabledReason}</p>
              )}
              <button
                type="button"
                onClick={() => importMutation.mutate()}
                disabled={!canImport}
                title={disabledReason ?? "Lưu vào ngân hàng"}
                className="min-h-11 rounded-md bg-primary px-4 py-2 text-sm font-medium text-text-inverse hover:bg-primary/90 disabled:opacity-50"
              >
                {importMutation.isPending
                  ? "Đang nhập..."
                  : reviewComplete
                    ? "Lưu vào ngân hàng"
                    : remainingReviewLabel(remainingUnreviewed)}
              </button>
            </div>
          </div>
        )}
    </>
  );

  return (
    <>
      {isInline ? (
        <div className="flex max-h-[70vh] w-full flex-col overflow-hidden rounded-xl border border-border-default bg-bg-surface">
          {inner}
        </div>
      ) : (
        <ResponsiveDialog
          size="4xl"
          labelledBy="ai-import-title"
          onBackdropClick={() => void requestClose()}
        >
          {inner}
        </ResponsiveDialog>
      )}
      {dialog}
    </>
  );
}

function QuestionReviewCard({
  item,
  index,
  viewed,
  difficultyLevels,
  onUpdate,
  onRemove,
}: {
  item: ValidatedAiQuestion;
  index: number;
  viewed: boolean;
  difficultyLevels: CourseDifficultyLevel[];
  onUpdate: (patch: Partial<ValidatedAiQuestion>) => void;
  onRemove: () => void;
}) {
  const diffOptions = difficultyLevels.map((level) => ({
    value: level.id,
    label: level.name,
  }));

  return (
    <div
      className={`rounded-lg border ${
        item._valid
          ? "border-border-default"
          : "border-error/50 bg-error/5"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <span className="text-xs font-medium text-text-muted">#{index + 1}</span>
        <Badge variant={item.type === "single_choice" ? "info" : "success"}>
          {item.type === "single_choice" ? "Trắc nghiệm" : "Tự luận"}
        </Badge>
        <Badge variant={viewed ? "success" : "secondary"}>
          {viewed ? "Đã xem" : "Chưa xem"}
        </Badge>
        {!item._valid && (
          <Badge variant="destructive">{item._errors.length} lỗi</Badge>
        )}
      </div>

      {!item._valid && item._errors.length > 0 && (
        <div className="border-t border-border-default px-4 py-2">
          {item._errors.map((err, i) => (
            <p key={i} className="text-xs text-error">
              Câu {index + 1}: {err}
            </p>
          ))}
        </div>
      )}

      <div className="space-y-3 border-t border-border-default px-4 py-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">
            Nội dung
          </label>
          <textarea
            value={item.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            rows={3}
            className="w-full rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none"
          />
          {item.content.trim() ? (
            <div className="mt-2 rounded-md bg-bg-secondary/40 p-2">
              <MathContent content={item.content} className="text-sm" />
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">
              Độ khó
            </label>
            <UpgradedSelect
              value={item.difficultyLevelId}
              onValueChange={(value) => {
                const level = difficultyLevels.find((entry) => entry.id === value);
                onUpdate({
                  difficultyLevelId: value,
                  difficultyName: level?.name ?? "",
                });
              }}
              options={diffOptions}
              placeholder="Chọn độ khó"
              ariaLabel="Độ khó"
            />
          </div>
          {item.type === "single_choice" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">
                Đáp án đúng
              </label>
              <UpgradedSelect
                value={String(item.correctIndex ?? 0)}
                onValueChange={(value) =>
                  onUpdate({ correctIndex: Number(value) })
                }
                options={
                  item.options?.map((opt, i) => ({
                    value: String(i),
                    label: `${String.fromCharCode(65 + i)}. ${opt.slice(0, 40)}`,
                  })) ?? []
                }
                ariaLabel="Đáp án đúng"
              />
            </div>
          )}
        </div>

        {item.type === "single_choice" && item.options && (
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">
              Phương án
            </label>
            <div className="space-y-2">
              {item.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-6 text-center text-xs font-bold text-text-muted">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <input
                    value={opt}
                    onChange={(e) => {
                      const newOpts = [...(item.options ?? [])];
                      newOpts[i] = e.target.value;
                      onUpdate({ options: newOpts });
                    }}
                    className="min-h-11 flex-1 rounded-md border border-border-default bg-bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-border-focus focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {item.type === "single_choice" && (
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">
              Giải thích
            </label>
            <textarea
              value={item.explanation ?? ""}
              onChange={(e) => onUpdate({ explanation: e.target.value })}
              rows={2}
              className="w-full rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none"
            />
          </div>
        )}
        {item.type === "essay" && item.options !== undefined && (
          <div className="rounded-md border border-error/30 bg-error/5 p-3">
            <p className="text-xs text-error">
              Câu tự luận không được có options. Gỡ để câu hợp lệ.
            </p>
            <button
              type="button"
              onClick={() => onUpdate({ options: undefined })}
              className="mt-2 min-h-11 text-xs font-medium text-error hover:underline"
            >
              Gỡ options thừa
            </button>
          </div>
        )}
        {item.type === "essay" && item.correctIndex !== undefined && (
          <div className="rounded-md border border-error/30 bg-error/5 p-3">
            <p className="text-xs text-error">
              Câu tự luận không được có correctIndex.
            </p>
            <button
              type="button"
              onClick={() => onUpdate({ correctIndex: undefined })}
              className="mt-2 min-h-11 text-xs font-medium text-error hover:underline"
            >
              Gỡ correctIndex thừa
            </button>
          </div>
        )}
        {item.type === "essay" && (
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">
              Hướng dẫn trả lời
            </label>
            <textarea
              value={item.answerGuide ?? ""}
              onChange={(e) => onUpdate({ answerGuide: e.target.value })}
              rows={2}
              className="w-full rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none"
            />
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onRemove}
            className="min-h-11 text-xs text-error hover:underline"
          >
            Xóa câu này
          </button>
        </div>
      </div>
    </div>
  );
}
