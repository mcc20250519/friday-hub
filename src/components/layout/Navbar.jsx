import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/store/AuthContext'
import { Menu, X, LogOut, User } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, signOut, loading } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // 导航链接
  const navLinks = [
    { label: '工具库', href: '/tools' },
    { label: '游戏广场', href: '/games' },
    { label: '关于', href: '/about' },
  ]

  // 检查当前路由是否激活
  const isActive = (href) => {
    if (href === '/') return location.pathname === '/'
    return location.pathname.startsWith(href)
  }

  // 处理登出
  const handleLogout = async () => {
    try {
      await signOut()
      navigate('/')
      setMobileMenuOpen(false)
    } catch (error) {
      console.error('登出失败:', error)
    }
  }

  // 生成用户头像（邮箱首字母）
  const getAvatarLetter = () => {
    return user?.email?.[0].toUpperCase() || 'U'
  }

  // 生成头像背景色（基于邮箱）
  const getAvatarBgColor = () => {
    const colors = [
      'bg-blue-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-green-500',
      'bg-orange-500',
      'bg-red-500',
      'bg-indigo-500',
      'bg-cyan-500',
    ]
    const hash = user?.email?.charCodeAt(0) || 0
    return colors[hash % colors.length]
  }

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* 左侧：Logo */}
          <Link
            to="/"
            className="flex-shrink-0 flex items-center group"
          >
            <span className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
              Friday Hub
            </span>
          </Link>

          {/* 中间：导航链接（桌面版） */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`transition-colors font-medium ${
                  isActive(link.href)
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* 右侧：认证按钮/用户菜单（桌面版） */}
          <div className="hidden md:flex items-center space-x-4">
            {loading ? (
              <div className="h-10 w-24 bg-gray-200 rounded-lg animate-pulse" />
            ) : user ? (
              // 已登录：用户菜单
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={`h-10 w-10 rounded-full ${getAvatarBgColor()} text-white font-semibold flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity`}>
                    {getAvatarLetter()}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5 text-sm text-gray-600 truncate">
                    {user.email}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      navigate('/profile')
                    }}
                    className="cursor-pointer"
                  >
                    <User className="mr-2 h-4 w-4" />
                    <span>个人中心</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer text-red-600 focus:text-red-600"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>退出登录</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              // 未登录：登录按钮
              <Link
                to="/login"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                登录
              </Link>
            )}
          </div>

          {/* 右侧：汉堡菜单（移动端） */}
          <div className="md:hidden">
            {loading ? (
              <div className="h-11 w-11 bg-gray-200 rounded animate-pulse" />
            ) : (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center p-2.5 rounded-md text-gray-600 hover:bg-gray-100 transition-colors min-h-[44px] min-w-[44px]"
                aria-label="菜单"
              >
                {mobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* 移动端菜单 */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 space-y-2">
            {/* 导航链接 */}
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-3 rounded-md font-medium transition-colors min-h-[44px] flex items-center ${
                  isActive(link.href)
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {link.label}
              </Link>
            ))}

            <div className="border-t border-gray-200 pt-2 mt-2">
              {user ? (
                <>
                  <div className="px-3 py-2 text-sm text-gray-600 truncate">
                    {user.email}
                  </div>
                  <Link
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-md text-gray-600 hover:bg-gray-100 transition-colors font-medium"
                  >
                    个人中心
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 rounded-md text-red-600 hover:bg-red-50 transition-colors font-medium"
                  >
                    退出登录
                  </button>
                </>
              ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center px-3 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium min-h-[44px] flex items-center justify-center"
              >
                登录
              </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
