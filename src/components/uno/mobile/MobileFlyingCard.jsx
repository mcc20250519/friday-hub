/**
 * MobileFlyingCard - 移动端飞牌动画组件
 *
 * 将手牌从选中位置飞向弃牌堆，使用 CSS transition 实现平滑动画
 */

import { useEffect, useRef, useState } from 'react'
import { CARD_TYPES } from '@/lib/uno/constants'

const COLOR_STYLE = {
  red:    { background: 'linear-gradient(135deg, #ef4444, #dc2626)' },
  yellow: { background: 'linear-gradient(135deg, #fbbf24, #d97706)' },
  green:  { background: 'linear-gradient(135deg, #34d399, #059669)' },
  blue:   { background: 'linear-gradient(135deg, #60a5fa, #2563eb)' },
  black:  { background: 'linear-gradient(135deg, #374151, #111827)' },
}

const DISPLAY = {
  number:  (v) => String(v),
  skip:    () => '🚫',
  reverse: () => '🔄',
  draw2:   () => '+2',
  wild:    () => '🌈',
  wild4:   () => '+4',
}

/**
 * @param {Object} props
 * @param {Object} props.card - 飞行的牌
 * @param {DOMRect} props.fromRect - 起始位置（getBoundingClientRect）
 * @param {DOMRect} props.toRect - 目标位置（getBoundingClientRect）
 * @param {Function} props.onComplete - 动画完成回调
 */
export default function MobileFlyingCard({ card, fromRect, toRect, onComplete }) {
  const [phase, setPhase] = useState('start') // 'start' | 'fly' | 'done'
  const timerRef = useRef(null)

  useEffect(() => {
    // 下一帧触发飞行阶段（确保初始位置已渲染）
    const raf = requestAnimationFrame(() => {
      setPhase('fly')
    })

    // 动画完成后回调
    timerRef.current = setTimeout(() => {
      setPhase('done')
      onComplete?.()
    }, 550)

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timerRef.current)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === 'done' || !fromRect || !toRect) return null

  const isWild = card.type === CARD_TYPES.WILD || card.type === CARD_TYPES.WILD4
  const colorStyle = isWild
    ? { background: 'linear-gradient(135deg, #ef4444 0%, #fbbf24 50%, #3b82f6 100%)' }
    : COLOR_STYLE[card.color] || COLOR_STYLE.black
  const display = DISPLAY[card.type]?.(card.value) ?? '?'

  // 计算位移
  const dx = toRect.left + (toRect.width - fromRect.width) / 2 - fromRect.left
  const dy = toRect.top + (toRect.height - fromRect.height) / 2 - fromRect.top

  const style = {
    position: 'fixed',
    left: fromRect.left,
    top: fromRect.top,
    width: fromRect.width,
    height: fromRect.height,
    zIndex: 9999,
    pointerEvents: 'none',
    borderRadius: 10,
    border: '3px solid rgba(255,255,255,0.9)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 900,
    fontSize: 18,
    color: 'white',
    textShadow: '0 1px 4px rgba(0,0,0,0.4)',
    // 动画
    transition: phase === 'fly'
      ? 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s'
      : 'none',
    transform: phase === 'fly'
      ? `translate(${dx}px, ${dy}px) rotate(360deg) scale(1.15)`
      : 'translate(0, 0) rotate(0) scale(1)',
    opacity: phase === 'fly' ? 0.85 : 1,
    ...colorStyle,
  }

  return (
    <div style={style}>
      {display}
    </div>
  )
}
