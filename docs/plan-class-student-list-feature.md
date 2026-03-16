# Kế hoạch: Điều chỉnh danh sách học sinh của lớp & thêm danh sách học sinh vào form tạo lớp

Tài liệu này mô tả kế hoạch triển khai tính năng:

1. **Thêm danh sách học sinh vào form tạo lớp** (AddClassPopup).
2. **Điều chỉnh danh sách học sinh** trong form chỉnh sửa lớp (EditClassPopup) và trên trang chi tiết lớp.

---

## 1. Tổng quan codebase hiện tại

### 1.1 Backend (apps/api)


| Thành phần                        | Hiện trạng                                                                                               |
| --------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Prisma**                        | `Class` N–N `StudentInfo` qua bảng `StudentClass` (learning.prisma). Quan hệ đã có, không cần migration. |
| **CreateClassDto**                | Có `teacher_ids`, `student_ids`.                                                                        |
| **UpdateClassDto**                | Có `teacher_ids`, `student_ids`.                                                                        |
| **class.service createClass()**   | Tạo `Class` + `ClassTeacher` + `StudentClass` (khi có `student_ids`).                                   |
| **class.service updateClass()**   | Sync `ClassTeacher` và `StudentClass` khi tương ứng !== undefined.                                      |
| **class.service getClassById()**  | Đã trả về `students` (từ StudentClass + StudentInfo).                                                    |
| **GET /class/:id/students**       | Trả về danh sách học sinh của lớp (id, fullName, status, remainingSessions).                            |
| **GET /student**                  | Có pagination và query `search` (filter fullName).                                                      |
| **student.service getStudents()** | Hỗ trợ `search` (fullName contains, case-insensitive).                                                  |


### 1.2 Frontend (apps/web)


| Thành phần                                     | Hiện trạng                                                                                                                           |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **CreateClassPayload / UpdateClassPayload**    | Có `teacher_ids`, `student_ids`.                                                                                                     |
| **AddClassPopup**                              | Có section "Gia sư phụ trách" và "Danh sách học sinh" (search + chips), submit gửi `student_ids`.                                      |
| **EditClassPopup**                             | Có section "Gia sư phụ trách" và "Danh sách học sinh", init từ `classDetail.students`, submit gửi `student_ids`.                      |
| **Trang chi tiết lớp** (`/admin/classes/[id]`) | Hiển thị bảng "Danh sách học sinh". Nút "Chỉnh sửa" mở EditClassPopup (có phần học sinh).                                             |
| **student.api.ts**                             | `getStudents(params)`, `getStudentById(id)` gọi GET /student và GET /student/:id.                                                     |


### 1.3 Kết luận

- Quan hệ Class–Student đã có trong DB và đã được dùng (getClassById trả về students, Session/Attendance theo học sinh trong lớp).
- Thiếu: (1) API tạo/cập nhật lớp nhận `student_ids` và ghi vào `StudentClass`; (2) Form tạo/sửa lớp có UI chọn học sinh; (3) API danh sách học sinh có search để combobox; (4) Frontend student API đúng (getStudents).

---

## 2. Kế hoạch triển khai

### Phase 1: Backend – Hỗ trợ student_ids khi tạo/cập nhật lớp

**Mục tiêu:** Create/Update class có thể nhận `student_ids` và đồng bộ bảng `student_classes`.

#### 2.1 DTO (apps/api/src/dtos/class.dto.ts)

- **CreateClassDto:** Thêm optional `student_ids?: string[]` (mảng UUID), validate `@IsUUID('4', { each: true })`, Swagger `@ApiPropertyOptional`.
- **UpdateClassDto:** Thêm optional `student_ids?: string[]` (đã kế thừa PartialType, chỉ cần khai báo thêm với mô tả "Sync thay thế danh sách học sinh hiện tại").

#### 2.2 ClassService (apps/api/src/class/class.service.ts)

- **createClass(data):**
  - Sau khi `tx.class.create(...)` và xử lý `teacher_ids`, nếu `data.student_ids?.length > 0` thì `tx.studentClass.createMany({ data: data.student_ids.map(studentId => ({ classId: createdClass.id, studentId })) })`.
  - Return vẫn dùng getClassById logic (hoặc query lại teachers + students) để response có `students` nếu cần (hiện tại createClass return không có students; có thể giữ như cũ và frontend refetch detail sau khi tạo).
- **updateClass(data):**
  - Khi `data.student_ids !== undefined`: `tx.studentClass.deleteMany({ where: { classId: data.id } })`, sau đó nếu `data.student_ids.length > 0` thì `tx.studentClass.createMany({ data: data.student_ids.map(studentId => ({ classId: data.id, studentId })) })`.
  - Giống `teacher_ids`: sync thay thế toàn bộ.

