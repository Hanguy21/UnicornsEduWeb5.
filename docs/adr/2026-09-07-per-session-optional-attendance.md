# ADR: Điểm danh tuỳ chọn theo từng buổi học, vẫn auto-present và vẫn thu phí

- **Status:** Accepted
- **Date:** 2026-09-07
- **Amends:** `docs/adr/2026-09-05-class-without-attendance-still-charges.md` (vị trí cờ + ai được tick). Phần **tính phí / auto `Attendance.present`** của ADR 2026-09-05 vẫn ràng buộc.

## Context

PRD 3.1: *"Điểm danh là tuỳ chọn theo TỪNG BUỔI: khi tạo buổi học, gia sư có thể tick 'không cần điểm danh'. Nếu tick, phần điểm danh sẽ KHÔNG hiển thị trong màn hình tạo/xem buổi học đó."*

ADR 2026-09-05 đặt cờ trên `Class`, chỉ admin/trợ lí chỉnh, form tạo buổi không có checkbox — vì tick nhầm ảnh hưởng trợ cấp/học phí. Ticket #104 yêu cầu chuyển quyết định xuống từng `Session`, giữ hành vi auto-present + tính phí.

## Decision

1. Cờ hiệu lực của **một buổi** là `sessions.snapshot_no_attendance` (`Session.snapshotNoAttendance`), đóng băng lúc tạo. Không đọc lại `Class.noAttendance` sau khi buổi đã tạo.
2. Form tạo buổi (admin và gia sư) có checkbox **"Không cần điểm danh cho buổi này"**. Payload `noAttendance` (boolean, optional):
   - có giá trị → dùng giá trị đó;
   - bỏ trống → default từ `Class.noAttendance` (gợi ý cho lớp đông).
3. Giữ `Class.noAttendance` (admin/assistant, tab Cài đặt lớp) làm **default gợi ý**, không xoá cột — tránh migration dữ liệu và vẫn cho trung tâm preset lớp đông.
4. Khi cờ buổi = true: ẩn form điểm danh lúc tạo/xem; backend tự tạo `Attendance.present` cho mọi học sinh `active`; học phí và trợ cấp vẫn tính như ADR 2026-09-05. `PUT` session vẫn bỏ qua `attendance` khi snapshot = true.
5. Không đổi tên cột DB (`snapshot_no_attendance`) — đã là cờ buổi; tránh cột `no_attendance` trùng nghĩa.

## Conflict with ADR 2026-09-05 (left for product)

ADR cũ loại checkbox gia sư vì người thụ hưởng trợ cấp tự quyết điều kiện tính trợ cấp. PRD 3.1 + ticket #104 bắt buộc checkbox đó. Slice này **không** tự bỏ ADR tính phí; chỉ ghi nhận mâu thuẫn chủ thể (gia sư được tick) để người quyết định xem trên PR.

## Consequences

- Một lớp có thể xen buổi điểm danh thật và buổi auto-present. Báo cáo chuyên cần phải lọc theo `sessions.snapshot_no_attendance`, không loại cả lớp.
- Client cũ không gửi `noAttendance` vẫn đúng nhờ default từ class.
- Đổi `Class.noAttendance` giữa chừng **không** sửa buổi đã tạo.
