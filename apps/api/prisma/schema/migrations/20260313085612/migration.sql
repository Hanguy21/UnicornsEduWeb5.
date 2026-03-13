/*
  Warnings:

  - You are about to drop the column `staff_id` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `student_id` on the `users` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_staff_id_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_student_id_fkey";

-- DropIndex
DROP INDEX "users_staff_id_idx";

-- DropIndex
DROP INDEX "users_student_id_idx";

-- AlterTable
ALTER TABLE "cost_extend" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "staff_id",
DROP COLUMN "student_id";