**Lưu ý:** Không cần unique constraint mới; Prisma schema `StudentClass` đã có `classId` + `studentId` (có thể thêm `@@unique([classId, studentId])` nếu chưa có để tránh trùng khi gọi createMany – cần kiểm tra schema). Hiện schema không có unique trên (classId, studentId); nên tránh add trùng trong một lần gọi (frontend gửi unique list).

#### 2.3 Swagger & docs

- Cập nhật mô tả API POST /class và PATCH /class trong controller: body có thêm `student_ids` (optional array UUID).
- Cập nhật tài liệu API trong `docs/` nếu có file mô tả Class API.

---

### Phase 2: Backend – Student list có search (cho combobox)

**Mục tiêu:** Frontend có thể gọi GET /student với `search` để hiển thị dropdown tìm học sinh theo tên.

#### 2.4 StudentService (apps/api/src/student/student.service.ts)

- `getStudents(query: PaginationQueryDto & { search?: string })`.
  - Nếu `query.search` có giá trị (trim): thêm điều kiện `where: { fullName: { contains: trimmedSearch, mode: 'insensitive' } }` (hoặc tương đương với Prisma).
  - Giữ nguyên pagination (skip/take).

#### 2.5 StudentController (apps/api/src/student/student.controller.ts)

- GET /student đã nhận query; cần đảm bảo DTO/query cho phép `search` (có thể mở rộng PaginationQueryDto hoặc dùng query param không validate cũng được). Thêm `@ApiQuery({ name: 'search', required: false })` cho Swagger.

#### 2.6 PaginationQueryDto

- Kiểm tra `apps/api/src/dtos/pagination.dto.ts`: nếu chỉ có page/limit thì thêm optional `search?: string` hoặc dùng query trực tiếp trong controller và truyền xuống service.

---

### Phase 3: Frontend – DTO & API student

**Mục tiêu:** Frontend có DTO và hàm gọi API danh sách học sinh (có search) để dùng trong form.

#### 3.1 DTO (apps/web/dtos)

- Nếu chưa có: thêm type/interface cho response GET /student (list student với id, fullName, …). Có thể đặt trong `apps/web/dtos/student.dto.ts` (hoặc file tên tương tự). Đảm bảo đúng cấu trúc backend trả về (mảng + meta nếu có).

#### 3.2 Student API (apps/web/lib/apis/student.api.ts)

- **Sửa file:** File hiện tại đang export user API (getUsers, getUserById, ...). Cần thay/thêm API học sinh:
  - `getStudents(params: { page: number; limit: number; search?: string })`: GET /student với query page, limit, search. Return type theo DTO (data + meta nếu backend trả meta).
  - `getStudentById(id: string)`: GET /student/:id (nếu cần).
- Giữ hoặc tách user API: nếu user API đang nằm nhầm trong student.api.ts, có thể chuyển user sang user.api.ts và để student.api.ts chỉ chứa student.

---

### Phase 4: Frontend – Form tạo lớp có danh sách học sinh

**Mục tiêu:** AddClassPopup có section "Danh sách học sinh" tương tự "Gia sư phụ trách": ô tìm kiếm + dropdown + danh sách đã chọn (chips) có nút xóa.

#### 4.1 CreateClassPayload (apps/web/dtos/class.dto.ts)

- Thêm `student_ids?: string[]` vào `CreateClassPayload`.

#### 4.2 AddClassPopup (apps/web/components/admin/class/AddClassPopup.tsx)

- State: `selectedStudents: Array<{ id: string; name: string }>` (tương tự selectedTeachers).
- State: `studentSearchInput`, `studentSearchFocused`, ref cho click-outside.
- useQuery: gọi `studentApi.getStudents({ page: 1, limit: 50, search: debouncedStudentSearch })` khi popup open.
- UI:
  - Section "Danh sách học sinh" (sau "Gia sư phụ trách" hoặc trước "Học phí", tùy wireframe).
  - Hiển thị chips đã chọn (id + fullName), mỗi chip có nút xóa.
  - Input tìm kiếm học sinh; khi focus hiển thị dropdown danh sách từ API (loại trừ đã chọn), click một item thì thêm vào selectedStudents và clear input.
- Khi submit: `payload.student_ids = selectedStudents.map(s => s.id)`.
- Reset form: clear selectedStudents và studentSearchInput.

**Thiết kế (theo frontend-design skill):** Giữ nhất quán với section "Gia sư phụ trách" (layout, spacing, token màu, accessibility). Mobile-first: section stack dọc, dropdown full-width trên mobile.

