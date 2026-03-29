# Auth pages (Login / Register / Forgot / Reset)

## Tổng quan

- **Paths:** `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password`.
- **State layer:** TanStack Query (`useMutation`) cho toàn bộ submit flow auth.
- **Global providers:** `QueryClientProvider` + Sonner `Toaster` được mount tại `apps/web/app/providers.tsx`.
- **Auth API contract:** Giữ nguyên theo `apps/web/lib/apis/auth.api` (không đổi request/response contract).

## UI feedback chuẩn hoá

- Thay toàn bộ box thông báo inline lỗi/thành công trong 4 auth pages bằng toast của Sonner.
- Dùng `toast.error(...)` cho validation/mutation failure.
- Dùng `toast.success(...)` cho mutation success.
- Giữ nguyên redirect logic và fallback message hiện có.

## Redirect rules

- Login thành công:
  - `admin -> /admin`
  - `staff -> /staff` chỉ khi `GET /users/me/full` xác nhận đã có linked `staffInfo`; nếu chưa có profile thì fallback `/user-profile`
  - `student -> /student` chỉ khi `GET /users/me/full` xác nhận đã có linked `studentInfo`; nếu chưa có profile thì fallback `/user-profile`
  - `guest -> /`
- Register thành công: toast success, delay 3s rồi redirect `/auth/login`.
- Reset password thành công: toast success, delay 2s rồi redirect `/auth/login`.
- Forgot password thành công: toast success, không redirect.

## Lấy user trong Server Component

Để lấy thông tin user hiện tại trong **Server Component**, Route Handler hoặc Server Action (không dùng React context):

- Import và gọi `getUser()` từ `@/lib/auth-server`.
- Hàm đọc cookie `refresh_token` từ request, gọi backend `GET /auth/profile` với cookie đó, và trả về `UserInfoDto` hoặc user guest nếu chưa đăng nhập/lỗi.

**Ví dụ (trang server component):**

```tsx
// app/some-page/page.tsx
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth-server";

export default async function SomePage() {
  const user = await getUser();
  if (user.roleType === "guest") {
    redirect("/auth/login");
  }
  return <div>Hello, {user.accountHandle}</div>;
}
```

**Lưu ý:** `getUser()` chỉ chạy được ở môi trường server (Server Components, Route Handlers, Server Actions). Ở Client Component vẫn dùng `useAuth()` từ `AuthContext`.

## Email vs accountHandle (model)

- **email**: địa chỉ email, unique, dùng để gửi xác thực / quên mật khẩu.
- **accountHandle**: định danh đăng nhập (username), unique, dùng trong JWT và hiển thị (navbar, profile).
- Login chấp nhận một chuỗi: backend coi là accountHandle trước, không có thì coi là email.
- User đăng ký Google: `accountHandle` được set = email. User đăng ký form: nhập email và accountHandle riêng (có thể trùng hoặc khác).

## API endpoints đang dùng

- **API (real only):** login, logout, me (profile + role), register, verify email, forgot password, reset password.
- **Backend Auth endpoints hiện có:**
  - `POST /auth/login` body: `{ accountHandle, password, rememberMe? }`
    - `accountHandle`: có thể là **email** hoặc **account handle** (username); backend tìm user theo accountHandle trước, không có thì theo email.
    - refresh token policy: mặc định 7 ngày, nếu `rememberMe=true` thì 30 ngày.
    - rate limit: `20` request / `5 phút` / IP.
  - `POST /auth/register` body: `{ email, accountHandle, password, ... }`
    - `accountHandle` phải unique; nếu trùng với user khác (khác email) sẽ trả 400.
    - rate limit: `10` request / `1 giờ` / IP.
  - `POST /auth/refresh` dùng `refresh_token` cookie
    - rate limit: `120` request / `1 phút` / IP.
  - `GET /auth/profile` — thông tin cơ bản từ JWT (id, accountHandle, roleType), dùng cho server/getUser.
  - `GET /auth/me` — payload JWT hiện tại (id, accountHandle, roleType). Yêu cầu cookie `access_token`.
  - `GET /auth/verify?token=...`
    - rate limit: `30` request / `1 giờ` / IP.
  - `POST /auth/forgot-password` body: `{ email }`
    - rate limit: `5` request / `1 giờ` / IP.
  - `POST /auth/reset-password` body: `{ token, password }`
    - rate limit: `10` request / `1 giờ` / IP.
  - `POST /auth/change-password`
    - rate limit: `10` request / `30 phút` / IP.
- **Global rate limit:** các endpoint HTTP khác của API dùng limit mặc định `300` request / `60s` / endpoint / IP; health check `GET /` được `@SkipThrottle()`.
- **Phản hồi khi vượt ngưỡng:** backend trả `429 Too Many Requests`; frontend nên surface message này qua Sonner toast như các lỗi auth khác.
- **Contract:** Auth DTO và role enum aligned với backend.
- **Mock:** Not used for auth; mock layer chỉ dùng cho nội dung sau đăng nhập.

## Hồ sơ cá nhân (User module)

Các endpoint xem/sửa hồ sơ hiện tại nằm trong **user module** (không phải auth):

- `GET /users/me/full` — hồ sơ đầy đủ: user + `staffInfo` + `studentInfo` (nếu có). Yêu cầu cookie `access_token`.
- `PATCH /users/me` — cập nhật thông tin tài khoản (first_name, last_name, email, phone, province, accountHandle). Body: `UpdateMyProfileDto`. Trả về full profile.
- `PATCH /users/me/staff` — cập nhật hồ sơ nhân sự (full_name, birth_date, university, high_school, …). Body: `UpdateMyStaffProfileDto`. 400 nếu user không có staff.
- `PATCH /users/me/student` — cập nhật hồ sơ học viên (full_name, email, school, …). Body: `UpdateMyStudentProfileDto`. 400 nếu user không có student.
- `GET /users/me/student-detail` — hồ sơ self-service của học sinh hiện tại, chỉ trả về field an toàn cho student UI (không có gói học phí / field admin-only).
- `GET /users/me/student-wallet-history?limit=` — lịch sử ví của học sinh hiện tại từ `wallet_transactions_history`.
- `PATCH /users/me/student-account-balance` — nạp/rút tiền trên ví của chính học sinh hiện tại. Body: `{ amount }`; `amount > 0` là nạp, `amount < 0` là rút. Backend chặn tự rút vượt số dư.

DTO: `apps/web/dtos/profile.dto.ts` và `apps/api/src/dtos/profile.dto.ts`.

## Trang hồ sơ cá nhân (`/user-profile`)

- **Path:** `/user-profile`.
- **Mục đích:** Hiển thị và cho phép chỉnh sửa thông tin user, staff (nếu có), student (nếu có).
- **Data:** `useQuery` với `getFullProfile()` (GET /users/me/full). Cập nhật qua `updateMyProfile`, `updateMyStaffProfile`, `updateMyStudentProfile` với TanStack Query mutation; toast Sonner cho thành công/lỗi.
- **Bảo vệ:** Nếu 401 (chưa đăng nhập), trang gợi ý đăng nhập và link tới `/auth/login`.
- **Role gates:** `StudentAccessGate` và `StaffAccessGate` đều đọc `GET /users/me/full` để kiểm tra cả `roleType` lẫn linked `studentInfo` / `staffInfo`, không chỉ dựa vào role trần.

## Tài liệu chi tiết theo trang

- [auth-login.md](./auth-login.md)
- [auth-register.md](./auth-register.md)
- [auth-forgot-password.md](./auth-forgot-password.md)
- [auth-reset-password.md](./auth-reset-password.md)
