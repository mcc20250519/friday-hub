import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/store/AuthContext'
import { Loader2 } from 'lucide-react'

/**
 * 受保护的路由组件
 * - 如果 loading 为 true，显示全屏加载动画
 * - 如果未登录，跳转到 /login?redirect=当前路径
 * - 如果已登录，渲染子组件 <Outlet />
 */
export default function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

  // 如果正在加载，显示全屏加载动画
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600" />
          <p className="text-gray-600 text-sm">加载中...</p>
        </div>
      </div>
    )
  }

  // 如果未登录，跳转到登录页，并携带当前路径作为 redirect 参数
  if (!user) {
    const redirectUrl = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?redirect=${redirectUrl}`} replace />
  }

  // 已登录，渲染子路由
  return <Outlet />
}
