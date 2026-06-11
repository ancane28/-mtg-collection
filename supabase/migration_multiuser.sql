-- ============================================================
-- Migration: Multi-user support
-- Aggiunge user_id a collection_items, decks, deck_cards,
-- wishlist_items e aggiorna le RLS policy per isolamento dati.
-- ============================================================

-- STEP 1: Aggiungi colonne user_id (nullable per compatibilità con dati esistenti)
ALTER TABLE collection_items ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE decks            ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE deck_cards       ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE wishlist_items   ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- STEP 2: Assegna i dati esistenti al primo utente registrato
UPDATE collection_items SET user_id = (SELECT id FROM auth.users ORDER BY created_at LIMIT 1) WHERE user_id IS NULL;
UPDATE decks            SET user_id = (SELECT id FROM auth.users ORDER BY created_at LIMIT 1) WHERE user_id IS NULL;
UPDATE deck_cards       SET user_id = (SELECT id FROM auth.users ORDER BY created_at LIMIT 1) WHERE user_id IS NULL;
UPDATE wishlist_items   SET user_id = (SELECT id FROM auth.users ORDER BY created_at LIMIT 1) WHERE user_id IS NULL;

-- STEP 3: Rendi NOT NULL
ALTER TABLE collection_items ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE decks            ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE deck_cards       ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE wishlist_items   ALTER COLUMN user_id SET NOT NULL;

-- STEP 4: Aggiorna indici univoci per includere user_id
-- collection_items: una stampa per utente (non condivisa tra utenti)
DROP INDEX IF EXISTS idx_collection_items_print;
CREATE UNIQUE INDEX idx_collection_items_print
  ON collection_items(user_id, card_id, COALESCE(scryfall_print_id, ''), is_foil);

-- wishlist_items: una riga per carta per utente
DROP INDEX IF EXISTS idx_wishlist_items_card_id;
CREATE UNIQUE INDEX idx_wishlist_items_card_id ON wishlist_items(user_id, card_id);

-- STEP 5: Rimuovi le vecchie policy (accesso globale)
DROP POLICY IF EXISTS "auth_full_access_collection"  ON collection_items;
DROP POLICY IF EXISTS "auth_full_access_decks"        ON decks;
DROP POLICY IF EXISTS "auth_full_access_deck_cards"   ON deck_cards;
DROP POLICY IF EXISTS "auth_full_access_wishlist"     ON wishlist_items;

-- STEP 6: Crea policy per-utente
CREATE POLICY "user_own_collection"
  ON collection_items FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_own_decks"
  ON decks FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_own_deck_cards"
  ON deck_cards FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_own_wishlist"
  ON wishlist_items FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
