-- ============================================================
-- MIGRAZIONE: Aggiunta tracking stampe a collection_items
-- Eseguire nel SQL Editor di Supabase
-- ============================================================

-- 1. Aggiungi nuove colonne
ALTER TABLE collection_items
  ADD COLUMN IF NOT EXISTS scryfall_print_id TEXT,
  ADD COLUMN IF NOT EXISTS set_code          TEXT,
  ADD COLUMN IF NOT EXISTS set_name          TEXT,
  ADD COLUMN IF NOT EXISTS is_foil           BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS print_image_url   TEXT;

-- 2. Rimuovi il vecchio indice univoco su card_id
DROP INDEX IF EXISTS idx_collection_items_card_id;

-- 3. Nuovo indice univoco: stessa carta + stessa stampa + foil
CREATE UNIQUE INDEX IF NOT EXISTS idx_collection_items_print
  ON collection_items(card_id, COALESCE(scryfall_print_id, ''), is_foil);

-- 4. Aggiorna la vista collection_availability
CREATE OR REPLACE VIEW collection_availability AS
SELECT
  ci.id,
  ci.card_id,
  c.oracle_id,
  c.name_en,
  c.name_it,
  c.mana_cost,
  c.cmc,
  c.type_line,
  c.colors,
  c.rarity,
  COALESCE(ci.print_image_url, c.image_url) AS image_url,
  c.price_eur,
  ci.quantity_owned,
  ci.scryfall_print_id,
  ci.set_code,
  ci.set_name,
  ci.is_foil,
  COALESCE(
    SUM(dc.quantity) FILTER (WHERE dc.usage_type = 'real'),
    0
  )::INTEGER AS qty_used,
  (
    ci.quantity_owned
    - COALESCE(
        SUM(dc.quantity) FILTER (WHERE dc.usage_type = 'real'),
        0
      )
  )::INTEGER AS qty_available
FROM collection_items ci
JOIN  cards c  ON c.id = ci.card_id
LEFT JOIN cards c2 ON c2.oracle_id = c.oracle_id
LEFT JOIN deck_cards dc ON dc.card_id = c2.id AND dc.usage_type = 'real'
GROUP BY
  ci.id, ci.card_id,
  c.oracle_id, c.name_en, c.name_it,
  c.mana_cost, c.cmc, c.type_line,
  c.colors, c.rarity, c.image_url, c.price_eur,
  ci.quantity_owned,
  ci.scryfall_print_id, ci.set_code, ci.set_name,
  ci.is_foil, ci.print_image_url;
