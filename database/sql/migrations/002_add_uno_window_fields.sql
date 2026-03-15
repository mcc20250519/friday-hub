-- ============================================================
-- Migration: Add UNO Window fields to uno_game_state table
-- Description:
--   Add fields for the new UNO button redesign (PRD v1.0):
--   - uno_window_open: Boolean flag indicating if UNO call window is open
--   - uno_window_owner: Player ID who opened the UNO window (played second-to-last card)
--   - reported_this_window: Array of player IDs who have reported during this window
-- ============================================================

-- 1. Add uno_window_open field
--    Boolean flag: true when a player has played their second-to-last card
--    Window closes when next player acts or game ends
ALTER TABLE public.uno_game_state
ADD COLUMN IF NOT EXISTS uno_window_open BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.uno_game_state.uno_window_open IS
'UNO call window status: true when a player has played second-to-last card and window is open for UNO calls';

-- 2. Add uno_window_owner field
--    Player ID (TEXT to support bot_ prefixed IDs) who opened the window
--    Used to identify which player needs to call UNO
ALTER TABLE public.uno_game_state
ADD COLUMN IF NOT EXISTS uno_window_owner TEXT DEFAULT NULL;

COMMENT ON COLUMN public.uno_game_state.uno_window_owner IS
'Player ID who opened the UNO window by playing their second-to-last card. NULL when window is closed.';

-- 3. Add reported_this_window field
--    JSONB array of player IDs who have submitted reports during current window
--    Prevents duplicate reports and tracks competition
ALTER TABLE public.uno_game_state
ADD COLUMN IF NOT EXISTS reported_this_window JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.uno_game_state.reported_this_window IS
'Array of player IDs who have reported during current UNO window. Cleared when window closes.';

-- ============================================================
-- Migration complete
-- ============================================================
