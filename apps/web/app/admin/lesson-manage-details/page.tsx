import LessonExercisesTab from "@/components/admin/lesson-plans/LessonExercisesTab";

export default function AdminLessonManageDetailsPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-3 pb-8 sm:p-6">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 rounded-xl border border-border-default bg-bg-surface p-3 shadow-sm sm:rounded-lg sm:p-5">
        <div className="rounded-xl border border-border-default bg-bg-secondary/35 px-4 py-3 sm:px-5">
          <h1 className="text-xl font-semibold text-text-primary sm:text-2xl">
            Quản lí Giáo Án chi tiết
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Bản phóng to của tab Giáo Án để theo dõi và quản lí danh sách dễ hơn.
          </p>
        </div>
        <LessonExercisesTab expandedView />
      </div>
    </div>
  );
}
