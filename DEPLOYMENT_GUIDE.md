# 🚀 Friday Hub 部署指南

本指南详细说明如何将 Friday Hub 项目部署到 Vercel 并配置 Supabase。

---

## 📋 目录

1. [Supabase 项目创建](#1-supabase-项目创建)
2. [Git 初始化和推送](#2-git-初始化和推送)
3. [Vercel 部署](#3-vercel-部署)
4. [环境变量配置](#4-环境变量配置)
5. [验证部署](#5-验证部署)

---

## 1. Supabase 项目创建

### 步骤 1.1：访问 Supabase 官网

- 打开 https://supabase.com
- 点击右上角 "Sign In" 或 "Start your project"
- 使用 GitHub、Google 或邮箱登录

### 步骤 1.2：创建新项目

1. 登录后进入 Dashboard
2. 点击 "New Project" 或 "Create a new project"
3. 填写项目信息：
   - **Project name**: `friday-hub` (或你想要的名称)
   - **Database password**: 设置一个强密码（保存好！）
   - **Region**: 选择离你最近的地区（如 `Singapore` 或 `us-east-1`）
4. 点击 "Create new project"，等待项目初始化（通常需要 1-2 分钟）

### 步骤 1.3：获取 API 密钥

项目创建完成后，进入项目 Dashboard：

1. **获取 Project URL**
   - 左侧菜单 → "Settings" → "API"
   - 找到 "Project URL"，复制整个 URL
   - 格式：`https://xxxxx.supabase.co`

2. **获取 Anon Key**
   - 在同一页面找到 "Project API keys"
   - 复制 "anon public" 下面的密钥
   - 这个密钥以 `eyJhbG...` 开头

3. **保存这两个值**
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGc...
   ```

### 步骤 1.4：启用认证功能（可选）

如果要使用 Supabase Auth：

1. 左侧菜单 → "Authentication"
2. 在 "Providers" 中可以配置各种登录方式（Email, Google, GitHub 等）
3. 默认 Email/Password 认证已启用

### 步骤 1.5：创建数据库表（后续添加）

后续开发中需要创建数据表时：
1. 左侧菜单 → "SQL Editor"
2. 或右上角 "New query" 写 SQL 语句创建表

---

## 2. Git 初始化和推送

### 步骤 2.1：初始化 Git 仓库

在项目根目录执行：

```bash
cd c:/Users/macheng11/Projects/AIWeb/friday-hub
git init
```

### 步骤 2.2：配置 Git 用户信息

```bash
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

### 步骤 2.3：添加所有文件到暂存区

```bash
git add .
```

### 步骤 2.4：创建首次提交

```bash
git commit -m "Initial commit: Friday Hub project setup"
```

### 步骤 2.5：在 GitHub 创建远程仓库

1. 访问 https://github.com/new
2. 填写仓库信息：
   - **Repository name**: `friday-hub`
   - **Description**: `AI Tool Aggregation Website - Friday Hub`
   - **Public/Private**: 选择 Public 或 Private
   - 其他选项保持默认
3. 点击 "Create repository"

### 步骤 2.6：关联远程仓库

GitHub 会显示仓库地址，复制 HTTPS 地址（如：`https://github.com/username/friday-hub.git`）

```bash
git remote add origin https://github.com/YOUR_USERNAME/friday-hub.git
git branch -M main
git push -u origin main
```

> 首次推送可能需要输入 GitHub 用户名和个人访问令牌。

---

## 3. Vercel 部署

### 步骤 3.1：访问 Vercel

1. 打开 https://vercel.com
2. 点击 "Sign Up" 或用 GitHub 账户登录

### 步骤 3.2：连接 GitHub 仓库

1. 登录 Vercel 后进入 Dashboard
2. 点击 "New Project" 或 "Add New..." → "Project"
3. 在 "Import Git Repository" 中搜索 `friday-hub`
4. 点击对应的仓库进行导入

### 步骤 3.3：配置项目设置

在导入页面填写：

- **Project Name**: `friday-hub`
- **Framework Preset**: 选择 "Vite"（如果没有自动检测）
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

都配置好后，点击 "Deploy"（还不要部署，先配置环境变量）

### 步骤 3.4：先不部署，回到项目设置

如果已经部署：
1. 进入 Vercel 项目 Dashboard
2. 点击 "Settings" 标签
3. 左侧菜单 → "Environment Variables"

如果还没部署：
1. 在部署前的配置页面，点击 "Environment Variables"
2. 添加两个环境变量（见下一步）

---

## 4. 环境变量配置

### 步骤 4.1：添加环境变量

在 Vercel 的 "Environment Variables" 页面：

1. **添加第一个变量**
   - **Name**: `VITE_SUPABASE_URL`
   - **Value**: `https://xxxxx.supabase.co`（从 Supabase 复制）
   - 点击 "Add"

2. **添加第二个变量**
   - **Name**: `VITE_SUPABASE_ANON_KEY`
   - **Value**: `eyJhbGc...`（从 Supabase 复制）
   - 点击 "Add"

3. **选择环境**
   - 两个变量都应该对 "Production" 和 "Preview" 生效
   - 保持默认即可

### 步骤 4.2：保存并重新部署

1. 环境变量添加完成后
2. 回到 "Deployments" 标签
3. 点击最新的 Deployment，选择 "Redeploy"
4. 或者推送新的 Git commit 会自动触发重新部署

---

## 5. 验证部署

### 步骤 5.1：访问部署的网站

1. 在 Vercel Dashboard 中复制 Production URL
   - 格式：`https://friday-hub-xxxxx.vercel.app`
2. 在浏览器访问这个 URL

### 步骤 5.2：检查功能

- ✅ 页面正常加载
- ✅ 导航栏和页脚正确显示
- ✅ 点击导航链接能正常切换页面
- ✅ 控制台（F12）没有红色错误信息

### 步骤 5.3：检查环境变量

在浏览器控制台（F12）执行：

```javascript
// 这样不会直接暴露，但能验证环境变量是否存在
console.log(import.meta.env.VITE_SUPABASE_URL ? '✓ Supabase URL 已配置' : '✗ 未配置')
```

---

## 🔄 后续开发流程

每次本地开发完成后：

```bash
# 1. 查看改动
git status

# 2. 添加改动
git add .

# 3. 提交改动
git commit -m "Feature: 描述你做了什么"

# 4. 推送到 GitHub
git push

# Vercel 会自动检测到新的 push，自动部署
```

---

## 🐛 常见问题

### Q1: 部署后页面显示 404 错误

**原因**: React Router 路由没有正确处理

**解决**: 
- 检查 `vercel.json` 中的 `rewrites` 配置是否正确
- 确保所有路由都指向 `/index.html`
- 本项目已配置，应该没有这个问题

### Q2: 环境变量没有加载

**原因**: 环境变量配置不完整或部署时没有重新部署

**解决**:
- 再次确认环境变量已添加到 Vercel
- 点击 "Redeploy" 重新部署
- 检查 `import.meta.env` 是否正确

### Q3: Supabase 连接失败

**原因**: URL 或 Key 复制错误，或网络问题

**解决**:
- 再次从 Supabase Dashboard 复制 URL 和 Key
- 检查 `.env.local` 文件是否正确（本地测试）
- 确认 Supabase 项目状态正常

### Q4: Git push 时提示权限错误

**原因**: 没有配置 SSH 密钥或个人访问令牌

**解决**:
- 方法1（推荐）: 使用个人访问令牌（PAT）
  - GitHub Settings → Developer settings → Personal access tokens
  - 生成新的 token，赋予 `repo` 权限
  - 用 token 替代密码进行 push

- 方法2: 配置 SSH 密钥
  - 生成 SSH 密钥：`ssh-keygen -t ed25519`
  - 添加到 GitHub Settings → SSH and GPG keys
  - 修改远程 URL：`git remote set-url origin git@github.com:username/friday-hub.git`

---

## 📚 相关链接

- Vercel 官网：https://vercel.com
- Supabase 官网：https://supabase.com
- Vite 文档：https://vitejs.dev
- React Router 文档：https://reactrouter.com
- GitHub 文档：https://docs.github.com

---

**完成以上所有步骤后，你的 Friday Hub 项目就会持续部署在 Vercel 上了！🎉**
