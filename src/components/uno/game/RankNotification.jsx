/**
 * RankNotification - 排名模式名次通知动画组件
 *
 * 当玩家在排名模式下出完最后一张牌时，显示名次通知
 *
 * 动画规格：
 *   0ms     → 从顶部外侧滑入（translateY -100% → 0）
 *   0~300ms → 滑入动画，spring easing
 *   300ms~1800ms → 静止展示
 *   1800ms~2100ms → 向上淡出消失
 *
 * 多人同时出完牌：依次排列，间隔 300ms 出现
 *
 * Props:
 *   notifications      {Array}    通知列表
 *   onDismiss          {Function} 关闭通知回调
 *   rankColors         {Object}   名次颜色配置（可选）
 *   onAnimationComplete {Function} 所有动画完成回调（可选）
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'

/**
 * 默认名次颜色
 */
const DEFAULT_RANK_COLORS = {
  first: '#FFD700',
  second: '#C0C0C0',
  third: '#CD7F32',
  others: 'rgba(0,0,0,0.6)',
}

/**
 * 根据名次获取背景渐变
 */
function getRankGradient(rank, rankColors = DEFAULT_RANK_COLORS) {
  switch (rank) {
    case 1:
      return `linear-gradient(135deg, ${rankColors.first} 0%, #FFA500 100%)` // 金色
    case 2:
      return `linear-gradient(135deg, ${rankColors.second} 0%, #A0A0A0 100%)` // 银色
    case 3:
      return `linear-gradient(135deg, ${rankColors.third} 0%, #A0522D 100%)` // 铜色
    default:
      return 'linear-gradient(135deg, rgba(30,30,30,0.85) 0%, rgba(50,50,50,0.85) 100%)' // 深色半透明
  }
}

/**
 * 根据名次获取奖章图标
 */
function getRankMedal(rank) {
  switch (rank) {
    case 1:
      return '🥇'
    case 2:
      return '🥈'
    case 3:
      return '🥉'
    default:
      return '🏅'
  }
}

/**
 * 单条排名通知
 */
function SingleNotification({ notification, index, onDismiss, rankColors }) {
  const [phase, setPhase] = useState('enter') // 'enter' | 'show' | 'exit'
  const timerRef = useRef(null)

  useEffect(() => {
    // 进入动画 300ms → 展示 1500ms → 退出 300ms
    const enterTimer = setTimeout(() => setPhase('show'), 300)
    const exitTimer = setTimeout(() => setPhase('exit'), 1800)
    const dismissTimer = setTimeout(() => onDismiss(notification.id), 2100)

    timerRef.current = { enterTimer, exitTimer, dismissTimer }

    return () => {
      clearTimeout(enterTimer)
      clearTimeout(exitTimer)
      clearTimeout(dismissTimer)
    }
  }, [notification.id, onDismiss])

  // 计算动画样式
  const getAnimationStyle = () => {
    // 垂直偏移：每个通知向下偏移，避免重叠
    const yOffset = index * 72 // 每条高度 + 间距

    switch (phase) {
      case 'enter':
        return {
          transform: `translateY(-100%) translateY(${yOffset}px)`,
          opacity: 0,
        }
      case 'show':
        return {
          transform: `translateY(0) translateY(${yOffset}px)`,
          opacity: 1,
        }
      case 'exit':
        return {
          transform: `translateY(-20px) translateY(${yOffset}px)`,
          opacity: 0,
        }
    }
  }

  const { playerName, rank, scoreEarned } = notification

  // 合并颜色配置
  const mergedRankColors = useMemo(() => ({
    ...DEFAULT_RANK_COLORS,
    ...rankColors,
  }), [rankColors])

  return (
    <div
      className="fixed left-1/2 z-[70] pointer-events-none"
      style={{
        top: '80px', // 顶部偏下，避开房间号栏
        ...getAnimationStyle(),
        transition: phase === 'enter'
          ? 'transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 200ms ease-out'
          : phase === 'exit'
          ? 'transform 300ms ease-in, opacity 300ms ease-in'
          : 'none',
        willChange: 'transform, opacity',
      }}
    >
      <div
        className="flex items-center gap-3 px-5 py-3 rounded-xl border border-black/30 shadow-lg"
        style={{
          background: getRankGradient(rank, mergedRankColors),
          boxShadow: rank <= 3
            ? `0 4px 20px ${rank === 1 ? 'rgba(255,215,0,0.4)' : rank === 2 ? 'rgba(192,192,192,0.4)' : 'rgba(205,127,50,0.4)'}`
            : '0 4px 15px rgba(0,0,0,0.3)',
          transform: 'translateX(-50%)', // 水平居中
        }}
      >
        {/* 奖章 */}
        <span className="text-2xl">{getRankMedal(rank)}</span>

        {/* 内容 */}
        <div className="flex items-center gap-2 text-white font-bold">
          <span className="text-lg">{playerName}</span>
          <span className="text-white/60">·</span>
          <span className="text-xl">第{rank}名</span>
          <span className="text-white/60">·</span>
          <span className="text-lg text-green-200">+{scoreEarned}分</span>
        </div>
      </div>
    </div>
  )
}

