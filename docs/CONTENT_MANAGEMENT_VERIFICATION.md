# 文案管理系统 - 数据一致性验证指南

## 📋 系统概述

本文档描述了站点文案管理系统的实现，以及如何验证后台修改与前台展示的数据一致性。

---

## 1️⃣ 已集成的文案参数

### 首页（Home.jsx）

| Key | 默认值 | 说明 |
|-----|--------|------|
| `home_hero_title` | 把好用的 | Hero 标题 |
| `home_hero_subtitle` | 全放这里 | Hero 副标题（高亮展示） |
| `home_hero_desc` | 效率工具、工作流模板... | Hero 描述 |
| `home_featured_label` | 精选内容 | 工具精选标签 |
| `home_cta_register_title` | 注册一下，追踪更新 | 注册 CTA 标题 |
| `home_cta_register_desc` | 有新东西上线第一时间... | 注册 CTA 描述 |
| `home_footer_text` | 还有些在做的东西，快了 | 尾部通知 |
| `home_footer_desc` | 有想法也欢迎来聊... | 尾部通知描述 |

### 工具页（Tools.jsx）

| Key | 默认值 | 说明 |
|-----|--------|------|
| `tools_page_title` | 自用工具箱 | 工具页标题 |
| `tools_page_desc` | 平时真在用的那些... | 工具页描述 |

### 游戏页（Games.jsx）

| Key | 默认值 | 说明 |
|-----|--------|------|
| `games_page_title` | 随便玩玩 | 游戏页标题 |
| `games_page_desc` | 不需要注册会员... | 游戏页描述 |

---

## 2️⃣ 数据一致性验证步骤

### 📍 步骤 1: 确认数据库中有初始化的文案数据

```sql
-- 检查 site_content 表中是否有记录
SELECT * FROM site_content WHERE key LIKE 'home_%' OR key LIKE 'tools_%' OR key LIKE 'games_%';
```

**预期结果**：应该返回至少 13 条记录，对应上述所有 key。

---

### 📍 步骤 2: 在后台修改文案

1. 以管理员身份登录（邮箱需在 `ADMIN_EMAILS` 中）
2. 进入 `/profile` 页面
3. 点击"管理后台"按钮进入 `/admin`
4. 切换到"📝 页面文案"标签
5. 修改任意一条文案（例如 `home_hero_title`），改为 `测试标题 - ${Date.now()}`
6. 点击"保存"按钮

**预期行为**：
- 应显示成功提示消息
- 页面应实时更新状态
- 数据应保存到数据库

---

### 📍 步骤 3: 验证前台页面立即反映更改

**方案 A：使用缓存清除**

1. 打开浏览器开发者工具（F12）
2. 进入前台首页（`/`）
3. 如果使用了缓存，需要刷新页面
4. 验证修改后的文案是否显示

**预期结果**：首页 Hero 标题应显示修改后的文案

---

### 📍 步骤 4：跨页面验证

重复步骤 2-3，分别测试：
- `tools_page_title` → 访问 `/tools` 页面
- `games_page_title` → 访问 `/games` 页面

**预期结果**：每个页面应该显示修改后的标题

---

## 3️⃣ 性能优化与缓存策略

### 当前实现

```javascript
// 缓存配置（siteContent.ts）
const CACHE_DURATION = 5 * 60 * 1000 // 5 分钟缓存
```

### 缓存行为

- **首次加载**：从数据库获取，存入内存缓存
- **后续请求（5分钟内）**：返回缓存数据
- **后续请求（5分钟后）**：重新从数据库获取

### 后台修改后的缓存失效

在 `AdminDashboard.jsx` 的 `ContentPanel` 中：

```javascript
// 保存文案后清除缓存
await updateSiteContent(key, { value: newValue }, user.id)
clearSiteContentCache() // 立即清除缓存
```

**结果**：前台用户在缓存过期或刷新页面后会获得最新文案

---

## 4️⃣ 防抖与过度请求控制

### 后台编辑防抖

在 `ContentPanel` 的编辑表单中实现：

```javascript
// 编辑内容时的防抖处理
const handleSave = useCallback(debounce(async (key, value) => {
  // 保存逻辑
}, 500), [])
```

### 前台请求优化

```javascript
// 使用 useEffect 依赖数组，仅在组件挂载时请求一次
useEffect(() => {
  loadContent()
}, []) // 空依赖数组 = 仅执行一次
```

---

## 5️⃣ 最终检查清单

- [x] **数据库表**：`site_content` 表已创建，包含必要字段
- [x] **API 服务**：`siteContent.ts` 提供完整的 CRUD 操作
- [x] **后台管理**：`AdminDashboard.jsx` 的 `ContentPanel` 可编辑所有文案
- [x] **权限控制**：仅 `ADMIN_EMAILS` 中的用户可访问后台
- [x] **前台集成**：Home、Tools、Games 页面动态加载文案
- [x] **缓存策略**：实现 5 分钟缓存和即时失效机制
- [x] **错误处理**：所有数据加载包含 try-catch 和默认值
- [x] **响应式布局**：所有文案字段支持多行文本（`whiteSpace: 'pre-wrap'`）

---

## 6️⃣ 故障排查

### 问题：前台不显示修改后的文案

**可能原因**：
1. 浏览器缓存未清除
2. 后台修改未保存成功
3. 前台刷新前 5 分钟缓存仍有效

**解决方案**：
```javascript
// 在浏览器控制台执行
localStorage.clear()
sessionStorage.clear()
location.reload()
```

### 问题：后台修改报错"权限不足"

**可能原因**：
- 当前用户邮箱不在 `ADMIN_EMAILS` 列表中
- 用户未登录

**解决方案**：
1. 检查 `ADMIN_EMAILS` 配置
2. 确保使用了正确的管理员账号

### 问题：前台加载文案很慢

**可能原因**：
- 网络延迟
- 数据库查询慢

**解决方案**：
- 检查数据库连接
- 验证是否需要添加索引

---

## 7️⃣ 测试代码示例

### 前台测试（检查文案是否动态加载）

```javascript
// 在浏览器控制台运行
console.log('Home content:', window.__HOME_CONTENT__)
// 应该打印出所有首页文案对象
```

### 后台 API 测试

```javascript
// 使用 Supabase 客户端直接查询
import { supabase } from '@/lib/supabase'

const { data } = await supabase
  .from('site_content')
  .select('*')
  .eq('key', 'home_hero_title')

console.log(data) // 应该返回包含 value 的对象
```

---

## 📚 相关文件

- **后台管理**：`src/pages/AdminDashboard.jsx`
- **首页**：`src/pages/Home.jsx`
- **工具页**：`src/pages/Tools.jsx`
- **游戏页**：`src/pages/Games.jsx`
- **API 服务**：`src/lib/utils/siteContent.ts`
- **权限检查**：`src/hooks/useAdminCheck.js`

---

## ✅ 完成状态

所有文案管理功能已实现并集成。系统支持：
- ✅ 后台动态编辑所有页面文案
- ✅ 前台实时显示最新文案
- ✅ 缓存机制优化性能
- ✅ 权限控制限制管理员访问
- ✅ 错误处理和降级方案
