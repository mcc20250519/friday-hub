/**
 * useUnoInvite - 邀请链接逻辑 Hook
 */

import { useCallback, useState } from 'react'
import { toast } from '@/hooks/useToast'

/**
 * @param {string} roomCode - 房间邀请码
 */
export function useUnoInvite(roomCode) {
  const [copied, setCopied] = useState(false)

  /**
   * 获取完整邀请链接
   */
  const getInviteUrl = useCallback(() => {
    if (!roomCode) return ''
    return `${window.location.origin}/games/uno/room/${roomCode}`
  }, [roomCode])

  /**
   * 复制邀请链接到剪贴板
   */
  const copyInviteLink = useCallback(async () => {
    const url = getInviteUrl()
    if (!url) return

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url)
      } else {
        // 兼容不支持 Clipboard API 的环境
        const textArea = document.createElement('textarea')
        textArea.value = url
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }

      setCopied(true)
      toast.success('邀请链接已复制', '发给朋友即可加入游戏！')

      // 2 秒后重置状态
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('复制失败:', err)
      toast.error('复制失败', '请手动复制链接')
    }
  }, [getInviteUrl])

  /**
   * 通过 Web Share API 分享（移动端）
   */
  const shareInviteLink = useCallback(async () => {
    const url = getInviteUrl()
    if (!url) return

    if (navigator.share) {
      try {
        await navigator.share({
          title: '来玩 UNO！',
          text: '我邀请你来玩 UNO，点击链接直接加入房间',
          url,
        })
      } catch (err) {
        // 用户取消分享，不做处理
        if (err.name !== 'AbortError') {
          console.error('分享失败:', err)
        }
      }
    } else {
      // 不支持 Web Share API，回退到复制
      await copyInviteLink()
    }
  }, [getInviteUrl, copyInviteLink])

  const canShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  return {
    inviteUrl: getInviteUrl(),
    copied,
    copyInviteLink,
    shareInviteLink,
    canShare,
  }
}
