-- ============================================================
-- UNO Called 状态字段补丁
-- 给 uno_game_state 表添加 uno_called JSONB 列
-- 用于记录每个玩家是否已喊 UNO（手牌剩 1 张时自动标记）
-- 在 Supabase Dashboard → SQL Editor 中执行
-- ============================================================

-- 添加 uno_called 列（存储格式：{ "playerId1": true, "playerId2": false }）
ALTER TABLE public.uno_game_state
  ADD COLUMN IF NOT EXISTS uno_called jsonb DEFAULT '{}';
