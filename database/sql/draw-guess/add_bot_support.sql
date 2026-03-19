-- ============================================================
-- 添加机器人支持
-- 在 Supabase Dashboard → SQL Editor 中执行
-- ============================================================

-- 1. 添加 is_bot 字段
ALTER TABLE public.draw_guess_players
ADD COLUMN IF NOT EXISTS is_bot BOOLEAN DEFAULT FALSE;

-- 2. 删除 unique 约束（因为机器人没有 user_id，会导致约束问题）
ALTER TABLE public.draw_guess_players
DROP CONSTRAINT IF EXISTS draw_guess_players_room_id_user_id_key;

-- 3. 允许 user_id 为 NULL（机器人没有用户ID）
ALTER TABLE public.draw_guess_players
ALTER COLUMN user_id DROP NOT NULL;

-- 4. 删除旧的玩家插入策略
DROP POLICY IF EXISTS "draw_guess_players_insert" ON public.draw_guess_players;
DROP POLICY IF EXISTS "draw_guess_players_insert_v2" ON public.draw_guess_players;

-- 5. 创建新的玩家插入策略
CREATE POLICY "draw_guess_players_insert_v3"
  ON public.draw_guess_players FOR INSERT
  WITH CHECK (
    -- 普通玩家：必须有 user_id 且是当前用户，且不是机器人
    (user_id = auth.uid() AND (is_bot = FALSE OR is_bot IS NULL))
    OR
    -- 机器人：必须标记为机器人，user_id 为 NULL，且操作者是房间房主
    (is_bot = TRUE AND user_id IS NULL AND EXISTS (
      SELECT 1 FROM public.draw_guess_rooms
      WHERE id = room_id AND host_id = auth.uid()
    ))
  );

-- 6. 删除旧的玩家删除策略
DROP POLICY IF EXISTS "draw_guess_players_delete" ON public.draw_guess_players;
DROP POLICY IF EXISTS "draw_guess_players_delete_v2" ON public.draw_guess_players;

-- 7. 创建新的玩家删除策略
CREATE POLICY "draw_guess_players_delete_v3"
  ON public.draw_guess_players FOR DELETE
  USING (
    -- 玩家可以删除自己
    user_id = auth.uid()
    OR
    -- 房主可以删除机器人
    (is_bot = TRUE AND EXISTS (
      SELECT 1 FROM public.draw_guess_rooms
      WHERE id = room_id AND host_id = auth.uid()
    ))
  );

-- 8. 删除旧的玩家更新策略
DROP POLICY IF EXISTS "draw_guess_players_update" ON public.draw_guess_players;
DROP POLICY IF EXISTS "draw_guess_players_update_v2" ON public.draw_guess_players;

-- 9. 创建新的玩家更新策略
CREATE POLICY "draw_guess_players_update_v3"
  ON public.draw_guess_players FOR UPDATE
  USING (
    -- 玩家可以更新自己
    user_id = auth.uid()
    OR
    -- 房主可以更新机器人
    (is_bot = TRUE AND EXISTS (
      SELECT 1 FROM public.draw_guess_rooms
      WHERE id = room_id AND host_id = auth.uid()
    ))
  );

-- 10. actions 表：删除外键约束
ALTER TABLE public.draw_guess_actions
DROP CONSTRAINT IF EXISTS draw_guess_actions_user_id_fkey;

-- 11. 删除旧的 actions 插入策略
DROP POLICY IF EXISTS "draw_guess_actions_insert" ON public.draw_guess_actions;
DROP POLICY IF EXISTS "draw_guess_actions_insert_v2" ON public.draw_guess_actions;

-- 12. 创建新的 actions 插入策略
CREATE POLICY "draw_guess_actions_insert_v3"
  ON public.draw_guess_actions FOR INSERT
  WITH CHECK (
    -- 用户自己的操作
    user_id = auth.uid()
    OR
    -- 房主代理机器人操作
    (user_id IS NULL AND EXISTS (
      SELECT 1 FROM public.draw_guess_rooms r
      WHERE r.id = room_id 
      AND r.host_id = auth.uid()
      AND r.status = 'active'
    ))
  );

-- 13. 创建索引
CREATE INDEX IF NOT EXISTS idx_draw_guess_players_is_bot 
ON public.draw_guess_players(is_bot);

-- 14. 确保 Realtime 发布包含 is_bot 字段
-- 注意：如果表已在发布中会报错，可以忽略
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.draw_guess_players;

-- 验证
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'draw_guess_players';
