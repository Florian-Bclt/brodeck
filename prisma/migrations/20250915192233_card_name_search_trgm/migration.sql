-- This is an empty migration.
-- 1) Extensions (safe si déjà créées)
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2) Colonne de recherche dérivée
ALTER TABLE "Card"
  ADD COLUMN IF NOT EXISTS "nameSearch" text;

-- 3) Backfill (utilise unaccent dans un UPDATE: autorisé)
UPDATE "Card"
SET "nameSearch" = unaccent(lower(name))
WHERE "nameSearch" IS NULL;

-- 4) Trigger pour maintenir la colonne
--    (unaccent peut être STABLE dans un trigger, ce n’est pas un index)
CREATE OR REPLACE FUNCTION card_set_name_search()
RETURNS trigger AS $$
BEGIN
  NEW."nameSearch" := unaccent(lower(NEW.name));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS card_name_search_trg ON "Card";

CREATE TRIGGER card_name_search_trg
BEFORE INSERT OR UPDATE OF name ON "Card"
FOR EACH ROW
EXECUTE FUNCTION card_set_name_search();

-- 5) Index trigram sur la colonne (pas d’expression)
CREATE INDEX IF NOT EXISTS card_name_search_trgm_idx
  ON "Card" USING gin ("nameSearch" gin_trgm_ops);
