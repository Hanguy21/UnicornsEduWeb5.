"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDebounce } from "use-debounce";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ClassDetail } from "@/dtos/class.dto";
import * as classApi from "@/lib/apis/class.api";
import * as studentApi from "@/lib/apis/student.api";
import {
  classEditorModalClassName,
  classEditorModalCloseButtonClassName,
  classEditorModalFooterClassName,
  classEditorModalHeaderClassName,
  classEditorModalInsetBodyClassName,
  classEditorModalPrimaryButtonClassName,
  classEditorModalSecondaryButtonClassName,
  classEditorModalTitleClassName,
} from "./classEditorModalStyles";

type DropdownRect = { top: number; left: number; width: number; maxHeight: number };

type Props = {
  open: boolean;
  onClose: () => void;
  classDetail: ClassDetail;
};

function getDropdownRect(el: HTMLElement | null): DropdownRect | null {
  if (!el) return null;

  const rect = el.getBoundingClientRect();
  const viewportPadding = 8;
  const width = Math.min(rect.width, window.innerWidth - viewportPadding * 2);
  const left = Math.min(
    Math.max(rect.left, viewportPadding),
    window.innerWidth - viewportPadding - width,
  );
  const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
  const spaceAbove = rect.top - viewportPadding;
  const shouldOpenUpward = spaceBelow < 180 && spaceAbove > spaceBelow;
  const availableHeight = shouldOpenUpward ? spaceAbove - 4 : spaceBelow - 4;
  const maxHeight = Math.max(0, Math.min(240, availableHeight));
  const top = shouldOpenUpward
    ? Math.max(viewportPadding, rect.top - maxHeight - 4)
    : rect.bottom + 4;

  return { top, left, width, maxHeight };
}

export default function EditClassStudentsPopup({ open, onClose, classDetail }: Props) {
  if (!open) return null;

  return <EditClassStudentsDialog onClose={onClose} classDetail={classDetail} />;
}

