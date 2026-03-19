# 数据同步问题修复指南

## 问题诊断

### 问题1：工具管理后台有工具，但首页和工具页不显示 ❌ 已修复

**根本原因**：
- `Tools.jsx` 的查询条件只过滤了 `status='published'`
- 但缺少 `is_active=true` 的过滤条件

**修复方案**：
- ✅ 已在 `src/pages/Tools.jsx` 的 `fetchTools` 函数中添加 `.eq('is_active', true)` 条件
- 现在查询条件为：`status='published' AND is_active=true`

**验证方式**：
1. 在管理后台创建一个工具
2. 设置 `status='published'` 并启用 `is_active=true`  
3. 刷新工具页，应该能看到该工具

---

### 问题2：游戏页有两个游戏，但管理后台查不到 🔴 需要修复数据库

**根本原因**：
- 游戏数据的 `category` 字段值**不是 `'小游戏'`**，可能是 `NULL` 或其他值
- `AdminDashboard.jsx` 的 `PANEL_TABS` 中游戏对应的分类是 `['小游戏']`
- 当查询 `category IN ['小游戏']` 时，无法找到这些游戏记录

**数据查询对比**：

| 组件 | 查询条件 | 能否找到游戏 |
|-----|---------|-----------|
| Games.jsx（游戏页） | `.eq('category', '小游戏')` | ✅ 可以 |
| AdminDashboard.jsx（管理后台） | `.in('category', ['小游戏'])` | ❌ 不行 |

**结论**：
- 游戏页查询成功说明数据库里有游戏记录
- 但这些游戏的 `category` 字段值不等于 `'小游戏'`
- **最有可能的原因**：游戏数据是手工插入的，没有设置 `category` 字段

---

## 修复步骤

### Step 1：修复工具页数据过滤 ✅ 已完成

**文件**：`src/pages/Tools.jsx`

```javascript
// 修改前：缺少 is_active 过滤
.eq('status', 'published')

// 修改后：添加 is_active 过滤
.eq('status', 'published')
.eq('is_active', true)
```

---

### Step 2：修复数据库游戏数据 🔴 需要执行

**执行 SQL 脚本**：`database/sql/patches/fix_game_category.sql`

这个脚本会：
1. 将所有 `type='game'` 的记录的 `category` 设置为 `'小游戏'`
2. 确保所有游戏的 `is_active=true`
3. 验证修复结果

**如何执行**：

#### 方法 A：使用 Supabase 控制台

