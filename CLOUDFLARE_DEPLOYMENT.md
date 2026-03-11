# 🚀 Cloudflare Pages 部署指南

## 快速开始（5 分钟）

### 步骤 1：连接 GitHub

1. 访问 https://dash.cloudflare.com
2. 登录或创建账户
3. 选择 **"Pages"** → **"连接到 Git"**
4. 授权并选择你的 `friday-hub` 仓库
5. 点击 **"开始设置"**

### 步骤 2：配置构建设置

在"开始设置"页面中：

- **项目名称**：`friday-hub` (或自定义)
- **生产分支**：`main`
- **框架预设**：选择 **"Vite"**
- **构建命令**：`npm run build`
- **构建输出目录**：`dist`
- **根目录**：`/` (或留空)

### 步骤 3：设置环境变量

1. 点击 **"保存和部署"** 后，进入项目设置
2. 找到 **"设置"** → **"环境变量"**
3. 添加以下变量：
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```
4. 点击 **"部署"**

### 步骤 4：自动部署

- 每当你推送到 `main` 分支时，Cloudflare Pages 会自动构建和部署
- 你的网站将部署在 `https://friday-hub.pages.dev` (或自定义域名)

---

## ✅ 常见问题

### Q: 如何使用自定义域名？
1. 在 Pages 项目中找到 **"自定义域"**
2. 添加你的域名（如 `friday-hub.example.com`）
3. 按照 DNS 配置说明操作

### Q: 如何回滚到之前的版本？
1. 进入项目 → **"部署"**
2. 找到之前的部署
3. 点击 **"回滚到此版本"**

### Q: 路由不工作怎么办？
确保 `_redirects` 文件存在于 `public/` 目录中，内容为：
```
/* /index.html 200
```

### Q: 如何查看构建日志？
1. 进入项目 → **"部署"**
2. 点击具体的部署
3. 查看 **"构建日志"**

---

## 🔗 有用的链接

- Cloudflare Pages 文档：https://developers.cloudflare.com/pages/
- Vite 配置：https://vite.dev/config/
- Supabase 文档：https://supabase.com/docs

---

## 📝 总结

Cloudflare Pages 优势：
- ✅ 完全免费
- ✅ 全球 CDN，速度快
- ✅ 自动 HTTPS
- ✅ 简单易用
- ✅ Git 自动部署
- ✅ 支持环境变量
