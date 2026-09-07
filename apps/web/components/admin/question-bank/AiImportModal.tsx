"use client";

import { useState, useMemo, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as questionApi from "@/lib/apis/question.api";
import { api } from "@/lib/client";
import { questionKeys, courseKeys } from "@/lib/query-keys";
import MathContent from "@/components/ui/MathContent";
import UpgradedSelect from "@/components/ui/UpgradedSelect";
import { Badge } from "@/components/ui/badge";
import type {
  ValidatedAiQuestion,
  QuestionTypeDto,
  Question,
} from "@/dtos/question.dto";

interface DifficultyLevel {
  id: string;
  name: string;
}
interface Chapter {
  id: string;
  title: string;
}
interface Course {
  id: string;
  name: string;
}

type Step = "prompt" | "paste" | "review";

interface AiImportModalProps {
  courseId: string;
  onClose: () => void;
  onImported: () => void;
  variant?: "modal" | "inline";
  onImportedQuestions?: (questions: Question[]) => void;
}

// --- Validation -----------------------------------------------------------

const ALLOWED_FIELDS = new Set([
  "type",
  "content",
  "options",
  "correctIndex",
  "explanation",
  "answerGuide",
  "difficulty",
]);

function validateAiJson(
  raw: string,
  difficultyNames: string[],
): { items: ValidatedAiQuestion[]; parseError: string | null } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { items: [], parseError: "JSON khong hop le. Vui long kiem tra lai." };
  }

  if (!Array.isArray(parsed)) {
    return { items: [], parseError: "Ket qua phai la mot JSON array." };
  }

  if (parsed.length === 0) {
    return { items: [], parseError: "JSON array trong." };
  }

  if (parsed.length > 50) {
    return {
      items: [],
      parseError: `Qua nhau cau hoi (${parsed.length}). Toi da 50 cau mot lan.`,
    };
  }

  const items: ValidatedAiQuestion[] = (parsed as Record<string, unknown>[]).map(
    (obj) => {
      const errors: string[] = [];

      // Check unknown fields
      for (const key of Object.keys(obj)) {
        if (!ALLOWED_FIELDS.has(key)) {
          errors.push(`Truong khong cho phep: "${key}"`);
        }
      }

      const type = obj.type;
      if (type !== "single_choice" && type !== "essay") {
        errors.push('type phai la "single_choice" hoac "essay"');
      }

      const content = obj.content;
      if (typeof content !== "string" || !content.trim()) {
        errors.push("content la bat buoc va khong duoc rong");
      }

      const difficulty = obj.difficulty;
      const difficultyName =
        typeof difficulty === "string" ? difficulty : "";
      const matchedLevel = difficultyNames.find(
        (d) => d.trim() === difficultyName.trim(),
      );

      if (!difficultyName) {
        errors.push("difficulty la bat buoc");
      } else if (!matchedLevel) {
        errors.push(
          `difficulty "${difficultyName}" khong khop voi danh sach do kho cua khoa`,
        );
      }

      if (type === "single_choice") {
        const options = obj.options;
        if (!Array.isArray(options) || options.length < 2 || options.length > 6) {
          errors.push("options: can 2-6 phuong an cho single_choice");
        } else {
          for (let j = 0; j < options.length; j++) {
            if (typeof options[j] !== "string" || !options[j].trim()) {
              errors.push(`options[${j}]: khong duoc rong`);
            }
          }
        }

        const ci = obj.correctIndex;
        if (typeof ci !== "number" || !Number.isInteger(ci)) {
          errors.push("correctIndex phai la so nguyen");
        } else if (
          Array.isArray(options) &&
          (ci < 0 || ci >= options.length)
        ) {
          errors.push(
            `correctIndex ${ci} nam ngoai pham vi [0, ${options.length - 1}]`,
          );
        }
      }

      if (type === "essay" && obj.options) {
        errors.push("essay khong duoc co options");
      }

      return {
        type: (type as QuestionTypeDto) ?? "single_choice",
        content: typeof content === "string" ? content : "",
        options: Array.isArray(obj.options) ? (obj.options as string[]) : undefined,
        correctIndex:
          typeof obj.correctIndex === "number" ? (obj.correctIndex as number) : undefined,
        explanation:
          typeof obj.explanation === "string" ? (obj.explanation as string) : undefined,
        answerGuide:
          typeof obj.answerGuide === "string" ? (obj.answerGuide as string) : undefined,
        difficultyLevelId: matchedLevel ? "" : "", // resolved later
        difficultyName: difficultyName,
        _valid: errors.length === 0 && !!matchedLevel,
        _errors: errors,
      };
    },
  );

  return { items, parseError: null };
}

