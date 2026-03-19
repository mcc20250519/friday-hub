# 数据同步问题修复指南

## 问题总结

1. **首页无内容** - 工具没有显示在首页
2. **工具页有内容** - ✅ 已正常显示
3. **游戏页无内容** - 游戏没有显示在游戏页
4. **管理后台无法保存** - 游戏的新增和修改都失败

## 根本原因分析

### 问题 1、2、3：数据库缺少字段
`tools` 表中缺少以下字段：
- `card_bg` (卡片背景色)
- `url` (在线链接)
- `players` (游戏人数)
- `duration` (游戏时长)
- `difficulty` (游戏难度)
- `badge` (游戏徽章)
- `download_url` (下载链接)
- `content` (详细内容)

当前端查询这些字段时，如果字段不存在，Supabase 会报 `column not found` 错误，导致整个查询失败，数据为空。

### 问题 4：管理后台保存逻辑
`handleSave` 函数把 `formData` 的所有字段（包括上述不存在的字段）都发送给 Supabase，导致 INSERT/UPDATE 失败，出现列不存在的错误。

### 问题 1：首页查询问题
首页查询里虽然指定了字段列表 `.select('id, name, description, category, tags, type, icon, card_bg, sort_order')`，但如果 `card_bg` 不存在，查询会失败且没有错误日志，难以诊断。修复为 `.select('*')` 更简洁，使用 Supabase 已有的字段，不存在的字段会自动忽略。

---

## 修复方案

### 第一步：执行数据库迁移 SQL

在 **Supabase SQL Editor** 中执行以下文件：
**`database/sql/patches/fix_game_category.sql`**

这个脚本会：
1. ✅ 为 `tools` 表补充缺失的 8 个字段
2. ✅ 把现有的草稿工具改为已发布
3. ✅ 插入两个游戏数据：UNO、你说我猜

**关键 SQL 段**：
```sql
-- 步骤 1：补充缺失字段（如字段已存在则跳过）
ALTER TABLE tools ADD COLUMN IF NOT EXISTS card_bg    TEXT;
ALTER TABLE tools ADD COLUMN IF NOT EXISTS url        TEXT;
ALTER TABLE tools ADD COLUMN IF NOT EXISTS players    TEXT;
ALTER TABLE tools ADD COLUMN IF NOT EXISTS duration   TEXT;
ALTER TABLE tools ADD COLUMN IF NOT EXISTS difficulty TEXT;
ALTER TABLE tools ADD COLUMN IF NOT EXISTS badge      TEXT;
ALTER TABLE tools ADD COLUMN IF NOT EXISTS download_url TEXT;
ALTER TABLE tools ADD COLUMN IF NOT EXISTS content    TEXT;

-- 步骤 2：发布现有工具
UPDATE tools
SET status = 'published', is_active = true
WHERE status = 'draft';

-- 步骤 3：插入游戏数据（2 条记录）
-- ...（详见 SQL 文件）
```

---

### 第二步：代码修复

已完成的文件修改：

#### 1. `src/pages/AdminDashboard.jsx`
- ✅ 修复 `handleSave` 函数，添加字段白名单过滤
- ✅ 添加工具/游戏 Tab 切换功能
- ✅ 游戏表单添加 `players`、`duration`、`difficulty`、`badge` 字段
- ✅ 卡片颜色选择器
- ✅ 状态管理改为 `status` 字段（draft/published/hidden）

**关键修改**：
```javascript
// 只保留 tools 表中存在的字段
const ALLOWED_FIELDS = [
  'name', 'description', 'category', 'type', 'tags',
  'icon', 'card_bg', 'url', 'download_url', 'content',
  'status', 'is_active', 'sort_order',
  'players', 'duration', 'difficulty', 'badge',
  'created_by', 'updated_by',
]
const toolData = ALLOWED_FIELDS.reduce((acc, key) => {
  if (key in formData || key === 'tags') {
    acc[key] = key === 'tags' ? tagsArray : formData[key]
  }
  return acc
}, {})
```

