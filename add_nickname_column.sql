-- ============================================
-- 为 profiles 表添加 nickname 字段
-- ============================================

-- 添加 nickname 字段（如果不存在）
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS nickname TEXT;

-- 验证
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles';
