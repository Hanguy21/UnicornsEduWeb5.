# Backend-Authoritative UUID Generation Implementation Plan

## Overview

Chuẩn hóa toàn bộ flow tạo mới để Backend/DB là nguồn tạo UUID authoritative, loại bỏ việc FE tự tạo `id` khi create. Mục tiêu là giữ tương thích behavior hiện tại (đặc biệt lịch Google Calendar) trong khi đơn giản hóa contract FE.

## Current State Analysis

Hiện tại codebase đang trộn 2 chiến lược ID: phần lớn model để DB tự sinh UUID, nhưng một số flow vẫn nhận `id` từ FE và persist trực tiếp.

- `bonus` create yêu cầu `id` từ request và service ghi thẳng `id` này.
- `class schedule` lưu trong JSON `Class.schedule`, merge theo `entry.id` để giữ `googleCalendarEventId/meetLink`.
- `student exam schedule` đang replace-all: delete rồi `createMany`, có dùng `id` nếu FE gửi.
- FE đang dùng `createClientId()` với fallback `local-*`, có nguy cơ lệch chuẩn UUID.

## Desired End State

Sau khi hoàn tất:

- FE không gửi `id` trong create payload cho `bonus`.
- BE/DB tạo UUID cho `bonus` (qua `@default(uuid())`), response trả về authoritative `id`.
- `class schedule` vẫn giữ `id` slot ổn định để merge metadata, nhưng BE chịu trách nhiệm tạo `id` cho slot mới thiếu `id` (strategy A).
- `student exam schedule` giữ replace-all, chấp nhận `id?`; khi FE không gửi `id` cho item mới thì DB tự sinh UUID.
- FE bỏ hoàn toàn phụ thuộc `createClientId()` trong các flow create chính.

### Key Discoveries:

- `CreateBonusDto` đang bắt buộc `id` và `BonusService.createBonus()` persist `id` request (`apps/api/src/dtos/bonus.dto.ts`, `apps/api/src/bonus/bonus.service.ts`).
- `ClassService.mergeScheduleEntriesWithExisting()` phụ thuộc `entry.id` để giữ `googleCalendarEventId/meetLink` (`apps/api/src/class/class.service.ts`).
- `StudentService.updateStudentExamSchedules()` đang replace-all với `createMany` và chỉ thêm `id` nếu payload có (`apps/api/src/student/student.service.ts`).
- FE create bonus ở cả admin và staff profile đều gửi `id: createClientId()` (`apps/web/app/admin/staffs/[id]/page.tsx`, `apps/web/app/staff/profile/page.tsx`).

## What We're NOT Doing

- Không đổi semantics replace-all của student exam schedules sang true upsert.
- Không redesign cấu trúc lưu `Class.schedule` (vẫn JSON, không tách bảng schedule slot riêng).
- Không thay đổi business rule payment/status hiện tại của bonus.
- Không thêm migration schema vì Prisma models đã có `@default(uuid())` phù hợp.

## Implementation Approach

Triển khai theo hướng contract-first ở BE, sau đó cập nhật FE DTO/API và các form liên quan. Riêng class schedule dùng normalization ở BE để bảo toàn behavior merge/sync calendar hiện tại: mọi slot thiếu `id` sẽ được BE bổ sung UUID trước khi merge.

## Phase 1: Make Backend Authoritative For Bonus IDs

### Overview

Loại bỏ yêu cầu FE gửi `id` khi tạo bonus; BE dùng DB default UUID.

### Changes Required:

#### 1. Bonus DTO contract update
**File**: `apps/api/src/dtos/bonus.dto.ts`  
**Changes**:
- Bỏ `id` khỏi `CreateBonusDto` hoặc chuyển thành optional nhưng không dùng khi create.
- Giữ `UpdateBonusDto`/`UpdateMyBonusDto` tiếp tục cần `id` cho update.

```typescript
export class CreateBonusDto {
  @IsUUID()
  staffId: string;
  // remove required create id
}
```

#### 2. Bonus service create path
**File**: `apps/api/src/bonus/bonus.service.ts`  
**Changes**:
- `createBonus()` không truyền `id` vào `tx.bonus.create`.
- Đảm bảo audit snapshot vẫn dùng `createdBonus.id` từ DB result.

