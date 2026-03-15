-- 评论表
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  -- 关联的工具ID（可选，为空表示首页评论）
  tool_id TEXT REFERENCES tools(id) ON DELETE CASCADE,
  -- 父评论ID（用于回复功能）
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_comments_tool_id ON comments(tool_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- 启用 RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- 删除旧策略（如果存在）
DROP POLICY IF EXISTS "comments are viewable by everyone" ON comments;
DROP POLICY IF EXISTS "users can create comments" ON comments;
DROP POLICY IF EXISTS "users can update own comments" ON comments;
DROP POLICY IF EXISTS "users can delete own comments" ON comments;

-- 评论表策略
-- 所有人可以查看评论
CREATE POLICY "comments are viewable by everyone" 
  ON comments FOR SELECT 
  USING (true);

-- 只有已登录用户可以创建评论
CREATE POLICY "users can create comments" 
  ON comments FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- 用户可以更新自己的评论
CREATE POLICY "users can update own comments" 
  ON comments FOR UPDATE 
  USING (auth.uid() = user_id);

-- 用户可以删除自己的评论
CREATE POLICY "users can delete own comments" 
  ON comments FOR DELETE 
  USING (auth.uid() = user_id);
