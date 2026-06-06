-- ============================================================
-- MTG Collection Manager — Schema Database
-- Eseguire nel SQL Editor di Supabase
-- ============================================================

-- Estensione UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABELLA: cards
-- Database globale carte MTG (popolato via Scryfall API)
-- ============================================================
CREATE TABLE IF NOT EXISTS cards (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  oracle_id    TEXT        UNIQUE NOT NULL,
  name_en      TEXT        NOT NULL,
  name_it      TEXT,
  mana_cost    TEXT,
  cmc          NUMERIC,
  oracle_text  TEXT,
  type_line    TEXT,
  power        TEXT,
  toughness    TEXT,
  colors       TEXT[]      NOT NULL DEFAULT '{}',
  rarity       TEXT        CHECK (rarity IN ('common', 'uncommon', 'rare', 'mythic')),
  image_url    TEXT,
  price_eur    NUMERIC(10,2),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cards_oracle_id ON cards(oracle_id);
CREATE INDEX IF NOT EXISTS idx_cards_name_en   ON cards(LOWER(name_en));

-- ============================================================
-- TABELLA: collection_items
-- Copie fisiche possedute dall'utente
-- ============================================================
CREATE TABLE IF NOT EXISTS collection_items (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id        UUID        NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  quantity_owned INTEGER     NOT NULL DEFAULT 0 CHECK (quantity_owned >= 0),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Un solo record per carta nella collezione
CREATE UNIQUE INDEX IF NOT EXISTS idx_collection_items_card_id ON collection_items(card_id);

-- ============================================================
-- TABELLA: decks
-- Mazzi dell'utente
-- ============================================================
CREATE TABLE IF NOT EXISTS decks (
  id                 UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name               TEXT        NOT NULL,
  format             TEXT        CHECK (format IN ('commander', 'standard', 'modern', 'legacy', 'vintage', 'pauper', 'custom')),
  commander_card_id  UUID        REFERENCES cards(id) ON DELETE SET NULL,
  notes              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_decks_format ON decks(format);

-- ============================================================
-- TABELLA: deck_cards
-- Relazione carte ↔ mazzi con stato REAL/PROXY
-- ============================================================
CREATE TABLE IF NOT EXISTS deck_cards (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  deck_id     UUID        NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  card_id     UUID        NOT NULL REFERENCES cards(id) ON DELETE RESTRICT,
  quantity    INTEGER     NOT NULL DEFAULT 1 CHECK (quantity > 0),
  usage_type  TEXT        NOT NULL CHECK (usage_type IN ('real', 'proxy')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deck_cards_deck_id   ON deck_cards(deck_id);
CREATE INDEX IF NOT EXISTS idx_deck_cards_card_id   ON deck_cards(card_id);
CREATE INDEX IF NOT EXISTS idx_deck_cards_usage_type ON deck_cards(usage_type);

-- Unicità: una carta può avere al massimo una riga REAL e una PROXY per mazzo
CREATE UNIQUE INDEX IF NOT EXISTS idx_deck_cards_unique
  ON deck_cards(deck_id, card_id, usage_type);

-- ============================================================
-- VISTA: collection_availability
-- Calcola disponibilità per ogni carta della collezione
-- Usa oracle_id per equivalenza tra ristampe
-- ============================================================
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
  c.image_url,
  c.price_eur,
  ci.quantity_owned,
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
-- Join su tutte le stampe della stessa carta tramite oracle_id
LEFT JOIN cards c2 ON c2.oracle_id = c.oracle_id
LEFT JOIN deck_cards dc ON dc.card_id = c2.id AND dc.usage_type = 'real'
GROUP BY
  ci.id, ci.card_id,
  c.oracle_id, c.name_en, c.name_it,
  c.mana_cost, c.cmc, c.type_line,
  c.colors, c.rarity, c.image_url, c.price_eur,
  ci.quantity_owned;

-- ============================================================
-- TABELLA: wishlist_items
-- Carte desiderate non ancora possedute
-- ============================================================
CREATE TABLE IF NOT EXISTS wishlist_items (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id          UUID        NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  quantity_wanted  INTEGER     NOT NULL DEFAULT 1 CHECK (quantity_wanted > 0),
  priority         TEXT        NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Un solo record per carta nella wishlist
CREATE UNIQUE INDEX IF NOT EXISTS idx_wishlist_items_card_id ON wishlist_items(card_id);

ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_full_access_wishlist"
  ON wishlist_items FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ============================================================
-- FUNZIONE + TRIGGER: updated_at automatico
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_cards_updated_at
  BEFORE UPDATE ON cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_collection_items_updated_at
  BEFORE UPDATE ON collection_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_decks_updated_at
  BEFORE UPDATE ON decks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- MVP single-user: accesso completo per utenti autenticati
-- ============================================================
ALTER TABLE cards             ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE decks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE deck_cards        ENABLE ROW LEVEL SECURITY;

-- Policy: utenti autenticati hanno accesso totale
CREATE POLICY "auth_full_access_cards"
  ON cards FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "auth_full_access_collection"
  ON collection_items FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "auth_full_access_decks"
  ON decks FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "auth_full_access_deck_cards"
  ON deck_cards FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ============================================================
-- QUERY DI RIFERIMENTO: disponibilità carta specifica
-- Uso: WHERE ci.card_id = '<uuid>'
-- ============================================================
-- SELECT
--   ci.card_id,
--   ci.quantity_owned,
--   COALESCE(SUM(dc.quantity) FILTER (WHERE dc.usage_type = 'real'), 0) AS qty_used,
--   ci.quantity_owned
--     - COALESCE(SUM(dc.quantity) FILTER (WHERE dc.usage_type = 'real'), 0) AS qty_available
-- FROM collection_items ci
-- LEFT JOIN cards c  ON c.id  = ci.card_id
-- LEFT JOIN cards c2 ON c2.oracle_id = c.oracle_id
-- LEFT JOIN deck_cards dc ON dc.card_id = c2.id AND dc.usage_type = 'real'
-- GROUP BY ci.id, ci.card_id, ci.quantity_owned;
