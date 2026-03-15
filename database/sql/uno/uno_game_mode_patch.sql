-- ============================================================
-- UNO 游戏模式补丁
-- 为 uno_rooms 添加 game_mode 字段
-- 为 uno_game_state 添加 game_mode 和 rank_list 字段
-- 执行前请确保已执行过 uno_database_setup.sql
-- ============================================================

-- 1. 为 uno_rooms 添加 game_mode 字段
ALTER TABLE uno_rooms
  ADD COLUMN IF NOT EXISTS game_mode VARCHAR(20) NOT NULL DEFAULT 'standard';

-- game_mode 枚举值：
--   'standard'      官方 Mattel 规则（+2/+4 不可叠加，首人出完即结束）
--   'entertainment' 娱乐版规则（+2/+4 可叠加，排名模式）

-- 2. 为 uno_game_state 添加 game_mode 字段（冗余存储，方便游戏中任意客户端读取）
ALTER TABLE uno_game_state
  ADD COLUMN IF NOT EXISTS game_mode VARCHAR(20) NOT NULL DEFAULT 'standard';

-- 3. 为 uno_game_state 添加 rank_list 字段
ALTER TABLE uno_game_state
  ADD COLUMN IF NOT EXISTS rank_list JSONB NOT NULL DEFAULT '[]';

-- rank_list 说明：
--   数组，元素为 userId 字符串，按出完牌的先后顺序排列
--   例如：["player_c_id", "player_a_id", "player_d_id"]
--   仅在娱乐版(entertainment)使用，标准版始终为 []

-- 4. 添加注释
COMMENT ON COLUMN uno_rooms.game_mode IS '游戏模式: standard=官方规则, entertainment=娱乐版规则';
COMMENT ON COLUMN uno_game_state.game_mode IS '游戏模式（与 uno_rooms 同步写入，方便游戏中读取）';
COMMENT ON COLUMN uno_game_state.rank_list IS '排名列表(娱乐版)，按出完牌顺序存放userId';
