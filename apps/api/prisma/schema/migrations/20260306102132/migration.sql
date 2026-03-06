-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'staff', 'student', 'guest');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'inactive', 'pending');

-- CreateEnum
CREATE TYPE "StaffStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female');

-- CreateEnum
CREATE TYPE "ClassStatus" AS ENUM ('running', 'ended');

-- CreateEnum
CREATE TYPE "ClassType" AS ENUM ('vip', 'basic', 'advance', 'hardcore');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('present', 'excused', 'absent');

-- CreateEnum
CREATE TYPE "WalletTransactionType" AS ENUM ('topup', 'loan', 'repayment', 'extend');

-- CreateEnum
CREATE TYPE "LessonTaskStatus" AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "LessonTaskPriority" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('paid', 'pending');

-- CreateTable
CREATE TABLE "class_surveys" (
    "id" TEXT NOT NULL,
    "class_id" TEXT,
    "test_number" INTEGER NOT NULL,
    "teacher_id" TEXT,
    "report_date" DATE NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP,

    CONSTRAINT "class_surveys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "action_history" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "user_email" TEXT,
    "entity_id" TEXT,
    "entity_type" TEXT,
    "action_type" TEXT,
    "before_value" JSONB,
    "after_value" JSONB,
    "changed_fields" JSONB,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,

    CONSTRAINT "action_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "file_url" TEXT NOT NULL,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "uploaded_by" TEXT,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bonuses" (
    "id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "work_type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "note" TEXT,
    "month" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "bonuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_transactions_history" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "type" "WalletTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customer_care_staff_id" TEXT NOT NULL,
    "customer_care_profit_percent" DECIMAL(2,2),
    "customer_care_payment_status" BOOLEAN,

    CONSTRAINT "wallet_transactions_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_care_service" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "profit_percent" DECIMAL(2,2),

    CONSTRAINT "customer_care_service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_monthly_stats" (
    "id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "classes_total_month" INTEGER,
    "classes_total_paid" INTEGER,
    "classes_total_unpaid" INTEGER,
    "work_items_total_month" INTEGER,
    "work_items_total_paid" INTEGER,
    "work_items_total_unpaid" INTEGER,
    "bonuses_total_month" INTEGER,
    "bonuses_total_paid" INTEGER,
    "bonuses_total_unpaid" INTEGER,
    "total_month_all" INTEGER,
    "total_paid_all" INTEGER,
    "total_unpaid_all" INTEGER,
    "calculated_at" TIMESTAMP,

    CONSTRAINT "staff_monthly_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_cache" (
    "cache_key" TEXT NOT NULL,
    "cache_type" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "expires_at" TIMESTAMP NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL,

    CONSTRAINT "dashboard_cache_pkey" PRIMARY KEY ("cache_key")
);

-- CreateTable
CREATE TABLE "cost_extend" (
    "id" TEXT NOT NULL,
    "month" TEXT,
    "category" TEXT,
    "amount" INTEGER,
    "date" DATE,
    "status" "PaymentStatus" DEFAULT 'pending',
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL,

    CONSTRAINT "cost_extend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ClassType" NOT NULL DEFAULT 'basic',
    "status" "ClassStatus" NOT NULL DEFAULT 'running',
    "max_students" INTEGER NOT NULL DEFAULT 15,
    "allowance_per_session_per_student" INTEGER NOT NULL DEFAULT 0,
    "max_allowance_per_session" INTEGER,
    "scale_amount" INTEGER,
    "schedule" JSONB NOT NULL DEFAULT '[]',
    "student_tuition_per_session" INTEGER,
    "tuition_package_total" INTEGER,
    "tuition_package_session" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_teachers" (
    "id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "custom_allowance" INTEGER,
    "status" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_teachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_classes" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "custom_student_tuition_per_session" INTEGER,
    "custom_tuition_package_total" INTEGER,
    "custom_tuition_package_session" INTEGER,
    "total_attended_session" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "allowance_amount" INTEGER,
    "teacher_payment_status" TEXT NOT NULL DEFAULT 'unpaid',
    "date" DATE NOT NULL,
    "start_time" TIME,
    "end_time" TIME,
    "coefficient" DECIMAL(3,1) NOT NULL DEFAULT 1.0,
    "notes" TEXT,
    "tuition_fee" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'present',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_lesson_task" (
    "id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "lesson_task_id" TEXT NOT NULL,

    CONSTRAINT "staff_lesson_task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_task" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "status" "LessonTaskStatus" NOT NULL,
    "priority" "LessonTaskPriority" NOT NULL,
    "due_date" DATE,
    "created_by" TEXT,

    CONSTRAINT "lesson_task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_resources" (
    "id" TEXT NOT NULL,
    "resource_link" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "created_by" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "lesson_resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_outputs" (
    "id" TEXT NOT NULL,
    "tag" TEXT,
    "level" TEXT,
    "lesson_name" TEXT NOT NULL,
    "original_title" TEXT,
    "source" TEXT,
    "original_link" TEXT,
    "cost" INTEGER NOT NULL DEFAULT 0,
    "date" DATE NOT NULL,
    "staffPaymentStatus" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "contest_uploaded" TEXT,
    "link" TEXT,
    "staff_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "lesson_outputs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_info" (
    "id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "birth_date" DATE,
    "university" TEXT,
    "high_school" TEXT,
    "specialization" TEXT,
    "bank_account" TEXT,
    "bank_qr_link" TEXT,
    "roles" JSONB NOT NULL DEFAULT '[]',
    "status" "StaffStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "staff_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_info" (
    "id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT,
    "school" TEXT,
    "province" TEXT,
    "birth_year" INTEGER,
    "parent_name" TEXT,
    "parent_phone" TEXT,
    "status" "StudentStatus" NOT NULL DEFAULT 'active',
    "gender" "Gender" NOT NULL DEFAULT 'male',
    "goal" TEXT,
    "drop_out_date" DATE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "student_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password_hash" TEXT,
    "name" TEXT,
    "role_type" "UserRole" NOT NULL,
    "province" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "link_id" TEXT,
    "account_handle" TEXT,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "phone_verified" BOOLEAN NOT NULL DEFAULT false,
    "refresh_token" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "student_id" TEXT,
    "staff_id" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "class_surveys_class_id_idx" ON "class_surveys"("class_id");

-- CreateIndex
CREATE INDEX "class_surveys_teacher_id_idx" ON "class_surveys"("teacher_id");

-- CreateIndex
CREATE INDEX "action_history_user_id_idx" ON "action_history"("user_id");

-- CreateIndex
CREATE INDEX "bonuses_staff_id_idx" ON "bonuses"("staff_id");

-- CreateIndex
CREATE INDEX "bonuses_month_idx" ON "bonuses"("month");

-- CreateIndex
CREATE INDEX "wallet_transactions_history_student_id_idx" ON "wallet_transactions_history"("student_id");

-- CreateIndex
CREATE INDEX "wallet_transactions_history_customer_care_staff_id_idx" ON "wallet_transactions_history"("customer_care_staff_id");

-- CreateIndex
CREATE INDEX "customer_care_service_student_id_idx" ON "customer_care_service"("student_id");

-- CreateIndex
CREATE INDEX "customer_care_service_staff_id_idx" ON "customer_care_service"("staff_id");

-- CreateIndex
CREATE INDEX "staff_monthly_stats_staff_id_idx" ON "staff_monthly_stats"("staff_id");

-- CreateIndex
CREATE INDEX "staff_monthly_stats_month_idx" ON "staff_monthly_stats"("month");

-- CreateIndex
CREATE INDEX "class_teachers_class_id_idx" ON "class_teachers"("class_id");

-- CreateIndex
CREATE INDEX "class_teachers_teacher_id_idx" ON "class_teachers"("teacher_id");

-- CreateIndex
CREATE UNIQUE INDEX "class_teachers_class_id_teacher_id_key" ON "class_teachers"("class_id", "teacher_id");

-- CreateIndex
CREATE INDEX "student_classes_student_id_idx" ON "student_classes"("student_id");

-- CreateIndex
CREATE INDEX "student_classes_class_id_idx" ON "student_classes"("class_id");

-- CreateIndex
CREATE INDEX "sessions_teacher_id_idx" ON "sessions"("teacher_id");

-- CreateIndex
CREATE INDEX "sessions_class_id_idx" ON "sessions"("class_id");

-- CreateIndex
CREATE INDEX "sessions_date_idx" ON "sessions"("date");

-- CreateIndex
CREATE INDEX "attendance_session_id_idx" ON "attendance"("session_id");

-- CreateIndex
CREATE INDEX "attendance_student_id_idx" ON "attendance"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_session_id_student_id_key" ON "attendance"("session_id", "student_id");

-- CreateIndex
CREATE INDEX "staff_lesson_task_staff_id_idx" ON "staff_lesson_task"("staff_id");

-- CreateIndex
CREATE INDEX "staff_lesson_task_lesson_task_id_idx" ON "staff_lesson_task"("lesson_task_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_lesson_task_staff_id_lesson_task_id_key" ON "staff_lesson_task"("staff_id", "lesson_task_id");

-- CreateIndex
CREATE INDEX "lesson_resources_created_at_idx" ON "lesson_resources"("created_at");

-- CreateIndex
CREATE INDEX "lesson_outputs_staff_id_idx" ON "lesson_outputs"("staff_id");

-- CreateIndex
CREATE INDEX "lesson_outputs_level_idx" ON "lesson_outputs"("level");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_account_handle_key" ON "users"("account_handle");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_phone_idx" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_account_handle_idx" ON "users"("account_handle");

-- CreateIndex
CREATE INDEX "users_link_id_idx" ON "users"("link_id");

-- CreateIndex
CREATE INDEX "users_role_type_idx" ON "users"("role_type");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- AddForeignKey
ALTER TABLE "class_surveys" ADD CONSTRAINT "class_surveys_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_surveys" ADD CONSTRAINT "class_surveys_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "staff_info"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_history" ADD CONSTRAINT "action_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bonuses" ADD CONSTRAINT "bonuses_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff_info"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions_history" ADD CONSTRAINT "wallet_transactions_history_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_info"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions_history" ADD CONSTRAINT "wallet_transactions_history_customer_care_staff_id_fkey" FOREIGN KEY ("customer_care_staff_id") REFERENCES "staff_info"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_care_service" ADD CONSTRAINT "customer_care_service_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_info"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_care_service" ADD CONSTRAINT "customer_care_service_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff_info"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_monthly_stats" ADD CONSTRAINT "staff_monthly_stats_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff_info"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_teachers" ADD CONSTRAINT "class_teachers_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_teachers" ADD CONSTRAINT "class_teachers_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "staff_info"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_classes" ADD CONSTRAINT "student_classes_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_info"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_classes" ADD CONSTRAINT "student_classes_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "staff_info"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_info"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_lesson_task" ADD CONSTRAINT "staff_lesson_task_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff_info"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_lesson_task" ADD CONSTRAINT "staff_lesson_task_lesson_task_id_fkey" FOREIGN KEY ("lesson_task_id") REFERENCES "lesson_task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_outputs" ADD CONSTRAINT "lesson_outputs_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff_info"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_info"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff_info"("id") ON DELETE SET NULL ON UPDATE CASCADE;