#### 3. Swagger and controller alignment
**File**: `apps/api/src/bonus/bonus.controller.ts` and `apps/api/src/user/user-profile.controller.ts`  
**Changes**:
- Cập nhật mô tả request body create bonus để không còn field `id`.

### Success Criteria:

#### Automated Verification:
- [x] API typecheck pass: `pnpm --filter api check-types`
- [x] API build pass: `pnpm --filter api build`
- [x] Bonus create endpoint validation pass without request `id` (e2e/unit update if existing suite covers): `pnpm --filter api test`

#### Manual Verification:
- [ ] Tạo bonus từ admin staff detail thành công dù FE không gửi `id`
- [ ] Tạo bonus từ staff self profile thành công dù FE không gửi `id`
- [ ] Bonus mới xuất hiện đúng với UUID do backend trả về

**Implementation Note**: Sau khi hoàn tất phase này và toàn bộ automated checks pass, tạm dừng để xác nhận manual test trước khi sang phase tiếp theo.

---

## Phase 2: Backend-Side Schedule Slot ID Normalization (Strategy A)

### Overview

Giữ merge behavior hiện có cho `class schedule`, nhưng chuyển trách nhiệm tạo `id` slot mới sang BE.

### Changes Required:

#### 1. Normalize missing slot IDs before merge
**File**: `apps/api/src/class/class.service.ts`  
**Changes**:
- Trong `updateClassSchedule()`, trước `mergeScheduleEntriesWithExisting()`, chuẩn hóa `dto.schedule`: slot nào thiếu `id` thì generate UUID ở BE.
- Không phá vỡ existing slot IDs để merge giữ `googleCalendarEventId/meetLink`.

```typescript
const normalizedInput = dto.schedule.map((entry) => ({
  ...entry,
  id: entry.id ?? randomUUID(),
}));
```

#### 2. Optional consistency for calendar-admin schedule endpoint
**File**: `apps/api/src/calendar/calendar.service.ts`  
**Changes**:
- Đảm bảo logic `updateClassSchedulePattern()` và `ClassService.updateClassSchedule()` dùng cùng nguyên tắc BE-generate-missing-id (đã có ở calendar service, cần đồng bộ về convention).

#### 3. DTO documentation clarification
**File**: `apps/api/src/dtos/class.dto.ts`  
**Changes**:
- Ghi rõ `ScheduleSlotDto.id` optional cho create/new row; nếu thiếu BE tự sinh.

### Success Criteria:

#### Automated Verification:
- [x] API typecheck pass: `pnpm --filter api check-types`
- [x] API build pass: `pnpm --filter api build`
- [x] Class-related tests pass: `pnpm --filter api test`

#### Manual Verification:
- [ ] Admin edit class schedule vẫn lưu thành công khi slot mới không có `id`
- [ ] Staff class schedule flow vẫn lưu thành công trong cùng điều kiện
- [ ] Google Calendar sync không mất link cho slot cũ khi chỉ sửa một phần lịch

**Implementation Note**: Sau khi hoàn tất phase này và automated checks pass, tạm dừng để xác nhận manual testing calendar flow trước khi tiếp tục.

---

## Phase 3: Frontend Contract Cleanup (Remove FE-Generated IDs In Create Paths)

### Overview

Cập nhật FE DTO/API/payload để không gửi `id` trong create where BE is authoritative, đồng thời giữ edit flows ổn định.

### Changes Required:

#### 1. Remove FE-generated bonus IDs in create flows
**File**: `apps/web/dtos/bonus.dto.ts`  
**Changes**:
- `CreateBonusPayload` và `CreateMyBonusPayload` bỏ field `id`.

**File**: `apps/web/app/admin/staffs/[id]/page.tsx`  
**File**: `apps/web/app/staff/profile/page.tsx`  
**Changes**:
- `handleSubmitBonus` create path không còn gửi `id: createClientId()`.
- Remove import `createClientId` nếu không còn dùng.

#### 2. Class schedule create/update payload adjustments
**File**: `apps/web/components/admin/class/AddClassPopup.tsx`  
**File**: `apps/web/components/staff/StaffCreateClassPopup.tsx`  
**File**: `apps/web/components/admin/class/EditClassPopup.tsx`  
**File**: `apps/web/components/admin/class/EditClassSchedulePopup.tsx`  
**Changes**:
- Với slot mới, cho phép payload `id` absent; với slot existing giữ nguyên `id`.
- Giảm phụ thuộc `createClientId()` cho row create mới nếu không cần cho React keys (nếu cần key local thì tách `localKey` khỏi API `id`).

