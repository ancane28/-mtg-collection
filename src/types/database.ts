export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      cards: {
        Row: {
          id: string
          oracle_id: string
          name_en: string
          name_it: string | null
          mana_cost: string | null
          cmc: number | null
          oracle_text: string | null
          type_line: string | null
          power: string | null
          toughness: string | null
          colors: string[]
          rarity: 'common' | 'uncommon' | 'rare' | 'mythic' | null
          image_url: string | null
          price_eur: number | null
          updated_at: string
        }
        Insert: {
          id?: string
          oracle_id: string
          name_en: string
          name_it?: string | null
          mana_cost?: string | null
          cmc?: number | null
          oracle_text?: string | null
          type_line?: string | null
          power?: string | null
          toughness?: string | null
          colors?: string[]
          rarity?: 'common' | 'uncommon' | 'rare' | 'mythic' | null
          image_url?: string | null
          price_eur?: number | null
          updated_at?: string
        }
        Update: {
          id?: string
          oracle_id?: string
          name_en?: string
          name_it?: string | null
          mana_cost?: string | null
          cmc?: number | null
          oracle_text?: string | null
          type_line?: string | null
          power?: string | null
          toughness?: string | null
          colors?: string[]
          rarity?: 'common' | 'uncommon' | 'rare' | 'mythic' | null
          image_url?: string | null
          price_eur?: number | null
          updated_at?: string
        }
      }
      collection_items: {
        Row: {
          id: string
          card_id: string
          quantity_owned: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          card_id: string
          quantity_owned?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          card_id?: string
          quantity_owned?: number
          created_at?: string
          updated_at?: string
        }
      }
      decks: {
        Row: {
          id: string
          name: string
          format: 'commander' | 'standard' | 'modern' | 'legacy' | 'vintage' | 'pauper' | 'custom' | null
          commander_card_id: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          format?: 'commander' | 'standard' | 'modern' | 'legacy' | 'vintage' | 'pauper' | 'custom' | null
          commander_card_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          format?: 'commander' | 'standard' | 'modern' | 'legacy' | 'vintage' | 'pauper' | 'custom' | null
          commander_card_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      deck_cards: {
        Row: {
          id: string
          deck_id: string
          card_id: string
          quantity: number
          usage_type: 'real' | 'proxy'
          created_at: string
        }
        Insert: {
          id?: string
          deck_id: string
          card_id: string
          quantity?: number
          usage_type: 'real' | 'proxy'
          created_at?: string
        }
        Update: {
          id?: string
          deck_id?: string
          card_id?: string
          quantity?: number
          usage_type?: 'real' | 'proxy'
          created_at?: string
        }
      }
      wishlist_items: {
        Row: {
          id: string
          card_id: string
          quantity_wanted: number
          priority: 'low' | 'medium' | 'high'
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          card_id: string
          quantity_wanted?: number
          priority?: 'low' | 'medium' | 'high'
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          card_id?: string
          quantity_wanted?: number
          priority?: 'low' | 'medium' | 'high'
          notes?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      collection_availability: {
        Row: {
          id: string
          card_id: string
          oracle_id: string
          name_en: string
          name_it: string | null
          mana_cost: string | null
          cmc: number | null
          type_line: string | null
          colors: string[]
          rarity: string | null
          image_url: string | null
          price_eur: number | null
          quantity_owned: number
          qty_used: number
          qty_available: number
        }
      }
    }
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// Convenience types
export type Card = Database['public']['Tables']['cards']['Row']
export type CollectionItem = Database['public']['Tables']['collection_items']['Row']
export type Deck = Database['public']['Tables']['decks']['Row']
export type DeckCard = Database['public']['Tables']['deck_cards']['Row']
export type CollectionAvailability = Database['public']['Views']['collection_availability']['Row']

// Extended types for UI
export type DeckWithCommander = Deck & {
  commander: Pick<Card, 'name_en' | 'image_url'> | null
  total_cards?: number
  real_count?: number
  proxy_count?: number
}

export type DeckCardWithCard = DeckCard & {
  card: Card
}

export type WishlistItem = Database['public']['Tables']['wishlist_items']['Row']

export type WishlistItemWithCard = WishlistItem & {
  card: Card
}

export type CollectionAvailabilityWithDecks = CollectionAvailability & {
  deck_usages: Array<{
    deck_id: string
    deck_name: string
    quantity: number
    usage_type: 'real' | 'proxy'
  }>
}
