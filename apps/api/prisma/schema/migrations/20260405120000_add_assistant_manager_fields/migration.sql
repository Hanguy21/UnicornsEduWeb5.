-- AlterTable: add assistant manager FK on staff_info
ALTER TABLE "staff_info" ADD COLUMN "customer_care_managed_by_staff_id" TEXT;

-- AlterTable: add assistant snapshot fields on attendance
ALTER TABLE "attendance" ADD COLUMN "assistant_manager_staff_id" TEXT;
ALTER TABLE "attendance" ADD COLUMN "assistant_payment_status" "PaymentStatus";

-- CreateIndex
CREATE INDEX "staff_info_customer_care_managed_by_staff_id_idx" ON "staff_info"("customer_care_managed_by_staff_id");
CREATE INDEX "attendance_assistant_manager_staff_id_assistant_payment_sta_idx" ON "attendance"("assistant_manager_staff_id", "assistant_payment_status");

-- AddForeignKey
ALTER TABLE "staff_info" ADD CONSTRAINT "staff_info_customer_care_managed_by_staff_id_fkey" FOREIGN KEY ("customer_care_managed_by_staff_id") REFERENCES "staff_info"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_assistant_manager_staff_id_fkey" FOREIGN KEY ("assistant_manager_staff_id") REFERENCES "staff_info"("id") ON DELETE SET NULL ON UPDATE CASCADE;
