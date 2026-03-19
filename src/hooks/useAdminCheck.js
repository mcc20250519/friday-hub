import { useAuth } from '@/store/AuthContext'

/**
 * 返回当前登录用户，供管理页面进行权限校验
 */
export function useAdminCheck() {
  const { user } = useAuth()
  return { user }
}
