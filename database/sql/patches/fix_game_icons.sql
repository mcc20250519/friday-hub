-- ============================================
-- 修复游戏卡片数据（图标 + 清除 badge 标签）
-- 在 Supabase Dashboard > SQL Editor 中执行
-- ============================================

-- 修复图标
UPDATE tools SET icon = '🃏' WHERE id = 'game-uno';
UPDATE tools SET icon = '🎭' WHERE id = 'game-party';

-- 清除 badge 字段（去掉"最受欢迎""最热闹"等标签）
UPDATE tools SET badge = NULL WHERE id IN ('game-uno', 'game-party');

-- 验证
SELECT id, name, icon, badge FROM tools WHERE id IN ('game-uno', 'game-party');
