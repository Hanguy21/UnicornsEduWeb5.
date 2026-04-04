"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import type { RulePostFormValues, RulePostItem } from "./RulePostFormPopup";
import NotesSubjectRichEditor from "./NotesSubjectRichEditor";

const INPUT_CLASS =
  "w-full rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus";

type Props = {
  rule: RulePostItem;
  onSave: (values: RulePostFormValues) => void;
  onDiscard: () => void;
};

export default function RulePostEditTable({
  rule,
  onSave,
  onDiscard,
}: Props) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<RulePostFormValues>({
    defaultValues: {
      title: rule.title,
      description: rule.description,
      content: rule.content,
    },
  });

  const contentValue = watch("content");

  useEffect(() => {
    reset({
      title: rule.title,
      description: rule.description,
      content: rule.content,
    });
  }, [rule.id, rule.title, rule.description, rule.content, reset]);

  return (
    <form
      onSubmit={handleSubmit((values) => onSave(values))}
      className="overflow-hidden rounded-lg border border-border-default bg-bg-surface shadow-sm"
      aria-labelledby={`rule-edit-heading-${rule.id}`}
    >
      <div className="border-b border-border-default bg-bg-secondary/50 px-4 py-3 sm:px-5">
        <h3
          id={`rule-edit-heading-${rule.id}`}
          className="text-sm font-semibold text-text-primary"
        >
          Chỉnh sửa quy định
        </h3>
        <p className="mt-0.5 text-xs text-text-muted">
          Cập nhật trực tiếp trong bảng; nhấn Lưu để áp dụng.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[min(100%,20rem)] border-collapse text-sm">
          <tbody>
            <tr className="border-b border-border-default">
              <th
                scope="row"
                className="w-[min(30%,10rem)] whitespace-nowrap bg-bg-secondary/30 px-3 py-3 text-left align-top text-xs font-medium uppercase tracking-wide text-text-muted sm:px-4"
              >
                Tiêu đề
              </th>
              <td className="px-3 py-2.5 sm:px-4">
                <input
                  type="text"
                  {...register("title", { required: "Bắt buộc" })}
                  className={INPUT_CLASS}
                  aria-invalid={!!errors.title}
                  aria-describedby={
                    errors.title ? `rule-title-err-${rule.id}` : undefined
                  }
                />
                {errors.title ? (
                  <p
                    id={`rule-title-err-${rule.id}`}
                    className="mt-1 text-xs text-danger"
                  >
                    {errors.title.message}
                  </p>
                ) : null}
              </td>
            </tr>
            <tr className="border-b border-border-default">
              <th
                scope="row"
                className="whitespace-nowrap bg-bg-secondary/30 px-3 py-3 text-left align-top text-xs font-medium uppercase tracking-wide text-text-muted sm:px-4"
              >
                Mô tả
              </th>
              <td className="px-3 py-2.5 sm:px-4">
                <input
                  type="text"
                  {...register("description")}
                  placeholder="Mô tả ngắn (tuỳ chọn)"
                  className={INPUT_CLASS}
                />
              </td>
            </tr>
            <tr>
              <th
                scope="row"
                className="whitespace-nowrap bg-bg-secondary/30 px-3 py-3 text-left align-top text-xs font-medium uppercase tracking-wide text-text-muted sm:px-4"
              >
                Nội dung
              </th>
              <td className="px-3 py-3 sm:px-4">
                <NotesSubjectRichEditor
                  value={contentValue}
                  onChange={(html) =>
                    setValue("content", html, { shouldDirty: true })
                  }
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-border-default bg-bg-secondary/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-end sm:px-5">
        <button
          type="button"
          onClick={onDiscard}
          className="min-h-11 rounded-md border border-border-default bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus sm:min-h-0"
        >
          Huỷ chọn
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !isDirty}
          className="min-h-11 rounded-md bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:pointer-events-none disabled:opacity-50 sm:min-h-0"
        >
          Lưu thay đổi
        </button>
      </div>
    </form>
  );
}
