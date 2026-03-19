-- ============================================
-- 迁移：创建 site_content 表（文案管理）
-- ============================================
-- 目的：管理首页及各页面的可编辑文案内容

-- 1. 创建 site_content 表
CREATE TABLE IF NOT EXISTS site_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,            -- 文案键（如 'home_hero_title'）
  value TEXT NOT NULL,                  -- 文案内容
  content_type TEXT DEFAULT 'text'      -- 'text' 或 'html'
    CHECK (content_type IN ('text', 'html')),
  description TEXT,                     -- 字段描述
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,                      -- 创建者邮箱
  updated_by TEXT,                      -- 更新者邮箱
  version INT DEFAULT 1                 -- 版本号（用于回滚）
);

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_site_content_key ON site_content(key);
CREATE INDEX IF NOT EXISTS idx_site_content_updated_at ON site_content(updated_at DESC);

-- 3. 启用 RLS
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;

-- 4. 删除旧策略（如果存在）
DROP POLICY IF EXISTS "site_content_select_all" ON site_content;
DROP POLICY IF EXISTS "site_content_insert_admin" ON site_content;
DROP POLICY IF EXISTS "site_content_update_admin" ON site_content;
DROP POLICY IF EXISTS "site_content_delete_admin" ON site_content;

-- 5. 创建 RLS 策略：所有人可查看文案
CREATE POLICY "site_content_select_all"
  ON site_content FOR SELECT
  USING (true);

-- 6. 创建 RLS 策略：仅管理员可插入
-- 注：需要在应用中进行权限验证，检查 updated_by 是否在管理员列表
CREATE POLICY "site_content_insert_admin"
  ON site_content FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- 7. 创建 RLS 策略：仅管理员可更新
CREATE POLICY "site_content_update_admin"
  ON site_content FOR UPDATE
  WITH CHECK (auth.role() = 'authenticated');

-- 8. 创建 RLS 策略：仅管理员可删除
CREATE POLICY "site_content_delete_admin"
  ON site_content FOR DELETE
  USING (auth.role() = 'authenticated');

-- 9. 插入默认文案内容
INSERT INTO site_content (key, value, description, content_type, created_by, updated_by) VALUES
  ('home_hero_title', '把好用的', '首页 Hero 区标题第一行', 'text', 'system', 'system'),
  ('home_hero_subtitle', '全放这里', '首页 Hero 区标题第二行（高亮部分）', 'text', 'system', 'system'),
  ('home_hero_desc', '效率工具、工作流模板、朋友聚会用的小游戏，都是自己平时真在用的，每一件都跑通了才放上来。', '首页 Hero 区描述文案', 'text', 'system', 'system'),
  ('home_featured_label', '精选内容', '首页精选内容区标签', 'text', 'system', 'system'),
  ('home_cta_register_title', '注册一下，追踪更新', '首页注册 CTA 标题', 'text', 'system', 'system'),
  ('home_cta_register_desc', '有新东西上线第一时间通知，不发没用的', '首页注册 CTA 描述', 'text', 'system', 'system'),
  ('home_footer_text', '还有些在做的东西，快了', '首页尾部提示文案', 'text', 'system', 'system'),
  ('home_footer_desc', '有想法也欢迎来聊，说不定下一个就是你想要的', '首页尾部提示描述', 'text', 'system', 'system'),
  ('tools_page_title', '工具箱', '工具页面标题', 'text', 'system', 'system'),
  ('tools_page_desc', '效率、自动化、日常小工具，跑通了才放上来', '工具页面描述', 'text', 'system', 'system'),
  ('games_page_title', '游戏室', '游戏页面标题', 'text', 'system', 'system'),
  ('games_page_desc', 'UNO 对战、你说我猜，叫上几个人开局就行', '游戏页面描述', 'text', 'system', 'system')
ON CONFLICT (key) DO NOTHING;

-- 10. 验证创建
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'site_content'
ORDER BY ordinal_position;
