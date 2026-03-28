-- AlterTable
ALTER TABLE "QrScan"
ADD COLUMN "idPhotoUrl" TEXT,
ADD COLUMN "idPhotoMimeType" TEXT,
ADD COLUMN "idPhotoSize" INTEGER,
ADD COLUMN "idCapturedAt" TIMESTAMP(3);
