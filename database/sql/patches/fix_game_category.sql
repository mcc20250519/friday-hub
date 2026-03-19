-- ============================================
-- 步骤 1：给 tools 表补充缺失的字段
-- （如字段已存在则跳过，不会报错）
-- ============================================
ALTER TABLE tools ADD COLUMN IF NOT EXISTS card_bg    TEXT;
ALTER TABLE tools ADD COLUMN IF NOT EXISTS url        TEXT;
ALTER TABLE tools ADD COLUMN IF NOT EXISTS players    TEXT;
ALTER TABLE tools ADD COLUMN IF NOT EXISTS duration   TEXT;
ALTER TABLE tools ADD COLUMN IF NOT EXISTS difficulty TEXT;
ALTER TABLE tools ADD COLUMN IF NOT EXISTS badge      TEXT;
ALTER TABLE tools ADD COLUMN IF NOT EXISTS download_url TEXT;
ALTER TABLE tools ADD COLUMN IF NOT EXISTS content    TEXT;

-- ============================================
-- 步骤 2：把现有草稿工具改为已发布
-- ============================================
UPDATE tools
SET status = 'published', is_active = true
WHERE status = 'draft';

-- ============================================
-- 步骤 3：插入游戏数据（如已存在则跳过）
-- ============================================
INSERT INTO tools (
  id, name, description, category, type,
  tags, icon, card_bg, url,
  players, duration, difficulty, badge,
  status, is_active, sort_order,
  content
)
VALUES
(
  'game-uno',
  'UNO 对战',
  '创建或加入房间，最多 4 人实时对战。可以拉机器人凑局，手机横屏直接开打，不需要额外下载任何东西。',
  '小游戏',
  'game',
  ARRAY['实时对战', '纸牌', '机器人可选'],
  '🃏',
  '#FFAEBC',
  'uno',
  '2–4 人',
  '10–30 分钟',
  '随手就会',
  '最受欢迎',
  'published',
  true,
  1,
  ''
),
(
  'game-party',
  '你说我猜',
  '接入 AI 引擎实时出题，美食、影视、动物……八大主题随意混搭。一个人比划，其他人抢猜，猜对计分，最后有排行榜。',
  '小游戏',
  'game',
  ARRAY['AI 出题', '比划猜词', '聚会首选'],
  '🎭',
  '#B4F8C8',
  'party',
  '2–10 人',
  '15–60 分钟',
  '老少皆宜',
  '最热闹',
  'published',
  true,
  2,
  ''
)
ON CONFLICT (id) DO UPDATE SET
  status     = EXCLUDED.status,
  is_active  = EXCLUDED.is_active,
  url        = EXCLUDED.url,
  card_bg    = EXCLUDED.card_bg,
  players    = EXCLUDED.players,
  duration   = EXCLUDED.duration,
  difficulty = EXCLUDED.difficulty,
  badge      = EXCLUDED.badge;

-- ============================================
-- 步骤 4：验证结果
-- ============================================
SELECT id, name, category, type, status, is_active, sort_order,
       card_bg, url, players, duration, difficulty, badge
FROM tools
ORDER BY type, sort_order;
