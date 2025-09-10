-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('CLIENT', 'ADMIN');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "pseudo" TEXT,
    "role" "public"."UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Card" (
    "id" INTEGER NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "type" TEXT,
    "frameType" TEXT,
    "desc" TEXT,
    "race" TEXT,
    "archetype" TEXT,
    "atk" INTEGER,
    "def" INTEGER,
    "level" INTEGER,
    "attribute" TEXT,
    "imageUrl" TEXT,
    "imageSmallUrl" TEXT,
    "contentHash" VARCHAR(64),
    "lastSyncedAt" TIMESTAMP(3),
    "rawJson" JSONB,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Ownership" (
    "userId" TEXT NOT NULL,
    "cardId" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ownership_pkey" PRIMARY KEY ("userId","cardId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "Card_name_idx" ON "public"."Card"("name");

-- CreateIndex
CREATE INDEX "Card_archetype_idx" ON "public"."Card"("archetype");

-- AddForeignKey
ALTER TABLE "public"."Ownership" ADD CONSTRAINT "Ownership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Ownership" ADD CONSTRAINT "Ownership_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "public"."Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;
