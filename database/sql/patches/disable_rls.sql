-- 禁用 comments 表的 RLS（快速测试用）
ALTER TABLE comments DISABLE ROW LEVEL SECURITY;

-- 禁用 comment_likes 表的 RLS（快速测试用）
ALTER TABLE comment_likes DISABLE ROW LEVEL SECURITY;
