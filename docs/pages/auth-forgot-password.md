# Auth Forgot Password Page (`/auth/forgot-password`)

## Mục tiêu

Cho phép user yêu cầu link reset password qua email, phản hồi bằng Sonner toast.

## Hành vi chính

- Form nhập email.
- Submit gọi `authApi.forgotPassword({ email })`.
- Thành công hiển thị thông báo generic (tránh lộ email tồn tại/không tồn tại).

## Feedback UI

- Success: `toast.success(...)`.
- Error: `toast.error(...)` với fallback message.
- Không render alert inline cho error/success.

## Ghi chú

- Không redirect sau submit thành công.
- Giữ nguyên nội dung message hiện có.