// --- Component ------------------------------------------------------------

export default function AiImportModal({
  courseId,
  onClose,
  onImported,
  variant = "modal",
  onImportedQuestions,
}: AiImportModalProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("prompt");
  const [topic, setTopic] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [rawJson, setRawJson] = useState("");
  const [items, setItems] = useState<ValidatedAiQuestion[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState("");

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
      const res = await api.get<DifficultyLevel[]>(
        `/courses/${courseId}/difficulty-levels`,
      );
      return res.data;
    },
  });

  const { data: chapters = [] } = useQuery({
    queryKey: [...courseKeys.all, "chapters", courseId],
    queryFn: async () => {
      const res = await api.get<Chapter[]>(
        `/course/${courseId}/chapters`,
      );
      return res.data;
    },
  });

  const difficultyNames = useMemo(
    () => difficultyLevels.map((d) => d.name),
    [difficultyLevels],
  );

  // Resolve difficultyLevelId from name
  const resolveDifficultyId = useCallback(
    (name: string): string => {
      const level = difficultyLevels.find(
        (d) => d.name.trim() === name.trim(),
      );
      return level?.id ?? "";
    },
    [difficultyLevels],
  );

  // --- Prompt generation ---
  const prompt = useMemo(() => {
    const courseName = course?.name ?? "N/A";
    const diffList = difficultyNames.length
      ? difficultyNames.map((d) => `  - ${d}`).join("\n")
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

  // --- Validate paste ---
  const handleValidate = () => {
    const result = validateAiJson(rawJson, difficultyNames);
    if (result.parseError) {
      toast.error(result.parseError);
      return;
    }
    // Resolve difficulty IDs
    const resolved = result.items.map((item) => ({
      ...item,
      difficultyLevelId: resolveDifficultyId(item.difficultyName),
    }));
    setItems(resolved);
    setStep("review");
    const validCount = resolved.filter((i) => i._valid).length;
    const invalidCount = resolved.length - validCount;
    toast.success(
      `Phat hien ${validCount} cau hop le${invalidCount > 0 ? `, ${invalidCount} cau loi` : ""}`,
    );
  };

  // --- Edit item ---
  const updateItem = (index: number, patch: Partial<ValidatedAiQuestion>) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const next = { ...item, ...patch };
        // Re-validate
        const errors: string[] = [];
        if (!next.content?.trim()) errors.push("content la bat buoc");
        if (next._valid || errors.length === 0) {
          // Only re-check fields that matter
          if (
            next.type === "single_choice" &&
            (!next.options || next.options.length < 2)
          ) {
            errors.push("single_choice can it nhat 2 phuong an");
          }
          if (
            next.type === "single_choice" &&
            (next.correctIndex === undefined ||
              next.correctIndex === null ||
              next.correctIndex < 0)
          ) {
            errors.push("single_choice can correctIndex hop le");
          }
        }
        return {
          ...next,
          _valid: errors.length === 0,
          _errors: errors,
        };
      }),
    );
  };

  // --- Remove item ---
  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // --- Import mutation ---
  const importMutation = useMutation({
    mutationFn: () => {
      const validItems = items.filter((i) => i._valid);
      return questionApi.bulkCreateQuestions({
        courseId,
        chapterId: selectedChapterId,
        questions: validItems.map((i) => ({
          type: i.type,
          content: i.content,
          options: i.options,
          correctIndex: i.correctIndex,
          explanation: i.explanation,
          answerGuide: i.answerGuide,
          difficultyLevelId: i.difficultyLevelId,
        })),
      });
    },
    onSuccess: (res) => {
      toast.success(`Da nhap thanh cong ${res.count} cau hoi.`);
      queryClient.invalidateQueries({ queryKey: questionKeys.all });
      onImportedQuestions?.(res.questions ?? []);
      onImported();
    },
    onError: () => {
      toast.error("Loi khi nhap cau hoi. Vui long thu lai.");
    },
  });

  const validItems = items.filter((i) => i._valid);
  const invalidItems = items.filter((i) => !i._valid);
  const canImport = validItems.length > 0 && selectedChapterId;

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt);
    toast.success("Đã sao chép prompt.");
  };

  const chapterOptions = chapters.map((ch) => ({
    value: ch.id,
    label: ch.title,
  }));

  const isInline = variant === "inline";

  return (
    <div
      className={
        isInline
          ? "flex max-h-[70vh] w-full flex-col rounded-xl border border-border-default bg-bg-surface"
          : "fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      }
    >
      <div
        className={
          isInline
            ? "flex min-h-0 flex-1 flex-col overflow-hidden"
            : "flex max-h-[90vh] w-full max-w-4xl flex-col rounded-lg bg-bg-surface shadow-xl"
        }
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-default px-4 py-3 md:px-6">
          <h2 className="text-lg font-bold text-text-primary">
            Nhập câu hỏi từ AI
          </h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary"
          >
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex gap-2 border-b border-border-default px-4 py-2 md:px-6">
          {(["prompt", "paste", "review"] as Step[]).map((s, idx) => (
            <button
              key={s}
              onClick={() => {
                if (s === "prompt") setStep("prompt");
                if (s === "paste" && rawJson) setStep("paste");
                if (s === "review" && items.length > 0) setStep("review");
              }}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                step === s
                  ? "bg-primary text-white"
                  : "bg-bg-secondary text-text-muted"
              }`}
            >
              {idx + 1}. {s === "prompt" ? "Lấy prompt" : s === "paste" ? "Dán JSON" : "Soát câu"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {/* Step 1: Prompt */}
          {step === "prompt" && (
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

              <div className="flex justify-end gap-3">
                <button
                  onClick={onClose}
                  className="rounded-md border border-border-default px-4 py-2 text-sm text-text-secondary hover:bg-bg-secondary/40"
                >
                  Huy
                </button>
                <button
                  onClick={() => {
                    handleCopy();
                    setStep("paste");
                  }}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                >
                  Sao chép & Tiếp tục
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Paste JSON */}
          {step === "paste" && (
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">
                Dan ket qua JSON tu ChatGPT/Claude vao duoi day. He thong se
                validate ngay tai client.
              </p>
              <textarea
                value={rawJson}
                onChange={(e) => setRawJson(e.target.value)}
                placeholder='[{"type":"single_choice","content":"...","options":["A","B","C","D"],"correctIndex":0,"difficulty":"Nhan biet"}]'
                className="h-64 w-full rounded-md border border-border-default bg-bg-surface p-3 font-mono text-xs text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none"
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setStep("prompt")}
                  className="rounded-md border border-border-default px-4 py-2 text-sm text-text-secondary hover:bg-bg-secondary/40"
                >
                  Quay lai
                </button>
                <button
                  onClick={handleValidate}
                  disabled={!rawJson.trim()}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                >
                  Validate
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === "review" && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <Badge variant="success">{validItems.length} hop le</Badge>
                {invalidItems.length > 0 && (
                  <Badge variant="destructive">
                    {invalidItems.length} loi
                  </Badge>
                )}
              </div>

              {/* Chapter selector */}
              <div>
                <label className="mb-1 block text-xs font-medium text-text-muted">
                  Gan vao Chu de (bat buoc)
                </label>
                <UpgradedSelect
                  value={selectedChapterId}
                  onValueChange={setSelectedChapterId}
                  options={chapterOptions}
                  placeholder="Chon chu de"
                  ariaLabel="Chon chu de de gan cau hoi"
                />
              </div>

              {/* Question cards */}
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <QuestionReviewCard
                    key={idx}
                    item={item}
                    index={idx}
                    difficultyLevels={difficultyLevels}
                    onUpdate={(patch) => updateItem(idx, patch)}
                    onRemove={() => removeItem(idx)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer (review step) */}
        {step === "review" && (
          <div className="flex items-center justify-between border-t border-border-default px-4 py-3 md:px-6">
            <button
              onClick={() => setStep("paste")}
              className="rounded-md border border-border-default px-4 py-2 text-sm text-text-secondary hover:bg-bg-secondary/40"
            >
              Quay lai
            </button>
            <button
              onClick={() => importMutation.mutate()}
              disabled={!canImport || importMutation.isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {importMutation.isPending
                ? "Dang nhap..."
                : `Nhập ${validItems.length} câu hỏi`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Review card component ------------------------------------------------

function QuestionReviewCard({
  item,
  index,
  difficultyLevels,
  onUpdate,
  onRemove,
}: {
  item: ValidatedAiQuestion;
  index: number;
  difficultyLevels: DifficultyLevel[];
  onUpdate: (patch: Partial<ValidatedAiQuestion>) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const diffOptions = difficultyLevels.map((d) => ({
    value: d.id,
    label: d.name,
  }));

  return (
    <div
      className={`rounded-lg border ${
        item._valid
          ? "border-border-default"
          : "border-red-400 bg-red-50/50"
      }`}
    >
      {/* Header */}
      <div
        className="flex cursor-pointer items-center gap-3 px-4 py-3"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-xs font-medium text-text-muted">
          #{index + 1}
        </span>
        <Badge variant={item.type === "single_choice" ? "info" : "success"}>
          {item.type === "single_choice" ? "Trac nghiem" : "Tu luan"}
        </Badge>
        {!item._valid && (
          <Badge variant="destructive">{item._errors.length} loi</Badge>
        )}
        <div className="min-w-0 flex-1">
          <MathContent
            content={item.content.slice(0, 100)}
            className="text-xs"
          />
        </div>
        <svg
          className={`size-4 shrink-0 text-text-muted transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Errors */}
      {!item._valid && item._errors.length > 0 && (
        <div className="border-t border-border-default px-4 py-2">
          {item._errors.map((err, i) => (
            <p key={i} className="text-xs text-red-600">
              {err}
            </p>
          ))}
        </div>
      )}

      {/* Expanded edit */}
      {expanded && (
        <div className="space-y-3 border-t border-border-default px-4 py-3">
          {/* Content */}
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">
              Noi dung
            </label>
            <textarea
              value={item.content}
              onChange={(e) => onUpdate({ content: e.target.value })}
              rows={3}
              className="w-full rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none"
            />
          </div>

          {/* Difficulty */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">
                Do kho
              </label>
              <UpgradedSelect
                value={item.difficultyLevelId}
                onValueChange={(v) => {
                  const level = difficultyLevels.find((d) => d.id === v);
                  onUpdate({
                    difficultyLevelId: v,
                    difficultyName: level?.name ?? "",
                  });
                }}
                options={diffOptions}
                placeholder="Chon do kho"
                ariaLabel="Do kho"
              />
            </div>
            {item.type === "single_choice" && (
              <div>
                <label className="mb-1 block text-xs font-medium text-text-muted">
                  Dap an dung
                </label>
                <UpgradedSelect
                  value={String(item.correctIndex ?? 0)}
                  onValueChange={(v) =>
                    onUpdate({ correctIndex: Number(v) })
                  }
                  options={
                    item.options?.map((opt, i) => ({
                      value: String(i),
                      label: `${String.fromCharCode(65 + i)}. ${opt.slice(0, 40)}`,
                    })) ?? []
                  }
                  ariaLabel="Dap an dung"
                />
              </div>
            )}
          </div>

          {/* Options (single_choice) */}
          {item.type === "single_choice" && item.options && (
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">
                Phuong an
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
                      className="flex-1 rounded-md border border-border-default bg-bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-border-focus focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Explanation / Answer guide */}
          {item.explanation && (
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">
                Giai thich
              </label>
              <textarea
                value={item.explanation}
                onChange={(e) => onUpdate({ explanation: e.target.value })}
                rows={2}
                className="w-full rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none"
              />
            </div>
          )}
          {item.answerGuide && (
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">
                Huong dan tra loi
              </label>
              <textarea
                value={item.answerGuide}
                onChange={(e) => onUpdate({ answerGuide: e.target.value })}
                rows={2}
                className="w-full rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none"
              />
            </div>
          )}

          {/* Remove button */}
          <div className="flex justify-end">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="text-xs text-red-600 hover:underline"
            >
              Xoa cau nay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
