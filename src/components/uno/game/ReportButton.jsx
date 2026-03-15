/**
 * ReportButton - 举报按钮
 * 
 * 显示在对手玩家头像旁边，用于举报没喊 UNO 的玩家
 * 
 * 状态：
 * - 常态（灰色不可点击）：目标玩家手牌!=1 或 已喊UNO 或 窗口关闭
 * - 可举报态（红色高亮+抖动）：满足举报条件
 * - 已举报态（灰色）：本轮已举报过该玩家
 * 
 * 举报结果：
 * - 成功：目标玩家摸2张牌
 * - 失败：举报者摸1张牌（目标已喊UNO）
 */

import { useState, useCallback } from 'react'

/**
 * @param {Object} props
 * @param {string} props.targetPlayerId - 被举报的玩家ID
 * @param {string} props.targetPlayerName - 被举报的玩家名称（显示用）
 * @param {number} props.targetHandCount - 目标玩家手牌数
 * @param {boolean} props.targetHasCalledUno - 目标是否已喊UNO
 * @param {boolean} props.unoWindowOpen - UNO窗口是否开启
 * @param {string} props.unoWindowOwner - 当前窗口归属的玩家ID
 * @param {boolean} props.hasReported - 是否已举报过该玩家
 * @param {Function} props.onReport - 举报回调 (targetPlayerId) => Promise<{success: boolean}>
 * @param {boolean} props.disabled - 全局禁用
 */
export default function ReportButton({
  targetPlayerId,
  targetPlayerName = '对手',
  targetHandCount = 0,
  targetHasCalledUno = false,
  unoWindowOpen = false,
  unoWindowOwner = null,
  hasReported = false,
  onReport,
  disabled = false,
}) {
  const [isReporting, setIsReporting] = useState(false)
  const [showResult, setShowResult] = useState(null) // 'success' | 'failed' | null

  // 判断是否可举报
  const canReport = useCallback(() => {
    // 已举报过
    if (hasReported) return false
    // 全局禁用
    if (disabled) return false
    // 目标手牌不是1张
    if (targetHandCount !== 1) return false
    // 目标已喊UNO
    if (targetHasCalledUno) return false
    // UNO窗口未开启
    if (!unoWindowOpen) return false
    // 窗口归属不是目标玩家
    if (unoWindowOwner !== targetPlayerId) return false
    return true
  }, [
    hasReported,
    disabled,
    targetHandCount,
    targetHasCalledUno,
    unoWindowOpen,
    unoWindowOwner,
    targetPlayerId,
  ])

  const reportable = canReport()

  // 点击举报
  const handleClick = useCallback(async () => {
    if (!reportable || isReporting) return

    setIsReporting(true)
    try {
      const result = await onReport?.(targetPlayerId)
      
      if (result?.success) {
        setShowResult('success')
      } else {
        setShowResult('failed')
      }

      // 1.5秒后隐藏结果
      setTimeout(() => {
        setShowResult(null)
      }, 1500)
    } finally {
      setIsReporting(false)
    }
  }, [reportable, isReporting, onReport, targetPlayerId])

  // 样式
  const getButtonStyle = () => {
    const baseStyle = {
      width: 28,
      height: 28,
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 14,
      transition: 'all 0.2s ease',
      border: '2px solid',
      cursor: 'pointer',
      position: 'relative',
    }

    if (hasReported) {
      return {
        ...baseStyle,
        background: '#e5e7eb',
        borderColor: '#9ca3af',
        color: '#9ca3af',
        cursor: 'not-allowed',
        pointerEvents: 'none',
      }
    }

    if (reportable) {
      return {
        ...baseStyle,
        background: '#fef2f2',
        borderColor: '#ef4444',
        color: '#ef4444',
        animation: 'reportPulse 1s ease-in-out infinite',
        boxShadow: '0 0 8px rgba(239,68,68,0.4)',
      }
    }

    return {
      ...baseStyle,
      background: '#f3f4f6',
      borderColor: '#d1d5db',
      color: '#9ca3af',
      opacity: 0.6,
      pointerEvents: 'none',
    }
  }

  return (
    <button
      onClick={handleClick}
      style={getButtonStyle()}
      disabled={!reportable || isReporting || hasReported}
      title={
        hasReported 
          ? '已举报' 
          : reportable 
            ? `举报 ${targetPlayerName} 没喊UNO` 
            : '暂不可举报'
      }
    >
      🚩

      {/* 结果标记 */}
      {showResult === 'success' && (
        <span
          style={{
            position: 'absolute',
            top: -4,
            right: -4,
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: '#22c55e',
            color: 'white',
            fontSize: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'popIn 0.2s ease-out',
          }}
        >
          ✓
        </span>
      )}
      {showResult === 'failed' && (
        <span
          style={{
            position: 'absolute',
            top: -4,
            right: -4,
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: '#ef4444',
            color: 'white',
            fontSize: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'popIn 0.2s ease-out',
          }}
        >
          ✗
        </span>
      )}

      <style>{`
        @keyframes reportPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        @keyframes popIn {
          from { transform: scale(0); }
          to { transform: scale(1); }
        }
      `}</style>
    </button>
  )
}
