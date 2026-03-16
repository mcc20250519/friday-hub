import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/store/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Eye, EyeOff, Loader2, Mail, ArrowRight, CheckCircle } from 'lucide-react'

export default function Register() {
  const navigate = useNavigate()
  const { signUp } = useAuth()

  // 表单状态
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  })

  // 错误状态
  const [errors, setErrors] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    general: '',
  })

  // 加载状态
  const [loading, setLoading] = useState(false)

  // 密码显示状态
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // 注册成功状态
  const [isRegistered, setIsRegistered] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')

  // 表单验证
  const validateForm = () => {
    const newErrors = { email: '', password: '', confirmPassword: '', general: '' }
    let isValid = true

    // 邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!formData.email) {
      newErrors.email = '请输入邮箱地址'
      isValid = false
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = '请输入有效的邮箱地址'
      isValid = false
    }

    // 密码长度验证
    if (!formData.password) {
      newErrors.password = '请输入密码'
      isValid = false
    } else if (formData.password.length < 8) {
      newErrors.password = '密码长度至少为8位'
      isValid = false
    }

    // 确认密码验证
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = '请确认密码'
      isValid = false
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '两次输入的密码不一致'
      isValid = false
    }

    setErrors(newErrors)
    return isValid
  }

  // 处理输入变化
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // 清除对应字段的错误
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  // 处理注册提交
  const handleSubmit = async (e) => {
    e.preventDefault()

    // 重置错误
    setErrors({ email: '', password: '', confirmPassword: '', general: '' })

    // 表单验证
    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      await signUp(formData.email, formData.password, {
        emailRedirectTo: `${window.location.origin}/verify-email`,
      })

      // 注册成功，显示验证提示
      setIsRegistered(true)
      setRegisteredEmail(formData.email)
    } catch (error) {
      console.error('注册失败:', error)

      // 处理常见错误
      let errorMessage = '注册失败，请稍后重试'
      const errorStr = (error.message || '').toLowerCase()

      // 检查邮箱是否已被注册
      if (errorStr.includes('already registered') ||
          errorStr.includes('user already registered') ||
          errorStr.includes('already exists') ||
          errorStr.includes('duplicate') ||
          errorStr.includes('unique') ||
          errorStr.includes('user_already_exists')) {
        errorMessage = '该邮箱已被注册，请使用其他邮箱或直接登录'
        setErrors((prev) => ({ ...prev, email: errorMessage }))
      } else if (errorStr.includes('password')) {
        errorMessage = '密码不符合要求，请检查密码设置'
        setErrors((prev) => ({ ...prev, password: errorMessage }))
      } else if (errorStr.includes('email')) {
        errorMessage = '邮箱格式不正确，请检查邮箱地址'
        setErrors((prev) => ({ ...prev, email: errorMessage }))
      } else {
        setErrors((prev) => ({ ...prev, general: errorMessage }))
      }
    } finally {
      setLoading(false)
    }
  }

  // 注册成功后的验证提示页面
  if (isRegistered) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
        {/* Logo */}
        <Link
          to="/"
          className="mb-8 text-2xl font-bold text-gray-900 hover:text-purple-600 transition-colors"
        >
          Friday Hub
        </Link>

        {/* 验证提示卡片 */}
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="pt-8 pb-8 text-center">
            {/* 成功图标 */}
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>

            {/* 标题 */}
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              验证邮件已发送
            </h2>

            {/* 描述 */}
            <p className="text-gray-600 mb-6">
              我们已向您的邮箱发送了验证链接，请查收并完成验证
            </p>

            {/* 邮箱地址显示 */}
            <div className="flex items-center justify-center gap-2 bg-gray-100 rounded-lg px-4 py-3 mb-6">
              <Mail className="h-5 w-5 text-gray-500" />
              <span className="text-gray-700 font-medium">{registeredEmail}</span>
            </div>

            {/* 提示信息 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-blue-700">
                <strong>提示：</strong> 验证邮件可能会被归类到垃圾邮件文件夹，如果收件箱中没有找到，请检查垃圾邮件。
              </p>
            </div>

            {/* 操作按钮 */}
            <div className="space-y-3">
              <Button
                onClick={() => navigate('/login')}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                前往登录
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="w-full"
              >
                返回注册
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 注册表单页面
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <Link
        to="/"
        className="mb-8 text-2xl font-bold text-gray-900 hover:text-purple-600 transition-colors"
      >
        Friday Hub
      </Link>

      {/* 注册卡片 */}
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            创建账号
          </CardTitle>
          <CardDescription className="text-center text-gray-500">
            填写以下信息完成注册
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
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                密码
              </label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="请输入密码（至少8位）"
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

            {/* 确认密码输入框 */}
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                确认密码
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="请再次输入密码"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={loading}
                  className={errors.confirmPassword ? 'border-red-500 focus-visible:ring-red-500 pr-10' : 'pr-10'}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-red-500">{errors.confirmPassword}</p>
              )}
            </div>

            {/* 注册按钮 */}
            <Button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  注册中...
                </>
              ) : (
                '注册'
              )}
            </Button>
          </form>

          {/* 底部链接 */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              已有账号？{' '}
              <Link
                to="/login"
                className="font-medium text-purple-600 hover:text-purple-500 transition-colors"
              >
                立即登录
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
