-- 评论点赞表
CREATE TABLE IF NOT EXISTS comment_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_id) -- 每个用户只能点赞一次
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON comment_likes(user_id);

-- 启用 RLS
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

-- 点赞表策略
-- 所有人可以查看点赞
CREATE POLICY "comment_likes are viewable by everyone" 
  ON comment_likes FOR SELECT 
  USING (true);

-- 已登录用户可以点赞
CREATE POLICY "users can like comments" 
  ON comment_likes FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- 已登录用户可以取消点赞
CREATE POLICY "users can unlike comments" 
  ON comment_likes FOR DELETE 
  USING (auth.uid() = user_id);
