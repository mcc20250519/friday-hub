# 🎉 Friday Hub - AI工具聚合网站

一个现代化的AI工具聚合平台，集成游戏、工具库和用户认证系统。基于 React + Vite + Tailwind CSS + Supabase 构建。

## 📋 项目概览

Friday Hub 是一个全栈AI工具聚合网站，提供：
- 🔧 AI工具库浏览和详情查看
- 🎮 游戏中心和派对游戏
- 👤 用户认证和个人资料管理
- 🔐 基于 Supabase 的后端支持

---

## 🏗️ 项目结构详解

```
friday-hub/
│
├── 📁 src/                          # 源代码目录
│   │
│   ├── 📄 App.jsx                   # 根组件，包含路由配置
│   ├── 📄 main.jsx                  # React 入口文件
│   ├── 📄 index.css                 # 全局样式（Tailwind CSS）
│   │
│   ├── 📁 lib/                      # 工具库
│   │   ├── supabase.js              # Supabase 客户端配置
│   │   └── utils.js                 # cn() 工具函数（类名合并）
│   │
│   ├── 📁 store/                    # 状态管理（Context）
│   │   └── AuthContext.jsx          # 认证上下文 + useAuth Hook
│   │
│   ├── 📁 pages/                    # 页面组件
│   │   ├── HomePage.jsx             # 首页
│   │   ├── ProfilePage.jsx          # 个人资料页（受保护）
│   │   ├── AboutPage.jsx            # 关于页面
│   │   │
│   │   ├── 📁 tools/                # 工具相关页面
│   │   │   ├── ToolsPage.jsx        # 工具列表页
│   │   │   └── ToolDetailPage.jsx   # 工具详情页（动态路由）
│   │   │
│   │   ├── 📁 games/                # 游戏相关页面
│   │   │   ├── GamesPage.jsx        # 游戏中心
│   │   │   └── PartyPage.jsx        # 派对游戏
│   │   │
│   │   └── 📁 auth/                 # 认证相关页面
│   │       ├── LoginPage.jsx        # 登录页
│   │       ├── RegisterPage.jsx     # 注册页
│   │       └── ForgotPasswordPage.jsx # 忘记密码页
│   │
│   ├── 📁 components/               # 可复用组件
│   │   ├── 📁 ui/                   # shadcn/ui 组件
│   │   │   └── (待添加)
│   │   │
│   │   └── 📁 layout/               # 布局组件
│   │       └── (Header, Footer 等)
│   │
│   ├── 📁 hooks/                    # 自定义 Hooks
│   │   └── (待添加)
│   │
│   └── 📁 assets/                   # 静态资源
│       └── react.svg
│
├── 📁 public/                       # 公共资源
│   └── vite.svg
│
├── 📄 index.html                    # HTML 入口文件
├── 📄 vite.config.js                # Vite 配置（含路径别名）
├── 📄 tailwind.config.js            # Tailwind CSS 配置
├── 📄 postcss.config.js             # PostCSS 配置
├── 📄 eslint.config.js              # ESLint 配置
├── 📄 package.json                  # 项目依赖和脚本
├── 📄 .env.local                    # 本地环境变量（不上传）
├── 📄 .env.example                  # 环境变量模板（参考）
├── 📄 .gitignore                    # Git 忽略规则
└── 📄 README.md                     # 项目文档
```

---

## 🛣️ 路由配置

所有路由定义在 `src/App.jsx` 中：

### 公开路由（无需登录）
| 路由 | 页面 | 文件 | 说明 |
|------|------|------|------|
| `/` | 首页 | `src/pages/HomePage.jsx` | 网站主页 |
| `/tools` | 工具列表 | `src/pages/tools/ToolsPage.jsx` | 浏览所有 AI 工具 |
| `/tools/:id` | 工具详情 | `src/pages/tools/ToolDetailPage.jsx` | 查看单个工具详情 |
| `/games` | 游戏中心 | `src/pages/games/GamesPage.jsx` | 游戏列表 |
| `/games/party` | 派对游戏 | `src/pages/games/PartyPage.jsx` | 多人派对游戏 |
| `/about` | 关于页面 | `src/pages/AboutPage.jsx` | 项目介绍 |
| `/login` | 登录 | `src/pages/auth/LoginPage.jsx` | 用户登录 |
| `/register` | 注册 | `src/pages/auth/RegisterPage.jsx` | 新用户注册 |
| `/forgot-password` | 忘记密码 | `src/pages/auth/ForgotPasswordPage.jsx` | 密码重置 |

