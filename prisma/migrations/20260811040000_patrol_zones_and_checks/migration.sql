-- CreateTable
CREATE TABLE "PatrolZone" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "residentialId" TEXT NOT NULL,

    CONSTRAINT "PatrolZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatrolCheck" (
    "id" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "zoneId" TEXT NOT NULL,
    "guardId" TEXT NOT NULL,
    "residentialId" TEXT NOT NULL,

    CONSTRAINT "PatrolCheck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PatrolZone_code_key" ON "PatrolZone"("code");

-- CreateIndex
CREATE INDEX "PatrolZone_residentialId_isActive_idx" ON "PatrolZone"("residentialId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PatrolZone_residentialId_name_key" ON "PatrolZone"("residentialId", "name");

-- CreateIndex
CREATE INDEX "PatrolCheck_residentialId_checkedAt_idx" ON "PatrolCheck"("residentialId", "checkedAt");

-- CreateIndex
CREATE INDEX "PatrolCheck_zoneId_checkedAt_idx" ON "PatrolCheck"("zoneId", "checkedAt");

-- CreateIndex
CREATE INDEX "PatrolCheck_guardId_checkedAt_idx" ON "PatrolCheck"("guardId", "checkedAt");

-- AddForeignKey
ALTER TABLE "PatrolZone" ADD CONSTRAINT "PatrolZone_residentialId_fkey" FOREIGN KEY ("residentialId") REFERENCES "Residential"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatrolCheck" ADD CONSTRAINT "PatrolCheck_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "PatrolZone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatrolCheck" ADD CONSTRAINT "PatrolCheck_guardId_fkey" FOREIGN KEY ("guardId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatrolCheck" ADD CONSTRAINT "PatrolCheck_residentialId_fkey" FOREIGN KEY ("residentialId") REFERENCES "Residential"("id") ON DELETE CASCADE ON UPDATE CASCADE;
