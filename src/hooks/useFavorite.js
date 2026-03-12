import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/store/AuthContext'
import { toast } from '@/hooks/useToast'

/**
 * 收藏功能 Hook
 * @returns {Object} { favorites, isFavorited, toggleFavorite, loading }
 */
export function useFavorite() {
  const { user } = useAuth()
  
  // 收藏的 toolId 数组
  const [favorites, setFavorites] = useState([])
  // 加载状态
  const [loading, setLoading] = useState(false)
  // 初始化加载状态
  const [initialLoading, setInitialLoading] = useState(true)

  /**
   * 加载用户收藏列表
   */
  const loadFavorites = useCallback(async () => {
    if (!user) {
      setFavorites([])
      setInitialLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('tool_id')
        .eq('user_id', user.id)

      if (error) {
        console.error('加载收藏列表失败:', error)
        return
      }

      // 提取 tool_id 数组
      const toolIds = data?.map(item => item.tool_id) || []
      setFavorites(toolIds)
    } catch (err) {
      console.error('加载收藏列表出错:', err)
    } finally {
      setInitialLoading(false)
    }
  }, [user])

  // 组件挂载时加载收藏列表
  useEffect(() => {
    loadFavorites()
  }, [loadFavorites])

  /**
   * 检查指定工具是否已收藏
   * @param {string} toolId - 工具ID
   * @returns {boolean}
   */
  const isFavorited = useCallback((toolId) => {
    return favorites.includes(toolId)
  }, [favorites])

  /**
   * 切换收藏状态（乐观更新）
   * @param {string} toolId - 工具ID
   * @returns {Promise<boolean>} - 操作是否成功
   */
  const toggleFavorite = useCallback(async (toolId) => {
    // 未登录用户返回 false
    if (!user) {
      return false
    }

    const currentlyFavorited = favorites.includes(toolId)
    
    // 乐观更新：先更新 UI
    setFavorites(prev => {
      if (currentlyFavorited) {
        return prev.filter(id => id !== toolId)
      } else {
        return [...prev, toolId]
      }
    })

    setLoading(true)

    try {
      if (currentlyFavorited) {
        // 取消收藏
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('tool_id', toolId)

        if (error) throw error
        toast({ title: '已取消收藏', variant: 'default' })
      } else {
        // 添加收藏
        const { error } = await supabase
          .from('favorites')
          .insert({
            user_id: user.id,
            tool_id: toolId
          })

        if (error) throw error
        toast.success('已添加到收藏')
      }

      return true
    } catch (err) {
      console.error('切换收藏状态失败:', err)
      toast.error('操作失败，请稍后重试')
      
      // 操作失败，回滚 UI 状态
      setFavorites(prev => {
        if (currentlyFavorited) {
          return [...prev, toolId]
        } else {
          return prev.filter(id => id !== toolId)
        }
      })
      
      return false
    } finally {
      setLoading(false)
    }
  }, [user, favorites])

  return {
    favorites,
    isFavorited,
    toggleFavorite,
    loading: loading || initialLoading,
    refreshFavorites: loadFavorites
  }
}

export default useFavorite
