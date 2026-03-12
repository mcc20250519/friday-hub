-- ============================================
-- 创建 favorites 表（用户收藏）
-- ============================================

-- 创建 favorites 表
CREATE TABLE IF NOT EXISTS favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_id TEXT NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 每个用户只能收藏同一个工具一次
  UNIQUE(user_id, tool_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_tool_id ON favorites(tool_id);

-- 启用 RLS
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- 删除旧策略（如果存在）
DROP POLICY IF EXISTS "Users can view own favorites" ON favorites;
DROP POLICY IF EXISTS "Users can insert own favorites" ON favorites;
DROP POLICY IF EXISTS "Users can delete own favorites" ON favorites;

-- 创建 RLS 策略
CREATE POLICY "Users can view own favorites"
  ON favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites"
  ON favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites"
  ON favorites FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 创建 download_records 表（下载记录）
-- ============================================

CREATE TABLE IF NOT EXISTS download_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_download_records_user_id ON download_records(user_id);
CREATE INDEX IF NOT EXISTS idx_download_records_downloaded_at ON download_records(downloaded_at);

-- 启用 RLS
ALTER TABLE download_records ENABLE ROW LEVEL SECURITY;

-- 删除旧策略（如果存在）
DROP POLICY IF EXISTS "Users can view own download records" ON download_records;
DROP POLICY IF EXISTS "Users can insert own download records" ON download_records;

-- 创建 RLS 策略
CREATE POLICY "Users can view own download records"
  ON download_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own download records"
  ON download_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 验证表结构
-- ============================================

-- 查看 favorites 表结构
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'favorites';

-- 查看 download_records 表结构
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'download_records';