### 受保护路由（需登录）
| 路由 | 页面 | 文件 | 说明 |
|------|------|------|------|
| `/profile` | 个人资料 | `src/pages/ProfilePage.jsx` | 用户个人信息（未登录跳转到 `/login`） |

---

## 🔐 认证系统详解

### AuthContext (`src/store/AuthContext.jsx`)

提供全局认证状态管理，使用 Supabase Auth。

**导出的组件和 Hook：**

```jsx
// 1. AuthProvider - 包裹应用根组件
<AuthProvider>
  <App />
</AuthProvider>

// 2. useAuth() - 自定义 Hook，获取认证信息
const { user, loading, signIn, signUp, signOut, isAuthenticated } = useAuth()
```

**useAuth() 返回对象结构：**

```javascript
{
  user: {
    id: string,              // 用户 ID
    email: string,          // 邮箱
    // ... 其他 Supabase 用户字段
  },
  loading: boolean,         // 初始化加载状态
  isAuthenticated: boolean, // 是否已登录
  
  // 认证方法
  signIn(email, password),      // 登录
  signUp(email, password, options), // 注册
  signOut(),                    // 退出登录
}
```

**使用示例：**

```jsx
import { useAuth } from '@/store/AuthContext'

export default function LoginPage() {
  const { signIn, loading } = useAuth()
  
  const handleLogin = async () => {
    try {
      await signIn('user@example.com', 'password123')
      // 登录成功，会自动更新 user 状态
    } catch (error) {
      console.error('登录失败:', error.message)
    }
  }
  
  return <button onClick={handleLogin}>登录</button>
}
```

---

## 🛠️ 核心工具库

### `src/lib/supabase.js`
初始化 Supabase 客户端，从环境变量读取配置。

**使用示例：**
```javascript
import { supabase } from '@/lib/supabase'

// 直接调用 Supabase API
const { data, error } = await supabase
  .from('tools')
  .select('*')
```

### `src/lib/utils.js`
提供 `cn()` 函数用于合并 Tailwind CSS 类名，自动处理类名冲突。

**使用示例：**
```javascript
import { cn } from '@/lib/utils'

const buttonClass = cn(
  'px-4 py-2 rounded',
  condition && 'bg-blue-500',
  condition && 'text-white'
)
```

---

## 💾 环境变量配置

### 设置步骤

1. **复制模板文件**
   ```bash
   cp .env.example .env.local
   ```

2. **填入 Supabase 凭证**
   - 访问 https://supabase.com
   - 创建项目或使用已有项目
   - 在项目 **Settings > API** 找到：
     - **Project URL** → `VITE_SUPABASE_URL`
     - **Anon public key** → `VITE_SUPABASE_ANON_KEY`

3. **最终 .env.local 示例**
   ```env
   # Supabase 配置
   VITE_SUPABASE_URL=https://xyzabc123.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   
   # 应用配置（可选）
   VITE_APP_NAME=Friday Hub
   VITE_APP_URL=http://localhost:5173
   ```

---

## 📦 依赖清单

### 生产依赖
| 包名 | 版本 | 用途 |
|-----|------|------|
| `react` | ^19.2.0 | React 框架 |
| `react-dom` | ^19.2.0 | React DOM 渲染 |
| `react-router-dom` | ^7.1.0 | 路由管理 |
| `@supabase/supabase-js` | ^2.46.3 | Supabase 客户端 |
| `clsx` | ^2.1.2 | 条件类名工具 |
| `tailwind-merge` | ^2.5.4 | 类名合并工具 |
| `class-variance-authority` | ^0.7.1 | 组件变体库 |
| `lucide-react` | ^0.469.0 | 图标库 |

