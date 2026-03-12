-- ============================================
-- 清理重复的工具数据
-- ============================================

-- 1. 先查看所有工具
SELECT id, name, category, sort_order FROM tools ORDER BY category, name;

-- 2. 删除旧的重复数据（保留新的id）
DELETE FROM tools WHERE id IN ('ai-chat-nav', 'travel-workflow', 'health-tool', 'party-game');

-- 3. 验证清理后的数据
SELECT id, name, category, sort_order FROM tools ORDER BY sort_order;

-- ============================================
-- 如果上面的清理不准确，可以删除全部重新插入
-- ============================================

-- 方式一：清空整个表重新插入（谨慎使用）
-- TRUNCATE TABLE tools;

-- 然后重新执行之前的 INSERT 语句
