"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as classApi from "@/lib/apis/class.api";
import { CourseFormPopup, type CourseFormValues } from "@/components/admin/class";
import UpgradedSelect from "@/components/ui/UpgradedSelect";
import { Switch } from "@/components/ui/switch";
import { authKeys, courseKeys } from "@/lib/query-keys";
import { runBackgroundSave } from "@/lib/mutation-feedback";
import { getFullProfile } from "@/lib/apis/auth.api";
import { resolveAdminShellAccess } from "@/lib/admin-shell-access";
import type {
  CourseDifficultyLevel,
} from "@/dtos/class.dto";

export default function CourseSettingsPage() {
  const params = useParams<{ id: string }>();
  const courseId = params.id;
  const { push } = useRouter();
  const queryClient = useQueryClient();

  const { data: fullProfile } = useQuery({
    queryKey: authKeys.fullProfile(),
    queryFn: getFullProfile,
    retry: false,
    staleTime: 60_000,
  });
  const { isAdmin, isAssistant } = resolveAdminShellAccess(fullProfile);
  const canManage = isAdmin || isAssistant;

  const { data: course, isLoading, isError, refetch } = useQuery({
    queryKey: courseKeys.detail(courseId),
    queryFn: () => classApi.getCourseById(courseId),
    enabled: Boolean(courseId),
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: courseKeys.detail(courseId) }),
      queryClient.invalidateQueries({ queryKey: courseKeys.all }),
    ]);
  };

  // ── Edit basic info ──
  const [formOpen, setFormOpen] = useState(false);
  const handleSubmit = async (values: CourseFormValues) => {
    setFormOpen(false);
    runBackgroundSave({
      loadingMessage: "Đang lưu khoá học...",
      successMessage: "Đã lưu khoá học.",
      errorMessage: "Không thể lưu khoá học.",
      action: () =>
        classApi.updateCourse(courseId, {
          name: values.name,
          sort_order: values.sortOrder,
          default_duration_days: values.defaultDurationDays,
        }),
      onSuccess: invalidate,
    });
  };

  const toggleActive = useMutation({
    mutationFn: (nextActive: boolean) =>
      classApi.updateCourse(courseId, { is_active: nextActive }),
    onSuccess: invalidate,
  });

  const handleDelete = () => {
    if (!course) return;
    if (
      !window.confirm(
        `Xoá khoá học "${course.name}"? Chỉ xoá được khi không còn lớp nào dùng khoá này.`,
      )
    ) {
      return;
    }
    runBackgroundSave({
      loadingMessage: "Đang xoá khoá học...",
      successMessage: "Đã xoá khoá học.",
      errorMessage: "Không thể xoá khoá học.",
      action: () => classApi.deleteCourse(courseId),
      onSuccess: () => push("/admin/classes/courses"),
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-3 pb-8 sm:p-6">
        <p className="text-sm text-text-secondary">Đang tải...</p>
      </div>
    );
  }

  if (isError || !course) {
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-3 pb-8 sm:p-6">
        <p className="text-sm text-error">
          Không tải được khoá học.{" "}
          <button type="button" onClick={() => refetch()} className="underline">
            Thử lại
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-3 pb-8 sm:p-6">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <section className="relative overflow-hidden rounded-2xl border border-border-default bg-gradient-to-br from-bg-secondary via-bg-surface to-bg-secondary/70 p-4 sm:p-5">
          <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-primary/10 blur-2xl" aria-hidden />
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <Link
                href="/admin/classes/courses"
                className="mb-1 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
              >
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Khoá học
              </Link>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold text-text-primary sm:text-2xl">
                  {course.name}
                </h1>
                {!course.isActive ? (
                  <span className="rounded bg-error/10 px-1.5 py-0.5 text-xs text-error">Đã ẩn</span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-text-secondary">
                Thời hạn mặc định:{" "}
                <span className="font-medium text-text-primary">
                  {course.defaultDurationDays == null
                    ? "Vô hạn"
                    : `${course.defaultDurationDays} ngày`}
                </span>
                {" · "}
                Mức độ khó: {course.difficultyLevels?.length ?? 0} · Đội giáo án:{" "}
                {course.lessonPlanMembers?.length ?? 0} · Lớp học: {course._count?.classes ?? 0}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2 self-end sm:self-auto">
              {canManage ? (
                <>
                  <label className="flex items-center gap-2 text-xs text-text-secondary">
                    <span>Hoạt động</span>
                    <Switch
                      checked={course.isActive}
                      onCheckedChange={(next) => toggleActive.mutate(next)}
                      disabled={toggleActive.isPending}
                      aria-label={`Bật/tắt hoạt động cho ${course.name}`}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormOpen(true)}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-text-inverse shadow-sm transition-colors duration-200 hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface sm:min-h-10"
                  >
                    Sửa khoá học
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="inline-flex min-h-11 items-center justify-center rounded-md border border-error/30 bg-bg-surface px-4 py-2 text-sm font-medium text-error transition-colors duration-200 hover:bg-error/10 sm:min-h-10"
                  >
                    Xoá
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </section>

        {canManage ? (
          <>
            <DifficultyLevelsCard courseId={courseId} invalidate={invalidate} />
            <LessonPlanTeamCard courseId={courseId} invalidate={invalidate} />
          </>
        ) : (
          <div className="rounded-lg border border-border-default bg-bg-surface p-4 text-sm text-text-secondary">
            Bạn chỉ có quyền xem cấu hình khoá học này.
          </div>
        )}
      </div>

      <CourseFormPopup
        open={formOpen}
        course={course}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Thang mức độ khó
// ─────────────────────────────────────────────────────────────

function DifficultyLevelsCard({
  courseId,
  invalidate,
}: {
  courseId: string;
  invalidate: () => Promise<void>;
}) {
  const queryClient = useQueryClient();
  const { data: levels = [], isLoading } = useQuery({
    queryKey: courseKeys.difficultyLevels(courseId),
    queryFn: () => classApi.getCourseDifficultyLevels(courseId, true),
  });

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const invalidateLevels = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: courseKeys.difficultyLevels(courseId),
      }),
      invalidate(),
    ]);
  };

  const addLevel = () => {
    const name = newName.trim();
    if (!name) return;
    setNewName("");
    runBackgroundSave({
      loadingMessage: "Đang thêm mức độ khó...",
      successMessage: "Đã thêm mức độ khó.",
      errorMessage: "Không thể thêm mức độ khó.",
      action: () =>
        classApi.createCourseDifficultyLevel(courseId, {
          name,
          sort_order: levels.length,
        }),
      onSuccess: invalidateLevels,
    });
  };

  const startEdit = (level: CourseDifficultyLevel) => {
    setEditingId(level.id);
    setEditingName(level.name);
  };

  const saveEdit = (level: CourseDifficultyLevel) => {
    const name = editingName.trim();
    if (!name) return;
    setEditingId(null);
    runBackgroundSave({
      loadingMessage: "Đang cập nhật mức độ khó...",
      successMessage: "Đã cập nhật mức độ khó.",
      errorMessage: "Không thể cập nhật mức độ khó.",
      action: () =>
        classApi.updateCourseDifficultyLevel(courseId, level.id, { name }),
      onSuccess: invalidateLevels,
    });
  };

  const toggleLevel = (level: CourseDifficultyLevel, nextActive: boolean) => {
    runBackgroundSave({
      loadingMessage: "Đang cập nhật mức độ khó...",
      successMessage: "Đã cập nhật mức độ khó.",
      errorMessage: "Không thể cập nhật mức độ khó.",
      action: () =>
        classApi.updateCourseDifficultyLevel(courseId, level.id, {
          is_active: nextActive,
        }),
      onSuccess: invalidateLevels,
    });
  };

  const deleteLevel = (level: CourseDifficultyLevel) => {
    if (!window.confirm(`Xoá mức độ khó "${level.name}"?`)) return;
    runBackgroundSave({
      loadingMessage: "Đang xoá mức độ khó...",
      successMessage: "Đã xoá mức độ khó.",
      errorMessage: "Không thể xoá mức độ khó.",
      action: () => classApi.deleteCourseDifficultyLevel(courseId, level.id),
      onSuccess: invalidateLevels,
    });
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= levels.length) return;
    const next = [...levels];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    runBackgroundSave({
      loadingMessage: "Đang sắp xếp mức độ khó...",
      successMessage: "Đã sắp xếp mức độ khó.",
      errorMessage: "Không thể sắp xếp mức độ khó.",
      action: () =>
        classApi.reorderCourseDifficultyLevels(
          courseId,
          next.map((l, i) => ({ id: l.id, sort_order: i })),
        ),
      onSuccess: invalidateLevels,
    });
  };

  return (
    <section className="rounded-xl border border-border-default bg-bg-surface p-3 shadow-sm sm:rounded-lg sm:p-5">
      <h2 className="text-base font-semibold text-text-primary">Thang mức độ khó</h2>
      <p className="mt-0.5 text-sm text-text-secondary">
        Thang do khoá tự định nghĩa (tên, thứ tự, bật/tắt) — không dùng thang cố định toàn hệ thống.
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addLevel();
            }
          }}
          placeholder="Tên mức độ khó (VD: Dễ, Trung bình, Khó)"
          className="min-w-0 flex-1 rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        />
        <button
          type="button"
          onClick={addLevel}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors duration-200 hover:bg-primary-hover sm:min-h-10"
        >
          <svg className="size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Thêm mức độ
        </button>
      </div>

      {isLoading ? (
        <p className="mt-4 text-sm text-text-secondary">Đang tải...</p>
      ) : levels.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-border-default p-4 text-sm text-text-secondary">
          Chưa có mức độ khó nào. Thêm mức độ đầu tiên để bắt đầu.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {levels.map((level, index) => (
            <li
              key={level.id}
              className="flex flex-col gap-2 rounded-lg border border-border-default bg-bg-surface p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              {editingId === level.id ? (
                <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        saveEdit(level);
                      }
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="min-w-0 flex-1 rounded-md border border-border-default bg-bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  />
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => saveEdit(level)}
                      className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-text-inverse"
                    >
                      Lưu
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded-md border border-border-default px-3 py-1.5 text-xs font-medium text-text-secondary"
                    >
                      Huỷ
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="w-5 shrink-0 text-center text-xs text-text-muted">
                      {index + 1}
                    </span>
                    <span
                      className={
                        level.isActive
                          ? "truncate text-sm font-medium text-text-primary"
                          : "truncate text-sm text-text-muted line-through"
                      }
                    >
                      {level.name}
                    </span>
                    {!level.isActive ? (
                      <span className="rounded bg-error/10 px-1.5 py-0.5 text-xs text-error">Đã tắt</span>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
                    <div className="flex items-center overflow-hidden rounded-md border border-border-default">
                      <button
                        type="button"
                        onClick={() => move(index, -1)}
                        disabled={index === 0}
                        className="px-2 py-1.5 text-text-secondary transition-colors hover:bg-bg-tertiary disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Lên trên"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => move(index, 1)}
                        disabled={index === levels.length - 1}
                        className="border-l border-border-default px-2 py-1.5 text-text-secondary transition-colors hover:bg-bg-tertiary disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Xuống dưới"
                      >
                        ↓
                      </button>
                    </div>
                    <Switch
                      checked={level.isActive}
                      onCheckedChange={(next) => toggleLevel(level, next)}
                      aria-label={`Bật/tắt ${level.name}`}
                    />
                    <button
                      type="button"
                      onClick={() => startEdit(level)}
                      className="rounded-md border border-border-default px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-bg-tertiary"
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteLevel(level)}
                      className="rounded-md border border-error/30 px-3 py-1.5 text-xs font-medium text-error transition-colors hover:bg-error/10"
                    >
                      Xoá
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Đội giáo án
// ─────────────────────────────────────────────────────────────

function LessonPlanTeamCard({
  courseId,
  invalidate,
}: {
  courseId: string;
  invalidate: () => Promise<void>;
}) {
  const { data: course } = useQuery({
    queryKey: courseKeys.detail(courseId),
    queryFn: () => classApi.getCourseById(courseId),
    enabled: Boolean(courseId),
  });
  const members = course?.lessonPlanMembers ?? [];

  const [selectedStaffId, setSelectedStaffId] = useState("");

  const { data: staffOptions = [] } = useQuery({
    queryKey: courseKeys.lessonPlanStaff(""),
    queryFn: () => classApi.searchLessonPlanStaff({ limit: 200 }),
    staleTime: 30_000,
  });

  const availableOptions = staffOptions
    .filter((staff) => !members.some((m) => m.staff.id === staff.id))
    .map((staff) => ({
      value: staff.id,
      label: staff.fullName,
      searchLabel: staff.fullName,
    }));

  const saveMembers = (staffIds: string[]) => {
    runBackgroundSave({
      loadingMessage: "Đang cập nhật đội giáo án...",
      successMessage: "Đã cập nhật đội giáo án.",
      errorMessage: "Không thể cập nhật đội giáo án.",
      action: () =>
        classApi.assignCourseLessonPlanMembers(courseId, {
          staff_ids: staffIds,
        }),
      onSuccess: invalidate,
    });
  };

  const addMember = () => {
    if (!selectedStaffId) return;
    saveMembers([...members.map((m) => m.staff.id), selectedStaffId]);
    setSelectedStaffId("");
  };

  const removeMember = (staffId: string) => {
    saveMembers(members.filter((m) => m.staff.id !== staffId).map((m) => m.staff.id));
  };

  return (
    <section className="rounded-xl border border-border-default bg-bg-surface p-3 shadow-sm sm:rounded-lg sm:p-5">
      <h2 className="text-base font-semibold text-text-primary">Đội giáo án</h2>
      <p className="mt-0.5 text-sm text-text-secondary">
        Nhân sự soạn nội dung học thuật và ngân hàng câu hỏi của khoá. Thành viên lesson_plan chỉ
        thấy khoá mình được gán; trưởng giáo án thấy mọi khoá.
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <UpgradedSelect
          searchable
          value={selectedStaffId}
          onValueChange={setSelectedStaffId}
          options={availableOptions}
          placeholder="Chọn nhân sự lesson_plan/lesson_plan_head..."
          emptyStateLabel="Không còn nhân sự nào để gán."
          noResultsLabel="Không tìm thấy nhân sự phù hợp."
          buttonClassName="min-w-0 flex-1"
          menuClassName="max-h-72"
        />
        <button
          type="button"
          onClick={addMember}
          disabled={!selectedStaffId}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors duration-200 hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-10"
        >
          Thêm
        </button>
      </div>

      {members.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-border-default p-4 text-sm text-text-secondary">
          Chưa có thành viên nào trong đội giáo án.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {members.map((member) => (
            <li
              key={member.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border-default bg-bg-surface px-3 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm font-medium text-text-primary">
                  {member.staff.fullName}
                </span>
                {member.staff.roles.includes("lesson_plan_head") ? (
                  <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                    Trưởng giáo án
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => removeMember(member.staff.id)}
                className="shrink-0 rounded-md border border-error/30 px-3 py-1.5 text-xs font-medium text-error transition-colors hover:bg-error/10"
              >
                Gỡ
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
