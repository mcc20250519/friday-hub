-- ============================================
-- 迁移：修复 site_content 表 RLS 策略
-- ============================================
-- 目的：允许已认证用户修改文案内容

-- 删除旧策略
DROP POLICY IF EXISTS "site_content_select_all" ON site_content;
DROP POLICY IF EXISTS "site_content_insert_admin" ON site_content;
DROP POLICY IF EXISTS "site_content_update_admin" ON site_content;
DROP POLICY IF EXISTS "site_content_delete_admin" ON site_content;

-- 新增 RLS 策略：所有人可查看
CREATE POLICY "site_content_select_all"
  ON site_content FOR SELECT
  USING (true);

-- 新增 RLS 策略：已认证用户可插入（应用端做权限验证）
CREATE POLICY "site_content_insert_authenticated"
  ON site_content FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 新增 RLS 策略：已认证用户可更新（应用端做权限验证）
CREATE POLICY "site_content_update_authenticated"
  ON site_content FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 新增 RLS 策略：已认证用户可删除（应用端做权限验证）
CREATE POLICY "site_content_delete_authenticated"
  ON site_content FOR DELETE
  USING (auth.uid() IS NOT NULL);
