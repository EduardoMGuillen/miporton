-- Banner color / tone (not always red).
CREATE TYPE "SiteBannerVariant" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'ALERT', 'NEUTRAL');

ALTER TABLE "SiteBanner" ADD COLUMN "variant" "SiteBannerVariant" NOT NULL DEFAULT 'INFO';
