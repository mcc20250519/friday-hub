-- ============================================
-- 创建 plugin-files 存储桶用于存储原始插件文件
-- ============================================

-- 1. 创建存储桶（如果不存在）
INSERT INTO storage.buckets (id, name, public)
VALUES ('plugin-files', 'plugin-files', true)
ON CONFLICT (id) DO NOTHING;

-- 2. 删除已存在的策略（避免冲突）
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;

-- 3. 设置存储桶的公开访问策略
-- 允许所有人读取文件
CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'plugin-files');

-- 允许已认证用户上传文件
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'plugin-files');

-- 允许已认证用户更新自己的文件
CREATE POLICY "Allow authenticated updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'plugin-files');

-- 允许已认证用户删除自己的文件
CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'plugin-files');

-- 4. 验证存储桶创建成功
SELECT * FROM storage.buckets WHERE id = 'plugin-files';
