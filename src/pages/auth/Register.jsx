import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/store/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Eye, EyeOff, Loader2, Mail, ArrowRight, CheckCircle } from 'lucide-react'

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

export default function Register() {
  const navigate = useNavigate()
  const { signUp } = useAuth()

  const [formData, setFormData] = useState({ email: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState({ email: '', password: '', confirmPassword: '', general: '' })
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isRegistered, setIsRegistered] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')

  const validateForm = () => {
    const newErrors = { email: '', password: '', confirmPassword: '', general: '' }
    let isValid = true

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!formData.email) { newErrors.email = '邮箱不能为空'; isValid = false }
    else if (!emailRegex.test(formData.email)) { newErrors.email = '邮箱格式不对'; isValid = false }

    if (!formData.password) { newErrors.password = '密码不能为空'; isValid = false }
    else if (formData.password.length < 8) { newErrors.password = '密码至少 8 位'; isValid = false }

    if (!formData.confirmPassword) { newErrors.confirmPassword = '请再输一次'; isValid = false }
    else if (formData.password !== formData.confirmPassword) { newErrors.confirmPassword = '两次密码不一样'; isValid = false }

    setErrors(newErrors)
    return isValid
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({ email: '', password: '', confirmPassword: '', general: '' })
    if (!validateForm()) return
    setLoading(true)
    try {
      const data = await signUp(formData.email, formData.password, {
        emailRedirectTo: `${window.location.origin}/verify-email`,
      })
      // Supabase 对已注册邮箱不报错，而是返回 user.identities 为空数组
      // 通过此特征判断邮箱是否已被注册
      if (data?.user?.identities?.length === 0) {
        setErrors((prev) => ({ ...prev, email: '这个邮箱已经注册过了，直接登录吧' }))
        return
      }
      setIsRegistered(true)
      setRegisteredEmail(formData.email)
    } catch (error) {
      console.error('注册失败:', error)
      const errorStr = (error.message || '').toLowerCase()
      if (errorStr.includes('already registered') || errorStr.includes('already exists') || errorStr.includes('duplicate')) {
        setErrors((prev) => ({ ...prev, email: '这个邮箱已经注册过了，直接登录吧' }))
      } else if (errorStr.includes('password')) {
        setErrors((prev) => ({ ...prev, password: '密码不符合要求' }))
      } else if (errorStr.includes('email')) {
        setErrors((prev) => ({ ...prev, email: '邮箱格式有问题' }))
      } else {
        setErrors((prev) => ({ ...prev, general: '注册遇到问题，稍后再试试' }))
      }
    } finally {
      setLoading(false)
    }
  }

  // 注册成功页面
  if (isRegistered) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
        style={{ background: WARM.bg }}>
        <Link to="/" className="mb-8 text-xl font-bold transition-opacity hover:opacity-70"
          style={{ color: WARM.text }}>
          Friday Hub
        </Link>
        <Card className="w-full max-w-md border" style={{ borderColor: WARM.border, background: '#FFFFFF' }}>
          <CardContent className="pt-8 pb-8 text-center">
            <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-5"
              style={{ background: '#EEF6ED' }}>
              <CheckCircle className="h-8 w-8" style={{ color: '#3A7D44' }} />
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: WARM.text }}>
              去邮箱确认一下
            </h2>
            <p className="text-sm mb-5" style={{ color: WARM.sub }}>
              验证链接发到了你的邮箱，点一下就激活成功
            </p>
            <div className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 mb-5"
              style={{ background: WARM.tagBg }}>
              <Mail className="h-4 w-4" style={{ color: WARM.sub }} />
              <span className="text-sm font-medium" style={{ color: WARM.text }}>{registeredEmail}</span>
            </div>
            <div className="p-3.5 rounded-xl mb-5 text-left text-xs"
              style={{ background: '#FFFBF5', border: `1px solid ${WARM.border}` }}>
              <p style={{ color: WARM.sub }}>
                如果收件箱里没有，检查一下垃圾邮件，可能被过滤了
              </p>
            </div>
            <div className="space-y-2.5">
              <button
                onClick={() => navigate('/login')}
                className="w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-85"
                style={{ background: WARM.btn, color: '#FFFFFF' }}
              >
                去登录
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full py-2.5 rounded-xl text-sm border transition-opacity hover:opacity-70"
                style={{ borderColor: WARM.border, color: WARM.sub, background: 'transparent' }}
              >
                返回注册
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

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
            注册一个账号
          </CardTitle>
          <CardDescription className="text-center text-sm" style={{ color: WARM.sub }}>
            以后用邮箱直接登录就行
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
              <label htmlFor="email" className="text-sm font-medium" style={{ color: WARM.text }}>邮箱</label>
              <Input
                id="email" name="email" type="email" placeholder="your@email.com"
                value={formData.email} onChange={handleChange} disabled={loading}
                style={{ borderColor: errors.email ? '#F87171' : WARM.border }}
              />
              {errors.email && <p className="text-xs" style={{ color: '#B03030' }}>{errors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium" style={{ color: WARM.text }}>密码</label>
              <div className="relative">
                <Input
                  id="password" name="password" type={showPassword ? 'text' : 'password'}
                  placeholder="至少 8 位" value={formData.password} onChange={handleChange}
                  disabled={loading} className="pr-10"
                  style={{ borderColor: errors.password ? '#F87171' : WARM.border }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
                  style={{ color: WARM.sub }}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs" style={{ color: '#B03030' }}>{errors.password}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="text-sm font-medium" style={{ color: WARM.text }}>确认密码</label>
              <div className="relative">
                <Input
                  id="confirmPassword" name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="再输一遍" value={formData.confirmPassword}
                  onChange={handleChange} disabled={loading} className="pr-10"
                  style={{ borderColor: errors.confirmPassword ? '#F87171' : WARM.border }}
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
                  style={{ color: WARM.sub }}>
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-xs" style={{ color: '#B03030' }}>{errors.confirmPassword}</p>}
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full py-2.5 rounded-xl font-semibold text-sm transition-opacity hover:opacity-85 disabled:opacity-50 flex items-center justify-center"
              style={{ background: WARM.btn, color: '#FFFFFF' }}
            >
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />注册中…</> : '注册'}
            </button>
          </form>

          <div className="mt-5 text-center">
            <p className="text-sm" style={{ color: WARM.sub }}>
              已经有账号了？{' '}
              <Link to="/login" className="font-medium transition-opacity hover:opacity-70"
                style={{ color: WARM.accent }}>
                直接登录
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
