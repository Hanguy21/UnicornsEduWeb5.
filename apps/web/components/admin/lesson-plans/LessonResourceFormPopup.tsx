"use client";

import { useEffect, useState, type SyntheticEvent } from "react";
import { toast } from "sonner";
import type {
  CreateLessonResourcePayload,
  LessonResourceItem,
  LessonUpsertMode,
  LessonTaskOption,
} from "@/dtos/lesson.dto";
import LessonTagPicker from "./LessonTagPicker";

type Props = {
  open: boolean;
  mode: LessonUpsertMode;
  initialData?: LessonResourceItem | null;
  linkedTask?: Pick<LessonTaskOption, "id" | "title"> | null;
  isSubmitting?: boolean;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  onClose: () => void;
  onRetry?: () => void;
  onSubmit: (payload: CreateLessonResourcePayload) => Promise<void> | void;
};

function getTitle(mode: LessonUpsertMode) {
  return mode === "create" ? "Thêm tài nguyên" : "Chỉnh sửa tài nguyên";
}

export default function LessonResourceFormPopup({
  open,
  mode,
  initialData,
  linkedTask = null,
  isSubmitting = false,
  isLoading = false,
  isError = false,
  errorMessage = "Không tải được tài nguyên.",
  onClose,
  onRetry,
  onSubmit,
}: Props) {
  const [title, setTitle] = useState(() => initialData?.title ?? "");
  const [resourceLink, setResourceLink] = useState(
    () => initialData?.resourceLink ?? "",
  );
  const [description, setDescription] = useState(
    () => initialData?.description ?? "",
  );
  const [selectedTags, setSelectedTags] = useState<string[]>(() =>
    initialData?.tags ?? [],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setTitle(initialData?.title ?? "");
    setResourceLink(initialData?.resourceLink ?? "");
    setDescription(initialData?.description ?? "");
    setSelectedTags(initialData?.tags ?? []);
  }, [open, mode, linkedTask?.id, initialData?.id, initialData?.updatedAt]);

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedTitle = title.trim();
    const trimmedLink = resourceLink.trim();

    if (!trimmedTitle) {
      toast.error("Tên tài nguyên là bắt buộc.");
      return;
    }

    if (!trimmedLink) {
      toast.error("Link tài nguyên là bắt buộc.");
      return;
    }

    try {
      const url = new URL(trimmedLink);
      if (!["http:", "https:"].includes(url.protocol)) {
        toast.error("Link tài nguyên phải bắt đầu bằng http hoặc https.");
        return;
      }
    } catch {
      toast.error("Link tài nguyên không hợp lệ.");
      return;
    }

    await onSubmit({
      title: trimmedTitle,
      resourceLink: trimmedLink,
      description: description.trim() || null,
      lessonTaskId: linkedTask?.id ?? initialData?.lessonTaskId ?? null,
      tags: selectedTags,
    });
  };

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50"
        aria-hidden
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lesson-resource-form-title"
        className="fixed inset-x-3 top-1/2 z-50 max-h-[88vh] -translate-y-1/2 overflow-y-auto rounded-[1.75rem] border border-border-default bg-bg-surface p-5 shadow-xl sm:left-1/2 sm:w-full sm:max-w-2xl sm:-translate-x-1/2"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
              Resource Desk
            </p>
            <h2
              id="lesson-resource-form-title"
              className="mt-2 text-xl font-semibold text-text-primary"
            >
              {getTitle(mode)}
            </h2>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              Lưu tài nguyên tham chiếu để đội giáo án truy cập lại nhanh trong
              tab Tổng quan.
            </p>
            {linkedTask ? (
              <div className="mt-4 rounded-[1.25rem] border border-primary/15 bg-[linear-gradient(135deg,rgba(219,234,254,0.88),rgba(239,246,255,0.96))] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/75">
                  Task đích
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {linkedTask.title ?? "Task chưa đặt tên"}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  Resource tạo mới từ popup này sẽ được gắn trực tiếp vào công
                  việc đang mở.
                </p>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            aria-label="Đóng"
          >
            <svg
              className="size-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <section className="rounded-[1.4rem] border border-border-default bg-bg-surface p-4 shadow-sm">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <div className="h-4 w-28 animate-pulse rounded-full bg-bg-tertiary/80" />
                  <div className="h-11 animate-pulse rounded-xl bg-bg-tertiary/70" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <div className="h-4 w-24 animate-pulse rounded-full bg-bg-tertiary/80" />
                  <div className="h-11 animate-pulse rounded-xl bg-bg-tertiary/70" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <div className="h-4 w-20 animate-pulse rounded-full bg-bg-tertiary/80" />
                  <div className="h-28 animate-pulse rounded-xl bg-bg-tertiary/70" />
                </div>
              </div>
            </section>
            <section className="rounded-[1.4rem] border border-border-default bg-[linear-gradient(180deg,rgba(248,250,252,0.7),rgba(255,255,255,0.96))] p-4 shadow-sm">
              <div className="h-4 w-16 animate-pulse rounded-full bg-bg-tertiary/80" />
              <div className="mt-4 h-12 animate-pulse rounded-xl bg-bg-tertiary/70" />
              <div className="mt-4 flex flex-wrap gap-2">
                <div className="h-8 w-24 animate-pulse rounded-full bg-bg-tertiary/75" />
                <div className="h-8 w-20 animate-pulse rounded-full bg-bg-tertiary/60" />
              </div>
            </section>
          </div>
        ) : isError ? (
          <div className="rounded-[1.4rem] border border-dashed border-border-default bg-bg-secondary/35 px-5 py-10 text-center">
            <p className="text-base font-semibold text-text-primary">
              Không tải được tài nguyên.
            </p>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              {errorMessage}
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              {onRetry ? (
                <button
                  type="button"
                  onClick={onRetry}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  Tải lại
                </button>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-border-default bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                Đóng
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <section className="rounded-[1.4rem] border border-border-default bg-bg-surface p-4 shadow-sm">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm text-text-secondary sm:col-span-2">
                  <span>Tên tài nguyên</span>
                  <input
                    type="text"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Ví dụ: Bộ note đại số tổ hợp"
                    className="rounded-xl border border-border-default bg-bg-surface px-3 py-2.5 text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    required
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm text-text-secondary sm:col-span-2">
                  <span>Link tài nguyên</span>
                  <input
                    type="url"
                    value={resourceLink}
                    onChange={(event) => setResourceLink(event.target.value)}
                    placeholder="https://..."
                    className="rounded-xl border border-border-default bg-bg-surface px-3 py-2.5 text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    required
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm text-text-secondary sm:col-span-2">
                  <span>Mô tả</span>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={4}
                    placeholder="Nội dung ngắn mô tả mục đích dùng của tài nguyên này."
                    className="rounded-xl border border-border-default bg-bg-surface px-3 py-2.5 text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-[1.4rem] border border-border-default bg-[linear-gradient(180deg,rgba(248,250,252,0.7),rgba(255,255,255,0.96))] p-4 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                    Tags
                  </p>
                  <p className="mt-1 text-sm text-text-secondary">
                    Gắn tag để gom tài nguyên theo chuyên đề, tuần học hoặc định dạng tài liệu.
                  </p>
                </div>
                <span className="text-xs text-text-muted">
                  {selectedTags.length > 0
                    ? `${selectedTags.length} tag đang được gắn`
                    : "Chưa gắn tag nào"}
                </span>
              </div>

              <div className="mt-4">
                <LessonTagPicker
                  value={selectedTags}
                  onChange={setSelectedTags}
                  placeholder="Tìm kiếm hoặc tạo tag cho tài nguyên…"
                />
              </div>

              {selectedTags.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2 rounded-2xl border border-border-default bg-bg-secondary/70 p-3">
                  {selectedTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-border-default bg-bg-surface px-3 py-1 text-xs font-medium text-text-secondary"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </section>

            <div className="flex items-center justify-end gap-2 border-t border-border-default pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-xl border border-border-default bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-60"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-60"
              >
                {isSubmitting
                  ? "Đang lưu…"
                  : mode === "create"
                    ? "Tạo tài nguyên"
                    : "Lưu thay đổi"}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
