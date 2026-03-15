-- ============================================================
-- UNO 先手玩家补丁
-- 为 uno_game_state 添加 first_player_id 和 needs_color_pick 字段
-- 执行前请确保已执行过 uno_database_setup.sql
-- ============================================================

-- 1. 添加 first_player_id 字段
--    记录本局游戏的起始玩家 ID（用于前端展示"先出牌"提示动画）
--    游戏开始后固定不变，纯展示用途
ALTER TABLE uno_game_state
  ADD COLUMN IF NOT EXISTS first_player_id TEXT;

-- 说明：
--   - 官方规则：摸牌数字最大的玩家 ID
--   - 娱乐规则：随机选取的玩家 ID
--   - 机器人：格式为 'bot_<uuid>'，与 uno_players.user_id 保持一致
--   - 使用 TEXT 而非 UUID，兼容 bot_ 前缀的机器人 ID

-- 2. 添加 needs_color_pick 字段
--    Wild 起始牌待选色标记：值为需要选色的玩家 ID，null 表示无需选色
--    玩家选完颜色后由客户端将此字段置为 null
ALTER TABLE uno_game_state
  ADD COLUMN IF NOT EXISTS needs_color_pick TEXT;

-- 说明：
--   - 仅当起始翻牌为 Wild（普通变色牌）时才有值
--   - Wild Draw Four 起始时会放回重翻，不会触发此字段
--   - 客户端读到 needs_color_pick === 自己的 userId 时弹出颜色选择器
--   - 选色后执行 UPDATE SET current_color=选色, needs_color_pick=null

-- 3. 添加 opening_data 字段
--    开场动画数据：发牌信息、比牌结果等，供前端开场状态机使用
--    开场动画结束后此字段不再更新，仅供读取
ALTER TABLE uno_game_state
  ADD COLUMN IF NOT EXISTS opening_data JSONB;

-- 4. 添加字段注释
COMMENT ON COLUMN uno_game_state.first_player_id IS '本局先手玩家ID（官方规则=摸牌最大值者，娱乐规则=随机），用于前端展示先手提示';
COMMENT ON COLUMN uno_game_state.needs_color_pick IS 'Wild起始牌待选色：值为需要选色的玩家ID，选色完成后置null';
COMMENT ON COLUMN uno_game_state.opening_data IS '开场动画数据（JSON），包含发牌信息、比牌轮次、先手玩家等，供前端开场状态机动画回放使用';