1. 打开 [Supabase Dashboard](https://app.supabase.com/)
2. 选择您的项目
3. 进入 **SQL Editor**
4. 创建新查询
5. 复制 `database/sql/patches/fix_game_category.sql` 的内容
6. 执行查询

#### 方法 B：使用 psql 命令行

```bash
psql -h [数据库主机] -U [用户名] -d [数据库名] -f database/sql/patches/fix_game_category.sql
```

#### 方法 C：逐步手动修复（推荐，这样可以先验证）

```sql
-- 第1步：查看所有游戏记录
SELECT id, name, category, type, status, is_active 
FROM tools 
WHERE type = 'game';

-- 第2步：修复游戏分类
UPDATE tools
SET category = '小游戏'
WHERE type = 'game';

-- 第3步：启用所有游戏
UPDATE tools
SET is_active = true
WHERE type = 'game';

-- 第4步：验证结果
SELECT id, name, category, type, status, is_active 
FROM tools 
WHERE type = 'game';
```

---

## 修复后的验证

### 验证1：工具页和首页能显示工具 ✅

**操作步骤**：
1. 打开管理后台 → 内容管理 → 工具
2. 创建一个新工具或编辑现有工具
3. 确保设置了：
   - `status = 'published'` ✅
   - `is_active = true` ✅（已启用的开关打开）
4. 保存修改
5. 访问 `/` 首页和 `/tools` 工具页
6. **预期结果**：应该能看到这个工具

### 验证2：管理后台能显示游戏 ✅

**操作步骤**：
1. 打开管理后台 → 内容管理
2. 点击 **🎮 游戏** Tab
3. **预期结果**：应该能看到两个游戏（UNO、Party）

### 验证3：游戏页能正常显示游戏 ✅

**操作步骤**：
1. 访问 `/games` 游戏页
2. **预期结果**：能看到所有已发布的游戏

---

## 数据表示意

### tools 表关键字段

| 字段 | 说明 | 示例 |
|-----|-----|-----|
| `category` | 分类 | `'效率工具'` \| `'工作流'` \| `'小游戏'` |
| `type` | 类型 | `'online'` \| `'download'` \| `'workflow'` \| `'game'` |
| `status` | 发布状态 | `'draft'` (草稿) \| `'published'` (已发布) \| `'hidden'` (隐藏) |
| `is_active` | 是否激活 | `true` (启用) \| `false` (禁用) |

### 前台显示规则

**工具页 / 首页工具列表**：
```
status = 'published' AND is_active = true
```

**游戏页**：
```
category = '小游戏' AND status = 'published'
```

**管理后台**：
```
工具 Tab: category IN ['效率工具', '工作流']
游戏 Tab: category IN ['小游戏']
（不过滤 status 和 is_active，显示所有状态的内容）
```

---

## 常见问题

### Q1：修复后工具/游戏仍然不显示？

**检查清单**：
1. ✅ 确认 `status = 'published'`
2. ✅ 确认 `is_active = true`
3. ✅ 对于工具，确认 `category IN ['效率工具', '工作流']`
4. ✅ 对于游戏，确认 `category = '小游戏'`
5. ✅ 刷新浏览器页面（Cmd+Shift+R 清空缓存）
6. ✅ 检查浏览器开发者工具的 Network 标签，看 API 请求是否成功

### Q2：为什么管理后台会有不同的 Tab（工具 / 游戏）？

为了让管理员清楚地看到不同类型的内容，管理后台区分了：
- **工具 Tab**：显示 `category IN ['效率工具', '工作流']` 的记录
- **游戏 Tab**：显示 `category IN ['小游戏']` 的记录

这样即使表中混合了工具和游戏，管理员也能有条理地管理。

### Q3：我创建的内容为什么在后台能看到但前台看不到？

**最常见的原因**：`status = 'draft'`（草稿）或 `is_active = false`（已禁用）

前台只显示已发布且激活的内容：
- ✅ 将 `status` 改为 `'published'`
- ✅ 确保 `is_active = true`

### Q4：如何在数据库里直接检查游戏数据？

```sql
-- 查看所有游戏
SELECT 
  id, name, category, type, status, is_active, 
  created_at, updated_at 
FROM tools 
WHERE type = 'game'
ORDER BY sort_order ASC;

-- 计数
SELECT COUNT(*) FROM tools WHERE type = 'game';
```

---

## 时间表

| 步骤 | 状态 | 完成时间 |
|-----|------|--------|
| 修复工具页查询条件 | ✅ 完成 | 已完成 |
| 生成数据库修复脚本 | ✅ 完成 | 已完成 |
| 执行 SQL 脚本修复游戏数据 | 🔴 待执行 | 您需要执行 |
| 验证所有页面正常显示 | 🔴 待验证 | 修复后进行 |

---

## 需要执行的 SQL 命令

**快速修复**（复制粘贴到 Supabase SQL Editor）：

```sql
-- 修复游戏数据
UPDATE tools SET category = '小游戏' WHERE type = 'game';
UPDATE tools SET is_active = true WHERE type = 'game';

-- 验证
SELECT id, name, category, type, status, is_active 
FROM tools 
WHERE type = 'game' 
ORDER BY sort_order ASC;
```

执行这两条 UPDATE 语句后，您的所有游戏数据就会显示在管理后台了！
