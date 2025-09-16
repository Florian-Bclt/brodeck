-- Extensions (safe si déjà présentes)
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Colonne dérivée pour la recherche
ALTER TABLE "Card"
  ADD COLUMN IF NOT EXISTS "nameSearch" text;

-- Backfill (normalise les noms existants)
UPDATE "Card"
SET "nameSearch" = unaccent(lower(name))
WHERE "nameSearch" IS NULL;

-- Trigger pour maintenir la colonne automatiquement
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

-- Index trigram sur la colonne (pas d’expression ⇒ compatible Neon)
CREATE INDEX IF NOT EXISTS card_name_search_trgm_idx
  ON "Card" USING gin ("nameSearch" gin_trgm_ops);
