"use client";

import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import UpgradedSelect from "@/components/ui/UpgradedSelect";
import { ClassScheduleFilter } from "@/dtos/class-schedule.dto";
import * as classScheduleApi from "@/lib/apis/class-schedule.api";

interface FilterBarProps {
  filters: Pick<ClassScheduleFilter, "classId" | "teacherId">;
  weekLabel: string;
  onFiltersChange: (filters: Pick<ClassScheduleFilter, "classId" | "teacherId">) => void;
}

/**
 * FilterBar component for admin calendar page
 * Provides class and teacher filtering for the current week view
 */
export default function FilterBar({
  filters,
  weekLabel,
  onFiltersChange,
}: FilterBarProps) {
  const { data: classListResponse, isLoading: isLoadingClasses } = useQuery({
    queryKey: ["classes", "filter"],
    queryFn: () => classScheduleApi.getClassesForFilter(100),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: teacherListResponse, isLoading: isLoadingTeachers } = useQuery({
    queryKey: ["teachers", "filter"],
    queryFn: () => classScheduleApi.getTeachersForFilter(100),
    staleTime: 5 * 60 * 1000,
  });

  const classOptions = useMemo(() => {
    const classes = classListResponse?.data ?? [];
    return [
      { value: "", label: "Tất cả lớp học" },
      ...classes.map((cls) => ({
        value: cls.id,
        label: cls.name,
      })),
    ];
  }, [classListResponse]);

  // Build teacher options
  const teacherOptions = useMemo(() => {
    const teachers = teacherListResponse?.data ?? [];
    return [
      { value: "", label: "Tất cả giáo viên" },
      ...teachers.map((t) => ({
        value: t.id,
        label: t.fullName || `ID: ${t.id}`,
      })),
    ];
  }, [teacherListResponse]);

  const handleClassChange = useCallback((value: string) => {
    onFiltersChange({
      ...filters,
      classId: value === "" ? undefined : value,
    });
  }, [filters, onFiltersChange]);

  const handleTeacherChange = useCallback((value: string) => {
    onFiltersChange({
      ...filters,
      teacherId: value === "" ? undefined : value,
    });
  }, [filters, onFiltersChange]);

  const handleClearFilters = useCallback(() => {
    onFiltersChange({});
  }, [onFiltersChange]);

  return (
    <section className="relative overflow-visible rounded-2xl border border-border-default bg-gradient-to-br from-bg-secondary via-bg-surface to-bg-secondary/70 p-4 sm:p-5">
      {/* Background blur decorations */}
      <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-primary/10 blur-2xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-10 left-10 size-28 rounded-full bg-warning/10 blur-2xl" aria-hidden />

      <div className="relative">
        <h2 className="text-lg font-semibold text-text-primary">Bộ lọc Lịch</h2>
        <p className="mt-1 text-sm text-text-secondary">
          {weekLabel}
        </p>
      </div>

      <div className="relative mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="class-filter" className="block text-sm font-medium text-text-secondary">
            Lớp học
          </label>
          <div className="mt-1">
            <UpgradedSelect
              id="class-filter"
              ariaLabel="Lọc theo lớp học"
              value={filters.classId ?? ""}
              onValueChange={handleClassChange}
              options={classOptions}
              placeholder={isLoadingClasses ? "Đang tải..." : "Tất cả lớp học"}
              disabled={isLoadingClasses}
            />
          </div>
        </div>

        <div>
          <label htmlFor="teacher-filter" className="block text-sm font-medium text-text-secondary">
            Giáo viên
          </label>
          <div className="mt-1">
            <UpgradedSelect
              id="teacher-filter"
              ariaLabel="Lọc theo giáo viên"
              value={filters.teacherId ?? ""}
              onValueChange={handleTeacherChange}
              options={teacherOptions}
              placeholder={isLoadingTeachers ? "Đang tải..." : "Tất cả giáo viên"}
              disabled={isLoadingTeachers}
            />
          </div>
        </div>
      </div>

      {(filters.classId || filters.teacherId) && (
        <div className="mt-3">
          <button
            type="button"
            onClick={handleClearFilters}
            className="inline-flex items-center gap-2 rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm font-medium text-text-secondary transition-colors duration-200 hover:bg-bg-secondary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-border-focus focus:ring-offset-2"
            aria-label="Xóa bộ lọc"
          >
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            Xóa bộ lọc
          </button>
        </div>
      )}
    </section>
  );
}
