-- ============================================
-- 修复 tools 表的 RLS 策略
-- 允许已认证用户进行所有操作
-- ============================================

-- 1. 删除所有现有的 tools 表策略
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'tools'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON tools', pol.policyname);
    END LOOP;
END $$;

-- 2. 创建新的策略：允许所有已认证用户进行所有操作

-- SELECT 策略（允许所有人读取）
CREATE POLICY "tools_select_all" ON tools
FOR SELECT USING (true);

-- INSERT 策略（允许已认证用户插入）
CREATE POLICY "tools_insert_auth" ON tools
FOR INSERT TO authenticated
WITH CHECK (true);

-- UPDATE 策略（允许已认证用户更新）
CREATE POLICY "tools_update_auth" ON tools
FOR UPDATE TO authenticated
USING (true);

-- DELETE 策略（允许已认证用户删除）
CREATE POLICY "tools_delete_auth" ON tools
FOR DELETE TO authenticated
USING (true);

-- 3. 验证策略
SELECT policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'tools';
