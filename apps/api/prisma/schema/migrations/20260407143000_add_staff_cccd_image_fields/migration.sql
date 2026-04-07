ALTER TABLE "staff_info"
ADD COLUMN "cccd_front_path" TEXT,
ADD COLUMN "cccd_back_path" TEXT,
ADD COLUMN "cccd_verified_at" TIMESTAMPTZ(6);
