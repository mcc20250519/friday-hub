-- ============================================================
-- UNO 游戏最大玩家数升级到 10 人
-- 请在 Supabase Dashboard → SQL Editor 中执行此脚本
-- ============================================================

-- 修改 uno_rooms 表的 max_players 约束（2-10 人）
ALTER TABLE public.uno_rooms
DROP CONSTRAINT IF EXISTS uno_rooms_max_players_check;

ALTER TABLE public.uno_rooms
ADD CONSTRAINT uno_rooms_max_players_check CHECK (max_players BETWEEN 2 AND 10);

-- 修改 uno_players 表的 seat_index 约束（0-9）
ALTER TABLE public.uno_players
DROP CONSTRAINT IF EXISTS uno_players_seat_index_check;

ALTER TABLE public.uno_players
ADD CONSTRAINT uno_players_seat_index_check CHECK (seat_index BETWEEN 0 AND 9);
