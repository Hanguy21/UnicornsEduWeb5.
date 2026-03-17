-- AlterTable
ALTER TABLE "attendance" ADD COLUMN     "customer_care_coef" DECIMAL(3,2),
ADD COLUMN     "customer_care_staff_id" TEXT;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_customer_care_staff_id_fkey" FOREIGN KEY ("customer_care_staff_id") REFERENCES "staff_info"("id") ON DELETE SET NULL ON UPDATE CASCADE;
