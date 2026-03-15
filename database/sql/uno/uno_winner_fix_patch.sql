-- ============================================================
-- UNO Winner 字段修复补丁
-- 将 winner_id 从 uuid 外键改为 text 类型，以支持机器人赢家
-- 机器人 ID 格式为 "bot_xxx"，不是合法 UUID，无法存入 uuid 列
-- 在 Supabase Dashboard → SQL Editor 中执行
-- ============================================================

-- 1. 先移除旧的 winner_id 外键约束和列
--    PostgreSQL 不支持直接修改列类型，需要先删除再重建
ALTER TABLE public.uno_game_state
  DROP COLUMN IF EXISTS winner_id;

-- 2. 重新添加 winner_id 为 text 类型（无外键约束）
--    可以存储任意字符串：真人 UUID 或机器人 "bot_xxx"
ALTER TABLE public.uno_game_state
  ADD COLUMN winner_id text DEFAULT NULL;

-- ============================================================
-- ✅ 执行完毕
-- 注意：执行后 winner_id 变为 text 类型，可存入机器人 ID
-- ============================================================
