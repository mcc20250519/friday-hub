-- ============================================================
-- 添加"你说我猜"游戏到游戏列表
-- 在 Supabase Dashboard → SQL Editor 中执行
-- ============================================================

-- 插入游戏记录到 tools 表
INSERT INTO public.tools (
  id,
  name,
  description,
  category,
  type,
  icon,
  card_bg,
  url,
  players,
  duration,
  difficulty,
  badge,
  status,
  sort_order,
  is_active
) VALUES (
  'game-draw-and-guess',
  '你说我猜',
  '经典的绘画猜词游戏！轮流描述词语，其他玩家猜测。支持多团队对战，看哪队先达到目标分数！',
  '小游戏',
  'game',
  '🎨',
  '#FFAEBC',
  'draw-and-guess',
  '2-8人',
  '10-30分钟',
  '简单',
  '新品',
  'published',
  20,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  card_bg = EXCLUDED.card_bg,
  url = EXCLUDED.url,
  players = EXCLUDED.players,
  duration = EXCLUDED.duration,
  difficulty = EXCLUDED.difficulty,
  badge = EXCLUDED.badge,
  status = EXCLUDED.status,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

-- ✅ 执行完毕后，游戏列表页将显示"你说我猜"游戏卡片
