-- ============================================================
-- 修复 uno_actions RLS 策略
-- 问题：Bot 用户无法写入 uno_actions 表，因为 auth.uid() 返回 null
-- 解决：允许房间内玩家代为写入操作日志
-- ============================================================

-- 删除旧策略
DROP POLICY IF EXISTS "uno_actions_insert" ON public.uno_actions;

-- 创建新策略：房间内玩家可代为写入操作日志
-- 这允许 Bot（user_id 以 'bot_' 开头）的操作被房间内玩家写入
CREATE POLICY "uno_actions_insert"
  ON public.uno_actions FOR INSERT
  WITH CHECK (
    -- 情况1：用户为自己写入日志
    auth.uid() = user_id
    OR
    -- 情况2：房间内玩家可为 Bot 写入日志（user_id 以 'bot_' 开头）
    (
      user_id::text LIKE 'bot_%'
      AND EXISTS (
        SELECT 1 FROM public.uno_players
        WHERE room_id = uno_actions.room_id
          AND user_id = auth.uid()
      )
    )
  );

-- ============================================================
-- ✅ 执行完毕后，Bot 的操作日志将能够正常写入
-- ============================================================
