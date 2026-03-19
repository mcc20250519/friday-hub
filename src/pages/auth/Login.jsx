import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/store/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

// 温暖色调
const WARM = {
  bg:     '#F7F6F3',
  text:   '#3D3530',
  sub:    '#8A7E77',
  accent: '#C8602A',
  border: '#E9E3DB',
  tagBg:  '#F2EDE8',
  btn:    '#3D3530',
}

export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { signIn, user, loading: authLoading } = useAuth()
  const redirectTo = searchParams.get('redirect') || '/'

  const [formData, setFormData] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({ email: '', password: '', general: '' })
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (user && !authLoading) navigate(redirectTo, { replace: true })
  }, [user, authLoading, navigate, redirectTo])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const getFriendlyError = (error) => {
    const msg = error.message?.toLowerCase() || ''
    if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) return '邮箱或密码不对，确认一下再试'
    if (msg.includes('email not confirmed') || msg.includes('not confirmed')) return '邮箱还没验证，去收件箱找一下验证邮件'
    if (msg.includes('user not found') || msg.includes('no user')) return '没找到这个账号，要不先注册一个？'
    if (msg.includes('rate limit') || msg.includes('too many requests')) return '试了太多次了，稍等几分钟'
    if (msg.includes('network') || msg.includes('connection')) return '网络有问题，检查一下连接'
    return '登录失败了，稍后再试试'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({ email: '', password: '', general: '' })

    const newErrors = {}
    if (!formData.email) newErrors.email = '邮箱不能为空'
    if (!formData.password) newErrors.password = '密码不能为空'
    if (Object.keys(newErrors).length > 0) { setErrors((prev) => ({ ...prev, ...newErrors })); return }

    setLoading(true)
    try {
      await signIn(formData.email, formData.password)
      navigate(redirectTo, { replace: true })
    } catch (error) {
      console.error('登录失败:', error)
      setErrors((prev) => ({ ...prev, general: getFriendlyError(error) }))
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: WARM.bg }}>
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: WARM.accent }} />
          <span className="text-sm" style={{ color: WARM.sub }}>正在检查登录状态…</span>
        </div>
      </div>
    )
  }

  if (user) return null

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: WARM.bg }}>

      <Link to="/" className="mb-8 text-xl font-bold transition-opacity hover:opacity-70"
        style={{ color: WARM.text }}>
        Friday Hub
      </Link>

      <Card className="w-full max-w-md border" style={{ borderColor: WARM.border, background: '#FFFFFF' }}>
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-xl font-bold text-center" style={{ color: WARM.text }}>
            欢迎回来
          </CardTitle>
          <CardDescription className="text-center text-sm" style={{ color: WARM.sub }}>
            登录后可以评论、收藏和追踪更新
          </CardDescription>
        </CardHeader>

        <CardContent>
          {errors.general && (
            <div className="mb-4 p-3 rounded-xl text-sm text-center"
              style={{ background: '#FEF0F0', color: '#B03030' }}>
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium" style={{ color: WARM.text }}>
                邮箱
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
                className={errors.email ? 'border-red-400' : ''}
                style={{ borderColor: errors.email ? '#F87171' : WARM.border }}
              />
              {errors.email && <p className="text-xs" style={{ color: '#B03030' }}>{errors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium" style={{ color: WARM.text }}>
                  密码
                </label>
                <Link to="/forgot-password" className="text-xs transition-opacity hover:opacity-70"
                  style={{ color: WARM.accent }}>
                  忘记了？
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                  className="pr-10"
                  style={{ borderColor: errors.password ? '#F87171' : WARM.border }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
                  style={{ color: WARM.sub }}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs" style={{ color: '#B03030' }}>{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 hover:opacity-85 disabled:opacity-50 flex items-center justify-center"
              style={{ background: WARM.btn, color: '#FFFFFF' }}
            >
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />登录中…</>
              ) : '登录'}
            </button>
          </form>

          <div className="mt-5 text-center">
            <p className="text-sm" style={{ color: WARM.sub }}>
              还没账号？{' '}
              <Link to="/register" className="font-medium transition-opacity hover:opacity-70"
                style={{ color: WARM.accent }}>
                注册一个
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
