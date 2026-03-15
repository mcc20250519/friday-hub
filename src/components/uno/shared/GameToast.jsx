/**
 * GameToast - 游戏内专用通知组件
 * 用于显示 +2/+4、跳过、UNO喊叫等事件通知
 */

import { useState, useCallback } from 'react'

/**
 * 单条游戏通知
 */
function GameNotification({ notification, onDismiss }) {
  const typeStyles = {
    draw: 'bg-red-500 text-white border-red-600',
    skip: 'bg-orange-500 text-white border-orange-600',
    reverse: 'bg-blue-500 text-white border-blue-600',
    uno: 'bg-yellow-400 text-yellow-900 border-yellow-500',
    wild: 'bg-purple-500 text-white border-purple-600',
    info: 'bg-gray-700 text-white border-gray-800',
    success: 'bg-green-500 text-white border-green-600',
  }

  const style = typeStyles[notification.type] || typeStyles.info

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl border-2 shadow-lg
        transform transition-all duration-300 animate-in slide-in-from-top-5
        ${style}
        pointer-events-auto max-w-xs w-full
      `}
    >
      <span className="text-xl flex-shrink-0">{notification.icon}</span>
      <div className="flex-1 min-w-0">
        {notification.title && (
          <div className="font-bold text-sm leading-tight">{notification.title}</div>
        )}
        {notification.message && (
          <div className="text-xs opacity-90 mt-0.5">{notification.message}</div>
        )}
      </div>
      <button
        onClick={() => onDismiss(notification.id)}
        className="opacity-70 hover:opacity-100 text-lg leading-none flex-shrink-0"
      >
        ×
      </button>
    </div>
  )
}

/**
 * 游戏通知容器
 */
export default function GameToast({ notifications, onDismiss }) {
  if (!notifications || notifications.length === 0) return null

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 pointer-events-none items-center">
      {notifications.slice(0, 3).map((n) => (
        <GameNotification key={n.id} notification={n} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

/**
 * 游戏通知 Hook（管理通知状态）
 */
let _notifId = 0

export function useGameToast() {
  const [notifications, setNotifications] = useState([])

  const show = useCallback(({ type, icon, title, message, duration = 3000 }) => {
    // 去重：检查是否已有相同的通知（相同类型和标题）
    setNotifications((prev) => {
      const duplicate = prev.find(
        (n) => n.type === type && n.title === title && n.message === message
      )
      if (duplicate) {
        return prev // 已存在相同通知，不添加
      }

      const id = ++_notifId
      const newNotif = { id, type, icon, title, message }

      if (duration > 0) {
        setTimeout(() => {
          setNotifications((curr) => curr.filter((n) => n.id !== id))
        }, duration)
      }

      return [...prev, newNotif]
    })
  }, [])

  const dismiss = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  // 便捷方法
  const showDraw = useCallback(
    (count, playerName = '你') =>
      show({
        type: 'draw',
        icon: '🃏',
        title: `${playerName} 需要摸 ${count} 张牌`,
        duration: 3000,
      }),
    [show]
  )

  const showSkip = useCallback(
    (playerName = '你') =>
      show({
        type: 'skip',
        icon: '🚫',
        title: `${playerName} 的回合被跳过`,
        duration: 2500,
      }),
    [show]
  )

  const showReverse = useCallback(
    () =>
      show({
        type: 'reverse',
        icon: '🔄',
        title: '游戏方向改变',
        duration: 2000,
      }),
    [show]
  )

  const showUno = useCallback(
    (playerName) =>
      show({
        type: 'uno',
        icon: '🎺',
        title: `${playerName} 喊了 UNO！`,
        duration: 3000,
      }),
    [show]
  )

  const showWild = useCallback(
    (color, playerName = '玩家') =>
      show({
        type: 'wild',
        icon: '🌈',
        title: `${playerName} 更换颜色`,
        message: `当前颜色：${color}`,
        duration: 2500,
      }),
    [show]
  )

  return {
    notifications,
    show,
    dismiss,
    showDraw,
    showSkip,
    showReverse,
    showUno,
    showWild,
  }
}
