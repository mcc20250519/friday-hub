-- ============================================
-- 迁移：为 tools 表添加卡片管理字段
-- ============================================
-- 目的：支持卡片状态管理（draft/published/hidden）
-- 添加字段：status, created_by, updated_by, is_active

-- 1. 添加 status 列（已上架/待上架/隐藏）
ALTER TABLE tools
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft'
CHECK (status IN ('draft', 'published', 'hidden'));

-- 2. 添加 created_by 列（记录创建者邮箱）
ALTER TABLE tools
ADD COLUMN IF NOT EXISTS created_by TEXT;

-- 3. 添加 updated_by 列（记录最后更新者邮箱）
ALTER TABLE tools
ADD COLUMN IF NOT EXISTS updated_by TEXT;

-- 4. 添加 is_active 列（向后兼容，true 表示活跃）
-- 前台显示条件：status='published' AND is_active=true
ALTER TABLE tools
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 5. 创建索引以加快查询
CREATE INDEX IF NOT EXISTS idx_tools_status ON tools(status);
CREATE INDEX IF NOT EXISTS idx_tools_status_active ON tools(status, is_active);
CREATE INDEX IF NOT EXISTS idx_tools_created_by ON tools(created_by);
CREATE INDEX IF NOT EXISTS idx_tools_updated_by ON tools(updated_by);

-- 6. 更新现有数据：将所有现有卡片标记为已发布（保持向后兼容）
UPDATE tools SET status = 'published' WHERE status = 'draft';
UPDATE tools SET is_active = true WHERE is_active IS NULL;

-- 7. 验证迁移
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'tools'
  AND column_name IN ('status', 'created_by', 'updated_by', 'is_active')
ORDER BY column_name;
