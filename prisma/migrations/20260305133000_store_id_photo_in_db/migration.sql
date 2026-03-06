-- AlterTable
ALTER TABLE "QrScan"
DROP COLUMN "idPhotoUrl",
ADD COLUMN "idPhotoData" BYTEA;