---

### Phase 5: Frontend – Form chỉnh sửa lớp có danh sách học sinh

**Mục tiêu:** EditClassPopup có section "Danh sách học sinh", giá trị khởi tạo từ `classDetail.students`, submit gửi `student_ids` trong UpdateClassPayload.

#### 5.1 UpdateClassPayload (apps/web/dtos/class.dto.ts)

- Thêm `student_ids?: string[]` vào `UpdateClassPayload`.

#### 5.2 EditClassPopup (apps/web/components/admin/class/EditClassPopup.tsx)

- State: `selectedStudents: Array<{ id: string; name: string }>`.
- Khởi tạo và sync khi `open`/`classDetail` thay đổi: `selectedStudents = (classDetail.students ?? []).map(s => ({ id: s.id, name: s.fullName }))`.
- Thêm useQuery getStudents (debounced search) và UI section "Danh sách học sinh" giống AddClassPopup (chips + search + dropdown).
- handleSubmit: thêm `student_ids: selectedStudents.map(s => s.id)` vào payload `updateClass`.

---

### Phase 6: Trang chi tiết lớp – Điều chỉnh danh sách học sinh

**Mục tiêu:** Người dùng có thể điều chỉnh danh sách học sinh của lớp từ trang chi tiết.

**Cách triển khai đề xuất:**

- Trang chi tiết lớp đã có nút "Chỉnh sửa" mở EditClassPopup. Sau khi thêm section "Danh sách học sinh" vào EditClassPopup (Phase 5), người dùng có thể:
  - Vào lớp → bấm "Chỉnh sửa" → chỉnh danh sách học sinh trong popup → Lưu.
- **Tùy chọn (nice-to-have):** Thêm nút "Điều chỉnh danh sách học sinh" trên trang chi tiết, mở một modal nhỏ chỉ gồm phần chọn học sinh (reuse component hoặc logic từ EditClassPopup) và gọi PATCH /class với chỉ `student_ids` (cập nhật một phần). Cách đơn giản hơn: không thêm modal riêng, chỉ dùng EditClassPopup đã mở rộng.

**Kết luận Phase 6:** Ưu tiên hoàn thành Phase 5; "điều chỉnh danh sách" = dùng "Chỉnh sửa thông tin lớp" và sửa phần học sinh. Nếu sau này cần UX "chỉ sửa học sinh nhanh" thì bổ sung modal nhỏ sau.

---

## 3. Kiểm tra & Docs

- **Validation:** Backend đã validate UUID cho `student_ids`. Frontend có thể kiểm tra không vượt quá `max_students` khi submit (cảnh báo hoặc chặn tùy product).
- **Database Schema:** Không thay đổi schema; chỉ dùng bảng `student_classes` hiện có. Nếu chưa có unique (classId, studentId), có thể thêm trong migration riêng để tránh duplicate.
- **Cập nhật tài liệu:**
  - `docs/Database Schema.md`: không bắt buộc (quan hệ đã mô tả).
  - Tài liệu API Class (nếu có): thêm body `student_ids` cho POST/PATCH class.
  - Tài liệu API Student (nếu có): thêm query `search` cho GET /student.

---

## 4. Thứ tự thực hiện gợi ý

1. **Backend:** Phase 1 (DTO + ClassService create/update với student_ids).
2. **Backend:** Phase 2 (Student list + search).
3. **Frontend:** Phase 3 (DTO student + student.api.ts getStudents).
4. **Frontend:** Phase 4 (AddClassPopup + student_ids).
5. **Frontend:** Phase 5 (EditClassPopup + student_ids).
6. **Optional:** Phase 6 modal "chỉ sửa học sinh" (có thể bỏ qua ở bước đầu).

---

## 5. Checklist hoàn thành

- [x] CreateClassDto & UpdateClassDto có `student_ids`; class.service create/update ghi StudentClass.
- [x] GET /student hỗ trợ query `search`; StudentService getStudents filter fullName.
- [x] apps/web: student API (getStudents, getStudentById) và DTO đúng.
- [x] CreateClassPayload & UpdateClassPayload có `student_ids`.
- [x] AddClassPopup: section "Danh sách học sinh", submit gửi student_ids.
- [x] EditClassPopup: section "Danh sách học sinh", init từ classDetail.students, submit gửi student_ids.
- [x] Trang chi tiết lớp: điều chỉnh danh sách qua "Chỉnh sửa" (EditClassPopup).
- [x] Docs/API: Swagger đã có student_ids (class DTO) và search (student controller).
- [ ] (Tùy chọn) Unique constraint (classId, studentId) trên student_classes.