#### 2. `src/pages/Home.jsx`
- ✅ 修改查询为 `.select('*')` 更简洁健壮
- ✅ 添加错误日志，便于诊断
- ✅ 整合 `usePageContent` hook 管理首页文案
- ✅ 支持动态生成分类 Tab（仅显示有内容的分类）
- ✅ 添加加载状态和错误提示

**关键修改**：
```javascript
useEffect(() => {
  supabase
    .from('tools')
    .select('*')  // 查询所有字段
    .eq('status', 'published')
    .not('type', 'eq', 'game')
    .neq('is_active', false)
    .order('sort_order', { ascending: true })
    .then(({ data, error }) => {
      if (error) console.error('[Home] 查询失败:', error)
      setItems(data || [])
      setLoadingItems(false)
    })
    .catch((err) => {
      console.error('[Home] 查询异常:', err)
      setLoadingItems(false)
    })
}, [])
```

#### 3. `src/pages/Games.jsx`
无需修改，查询逻辑已正确（`select` 指定了所有需要的字段，不存在的字段不影响查询）

---

## 预期修复结果

执行上述步骤后：

| 页面 | 状态 | 说明 |
|------|------|------|
| **首页** | ✅ 显示工具 | 显示所有 `published` 且非游戏的工具 |
| **工具页** | ✅ 显示工具 | 过滤 `category` 不同的工具 |
| **游戏页** | ✅ 显示游戏 | UNO、你说我猜 |
| **管理后台** | ✅ 可保存 | 工具和游戏都能新增、修改、删除 |

---

## 验证步骤

### 1. 执行 SQL 后验证数据库
在 Supabase SQL Editor 执行查询：
```sql
SELECT id, name, category, type, status, is_active, 
       card_bg, url, players, duration, difficulty, badge
FROM tools
ORDER BY type, sort_order;
```
应该看到：
- 1 条工具：「AI对话导航助手」，`status='published'`
- 2 条游戏：「UNO 对战」、「你说我猜」，`status='published'`

### 2. 在浏览器中验证前台显示
刷新以下页面，检查是否有数据显示：
- `/` → 首页精选区应显示工具
- `/tools` → 工具页应列出工具
- `/games` → 游戏页应显示 UNO 和 你说我猜
- 打开 F12 控制台，查看是否有 `console.error` 错误日志

### 3. 在管理后台验证保存
- 访问 `/admin`，切换到「🎮 游戏」Tab
- 尝试编辑现有的游戏（修改名称或徽章）
- 点击保存，应该成功显示「保存成功」提示
- 刷新管理后台，确认修改已保存

---

## 常见问题

### Q1：执行 SQL 后首页仍未显示内容
**检查清单**：
1. 确认 SQL 脚本全部执行成功（看最后的 SELECT 查询结果）
2. 打开浏览器 F12 → Console，查看是否有错误日志
3. 检查工具的 `status` 是否为 `'published'`
4. 检查工具的 `type` 是否不是 `'game'`（防止首页显示游戏）

### Q2：管理后台保存时仍然报错
**检查清单**：
1. 查看浏览器 F12 → Console 里的完整错误信息
2. 确认是否有数据库权限问题（需要检查 Supabase RLS 策略）
3. 若报 `column ... does not exist`，说明 SQL 脚本未完全执行

### Q3：数据库里有数据，但前台显示"暂时还没有发布的内容"
**检查清单**：
1. 确认数据库记录的 `status` 是 `'published'`（不是 `'draft'`）
2. 确认 `is_active` 不是 `false`（可以是 `true` 或 `NULL`）
3. 对于游戏，确认 `type='game'` 或 `category='小游戏'`

---

## 后续维护建议

1. **添加更多工具/游戏时**，务必在管理后台设置：
   - `status = 'published'`
   - `is_active = true`
   - `category` 正确（工具用"效率工具"或"工作流"，游戏用"小游戏"）
   - `type` 正确（工具用"online"或"download"，游戏用"game"）

2. **如需草稿工具不出现在前台**，修改时只改 `status='draft'`，保留其他字段

3. **定期备份数据库**，尤其是在修改 schema 后

---

**最后一步**：现在在 Supabase SQL Editor 执行 `database/sql/patches/fix_game_category.sql` 中的所有 SQL，完成修复！
