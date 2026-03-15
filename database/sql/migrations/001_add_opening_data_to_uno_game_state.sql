-- ============================================================
-- Migration: Add opening_data field to uno_game_state table
-- Description: 
--   Add JSONB column to store opening animation data
--   (comparison rounds for official mode, player IDs, first card effect info, etc.)
-- ============================================================

-- Check if column already exists before adding
alter table public.uno_game_state
add column if not exists opening_data jsonb;

-- Add comment to explain the field
comment on column public.uno_game_state.opening_data is 
'Opening animation data: contains gameMode, playerIds, firstPlayerIndex, topCard, comparisonRounds, etc. Used for replaying opening sequence animations.';

-- ============================================================
-- Migration complete
-- ============================================================
