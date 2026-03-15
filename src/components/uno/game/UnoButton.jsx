/**
 * UnoButton - 常态化 UNO 按钮
 * 
 * 根据 PRD 设计，按钮始终存在于界面上，有四种视觉状态：
 * 
 * 1. 常态（灰色）：手牌 > 2 张，或不是自己的回合
 * 2. 可点击态（红色高亮+呼吸）：手牌 = 2 张且是自己回合
 * 3. 已点击态（绿色）：本轮已成功喊 UNO
 * 4. 锁定态（半透明）：非自己回合 / 动画播放中
 * 
 * 点击逻辑：
 * - 合法点击（手牌=1且在UNO窗口内）：成功喊UNO
 * - 过早点击（手牌>=2）：误触惩罚，摸2张牌
 * - 窗口外点击：无效
 * - 重复点击：无效
 */

import { useState, useEffect, useCallback } from 'react'

// 按钮状态枚举
export const UNO_BUTTON_STATE = {
  NORMAL: 'normal',           // 常态（灰色，不可点击）
  CLICKABLE: 'clickable',     // 可点击态（红色高亮）
  CALLED: 'called',           // 已点击态（绿色）
  LOCKED: 'locked',           // 锁定态（半透明）
}

/**
 * @param {Object} props
 * @param {number} props.handCount - 当前手牌数量
 * @param {boolean} props.isMyTurn - 是否轮到我
 * @param {boolean} props.hasCalledUno - 本轮是否已喊UNO
 * @param {boolean} props.unoWindowOpen - UNO窗口是否开启
 * @param {boolean} props.interactionLocked - 全局交互锁
 * @param {Function} props.onCallUno - 喊UNO回调
 * @param {Function} props.onPenalty - 误触惩罚回调（摸2张牌）
 */
export default function UnoButton({
  handCount = 0,
  isMyTurn = false,
  hasCalledUno = false,
  unoWindowOpen = false,
  interactionLocked = false,
  onCallUno,
  onPenalty,
}) {
  // 抖动动画状态
  const [isShaking, setIsShaking] = useState(false)
  // 错误提示
  const [errorMessage, setErrorMessage] = useState(null)

  // 计算按钮当前状态
  const getButtonState = useCallback(() => {
    // 锁定态优先
    if (interactionLocked) return UNO_BUTTON_STATE.LOCKED
    // 已喊过 UNO
    if (hasCalledUno) return UNO_BUTTON_STATE.CALLED
    // UNO窗口开放中 → 真正可点击
    // 注意：不再检查 handCount，因为出牌后 handCount 可能还没更新
    // 完全依赖 unoWindowOpen 状态（在出牌瞬间立即开启）
    if (unoWindowOpen) return UNO_BUTTON_STATE.CLICKABLE
    // 其他情况为常态
    return UNO_BUTTON_STATE.NORMAL
  }, [interactionLocked, hasCalledUno, unoWindowOpen])

  const buttonState = getButtonState()

  // 触发抖动动画
  const triggerShake = useCallback((message) => {
    setIsShaking(true)
    setErrorMessage(message)
    setTimeout(() => {
      setIsShaking(false)
      setErrorMessage(null)
    }, 800)
  }, [])

  // 点击处理
  const handleClick = useCallback(() => {
    // 锁定态不响应
    if (interactionLocked) return

    // 已喊过UNO，不响应
    if (hasCalledUno) return

    // 窗口开启 → 合法喊 UNO
    if (unoWindowOpen) {
      onCallUno?.()
      return
    }

    // 窗口未开启 → 根据手牌数判断
    if (handCount >= 2) {
      triggerShake('手牌不止1张！罚摸2张')
      onPenalty?.(2)
      return
    }

    // 手牌 = 0 或 1 但窗口未开启
    triggerShake('UNO窗口已关闭')
  }, [
    interactionLocked,
    hasCalledUno,
    handCount,
    unoWindowOpen,
    onCallUno,
    onPenalty,
    triggerShake,
  ])

  // 样式根据状态变化
  const getButtonStyle = () => {
    const baseStyle = {
      width: 72,
      height: 72,
      borderRadius: '50%',
      border: '4px solid #1a1a1a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Arial Black, sans-serif',
      fontSize: 18,
      fontWeight: 900,
      fontStyle: 'italic',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      userSelect: 'none',
      position: 'relative',
    }

    switch (buttonState) {
      case UNO_BUTTON_STATE.LOCKED:
        return {
          ...baseStyle,
          background: 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)',
          color: 'rgba(255,255,255,0.5)',
          opacity: 0.6,
          pointerEvents: 'none',
          cursor: 'not-allowed',
        }

      case UNO_BUTTON_STATE.CALLED:
        return {
          ...baseStyle,
          background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
          color: 'white',
          boxShadow: '0 4px 16px rgba(34,197,94,0.4)',
          pointerEvents: 'none',
        }

      case UNO_BUTTON_STATE.CLICKABLE:
        return {
          ...baseStyle,
          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          color: 'white',
          boxShadow: '0 4px 20px rgba(239,68,68,0.5)',
          animation: 'unoBreath 1.5s ease-in-out infinite',
        }

      case UNO_BUTTON_STATE.NORMAL:
      default:
        return {
          ...baseStyle,
          background: 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)',
          color: 'rgba(255,255,255,0.7)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }
    }
  }

  const getButtonText = () => {
    if (buttonState === UNO_BUTTON_STATE.CALLED) return '✓ UNO'
    return 'UNO'
  }

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        style={{
          ...getButtonStyle(),
          transform: isShaking ? 'translateX(-4px)' : undefined,
          animation: isShaking ? 'unoShake 0.4s ease-in-out' : getButtonStyle().animation,
        }}
        disabled={buttonState === UNO_BUTTON_STATE.LOCKED}
      >
        <span
          style={{
            WebkitTextStroke: '1.5px #1a1a1a',
            textShadow: '0 2px 4px rgba(0,0,0,0.3)',
          }}
        >
          {getButtonText()}
        </span>
      </button>

      {/* 错误提示气泡 */}
      {errorMessage && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: 8,
            padding: '4px 12px',
            background: 'rgba(239,68,68,0.95)',
            color: 'white',
            fontSize: 12,
            fontWeight: 600,
            borderRadius: 8,
            whiteSpace: 'nowrap',
            animation: 'fadeInUp 0.2s ease-out',
          }}
        >
          {errorMessage}
        </div>
      )}

      {/* 动画关键帧 */}
      <style>{`
        @keyframes unoBreath {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes unoShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateX(-50%) translateY(4px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  )
}
