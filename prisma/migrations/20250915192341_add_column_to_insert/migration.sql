/*
  Warnings:

  - You are about to drop the column `nameSearch` on the `Card` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."card_name_search_trgm_idx";

-- AlterTable
ALTER TABLE "public"."Card" DROP COLUMN "nameSearch";
