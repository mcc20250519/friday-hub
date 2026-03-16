# 邮箱验证链接配置指南

## 问题描述
邮箱验证链接中包含 `localhost`，不符合生产环境要求。

## 解决方案

### 1. 代码修改（已完成）
已在以下文件中进行了修改：

- **`src/pages/Register.jsx`**: 添加了 `emailRedirectTo` 参数，指向 `/verify-email` 页面
- **`src/pages/VerifyEmail.jsx`**: 新增页面，用于处理邮箱验证链接的回调
- **`src/App.jsx`**: 添加了 `/verify-email` 路由

### 2. Supabase 控制面板配置（必须手动完成）

邮件中的验证链接是由 Supabase 生成的。要让 Supabase 使用正确的域名（而不是 localhost），需要配置 "Site URL"。

#### 步骤：

1. **登录 Supabase 控制面板**
   - 访问 https://supabase.com/dashboard

2. **选择你的项目**
   - 找到 Friday Hub 项目

3. **进入 Authentication 设置**
   - 左侧菜单: `Authentication` → `Providers` → `Email`
   - 或直接进入 `Settings` → `Authentication`

4. **配置 Site URL**
   - 在 Authentication 设置页面，找到 "Site URL" 或 "Redirect URLs" 部分
   - 设置为你的生产域名，例如：
     - 开发环境：`http://localhost:5173`
     - 生产环境：`https://your-domain.com`
     - Vercel 部署：`https://your-vercel-project.vercel.app`

5. **配置邮件模板（可选）**
   - 如果需要自定义邮件内容，可以在 "Email Templates" 中配置
   - 但通常使用默认模板即可，只要 Site URL 正确，链接就会正确

6. **保存配置**

### 3. 邮件验证流程

用户注册后的流程：

1. 用户在 `/register` 页面注册
2. 系统发送验证邮件到用户邮箱
   - 验证链接格式：`https://your-domain.com/verify-email#access_token=...&token_type=...&type=email`
3. 用户点击邮件中的链接
4. 页面跳转到 `/verify-email`
5. `VerifyEmail.jsx` 处理链接中的 token，验证用户邮箱
6. 验证成功后，自动跳转到 `/login` 页面

### 4. 环境变量配置

确保 `.env.production` 中已配置 Supabase 的 URL 和 Key：

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 5. 本地测试

如果需要在本地环境测试邮箱验证：

1. 在 Supabase 控制面板中，将 `http://localhost:5173` 添加到允许的重定向 URLs
2. 运行本地开发服务器：`npm run dev`
3. 注册账号，查看发送的邮件中的链接是否为 `localhost`

### 常见问题

**Q: 为什么邮件中的链接仍然是 localhost？**
A: 检查 Supabase 控制面板中的 "Site URL" 配置是否正确。可能需要等待配置生效（通常几分钟）。

**Q: 如何调试邮件验证过程？**
A: 
- 在 Supabase 控制面板的 "Auth" 部分查看 "Users" 列表，检查用户的 `email_confirmed_at` 字段
- 在浏览器开发者工具中查看 `/verify-email` 页面的控制台日志
- 检查 Supabase 的邮件日志（如果启用了日志记录）

**Q: 生产环境和开发环境如何使用不同的重定向 URL？**
A: Supabase 允许配置多个重定向 URLs，使用逗号或换行符分隔。例如：
```
http://localhost:5173
https://your-production-domain.com
https://your-vercel-project.vercel.app
```

---

**相关文件：**
- `src/pages/Register.jsx` - 注册页面，发送验证邮件
- `src/pages/VerifyEmail.jsx` - 处理验证链接回调
- `src/store/AuthContext.jsx` - 认证上下文，包含 signUp 方法
- `.env.production` - 生产环境配置
