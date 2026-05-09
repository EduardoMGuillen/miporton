-- Global maintenance / notice banner (single row, id = global).
CREATE TABLE "SiteBanner" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "message" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteBanner_pkey" PRIMARY KEY ("id")
);
