import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/store/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { signIn, user, loading: authLoading } = useAuth()

  // 获取 redirect 参数
  const redirectTo = searchParams.get('redirect') || '/'

  // 表单状态
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  // 错误状态
  const [errors, setErrors] = useState({
    email: '',
    password: '',
    general: '',
  })

  // 加载状态
  const [loading, setLoading] = useState(false)

  // 密码显示状态
  const [showPassword, setShowPassword] = useState(false)

  // 如果已登录，直接跳转
  useEffect(() => {
    if (user && !authLoading) {
      navigate(redirectTo, { replace: true })
    }
  }, [user, authLoading, navigate, redirectTo])

  // 处理输入变化
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // 清除对应字段的错误
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  // 获取友好的错误信息
  const getFriendlyError = (error) => {
    const errorMessage = error.message?.toLowerCase() || ''

    if (errorMessage.includes('invalid login credentials') || 
        errorMessage.includes('invalid credentials')) {
      return '邮箱或密码错误，请检查后重试'
    }
    
    if (errorMessage.includes('email not confirmed') || 
        errorMessage.includes('not confirmed')) {
      return '邮箱尚未验证，请检查邮箱完成验证'
    }
    
    if (errorMessage.includes('user not found') || 
        errorMessage.includes('no user')) {
      return '该邮箱尚未注册，请先注册账号'
    }
    
    if (errorMessage.includes('rate limit') || 
        errorMessage.includes('too many requests')) {
      return '登录尝试次数过多，请稍后再试'
    }
    
    if (errorMessage.includes('network') || 
        errorMessage.includes('connection')) {
      return '网络连接失败，请检查网络后重试'
    }

    return '登录失败，请稍后重试'
  }

  // 处理登录提交
  const handleSubmit = async (e) => {
    e.preventDefault()

    // 重置错误
    setErrors({ email: '', password: '', general: '' })

    // 简单验证
    const newErrors = {}
    if (!formData.email) {
      newErrors.email = '请输入邮箱地址'
    }
    if (!formData.password) {
      newErrors.password = '请输入密码'
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...newErrors }))
      return
    }

    setLoading(true)

    try {
      await signIn(formData.email, formData.password)
      
      // 登录成功，跳转到 redirect 参数指定的页面或首页
      navigate(redirectTo, { replace: true })
    } catch (error) {
      console.error('登录失败:', error)
      
      // 显示友好错误信息
      const friendlyError = getFriendlyError(error)
      setErrors((prev) => ({ ...prev, general: friendlyError }))
    } finally {
      setLoading(false)
    }
  }

  // 如果正在检查登录状态，显示加载中
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
          <span className="text-gray-600">加载中...</span>
        </div>
      </div>
    )
  }

  // 如果已登录，不显示登录页面（会被 useEffect 重定向）
  if (user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <Link
        to="/"
        className="mb-8 text-2xl font-bold text-gray-900 hover:text-purple-600 transition-colors"
      >
        Friday Hub
      </Link>

      {/* 登录卡片 */}
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            欢迎回来
          </CardTitle>
          <CardDescription className="text-center text-gray-500">
            登录以访问您的账号
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* 通用错误提示 */}
          {errors.general && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600 text-center">{errors.general}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 邮箱输入框 */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                邮箱地址
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="请输入邮箱"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
                className={errors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            {/* 密码输入框 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-gray-700">
                  密码
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-purple-600 hover:text-purple-500 transition-colors"
                >
                  忘记密码？
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="请输入密码"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                  className={errors.password ? 'border-red-500 focus-visible:ring-red-500 pr-10' : 'pr-10'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password}</p>
              )}
            </div>

            {/* 登录按钮 */}
            <Button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  登录中...
                </>
              ) : (
                '登录'
              )}
            </Button>
          </form>

          {/* 底部链接 */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              还没有账号？{' '}
              <Link
                to="/register"
                className="font-medium text-purple-600 hover:text-purple-500 transition-colors"
              >
                立即注册
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
