# Tổng quan Database Schema – Unicorns Edu

Schema được định nghĩa bằng **Prisma** (ORM), chạy trên **PostgreSQL**.

---

## 1. Công nghệ

- **ORM**: Prisma
- **Database**: PostgreSQL
- **Output**: `apps/cp-api/generated/` (Prisma Client)

---

## 2. Các nhóm Entity chính

### 2.1 Xác thực và người dùng

| Model   | Bảng      | Mô tả                           |
|---------|-----------|----------------------------------|
| User    | users     | Tài khoản đăng nhập, phân quyền |
| Teacher | teachers  | Giáo viên (ID dạng T001, T002…) |
| Student | students  | Học sinh (ID dạng S001, S002…)  |
| Assistant | assistants | Trợ giảng (technical / lesson_plan) |

**User** liên kết 1-1 với Teacher, Student hoặc Assistant thông qua `teacherId`, `studentId`, `assistantId`.

### 2.2 Lớp học và buổi học

| Model        | Bảng         | Mô tả                           |
|-------------|--------------|----------------------------------|
| Class       | classes      | Lớp học                         |
| ClassTeacher | class_teachers | N–N: lớp ↔ giáo viên         |
| StudentClass | student_classes | N–N: học sinh ↔ lớp          |
| Session     | sessions     | Buổi học (ngày, giờ, giáo viên) |
| Attendance  | attendance   | Điểm danh theo buổi             |

### 2.3 Tài chính

| Model            | Bảng                | Mô tả                     |
|------------------|---------------------|---------------------------|
| Payment          | payments            | Học phí học sinh          |
| Payroll          | payroll             | Lương giáo viên theo tháng |
| Revenue          | revenue             | Doanh thu theo lớp/tháng   |
| Cost             | costs               | Chi phí                   |
| Bonus            | bonuses             | Thưởng nhân sự             |
| WalletTransaction | wallet_transactions | Ví học sinh (nạp, vay, trả) |
| AssistantPayment | assistant_payments  | Thanh toán trợ giảng       |

### 2.4 Nội dung và tài liệu

| Model          | Bảng             | Mô tả                    |
|----------------|------------------|--------------------------|
| HomePost       | home_posts       | Tin tức, chính sách      |
| Document       | documents        | Tài liệu lập trình       |
| Category       | categories       | Danh mục loại lớp        |

### 2.5 Giáo án và trợ giảng

| Model          | Bảng              | Mô tả                           |
|----------------|-------------------|----------------------------------|
| LessonPlan     | lesson_plans      | Giáo án (legacy)                 |
| LessonResource | lesson_resources  | Tài nguyên giáo án               |
| LessonTask     | lesson_tasks      | Nhiệm vụ giáo án                 |
| LessonOutput   | lesson_outputs    | Sản phẩm hoàn thành              |
| LessonTopic    | lesson_topics     | Chủ đề bài học                   |
| LessonTopicLink | lesson_topic_links | N–N: topic ↔ lesson output   |
| AssistantTask  | assistant_tasks   | Công việc trợ giảng kỹ thuật     |

### 2.6 Phụ trợ

| Model          | Bảng            | Mô tả                |
|----------------|-----------------|----------------------|
| DashboardCache | dashboard_cache | Cache dashboard       |

---

## 3. Enums

| Enum                 | Giá trị                                    |
|----------------------|---------------------------------------------|
| UserRole             | admin, teacher, student, assistant, visitor |
| UserStatus           | active, inactive, pending                   |
| AssistantType        | technical, lesson_plan                      |
| ClassStatus          | running, paused, ended                      |
| StudentStatus        | active, inactive                            |
| Gender               | male, female                                |
| SessionPaymentStatus | paid, unpaid, deposit                       |
| PaymentStatus        | paid, pending, cancelled                    |
| WalletTransactionType| topup, loan, advance, repayment             |
| DashboardCacheType   | dashboard, quickview                        |
| HomePostCategory     | intro, news, docs, policy                   |
| LessonPlanType       | resource, completed_task                    |
| LessonTaskStatus     | pending, in_progress, completed, cancelled  |
| LessonTaskPriority   | low, medium, high                           |

---

## 4. Quan hệ chính

```
User ─┬─ 1:1 ─ Teacher
      ├─ 1:1 ─ Student
      └─ 1:1 ─ Assistant

Class ─┬─ N:N ─ Teacher (qua ClassTeacher)
       ├─ N:N ─ Student (qua StudentClass)
       ├─ 1:N ─ Session
       ├─ 1:N ─ Payment
       └─ 1:N ─ Revenue

Session ─┬─ N:1 ─ Class, Teacher
         └─ 1:N ─ Attendance

Student ─┬─ 1:N ─ Payment, WalletTransaction, Attendance
         └─ N:N ─ Class (qua StudentClass)

Teacher ─┬─ 1:N ─ Payroll, Bonus, Session
         └─ N:N ─ Class (qua ClassTeacher)

Assistant ─┬─ 1:N ─ AssistantPayment, AssistantTask
           ├─ 1:N ─ LessonPlan, LessonTask, LessonOutput
           └─ 1:1 ─ User
```

---

## 5. Một số field quan trọng

- **User**: `passwordHash` (argon2/bcrypt), `role`, `emailVerified`, `phoneVerified`
- **Teacher/Student/Assistant**: ID dạng text (T001, S001, A001)
- **Class**: `schedule` (JSON), `customTeacherAllowances` (JSON)
- **Session**: `allowanceAmount`, `subsidyOriginal` (trợ cấp giáo viên)
- **Payment/Payroll**: trạng thái thanh toán (paid, pending, deposit, cancelled)
- **WalletTransaction**: `type` (topup, loan, advance, repayment)

---

## 6. Index

Index đã được định nghĩa cho các trường hay dùng trong truy vấn: `email`, `phone`, `role`, `classId`, `teacherId`, `studentId`, `date`, `month`, `status`, v.v.
