import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/store/AuthContext'
import Layout from '@/components/layout/Layout'
import ProtectedRoute from '@/components/common/ProtectedRoute'
import ErrorBoundary from '@/components/common/ErrorBoundary'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/toaster'

// 页面组件
import Home from '@/pages/Home'
import Tools from '@/pages/tools/Tools'
import ToolDetail from '@/pages/tools/ToolDetail'
import Games from '@/pages/games/Games'
import PartyGame from '@/pages/games/PartyGame'
import UnoGame from '@/pages/games/UnoGame'
import DrawAndGuessGame from '@/pages/games/DrawAndGuessGame'
import Profile from '@/pages/Profile'
import Login from '@/pages/auth/Login'
import Register from '@/pages/auth/Register'
import VerifyEmail from '@/pages/auth/VerifyEmail'
import ForgotPassword from '@/pages/auth/ForgotPassword'
import About from '@/pages/About'
import NotFound from '@/pages/NotFound'
import AdminTools from '@/pages/admin/AdminTools'
import CardManagement from '@/pages/admin/CardManagement'
import AdminDashboard from '@/pages/admin/AdminDashboard'

/**
 * 根组件
 * 使用 ErrorBoundary 包裹整个应用，防止错误导致白屏
 */
export default function App() {
  return (
    <ErrorBoundary>
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
              <Route path="/games/uno" element={<UnoGame />} />
              <Route path="/games/uno/room/:roomCode" element={<UnoGame />} />
              <Route path="/games/draw-and-guess" element={<DrawAndGuessGame />} />
              <Route path="/games/draw-and-guess/room/:roomCode" element={<DrawAndGuessGame />} />
              <Route path="/about" element={<About />} />

              {/* 认证相关路由 */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />

              {/* 受保护路由 - 需要登录 */}
              <Route element={<ProtectedRoute />}>
                <Route path="/profile" element={<Profile />} />
                {/* 新统一管理后台 */}
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/cards" element={<AdminDashboard />} />
                <Route path="/admin/content" element={<AdminDashboard />} />
                {/* 兼容旧路由 */}
                <Route path="/admin/tools" element={<AdminTools />} />
              </Route>
            </Route>

            {/* 404 页面 - 所有未匹配的路由 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}