function EditClassStudentsDialog({ onClose, classDetail }: Omit<Props, "open">) {
  const queryClient = useQueryClient();
  const studentSearchRef = useRef<HTMLDivElement>(null);
  const scrollableRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownRect, setDropdownRect] = useState<DropdownRect | null>(null);

  const [selectedStudents, setSelectedStudents] = useState<Array<{ id: string; name: string }>>(() =>
    (classDetail.students ?? []).map((s) => ({ id: s.id, name: s.fullName?.trim() ?? "—" })),
  );
  const [studentSearchInput, setStudentSearchInput] = useState("");
  const [studentSearchFocused, setStudentSearchFocused] = useState(false);
  const [debouncedStudentSearch] = useDebounce(studentSearchInput.trim(), 350);

  const { data: studentSearchResult } = useQuery({
    queryKey: ["student", "list", { page: 1, limit: 50, search: debouncedStudentSearch }],
    queryFn: () =>
      studentApi.getStudents({
        page: 1,
        limit: 50,
        search: debouncedStudentSearch || undefined,
      }),
  });

  const filteredStudents = (studentSearchResult ?? []).filter(
    (s) => !selectedStudents.some((st) => st.id === s.id),
  );

  useLayoutEffect(() => {
    if (!studentSearchFocused) return;
    const updateRect = () => setDropdownRect(getDropdownRect(studentSearchRef.current));
    updateRect();
    const scrollable = scrollableRef.current;
    scrollable?.addEventListener("scroll", updateRect, true);
    window.addEventListener("resize", updateRect);
    return () => {
      scrollable?.removeEventListener("scroll", updateRect, true);
      window.removeEventListener("resize", updateRect);
    };
  }, [studentSearchFocused]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const inInput = studentSearchRef.current?.contains(target);
      const inDropdown = dropdownRef.current?.contains(target);
      if (!inInput && !inDropdown) {
        setStudentSearchFocused(false);
        setDropdownRect(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const updateMutation = useMutation({
    mutationFn: (data: { student_ids: string[] }) =>
      classApi.updateClassStudents(classDetail.id, data),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["class", "detail", classDetail.id] }),
        queryClient.invalidateQueries({ queryKey: ["class", "list"] }),
      ]);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err as Error)?.message ??
        "Không thể cập nhật danh sách học sinh.";
      toast.error(msg);
    },
  });

  const handleSubmit = async () => {
    const student_ids = selectedStudents.map((s) => s.id);
    try {
      await updateMutation.mutateAsync({ student_ids });
      toast.success("Đã lưu danh sách học sinh.");
      onClose();
    } catch {
      // handled in onError
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" aria-hidden onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-class-students-title"
        className={classEditorModalClassName}
      >
        <div className={classEditorModalHeaderClassName}>
          <h2 id="edit-class-students-title" className={classEditorModalTitleClassName}>
            Chỉnh sửa học sinh trong lớp
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={classEditorModalCloseButtonClassName}
            aria-label="Đóng"
          >
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div ref={scrollableRef} className={classEditorModalInsetBodyClassName}>
          <div className="flex flex-wrap gap-2">
            {selectedStudents.map((s) => (
              <span
                key={s.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-border-default bg-bg-surface px-3 py-1.5 text-sm text-text-primary"
              >
                {s.name}
                <button
                  type="button"
                  onClick={() => setSelectedStudents((prev) => prev.filter((x) => x.id !== s.id))}
                  className="rounded-full p-0.5 text-text-muted transition-colors hover:bg-bg-tertiary hover:text-error focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  aria-label={`Bỏ ${s.name}`}
                >
                  <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
          <div className="relative" ref={studentSearchRef}>
            <input
              type="text"
              value={studentSearchInput}
              onChange={(e) => setStudentSearchInput(e.target.value)}
              onFocus={() => {
                setStudentSearchFocused(true);
                setDropdownRect(getDropdownRect(studentSearchRef.current));
              }}
              placeholder="Tìm kiếm học sinh theo tên..."
              className="w-full rounded-md outline outline-1 outline-border-default outline-offset-0 bg-bg-surface px-3 py-2 pr-9 text-sm text-text-primary placeholder:text-text-muted focus:outline-2 focus:outline-border-focus focus:outline-offset-0"
              aria-label="Tìm kiếm học sinh"
              aria-autocomplete="list"
            />
            {studentSearchFocused &&
              dropdownRect &&
              typeof document !== "undefined" &&
              createPortal(
                <div
                  ref={dropdownRef}
                  role="listbox"
                  className="z-[60] overflow-y-auto rounded-md border border-border-default bg-bg-surface py-1 shadow-lg"
                  style={{
                    position: "fixed",
                    top: dropdownRect.top,
                    left: dropdownRect.left,
                    width: dropdownRect.width,
                    maxHeight: dropdownRect.maxHeight,
                  }}
                >
                  {filteredStudents.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-text-muted">
                      {studentSearchInput.trim()
                        ? "Không tìm thấy kết quả"
                        : "Nhập tên để tìm kiếm học sinh"}
                    </p>
                  ) : (
                    filteredStudents.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        role="option"
                        aria-selected={false}
                        onClick={() => {
                          setSelectedStudents((prev) => [
                            ...prev,
                            { id: s.id, name: (s.fullName?.trim() ?? "") || s.id },
                          ]);
                          setStudentSearchInput("");
                          setStudentSearchFocused(false);
                          setDropdownRect(null);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text-primary transition-colors hover:bg-bg-tertiary focus:bg-bg-tertiary focus:outline-none focus-visible:ring-0"
                      >
                        {(s.fullName?.trim() ?? "") || s.id}
                      </button>
                    ))
                  )}
                </div>,
                document.body,
              )}
          </div>
        </div>

        <div className={classEditorModalFooterClassName}>
          <button
            type="button"
            onClick={onClose}
            className={classEditorModalSecondaryButtonClassName}
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={updateMutation.isPending}
            className={classEditorModalPrimaryButtonClassName}
          >
            {updateMutation.isPending ? "Đang lưu…" : "Lưu"}
          </button>
        </div>
      </div>
    </>
  );
}
