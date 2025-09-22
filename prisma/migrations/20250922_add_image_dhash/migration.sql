-- Ajoute la colonne si elle n'existe pas déjà (CHAR(16) conseillé pour un hash hex fixe)
ALTER TABLE "public"."Card" ADD COLUMN IF NOT EXISTS "imageDhash" CHAR(16);

-- Index (idempotent)
CREATE INDEX IF NOT EXISTS "Card_imageDhash_idx" ON "public"."Card" ("imageDhash");
