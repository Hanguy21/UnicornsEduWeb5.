# Student – `/student`

## Route and role

- **Path:** `/student`
- **Role:** `student` only (guard must block other roles).
- **Workplan owner:** Minh (Frontend – UX + Assistant/Student).

## Features

- **Thông tin cá nhân:** Dùng cùng bố cục với `/admin/students/[id]`, nhưng chỉ hiển thị hồ sơ của chính học sinh đang đăng nhập.
- **Ẩn dữ liệu nhạy cảm:** Không render gói học phí, học phí/buổi, customer care profit và các control quản trị lớp/hồ sơ.
- **Ví học viên:** Hiển thị số dư hiện tại, popup lịch sử ví authoritative, cho phép **nạp tiền** và **rút tiền** trên chính tài khoản của mình.
- **Ràng buộc rút tiền:** Backend chặn rút vượt số dư; self-service không được phép làm âm ví.
- **Lớp học:** Hiển thị danh sách lớp đang liên kết + số buổi đã vào học; không có thao tác đổi lớp/gỡ lớp.
- **Lịch thi:** Reuse card `StudentExamCard` để xem lịch thi FE-local theo đúng `studentId`.
- **Data scope:** All data scoped to current student; backend enforces by identity.

## UI-Schema tokens and components

- **Navbar / Sidebar:** `bg-surface` / `bg-secondary`, `text-primary` / `text-secondary`, `border-default`; hover and active per component mapping.
- **Cards (schedule, document, payment row):** `bg-surface`, `text-primary`, `border-default`; hover `bg-secondary` or `bg-elevated`.
- **Tables / lists:** Header `bg-secondary`; row `bg-surface`; `border-default`; row hover `bg-secondary`.
- **Buttons:** Primary = `primary` + `text-inverse`; Secondary = `secondary` + `border-default`.
- **Inputs (profile):** `bg-surface`, `text-primary`, `border-default`; focus `border-focus`.
- **Badges (payment status):** Same status tints as other routes; icon + label.
- **Tags (e.g. document type):** `bg-secondary`, `text-secondary`, `border-subtle`; selected `primary` + `text-inverse`.

## Data and API

- **Backend domain:** `student_info`, `student_classes`, `wallet_transactions_history`.
- **API (real):**
  - `GET /users/me/student-detail`
  - `GET /users/me/student-wallet-history?limit=`
  - `PATCH /users/me/student-account-balance` body `{ amount }`
- **Balance semantics:** `amount > 0` = nạp tiền, `amount < 0` = rút tiền; backend ghi `wallet_transactions_history` và tự chặn số dư âm ở self-service route.
- **Frontend data layer:** TanStack Query + `apps/web/lib/apis/auth.api.ts`; DTO student self-service nằm trong `apps/web/dtos/student.dto.ts`.

## Runtime status

- Route `/student` đã có file runtime thật tại `apps/web/app/student/page.tsx`.
- Shell route dùng `apps/web/app/student/layout.tsx` + `StudentAccessGate` để khóa quyền theo role `student`.
- Layout bám admin student detail nhưng đổi CTA và copy về hướng self-service.

## DoD and week

- **Tuần 5:** Student sees only own data; wallet self-service available for own account only; sensitive finance fields stay hidden; frontend `/student` connected to real API.

## Accessibility

- Tables/lists with clear structure; status and links not by color only.
- Focus and contrast AA per UI-Schema.

## Archived context (for implementation)

See [ARCHIVED-UI-CONTEXT.md](ARCHIVED-UI-CONTEXT.md) for full mapping.

- **Own profile / read-only scope:** `archived/.../pages/StudentDetail.tsx` — when viewer is student and `user.linkId === id`: profile view/edit, no admin actions (canManageStudentRecord false, canTopUp false); accountIconMode `'self'` for login info.
- **Timetable / schedule:** `pages/Schedule.tsx` — weekly calendar, fetchSessions by date range; in 5.0 scope to current student’s classes/sessions only.
- **Payment history (read-only):** Reuse list/table pattern from `pages/Payments.tsx` but no create/update/delete; fetchPayments or equivalent filtered by current student.
- **Documents:** If present in archived (documentsService), reuse for “tài liệu” under student scope.
- **Layout:** Student uses top nav (no sidebar); same Layout pattern as teacher in archived.
