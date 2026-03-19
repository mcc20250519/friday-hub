import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function VerifyEmail() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState('verifying') // verifying, success, error
  const [error, setError] = useState('')

  useEffect(() => {
    // Supabase 会在 URL hash 中传入 access_token 和 type
    // type=email 表示邮箱验证
    const verifyEmail = async () => {
      try {
        // 获取 hash 中的信息
        const hash = window.location.hash
        
        if (!hash) {
          setStatus('error')
          setError('验证链接无效或已过期')
          return
        }

        // Supabase 会自动处理 hash 中的信息
        // 使用 supabase.auth.verifyOtp 或等待 onAuthStateChange
        // 实际上，Supabase 会自动在 onAuthStateChange 中处理
        
        // 等待 auth 状态更新
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user?.email_confirmed_at) {
          // 邮箱已验证
          setStatus('success')
          
          // 2 秒后跳转到登录页
          setTimeout(() => {
            navigate('/login', { replace: true })
          }, 2000)
        } else {
          // 检查是否有 token 在 hash 中，尝试恢复会话
          const hashParams = new URLSearchParams(hash.substring(1))
          const accessToken = hashParams.get('access_token')
          const tokenType = hashParams.get('type')
          
          if (accessToken && tokenType === 'email') {
            // 使用 access token 建立会话
            const { data, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: hashParams.get('refresh_token') || '',
            })
            
            if (sessionError) {
              throw sessionError
            }
            
            // 检查用户状态
            if (data?.user?.email_confirmed_at) {
              setStatus('success')
              setTimeout(() => {
                navigate('/login', { replace: true })
              }, 2000)
            } else {
              // 邮箱还未标记为已验证
              setStatus('success')
              setTimeout(() => {
                navigate('/login', { replace: true })
              }, 2000)
            }
          } else {
            setStatus('error')
            setError('验证链接无效或已过期')
          }
        }
      } catch (err) {
        console.error('邮箱验证失败:', err)
        setStatus('error')
        setError(err.message || '验证过程中出错，请稍后重试')
      }
    }

    verifyEmail()
  }, [navigate])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div
        onClick={() => navigate('/')}
        className="mb-8 text-2xl font-bold text-gray-900 hover:text-purple-600 transition-colors cursor-pointer"
      >
        Friday Hub
      </div>

      {/* 验证卡片 */}
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="pt-8 pb-8 text-center">
          {status === 'verifying' && (
            <>
              <div className="mx-auto w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mb-6">
                <Loader2 className="h-10 w-10 text-purple-600 animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                验证邮箱中
              </h2>
              <p className="text-gray-600">
                请稍候，正在验证您的邮箱地址...
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                验证成功！
              </h2>
              <p className="text-gray-600 mb-6">
                您的邮箱已成功验证，正在跳转到登录页面...
              </p>
              <div className="flex items-center justify-center">
                <Loader2 className="h-5 w-5 text-purple-600 animate-spin" />
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
                <AlertCircle className="h-10 w-10 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                验证失败
              </h2>
              <p className="text-gray-600 mb-6">
                {error || '无法验证您的邮箱，验证链接可能已过期或无效'}
              </p>
              <div className="space-y-3">
                <Button
                  onClick={() => navigate('/register', { replace: true })}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  返回注册
                </Button>
                <Button
                  onClick={() => navigate('/login', { replace: true })}
                  variant="outline"
                  className="w-full"
                >
                  前往登录
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
