/**
 * FlyingCard - 出牌飞行动画覆盖层
 *
 * 用法：
 *   <FlyingCard
 *     card={card}
 *     from={{ x, y, w, h, rotate }}   // 起点（手牌 getBoundingClientRect + 当前旋转角）
 *     to={{ x, y, w, h }}             // 终点（弃牌堆 getBoundingClientRect）
 *     onDone={callback}               // 动画结束回调
 *   />
 */

import { useEffect, useRef } from 'react'
import { CARD_TYPES, COLOR_CLASSES, CARD_SYMBOLS } from '@/lib/uno/constants'

export default function FlyingCard({ card, from, to, onDone }) {
  const elRef = useRef(null)

  useEffect(() => {
    if (!elRef.current || !from || !to) return

    const el = elRef.current

    // 起始位置：牌的左上角绝对屏幕坐标
    const startX = from.x
    const startY = from.y
    const startW = from.w
    const startH = from.h
    const startRotate = from.rotate ?? 0

    // 终点位置：弃牌堆中心
    const endX = to.x + to.w / 2 - startW / 2
    const endY = to.y + to.h / 2 - startH / 2

    // 初始状态（起点）
    el.style.left = `${startX}px`
    el.style.top = `${startY}px`
    el.style.width = `${startW}px`
    el.style.height = `${startH}px`
    el.style.transform = `rotate(${startRotate}deg) scale(1)`
    el.style.opacity = '1'
    el.style.transition = 'none'

    // 强制回流，确保起始样式生效
    el.getBoundingClientRect()

    // 飞行动画：平移 + 旋转归零 + 轻微放大后缩回目标尺寸
    // 注意：不再淡出，而是保持可见，让弃牌堆无缝衔接
    const DURATION = 350 // ms，快而流畅

    el.style.transition = `
      left ${DURATION}ms cubic-bezier(0.4, 0, 0.2, 1),
      top ${DURATION}ms cubic-bezier(0.4, 0, 0.2, 1),
      transform ${DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)
    `
    el.style.left = `${endX}px`
    el.style.top = `${endY}px`
    el.style.transform = `rotate(0deg) scale(1)`
    // 不再设置 opacity: 0，让牌落入弃牌堆时保持可见

    const timer = setTimeout(() => {
      onDone?.()
    }, DURATION + 20)

    return () => clearTimeout(timer)
  }, [])

  if (!card || !from || !to) return null

  const isWild = card.type === CARD_TYPES.WILD || card.type === CARD_TYPES.WILD4
  const colorClasses = COLOR_CLASSES[card.color] || COLOR_CLASSES.black
  const displayContent =
    card.type === CARD_TYPES.NUMBER ? card.value : CARD_SYMBOLS[card.type] || '?'

  return (
    <div
      ref={elRef}
      style={{
        position: 'fixed',
        pointerEvents: 'none',
        zIndex: 9999,
        borderRadius: '12px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        overflow: 'hidden',
        willChange: 'left, top, transform, opacity',
      }}
      className={`
        border-4 border-white
        ${isWild
          ? 'bg-gradient-to-br from-red-500 via-yellow-500 via-green-500 to-blue-500'
          : colorClasses.bg
        }
      `}
    >
      <div className="absolute inset-[5px] bg-white rounded-lg flex flex-col justify-between p-1 h-full">
        <div className={`text-left font-extrabold text-xs leading-none ${isWild ? 'text-gray-900' : colorClasses.text}`}>
          {displayContent}
        </div>
        <div className={`text-center font-extrabold text-2xl leading-none ${isWild ? 'text-gray-900' : colorClasses.text}`}>
          {displayContent}
        </div>
        <div className={`text-right font-extrabold text-xs leading-none rotate-180 ${isWild ? 'text-gray-900' : colorClasses.text}`}>
          {displayContent}
        </div>
      </div>
    </div>
  )
}
