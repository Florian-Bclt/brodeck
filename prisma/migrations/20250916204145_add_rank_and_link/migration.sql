-- DropIndex
DROP INDEX "public"."card_name_search_trgm_idx";

-- AlterTable
ALTER TABLE "public"."Card" ADD COLUMN     "link" INTEGER,
ADD COLUMN     "rank" INTEGER;
