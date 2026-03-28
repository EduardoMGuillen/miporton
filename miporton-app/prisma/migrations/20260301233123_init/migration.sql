-- CreateTable
CREATE TABLE "Residential" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "residentialId" TEXT,
    CONSTRAINT "User_residentialId_fkey" FOREIGN KEY ("residentialId") REFERENCES "Residential" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QrCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "visitorName" TEXT NOT NULL,
    "validityType" TEXT NOT NULL,
    "validFrom" DATETIME NOT NULL,
    "validUntil" DATETIME NOT NULL,
    "maxUses" INTEGER NOT NULL,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "residentialId" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    CONSTRAINT "QrCode_residentialId_fkey" FOREIGN KEY ("residentialId") REFERENCES "Residential" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QrCode_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QrScan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scannedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isValid" BOOLEAN NOT NULL,
    "reason" TEXT NOT NULL,
    "codeId" TEXT NOT NULL,
    "scannerId" TEXT NOT NULL,
    CONSTRAINT "QrScan_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "QrCode" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QrScan_scannerId_fkey" FOREIGN KEY ("scannerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "QrCode_code_key" ON "QrCode"("code");
