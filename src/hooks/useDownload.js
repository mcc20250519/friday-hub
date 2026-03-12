import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/store/AuthContext'
import { toast } from '@/hooks/useToast'

/**
 * 下载功能 Hook
 * @returns {Object} { downloadTool, downloading }
 */
export function useDownload() {
  const { user } = useAuth()
  
  // 下载中状态
  const [downloading, setDownloading] = useState(false)

  /**
   * 执行下载并记录
   * @param {Object} tool - 工具对象
   * @param {string} tool.id - 工具ID
   * @param {string} tool.name - 工具名称
   * @param {string} tool.download_url - 下载链接
   * @param {string} tool.type - 工具类型
   * @returns {Promise<boolean>} - 下载是否成功
   */
  const downloadTool = useCallback(async (tool) => {
    if (!tool) {
      console.error('工具对象不能为空')
      return false
    }

    setDownloading(true)

    try {
      // 游戏类型直接跳转，不触发下载
      if (tool.type === 'game') {
        return { success: true, isGame: true }
      }

      // 显示开始下载提示
      toast.info('开始下载...')

      // 检查是否有下载链接
      if (!tool.download_url) {
        console.warn('该工具暂无下载链接')
        return { success: false, error: '暂无下载链接' }
      }

      // 触发浏览器下载
      const link = document.createElement('a')
      link.href = tool.download_url
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // 如果用户已登录，记录下载
      if (user) {
        try {
          await supabase
            .from('download_records')
            .insert({
              user_id: user.id,
              tool_id: tool.id,
              tool_name: tool.name,
              downloaded_at: new Date().toISOString()
            })
        } catch (recordError) {
          // 记录下载失败不影响主流程
          console.error('记录下载失败:', recordError)
        }
      }

      return { success: true }
    } catch (err) {
      console.error('下载失败:', err)
      return { success: false, error: err.message }
    } finally {
      setDownloading(false)
    }
  }, [user])

  return {
    downloadTool,
    downloading
  }
}

export default useDownload
