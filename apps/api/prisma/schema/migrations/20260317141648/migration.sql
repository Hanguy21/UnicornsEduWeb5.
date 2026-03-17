/*
  Warnings:

  - You are about to drop the column `customer_care_payment_status` on the `wallet_transactions_history` table. All the data in the column will be lost.
  - You are about to drop the column `customer_care_profit_percent` on the `wallet_transactions_history` table. All the data in the column will be lost.
  - You are about to drop the column `customer_care_staff_id` on the `wallet_transactions_history` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "wallet_transactions_history" DROP CONSTRAINT "wallet_transactions_history_customer_care_staff_id_fkey";

-- DropIndex
DROP INDEX "wallet_transactions_history_customer_care_staff_id_idx";

-- AlterTable
ALTER TABLE "attendance" ADD COLUMN     "customer_care_payment_status" "PaymentStatus" DEFAULT 'pending';

-- AlterTable
ALTER TABLE "wallet_transactions_history" DROP COLUMN "customer_care_payment_status",
DROP COLUMN "customer_care_profit_percent",
DROP COLUMN "customer_care_staff_id";
