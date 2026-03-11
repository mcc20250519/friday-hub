import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // 用户状态
  const [user, setUser] = useState(null)
  // 用户扩展资料
  const [profile, setProfile] = useState(null)
  // 加载状态
  const [loading, setLoading] = useState(true)

  /**
   * 获取用户 profile 信息
   */
  const fetchProfile = async (userId) => {
    if (!userId) {
      setProfile(null)
      return
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('获取 profile 失败:', error)
        setProfile(null)
      } else {
        setProfile(data)
      }
    } catch (err) {
      console.error('获取 profile 出错:', err)
      setProfile(null)
    }
  }

  useEffect(() => {
    // 获取初始 session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      
      // 如果有用户，获取 profile
      if (currentUser?.id) {
        fetchProfile(currentUser.id)
      }
      
      setLoading(false)
    })

    // 监听 Auth 状态变化
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      
      // 用户变化时，更新 profile
      if (currentUser?.id) {
        fetchProfile(currentUser.id)
      } else {
        setProfile(null)
      }
      
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  /**
   * 邮箱 + 密码登录
   */
  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return data
  }

  /**
   * 邮箱 + 密码注册
   */
  const signUp = async (email, password, options = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options,
    })
    if (error) throw error
    return data
  }

  /**
   * 退出登录
   */
  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    // 清除本地状态
    setUser(null)
    setProfile(null)
  }

  /**
   * 更新用户 profile
   */
  const updateProfile = async (data) => {
    if (!user?.id) {
      throw new Error('用户未登录')
    }

    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      console.error('更新 profile 失败:', error)
      throw error
    }

    // 更新本地状态
    setProfile(updatedProfile)
    return updatedProfile
  }

  const value = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    isAuthenticated: !!user,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * 自定义 Hook，使用 AuthContext
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
