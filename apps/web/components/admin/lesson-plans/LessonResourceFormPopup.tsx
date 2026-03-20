"use client";

import { useMemo, useState, type SyntheticEvent } from "react";
import { toast } from "sonner";
import type {
  CreateLessonResourcePayload,
  LessonResourceItem,
  LessonUpsertMode,
} from "@/dtos/lesson.dto";

type Props = {
  open: boolean;
  mode: LessonUpsertMode;
  initialData?: LessonResourceItem | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateLessonResourcePayload) => Promise<void> | void;
};

function getTitle(mode: LessonUpsertMode) {
  return mode === "create" ? "Thêm tài nguyên" : "Chỉnh sửa tài nguyên";
}

export default function LessonResourceFormPopup({
  open,
  mode,
  initialData,
  isSubmitting = false,
  onClose,
  onSubmit,
}: Props) {
  const [title, setTitle] = useState(() => initialData?.title ?? "");
  const [resourceLink, setResourceLink] = useState(
    () => initialData?.resourceLink ?? "",
  );
  const [description, setDescription] = useState(
    () => initialData?.description ?? "",
  );
  const [tagsInput, setTagsInput] = useState(() =>
    (initialData?.tags ?? []).join(", "),
  );

  const parsedTags = useMemo(
    () =>
      Array.from(
        new Set(
          tagsInput
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        ),
      ),
    [tagsInput],
  );

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
      tags: parsedTags,
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

        <form onSubmit={handleSubmit} className="space-y-4">
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

            <label className="flex flex-col gap-1 text-sm text-text-secondary sm:col-span-2">
              <span>Tags</span>
              <input
                type="text"
                value={tagsInput}
                onChange={(event) => setTagsInput(event.target.value)}
                placeholder="đại số, lecture-note, week-1"
                className="rounded-xl border border-border-default bg-bg-surface px-3 py-2.5 text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              />
            </label>
          </div>

          {parsedTags.length > 0 ? (
            <div className="flex flex-wrap gap-2 rounded-2xl border border-border-default bg-bg-secondary/70 p-3">
              {parsedTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border-default bg-bg-surface px-3 py-1 text-xs font-medium text-text-secondary"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

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
      </div>
    </>
  );
}
