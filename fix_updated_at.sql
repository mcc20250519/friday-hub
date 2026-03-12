-- ============================================
-- 为 profiles 表添加 updated_at 字段并修复触发器
-- ============================================

-- 1. 添加 updated_at 字段（如果不存在）
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. 删除旧触发器（如果有问题）
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;

-- 3. 创建/替换触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. 重新创建触发器
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 验证
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles';
