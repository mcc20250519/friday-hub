# Friday Hub 开发指南

## 目录

1. [项目概述](#1-项目概述)
2. [技术栈](#2-技术栈)
3. [项目结构](#3-项目结构)
4. [核心功能模块](#4-核心功能模块)
5. [页面路由](#5-页面路由)
6. [数据库概览](#6-数据库概览)
7. [开发环境配置](#7-开发环境配置)
8. [开发规范](#8-开发规范)
9. [部署指南](#9-部署指南)
10. [常见问题](#10-常见问题)

---

## 1. 项目概述

### 1.1 项目简介

**Friday Hub** 是一个 AI 工具集成站，旨在收集和展示各类 AI 效率工具、工作流模板和聚会小游戏。项目名称来源于"Friday"（周五），寓意在周末前提升工作效率，享受生活。

### 1.2 核心功能

| 功能模块 | 描述 |
|---------|------|
| **工具库** | 展示和分发各类 AI 效率工具、Chrome 插件等 |
| **工作流** | n8n 等工作流模板的分享与下载 |
| **小游戏** | 在线多人聚会游戏（目前有 UNO） |
| **用户系统** | 注册登录、个人中心、收藏功能 |
| **评论系统** | 工具评论区、首页留言板 |
| **后台管理** | 工具管理、数据统计 |

### 1.3 用户角色

| 角色 | 权限 |
|------|------|
| **游客** | 浏览工具、玩游戏、查看评论 |
| **注册用户** | 收藏工具、记录下载、发表评论 |
| **管理员** | 管理工具、查看统计数据 |

---

## 2. 技术栈

### 2.1 前端技术

| 类别 | 技术 | 版本 |
|------|------|------|
| 框架 | React | 18.x |
| 构建工具 | Vite | 5.x |
| 路由 | React Router | 6.x |
| 状态管理 | React Context + Hooks | - |
| 样式 | TailwindCSS | 3.x |
| UI 组件 | shadcn/ui | - |
| 图标 | Lucide React | - |

### 2.2 后端服务

| 服务 | 用途 |
|------|------|
| Supabase | 数据库、认证、实时订阅、存储 |
| PostgreSQL | 关系型数据库 |
| Supabase Auth | 用户认证 |
| Supabase Realtime | 实时数据同步 |
| Supabase Storage | 文件存储 |

### 2.3 部署平台

- **Netlify**（推荐）
- **Vercel**
- **Cloudflare Pages**

---

## 3. 项目结构

```
friday-hub/
├── database/                    # 数据库相关文件
│   └── sql/
│       ├── core/               # 核心表结构
│       │   ├── create_comments_table.sql
│       │   ├── create_comment_likes_table.sql
│       │   ├── add_nickname_column.sql
│       │   ├── setup_favorites_downloads.sql
│       │   ├── cleanup_tools.sql
│       │   └── create_storage_bucket.sql
│       ├── uno/                # UNO 游戏相关
│       │   ├── uno_database_setup.sql
│       │   ├── uno_game_mode_patch.sql
│       │   └── ...
│       ├── patches/            # 修复补丁
│       │   ├── fix_profile_update.sql
│       │   ├── fix_rls_policy.sql
│       │   └── ...
│       └── migrations/         # 数据迁移
│           ├── 001_add_opening_data_to_uno_game_state.sql
│           └── 002_add_uno_window_fields.sql
│
├── docs/                        # 文档目录
│   ├── DEVELOPMENT_GUIDE.md    # 开发指南（本文档）
│   ├── DATABASE_GUIDE.md       # 数据库文档
│   ├── UNO_DEVELOPMENT_GUIDE.md # UNO 游戏开发文档
│   ├── DEPLOYMENT_GUIDE.md     # 部署指南
│   └── CLOUDFLARE_DEPLOYMENT.md
│
├── public/                      # 静态资源
│   ├── robots.txt
│   ├── vite.svg
│   └── _redirects
│
├── src/                         # 源代码
│   ├── components/             # UI 组件
│   │   ├── common/             # 通用组件
│   │   │   ├── Comments.jsx    # 评论组件
│   │   │   ├── ErrorBoundary.jsx
│   │   │   ├── LoadingSpinner.jsx
│   │   │   ├── PageMeta.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   ├── layout/             # 布局组件
│   │   │   ├── Footer.jsx
│   │   │   ├── Layout.jsx
│   │   │   └── Navbar.jsx
│   │   ├── ui/                 # 基础 UI（shadcn/ui）
│   │   │   ├── button.jsx
│   │   │   ├── card.jsx
│   │   │   └── ...
│   │   └── uno/                # UNO 游戏组件
│   │       ├── game/           # 游戏进行中组件
│   │       ├── lobby/          # 大厅组件
│   │       └── shared/         # 共享组件
│   │
│   ├── hooks/                  # 自定义 Hooks
│   │   ├── uno/                # UNO 游戏 Hooks
│   │   │   ├── useAnimationEngine.js
│   │   │   ├── useUnoActions.js
│   │   │   ├── useUnoBot.js
│   │   │   ├── useUnoGameState.js
│   │   │   ├── useUnoInvite.js
│   │   │   └── useUnoRoom.js
│   │   ├── useDownload.js      # 文件下载
│   │   ├── useFavorite.js      # 收藏功能
│   │   └── useToast.js         # 全局通知
│   │
│   ├── lib/                    # 工具库
│   │   ├── aiClient.js         # AI 客户端
│   │   ├── supabase.js         # Supabase 客户端
│   │   ├── utils.js            # 通用工具函数
│   │   └── uno/                # UNO 核心逻辑
│   │       ├── animation/      # 动画主题
│   │       ├── bot.js          # 机器人 AI
│   │       ├── constants.js    # 常量
│   │       ├── deck.js         # 牌组
│   │       ├── rules.js        # 规则引擎
│   │       ├── scoring.js      # 计分系统
│   │       └── ...
│   │
│   ├── pages/                  # 页面组件
│   │   ├── Home.jsx            # 首页
│   │   ├── Tools.jsx           # 工具列表
│   │   ├── ToolDetail.jsx      # 工具详情
│   │   ├── Games.jsx           # 游戏列表
│   │   ├── PartyGame.jsx       # 聚会游戏介绍
│   │   ├── games/              # 游戏页面
│   │   │   └── UnoGame.jsx     # UNO 游戏
│   │   ├── tools/              # 工具页面
│   │   │   ├── JsonFormatter.jsx
│   │   │   └── ExtensionGenerator.jsx
│   │   ├── Profile.jsx         # 个人中心
│   │   ├── AdminTools.jsx      # 后台管理
│   │   ├── Login.jsx           # 登录
│   │   ├── Register.jsx        # 注册
│   │   ├── ForgotPassword.jsx  # 忘记密码
│   │   ├── About.jsx           # 关于页面
│   │   └── NotFound.jsx        # 404 页面
│   │
│   ├── store/                  # 全局状态
│   │   └── AuthContext.jsx     # 认证上下文
│   │
│   ├── App.jsx                 # 根组件
│   ├── main.jsx                # 入口文件
│   └── index.css               # 全局样式
│
├── dist/                        # 构建输出
├── package.json
├── vite.config.js
├── tailwind.config.js
├── jsconfig.json
├── eslint.config.js
├── netlify.toml
├── vercel.json
└── README.md
```

---

## 4. 核心功能模块

### 4.1 用户系统

**文件位置**：`src/store/AuthContext.jsx`

提供全局认证状态管理：

```jsx
import { useAuth } from '@/store/AuthContext'

const { user, profile, loading, signIn, signUp, signOut } = useAuth()
```

**功能**：
- 登录/注册/登出
- 用户资料管理
- 密码找回
- Session 持久化

### 4.2 工具系统

**文件位置**：`src/pages/Tools.jsx`, `src/pages/ToolDetail.jsx`

**数据表**：`tools`

**功能**：
- 工具列表展示（分类、搜索）
- 工具详情页
- 收藏功能（`useFavorite`）
- 下载记录（`useDownload`）

### 4.3 评论系统

**文件位置**：`src/components/common/Comments.jsx`

**数据表**：`comments`, `comment_likes`

**功能**：
- 发表评论
- 回复评论
- 点赞评论
- 删除自己的评论

### 4.4 UNO 游戏

详细文档请参阅 [UNO_DEVELOPMENT_GUIDE.md](./UNO_DEVELOPMENT_GUIDE.md)

**核心文件**：
- 入口页面：`src/pages/games/UnoGame.jsx`
- 游戏主板：`src/components/uno/game/GameBoard.jsx`
- 规则引擎：`src/lib/uno/rules.js`
- 状态管理：`src/hooks/uno/useUnoGameState.js`
- 操作接口：`src/hooks/uno/useUnoActions.js`

---

## 5. 页面路由

| 路径 | 页面 | 权限 |
|------|------|------|
| `/` | 首页 | 公开 |
| `/tools` | 工具列表 | 公开 |
| `/tools/:id` | 工具详情 | 公开 |
| `/games` | 游戏列表 | 公开 |
| `/games/party` | 聚会游戏介绍 | 公开 |
| `/games/uno` | UNO 游戏入口 | 公开 |
| `/games/uno/room/:roomCode` | UNO 游戏房间 | 公开 |
| `/about` | 关于页面 | 公开 |
| `/login` | 登录 | 公开 |
| `/register` | 注册 | 公开 |
| `/forgot-password` | 忘记密码 | 公开 |
| `/profile` | 个人中心 | **需登录** |
| `/admin/tools` | 后台工具管理 | **需登录** |

---

## 6. 数据库概览

详细文档请参阅 [DATABASE_GUIDE.md](./DATABASE_GUIDE.md)

### 6.1 核心表

| 表名 | 用途 |
|------|------|
| `profiles` | 用户资料 |
| `tools` | 工具列表 |
| `favorites` | 用户收藏 |
| `download_records` | 下载记录 |
| `comments` | 评论 |
| `comment_likes` | 评论点赞 |

### 6.2 UNO 游戏表

| 表名 | 用途 |
|------|------|
| `uno_rooms` | 游戏房间 |
| `uno_players` | 房间玩家 |
| `uno_game_state` | 游戏状态 |
| `uno_actions` | 操作日志 |

---

## 7. 开发环境配置

### 7.1 环境要求

- Node.js >= 18.x
- npm >= 9.x 或 pnpm >= 8.x

### 7.2 安装步骤

```bash
# 1. 克隆项目
git clone <repo-url>
cd friday-hub

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env.local
```

### 7.3 环境变量

创建 `.env.local` 文件：

```env
# Supabase 配置
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 7.4 数据库初始化

在 Supabase SQL Editor 中按顺序执行：

1. **核心表**（`database/sql/core/`）
   - `create_comments_table.sql`
   - `create_comment_likes_table.sql`
   - `setup_favorites_downloads.sql`
   - `add_nickname_column.sql`

2. **UNO 游戏**（`database/sql/uno/`）
   - `uno_database_setup.sql`
   - 其他 patch 文件（按需执行）

3. **迁移文件**（`database/sql/migrations/`）
   - 按编号顺序执行

### 7.5 开发命令

```bash
# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview

# 代码检查
npm run lint
```

---

## 8. 开发规范

### 8.1 代码风格

- 使用 ESLint 进行代码检查
- 使用 Prettier 进行代码格式化
- 组件使用 PascalCase 命名
- 函数使用 camelCase 命名
- 常量使用 UPPER_SNAKE_CASE 命名

### 8.2 组件规范

```jsx
/**
 * 组件说明
 * 
 * @param {Object} props
 * @param {string} props.title - 标题
 * @param {Function} props.onClick - 点击回调
 */
export default function MyComponent({ title, onClick }) {
  // 1. Hooks 声明
  const [state, setState] = useState(null)
  
  // 2. 派生状态
  const derivedValue = useMemo(() => compute(state), [state])
  
  // 3. 回调函数
  const handleClick = useCallback(() => {
    onClick?.()
  }, [onClick])
  
  // 4. 副作用
  useEffect(() => {
    // ...
  }, [])
  
  // 5. 渲染
  return (
    <div onClick={handleClick}>
      {title}
    </div>
  )
}
```

### 8.3 文件命名

| 类型 | 命名规则 | 示例 |
|------|---------|------|
| 组件 | PascalCase | `GameBoard.jsx` |
| Hook | camelCase + use 前缀 | `useUnoGameState.js` |
| 工具函数 | camelCase | `utils.js` |
| 常量 | camelCase | `constants.js` |
| SQL 文件 | snake_case | `create_comments_table.sql` |

### 8.4 注释规范

```javascript
/**
 * 函数说明
 * 
 * @param {string} param1 - 参数1说明
 * @param {Object} param2 - 参数2说明
 * @param {number} param2.count - 数量
 * @returns {Promise<Object>} 返回值说明
 */
export async function myFunction(param1, param2) {
  // ...
}
```

---

## 9. 部署指南

### 9.1 Netlify 部署

1. 连接 GitHub 仓库
2. 构建命令：`npm run build`
3. 发布目录：`dist`
4. 设置环境变量

详细文档：[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

### 9.2 Vercel 部署

```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署
vercel
```

### 9.3 环境变量配置

在部署平台设置以下环境变量：

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## 10. 常见问题

### Q1: 登录后刷新页面丢失登录状态？

**原因**：Supabase Session 未正确持久化

**解决方案**：
- 检查 `AuthContext.jsx` 中的 `onAuthStateChange` 配置
- 确保 localStorage 未被清除

### Q2: 实时订阅不生效？

**原因**：未在 Supabase Dashboard 中启用 Realtime

**解决方案**：
1. 进入 Supabase Dashboard → Database → Replication
2. 将需要的表添加到 `supabase_realtime` publication

### Q3: RLS 策略导致数据无法读取？

**原因**：Row Level Security 策略配置不正确

**解决方案**：
1. 检查表的 RLS 策略
2. 确保用户已登录且有正确的权限
3. 参考 `database/sql/patches/fix_rls_policy.sql`

### Q4: 构建后路由 404？

**原因**：SPA 路由需要服务器配置重定向

**解决方案**：
- Netlify：确保 `public/_redirects` 文件存在，内容为 `/* /index.html 200`
- Vercel：确保 `vercel.json` 配置正确

---

## 附录：快速参考

### 常用命令

```bash
# 开发
npm run dev

# 构建
npm run build

# 检查依赖更新
npm outdated

# 更新依赖
npm update
```

### 重要文件速查

| 用途 | 文件路径 |
|------|----------|
| 应用入口 | `src/main.jsx` |
| 路由配置 | `src/App.jsx` |
| 认证上下文 | `src/store/AuthContext.jsx` |
| Supabase 客户端 | `src/lib/supabase.js` |
| 全局样式 | `src/index.css` |
| Tailwind 配置 | `tailwind.config.js` |
| Vite 配置 | `vite.config.js` |

### 相关文档

- [数据库文档](./DATABASE_GUIDE.md)
- [UNO 游戏开发文档](./UNO_DEVELOPMENT_GUIDE.md)
- [部署指南](./DEPLOYMENT_GUIDE.md)