#### 3. Student exam schedule keep replace-all, drop forced FE ID creation
**File**: `apps/web/components/admin/student/StudentExamSchedulePopup.tsx`  
**File**: `apps/web/components/admin/student/EditStudentPopup.tsx`  
**File**: `apps/web/components/admin/student/StudentExamCard.tsx`  
**File**: `apps/web/dtos/student.dto.ts`  
**Changes**:
- Cho phép item mới dùng local key riêng trong UI, không bắt buộc map sang API `id`.
- Payload vẫn giữ `id?` cho row đã tồn tại; row mới omit `id`.

#### 4. Route parity validation
**File group**: `apps/web/app/admin/**`, `apps/web/app/staff/**`, `apps/web/app/student/**`  
**Changes**:
- Rà soát parity ở các route mirror dùng cùng component và query keys.
- Đảm bảo behavior admin/staff/student nhất quán sau thay đổi contract.

### Success Criteria:

#### Automated Verification:
- [x] Web typecheck pass: `pnpm --filter web exec tsc --noEmit`
- [ ] Web lint pass: `pnpm --filter web lint`
- [x] API/Web combined typecheck pass: `pnpm check-types`

#### Manual Verification:
- [ ] Admin tạo bonus thành công, không còn gửi FE id
- [ ] Staff self thêm bonus thành công, không còn gửi FE id
- [ ] Admin/staff chỉnh lịch lớp thêm slot mới thành công, calendar sync không regression
- [ ] Admin/student self chỉnh lịch thi thành công theo replace-all, dữ liệu trả về có UUID từ backend

**Implementation Note**: Sau phase này và automated checks pass, dừng để xác nhận full regression manual test trên cả admin/staff/student.

---

## Testing Strategy

### Unit Tests:
- Bổ sung test cho `BonusService.createBonus()` để assert không cần input `id`.
- Bổ sung test `ClassService.updateClassSchedule()` cho case missing slot `id` -> BE generate và vẫn giữ metadata cũ khi slot existing có `id`.
- Bổ sung test `StudentService.updateStudentExamSchedules()` cho case item mới không có `id`.

### Integration Tests:
- API create bonus không gửi `id` vẫn trả `201` + object có `id`.
- PATCH class schedule mixed payload (existing + new slot without id) vẫn hợp lệ.
- PUT student exam schedules với items không có `id` vẫn replace-all thành công.

### Manual Testing Steps:
1. Tạo bonus ở admin staff detail, verify network payload không có `id`, response có `id`.
2. Tạo bonus ở staff profile, verify tương tự.
3. Edit class schedule: sửa slot cũ + thêm slot mới, lưu và kiểm tra lịch sync vẫn đúng.
4. Edit student exam schedules ở admin và self-service, lưu nhiều lần để kiểm tra replace-all không lỗi validation.

## Performance Considerations

- Không có thay đổi query nặng mới; tác động chính là validation/normalization ở service layer.
- Generation UUID ở BE là O(n) theo số item schedule/exam trong payload, chi phí nhỏ.
- Cần theo dõi log sync calendar sau rollout để phát hiện mismatch slot IDs sớm.

## Migration Notes

- Không cần DB migration.
- Nên rollout theo thứ tự: BE contract trước, FE cleanup sau để tránh downtime contract.
- Trong giai đoạn chuyển tiếp ngắn, BE có thể tạm accept `id` ở create bonus nhưng ignore value; sau khi FE rollout ổn định thì remove hoàn toàn field khỏi DTO (nếu chọn hard cut ngay thì rollout BE+FE cùng release).

## References

- Original research: `docs/researches/2026-04-29-uuid-generation-fe-vs-be.md`
- Related implementation:
  - `apps/api/src/dtos/bonus.dto.ts`
  - `apps/api/src/bonus/bonus.service.ts`
  - `apps/api/src/class/class.service.ts`
  - `apps/api/src/student/student.service.ts`
  - `apps/web/app/admin/staffs/[id]/page.tsx`
  - `apps/web/app/staff/profile/page.tsx`
  - `apps/web/components/admin/class/EditClassPopup.tsx`
  - `apps/web/components/admin/student/EditStudentPopup.tsx`
