/*
  Warnings:

  - You are about to drop the column `isBannedTcg` on the `Card` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."TcgBanStatus" AS ENUM ('LEGAL', 'LIMITED', 'SEMI_LIMITED', 'BANNED');

-- AlterTable
ALTER TABLE "public"."Card" DROP COLUMN "isBannedTcg",
ADD COLUMN     "tcgBanStatus" "public"."TcgBanStatus" DEFAULT 'LEGAL';
