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
      '#C8602A',
      '#2D7A6B',
      '#B86B52',
      '#5A7A5F',
      '#8B6239',
      '#6B7F84',
      '#7A6B52',
      '#6B7F8F',
    ]
    const hash = user?.email?.charCodeAt(0) || 0
    return colors[hash % colors.length]
  }

  return (
    <nav className="sticky top-0 z-50 bg-white border-b" style={{ borderColor: '#E8E3DB' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14">
          {/* 左侧：Logo */}
          <Link
            to="/"
            className="flex-shrink-0 flex items-center group"
          >
            <span className="text-lg font-bold transition-colors duration-200"
              style={{ color: '#1A1814' }}
              onMouseEnter={e => e.currentTarget.style.color = '#C8602A'}
              onMouseLeave={e => e.currentTarget.style.color = '#1A1814'}
            >
              Friday Hub
            </span>
          </Link>

          {/* 中间：导航链接（桌面版） */}
          <div className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`text-sm font-medium transition-colors duration-200 relative group ${
                  isActive(link.href)
                    ? 'text-stone-800'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
                style={{
                  color: isActive(link.href) ? '#1A1814' : 'inherit'
                }}
              >
                {link.label}
                {isActive(link.href) && (
                  <div
                    className="absolute -bottom-0.5 left-0 h-0.5 group-hover:w-full transition-all duration-200"
                    style={{ background: '#C8602A', width: '100%' }}
                  />
                )}
              </Link>
            ))}
          </div>

          {/* 右侧：认证按钮/用户菜单（桌面版） */}
          <div className="hidden md:flex items-center space-x-3">
            {loading ? (
              <div className="h-9 w-20 bg-stone-200 rounded-lg animate-pulse" />
            ) : user ? (
              // 已登录：用户菜单
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="h-8 w-8 rounded-full text-white font-semibold flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ background: getAvatarBgColor() }}
                  >
                    {getAvatarLetter()}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5 text-xs text-stone-500 truncate">
                    {user.email}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      navigate('/profile')
                    }}
                    className="cursor-pointer text-sm"
                  >
                    <User className="mr-2 h-3.5 w-3.5" />
                    <span>个人中心</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer text-sm"
                    style={{ color: '#C8602A' }}
                  >
                    <LogOut className="mr-2 h-3.5 w-3.5" />
                    <span>退出</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              // 未登录：登录按钮
              <Link
                to="/login"
                className="px-5 py-2 rounded-lg font-medium text-sm transition-all duration-200"
                style={{ background: '#1A1814', color: '#FFFFFF' }}
                onMouseEnter={e => e.currentTarget.style.background = '#2D2922'}
                onMouseLeave={e => e.currentTarget.style.background = '#1A1814'}
              >
                登录
              </Link>
            )}
          </div>

          {/* 右侧：汉堡菜单（移动端） */}
          <div className="md:hidden">
            {loading ? (
              <div className="h-9 w-9 bg-stone-200 rounded animate-pulse" />
            ) : (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-lg text-stone-600 hover:bg-stone-100 transition-colors"
                aria-label="菜单"
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* 移动端菜单 */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-3 space-y-1 border-t" style={{ borderColor: '#E8E3DB' }}>
            {/* 导航链接 */}
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                  isActive(link.href)
                    ? 'text-white'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
                style={{
                  background: isActive(link.href) ? '#1A1814' : 'transparent'
                }}
              >
                {link.label}
              </Link>
            ))}

            <div className="border-t border-stone-100 pt-2 mt-1">
              {user ? (
                <>
                  <div className="px-3 py-2 text-xs text-stone-500 truncate">
                    {user.email}
                  </div>
                  <Link
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2.5 rounded-lg text-stone-600 hover:bg-stone-100 transition-colors font-medium text-sm"
                  >
                    个人中心
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2.5 rounded-lg transition-colors font-medium text-sm"
                    style={{ color: '#C8602A' }}
                  >
                    退出
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full text-center px-3 py-2.5 rounded-lg font-medium text-sm transition-colors"
                  style={{ background: '#1A1814', color: '#FFFFFF' }}
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
