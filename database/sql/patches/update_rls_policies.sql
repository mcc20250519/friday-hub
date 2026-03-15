-- ============================================
-- 评论表 (comments) 的 RLS 策略
-- ============================================

-- 删除旧策略（使用 IF EXISTS）
DROP POLICY IF EXISTS "comments_select_policy" ON comments;
DROP POLICY IF EXISTS "comments_insert_policy" ON comments;
DROP POLICY IF EXISTS "comments_update_policy" ON comments;
DROP POLICY IF EXISTS "comments_delete_policy" ON comments;
DROP POLICY IF EXISTS "comments are viewable by everyone" ON comments;
DROP POLICY IF EXISTS "users can create comments" ON comments;
DROP POLICY IF EXISTS "users can update own comments" ON comments;
DROP POLICY IF EXISTS "users can delete own comments" ON comments;

-- 创建新策略
-- 1. SELECT - 所有人都可以查看评论
CREATE POLICY "comments_select_policy" 
  ON comments FOR SELECT 
  USING (true);

-- 2. INSERT - 只有登录用户可以创建评论
CREATE POLICY "comments_insert_policy" 
  ON comments FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- 3. UPDATE - 用户只能更新自己的评论
CREATE POLICY "comments_update_policy" 
  ON comments FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. DELETE - 用户只能删除自己的评论
CREATE POLICY "comments_delete_policy" 
  ON comments FOR DELETE 
  USING (auth.uid() = user_id);


-- ============================================
-- 点赞表 (comment_likes) 的 RLS 策略
-- ============================================

-- 删除旧策略（使用 IF EXISTS）
DROP POLICY IF EXISTS "comment_likes_select_policy" ON comment_likes;
DROP POLICY IF EXISTS "comment_likes_insert_policy" ON comment_likes;
DROP POLICY IF EXISTS "comment_likes_delete_policy" ON comment_likes;
DROP POLICY IF EXISTS "comment_likes are viewable by everyone" ON comment_likes;
DROP POLICY IF EXISTS "users can like comments" ON comment_likes;
DROP POLICY IF EXISTS "users can unlike comments" ON comment_likes;

-- 创建新策略
-- 1. SELECT - 所有人都可以查看点赞
CREATE POLICY "comment_likes_select_policy" 
  ON comment_likes FOR SELECT 
  USING (true);

-- 2. INSERT - 只有登录用户可以点赞
CREATE POLICY "comment_likes_insert_policy" 
  ON comment_likes FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- 3. DELETE - 用户只能取消自己的点赞
CREATE POLICY "comment_likes_delete_policy" 
  ON comment_likes FOR DELETE 
  USING (auth.uid() = user_id);