### 开发依赖
| 包名 | 版本 | 用途 |
|-----|------|------|
| `vite` | ^8.0.0-beta.13 | 构建工具 |
| `@vitejs/plugin-react` | ^5.1.1 | Vite React 插件 |
| `tailwindcss` | ^4.2.1 | CSS 框架 |
| `postcss` | ^8.5.8 | CSS 处理器 |
| `autoprefixer` | ^10.4.27 | CSS 前缀工具 |
| `tailwindcss-animate` | ^1.0.7 | Tailwind 动画 |
| `eslint` | ^9.39.1 | 代码检查 |

---

## 🚀 快速开始

### 环境要求
- Node.js >= 18.x
- npm >= 9.x

### 安装和运行

```bash
# 1. 进入项目目录
cd friday-hub

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，填入 Supabase 凭证

# 4. 启动开发服务器
npm run dev

# 5. 打开浏览器
# 访问 http://localhost:5173
```

### 常用命令

```bash
# 开发
npm run dev

# 生产构建
npm run build

# 预览构建结果
npm run preview

# ESLint 检查
npm run lint
```

---

## 🎨 样式和主题

### Tailwind CSS 配置
- **配置文件**: `tailwind.config.js`
- **CSS 变量**: `src/index.css`
- **颜色系统**: 使用 HSL 色彩空间
- **深色模式**: 支持 `.dark` 类切换

### 主要颜色变量
```css
--primary:       主色
--secondary:     次级色
--destructive:   警告/删除色
--muted:         淡灰色
--accent:        强调色
--border:        边框色
```

### 使用示例
```jsx
// 使用 Tailwind 类名
<button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg">
  按钮
</button>

// 暗黑模式
<div className="dark:bg-slate-900 dark:text-white">
  内容
</div>
```

---

## 🔧 配置文件详解

### `vite.config.js`
```javascript
// 路径别名 @ 指向 src 目录
import { '@': path.resolve(__dirname, './src') }

// 使用示例
import HomePage from '@/pages/HomePage'
```

### `tailwind.config.js`
- 配置了完整的颜色系统
- 支持深色模式
- 包含动画扩展
- 支持 CSS 变量

---

## 📝 后续开发指南

### 添加新页面

1. **创建页面文件**
   ```jsx
   // src/pages/NewPage.jsx
   export default function NewPage() {
     return <div>New Page</div>
   }
   ```

2. **在 App.jsx 中添加路由**
   ```jsx
   import NewPage from '@/pages/NewPage'
   
   <Route path="/new" element={<NewPage />} />
   ```

### 添加受保护的新页面

```jsx
<Route
  path="/admin"
  element={
    <ProtectedRoute>
      <AdminPage />
    </ProtectedRoute>
  }
/>
```

### 使用 Supabase 数据库

```javascript
import { supabase } from '@/lib/supabase'

// 查询
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('status', 'active')

// 插入
await supabase.from('table_name').insert([{ name: 'test' }])

// 更新
await supabase.from('table_name').update({ name: 'new' }).eq('id', 1)

// 删除
await supabase.from('table_name').delete().eq('id', 1)
```

### 添加 shadcn/ui 组件

```bash
# 运行 shadcn 初始化（如果还没做）
npx shadcn@latest init -d

# 添加某个组件（如 Button）
npx shadcn@latest add button
```

使用组件：
```jsx
import { Button } from '@/components/ui/button'

<Button>Click me</Button>
```

---

## 🐛 常见问题

### Q: 路径别名 @ 不工作？
**A:** 检查是否：
1. 更新了 `vite.config.js` 中的别名配置
2. IDE 重新启动了 VSCode/WebStorm
3. 重新运行了 `npm run dev`

### Q: Supabase 连接失败？
**A:** 检查是否：
1. `.env.local` 中填入了正确的 URL 和 key
2. 项目是否在 https://supabase.com 上创建
3. 网络连接是否正常

### Q: 样式没有生效？
**A:** 检查是否：
1. 正确导入了 `index.css`
2. 类名是否在 `tailwind.config.js` 的 `content` 中包含
3. 是否重新启动了开发服务器

---

## 📞 联系方式

如有问题或建议，请提交 Issue 或联系项目维护者。

---

**最后更新**: 2026-03-11  
**项目状态**: 🚧 开发中
