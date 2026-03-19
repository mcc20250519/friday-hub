-- 007_initialize_site_content.sql
-- 初始化网站文案数据表
-- 执行这个脚本将插入所有需要的文案初始数据

-- 首页文案
INSERT INTO site_content (id, key, value, description, created_by, updated_by, version, created_at, updated_at)
VALUES
  (
    gen_random_uuid(),
    'home_hero_title',
    '把好用的',
    '首页 Hero 标题',
    'system',
    'system',
    1,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'home_hero_subtitle',
    '全放这里',
    '首页 Hero 副标题（高亮展示）',
    'system',
    'system',
    1,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'home_hero_desc',
    '效率工具、工作流模板、朋友聚会用的小游戏，都是自己平时真在用的，每一件都跑通了才放上来。',
    '首页 Hero 描述',
    'system',
    'system',
    1,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'home_featured_label',
    '精选内容',
    '工具精选标签',
    'system',
    'system',
    1,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'home_cta_register_title',
    '注册一下，追踪更新',
    '注册 CTA 标题',
    'system',
    'system',
    1,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'home_cta_register_desc',
    '有新东西上线第一时间通知，不发没用的',
    '注册 CTA 描述',
    'system',
    'system',
    1,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'home_footer_text',
    '还有些在做的东西，快了',
    '首页尾部通知文本',
    'system',
    'system',
    1,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'home_footer_desc',
    '有想法也欢迎来聊，说不定下一个就是你想要的',
    '首页尾部通知描述',
    'system',
    'system',
    1,
    NOW(),
    NOW()
  )
ON CONFLICT (key) DO NOTHING;

-- 工具页文案
INSERT INTO site_content (id, key, value, description, created_by, updated_by, version, created_at, updated_at)
VALUES
  (
    gen_random_uuid(),
    'tools_page_title',
    '自用工具箱',
    '工具页标题',
    'system',
    'system',
    1,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'tools_page_desc',
    '平时真在用的那些，每一件都跑通了才放上来，不堆数量，只挑好用的。',
    '工具页描述',
    'system',
    'system',
    1,
    NOW(),
    NOW()
  )
ON CONFLICT (key) DO NOTHING;

-- 游戏页文案
INSERT INTO site_content (id, key, value, description, created_by, updated_by, version, created_at, updated_at)
VALUES
  (
    gen_random_uuid(),
    'games_page_title',
    '随便玩玩',
    '游戏页标题',
    'system',
    'system',
    1,
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'games_page_desc',
    '不需要注册会员，不用下载 APP，叫上几个人，开局就行。',
    '游戏页描述',
    'system',
    'system',
    1,
    NOW(),
    NOW()
  )
ON CONFLICT (key) DO NOTHING;

-- 验证数据是否插入成功
SELECT COUNT(*) as total_records
FROM site_content
WHERE key IN (
  'home_hero_title', 'home_hero_subtitle', 'home_hero_desc',
  'home_featured_label', 'home_cta_register_title', 'home_cta_register_desc',
  'home_footer_text', 'home_footer_desc',
  'tools_page_title', 'tools_page_desc',
  'games_page_title', 'games_page_desc'
);
