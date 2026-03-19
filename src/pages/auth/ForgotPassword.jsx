import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, Mail, ArrowLeft, CheckCircle, Clock } from 'lucide-react'
import BackButton from '@/components/common/BackButton'

export default function ForgotPassword() {
  // 表单状态
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  // 加载状态
  const [loading, setLoading] = useState(false)

  // 成功状态
  const [isSuccess, setIsSuccess] = useState(false)
  const [sentEmail, setSentEmail] = useState('')

  // 倒计时状态
  const [countdown, setCountdown] = useState(60)
  const [canResend, setCanResend] = useState(false)

  // 倒计时逻辑
  useEffect(() => {
    if (isSuccess && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (countdown === 0) {
      setCanResend(true)
    }
  }, [isSuccess, countdown])

  // 处理输入变化
  const handleChange = (e) => {
    setEmail(e.target.value)
    if (error) setError('')
  }

  // 发送重置邮件
  const handleSubmit = async (e) => {
    e.preventDefault()

    // 验证邮箱
    if (!email) {
      setError('请输入邮箱地址')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('请输入有效的邮箱地址')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (resetError) throw resetError

      // 发送成功
      setIsSuccess(true)
      setSentEmail(email)
      setCountdown(60)
      setCanResend(false)
    } catch (err) {
      console.error('发送重置邮件失败:', err)
      setError('发送失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  // 重新发送
  const handleResend = async () => {
    if (!canResend) return

    setLoading(true)

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(sentEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (resetError) throw resetError

      // 重置倒计时
      setCountdown(60)
      setCanResend(false)
    } catch (err) {
      console.error('重新发送失败:', err)
      setError('发送失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  // 成功后的页面
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
        {/* Logo */}
        <Link
          to="/"
          className="mb-8 text-2xl font-bold text-gray-900 hover:text-purple-600 transition-colors"
        >
          Friday Hub
        </Link>

        {/* 成功卡片 */}
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="pt-8 pb-8 text-center">
            {/* 成功图标 */}
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>

            {/* 标题 */}
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              重置邮件已发送
            </h2>

            {/* 描述 */}
            <p className="text-gray-600 mb-6">
              重置密码链接已发送到您的邮箱
            </p>

            {/* 邮箱地址显示 */}
            <div className="flex items-center justify-center gap-2 bg-gray-100 rounded-lg px-4 py-3 mb-6">
              <Mail className="h-5 w-5 text-gray-500" />
              <span className="text-gray-700 font-medium">{sentEmail}</span>
            </div>

            {/* 提示信息 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-blue-700">
                请检查收件箱（包括垃圾邮件文件夹），点击邮件中的链接重置密码。
              </p>
            </div>

            {/* 重新发送按钮 */}
            <div className="space-y-3">
              <Button
                onClick={handleResend}
                disabled={!canResend || loading}
                variant="outline"
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    发送中...
                  </>
                ) : canResend ? (
                  '重新发送'
                ) : (
                  <>
                    <Clock className="mr-2 h-4 w-4" />
                    {countdown} 秒后重新发送
                  </>
                )}
              </Button>

              <Button
                onClick={() => setIsSuccess(false)}
                variant="ghost"
                className="w-full"
              >
                使用其他邮箱
              </Button>
            </div>

            {/* 返回登录 */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <BackButton
                to="/login"
                variant="link"
                className="inline-flex items-center text-sm text-purple-600 hover:text-purple-500 transition-colors"
              >
                返回登录
              </BackButton>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 表单页面
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <Link
        to="/"
        className="mb-8 text-2xl font-bold text-gray-900 hover:text-purple-600 transition-colors"
      >
        Friday Hub
      </Link>

      {/* 找回密码卡片 */}
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            找回密码
          </CardTitle>
          <CardDescription className="text-center text-gray-500">
            输入您的注册邮箱，我们将发送重置密码链接
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* 错误提示 */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600 text-center">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 邮箱输入框 */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                邮箱地址
              </label>
              <div className="relative">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="请输入注册邮箱"
                  value={email}
                  onChange={handleChange}
                  disabled={loading}
                  className={error ? 'border-red-500 focus-visible:ring-red-500 pl-10' : 'pl-10'}
                />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
            </div>

            {/* 发送按钮 */}
            <Button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  发送中...
                </>
              ) : (
                '发送重置邮件'
              )}
            </Button>
          </form>

          {/* 返回登录 */}
          <div className="mt-6 text-center">
            <BackButton
              to="/login"
              variant="link"
              className="inline-flex items-center text-sm text-purple-600 hover:text-purple-500 transition-colors"
            >
              返回登录
            </BackButton>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