/**
 * 排名通知容器
 */
export default function RankNotification({ 
  notifications, 
  onDismiss,
  rankColors,
  onAnimationComplete,
}) {
  // 追踪通知完成数量
  const completedRef = useRef(0)
  const prevCountRef = useRef(0)

  useEffect(() => {
    // 当通知数量减少时，表示有通知完成
    if (notifications.length < prevCountRef.current) {
      completedRef.current += prevCountRef.current - notifications.length
      
      // 当所有通知都完成时，触发回调
      if (notifications.length === 0 && completedRef.current > 0) {
        onAnimationComplete?.()
        completedRef.current = 0
      }
    }
    prevCountRef.current = notifications.length
  }, [notifications.length, onAnimationComplete])

  if (!notifications || notifications.length === 0) return null

  return (
    <>
      {notifications.map((n, index) => (
        <SingleNotification
          key={n.id}
          notification={n}
          index={index}
          onDismiss={onDismiss}
          rankColors={rankColors}
        />
      ))}
    </>
  )
}

/**
 * 排名通知 Hook
 *
 * 管理排名通知队列，支持多人同时出完牌时依次显示
 */
let _rankNotifId = 0

export function useRankNotification() {
  const [notifications, setNotifications] = useState([])
  const queueRef = useRef([])
  const processingRef = useRef(false)

  // 处理队列中的通知（每个通知间隔 300ms 出现）
  const processQueue = useCallback(() => {
    if (processingRef.current || queueRef.current.length === 0) return

    processingRef.current = true
    const notif = queueRef.current.shift()

    setNotifications((prev) => [...prev, notif])

    // 300ms 后处理下一个
    setTimeout(() => {
      processingRef.current = false
      if (queueRef.current.length > 0) {
        processQueue()
      }
    }, 300)
  }, [])

  /**
   * 添加排名通知
   * @param {Object} params
   * @param {string} params.playerId - 玩家 ID
   * @param {string} params.playerName - 玩家名称
   * @param {number} params.rank - 名次（1-N）
   * @param {number} params.scoreEarned - 获得分数
   */
  const showRank = useCallback(({ playerId, playerName, rank, scoreEarned }) => {
    const id = ++_rankNotifId
    const notif = { id, playerId, playerName, rank, scoreEarned }

    queueRef.current.push(notif)
    processQueue()
  }, [processQueue])

  /**
   * 批量添加排名通知（用于多人同时出完牌）
   * @param {Array<{ playerId: string, playerName: string, rank: number, scoreEarned: number }>} list
   */
  const showRankBatch = useCallback((list) => {
    list.forEach(({ playerId, playerName, rank, scoreEarned }) => {
      const id = ++_rankNotifId
      queueRef.current.push({ id, playerId, playerName, rank, scoreEarned })
    })
    processQueue()
  }, [processQueue])

  const dismiss = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  /**
   * 清空所有通知（游戏结束时调用）
   */
  const clearAll = useCallback(() => {
    setNotifications([])
    queueRef.current = []
    processingRef.current = false
  }, [])

  return {
    notifications,
    showRank,
    showRankBatch,
    dismiss,
    clearAll,
  }
}
