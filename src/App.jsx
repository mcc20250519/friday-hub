import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/store/AuthContext'
import Layout from '@/components/layout/Layout'
import ProtectedRoute from '@/components/common/ProtectedRoute'
import { TooltipProvider } from '@/components/ui/tooltip'

// 页面组件
import Home from '@/pages/Home'
import Tools from '@/pages/Tools'
import ToolDetail from '@/pages/ToolDetail'
import Games from '@/pages/Games'
import PartyGame from '@/pages/PartyGame'
import Profile from '@/pages/Profile'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import ForgotPassword from '@/pages/ForgotPassword'
import About from '@/pages/About'

/**
 * 根组件
 */
export default function App() {
  return (
    <AuthProvider>
      <TooltipProvider>
        <Routes>
          {/* 布局路由：包含 Navbar 和 Footer */}
          <Route element={<Layout />}>
            {/* 公开路由 */}
            <Route path="/" element={<Home />} />
            <Route path="/tools" element={<Tools />} />
            <Route path="/tools/:id" element={<ToolDetail />} />
            <Route path="/games" element={<Games />} />
            <Route path="/games/party" element={<PartyGame />} />
            <Route path="/about" element={<About />} />

            {/* 认证相关路由 */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* 受保护路由 - 需要登录 */}
            <Route element={<ProtectedRoute />}>
              <Route path="/profile" element={<Profile />} />
              {/* 其他需要登录的路由可以放在这里 */}
            </Route>
          </Route>

          {/* 404 fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  )
}
