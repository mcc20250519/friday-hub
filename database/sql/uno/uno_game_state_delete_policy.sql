-- ============================================
-- uno_game_state DELETE 策略补丁
-- 问题：uno_game_state 表缺少 DELETE 策略，导致无法删除游戏状态
-- 解决：允许房主删除游戏状态（用于返回房间时清理）
-- ============================================

-- 添加 DELETE 策略：允许房主删除游戏状态
CREATE POLICY "uno_game_state_delete"
  ON public.uno_game_state FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.uno_rooms
      WHERE id = uno_game_state.room_id
        AND host_id = auth.uid()
    )
  );

-- 验证策略已创建
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename = 'uno_game_state';
