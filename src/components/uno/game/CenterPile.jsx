/**
 * CenterPile - 中央牌堆区域（摸牌堆 + 弃牌堆）
 */

import { useEffect, useRef, useState } from 'react'
import { CARD_TYPES, COLOR_CLASSES, COLOR_NAMES, CARD_SYMBOLS } from '@/lib/uno/constants'

/**
 * 弃牌堆顶牌（大号内联渲染，比 CardComponent 更大更清晰）
 * 带落地动画：顶牌变化时触发 scale 1.15 → 1.0
 */
function TopCardDisplay({ card, currentColor }) {
  const [isLanding, setIsLanding] = useState(false)
  const prevCardIdRef = useRef(card?.id)

  useEffect(() => {
    // 检测顶牌变化
    if (card?.id && card.id !== prevCardIdRef.current) {
      setIsLanding(true)
      const timer = setTimeout(() => setIsLanding(false), 150)
      prevCardIdRef.current = card.id
      return () => clearTimeout(timer)
    }
  }, [card?.id])

  if (!card) {
    return (
      <div className="w-24 h-36 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center">
        <span className="text-gray-300 text-xs">空</span>
      </div>
    )
  }

  const isWild = card.type === CARD_TYPES.WILD || card.type === CARD_TYPES.WILD4
  const displayColor = isWild && currentColor ? currentColor : card.color
  const colorClasses = COLOR_CLASSES[displayColor] || COLOR_CLASSES.black

  const displayContent =
    card.type === CARD_TYPES.NUMBER
      ? card.value
      : CARD_SYMBOLS[card.type] || '?'

  return (
    <div
      className={`
        relative w-24 h-36 rounded-xl border-4 shadow-xl flex-shrink-0
        transition-transform duration-150 ease-out
        ${isLanding ? 'scale-110' : 'scale-100'}
        ${isWild
          ? 'bg-gradient-to-br from-red-500 via-yellow-500 via-green-500 to-blue-500'
          : colorClasses.bg
        }
        border-white ring-4 ${colorClasses.ring ?? 'ring-white/50'}
      `}
    >
      {/* 白色内卡片 */}
      <div className="absolute inset-2 bg-white rounded-lg flex flex-col justify-between p-1.5">
        {/* 左上角 */}
        <div
          className={`text-left font-extrabold text-sm leading-none ${
            isWild ? 'text-gray-900' : colorClasses.text
          }`}
        >
          {displayContent}
        </div>

        {/* 中央大号 */}
        <div
          className={`text-center font-extrabold text-4xl ${
            isWild ? 'text-gray-900' : colorClasses.text
          }`}
        >
          {displayContent}
        </div>

        {/* 右下角（镜像） */}
        <div
          className={`text-right font-extrabold text-sm leading-none transform rotate-180 ${
            isWild ? 'text-gray-900' : colorClasses.text
          }`}
        >
          {displayContent}
        </div>
      </div>

      {/* Wild 牌选色后的颜色标记 */}
      {isWild && currentColor && currentColor !== 'black' && (
        <div
          className={`absolute -top-2 -right-2 w-7 h-7 rounded-full border-2 border-white shadow-md ${COLOR_CLASSES[currentColor]?.bg}`}
        />
      )}
    </div>
  )
}

/**
 * @param {Object} props
 * @param {Object} props.topCard - 弃牌堆顶牌
 * @param {string} props.currentColor - 当前有效颜色（Wild 牌选色后）
 * @param {number} props.drawPileCount - 摸牌堆剩余数量
 * @param {boolean} props.isMyTurn - 是否轮到我
 * @param {boolean} props.canDraw - 是否可以摸牌
 * @param {Function} props.onDraw - 点击摸牌堆回调
 */
export default function CenterPile({
  topCard,
  currentColor,
  drawPileCount,
  isMyTurn,
  canDraw,
  onDraw,
  discardPileRef,
  drawPileRef,
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      {/* 当前有效颜色指示器（Wild 选色后） */}
      {currentColor && currentColor !== 'black' && (
        <div
          className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-white text-xs font-bold shadow-md ${COLOR_CLASSES[currentColor]?.bg}`}
        >
          <div className="w-2.5 h-2.5 rounded-full bg-white/60" />
          当前颜色：{COLOR_NAMES[currentColor] || currentColor}
        </div>
      )}

      {/* 牌堆区域 */}
      <div className="flex items-center gap-8">
        {/* 摸牌堆 */}
        <div className="flex flex-col items-center gap-2">
          <button
            ref={drawPileRef}
            onClick={isMyTurn && canDraw ? onDraw : undefined}
            className={`relative transform transition-all ${
              isMyTurn && canDraw
                ? 'hover:scale-110 active:scale-95 cursor-pointer hover:-translate-y-2 drop-shadow-xl'
                : 'cursor-default'
            }`}
          >
            {/* 多层叠加效果（模拟厚度） */}
            <div className="absolute top-2 left-2 w-[72px] h-[108px] rounded-xl bg-gray-700 opacity-30" />
            <div className="absolute top-1 left-1 w-[72px] h-[108px] rounded-xl bg-gray-700 opacity-50" />
            {/* 主牌面 */}
            <div
              className={`
                relative w-[72px] h-[108px] rounded-xl bg-gradient-to-br from-gray-600 to-gray-900
                border-4 border-gray-500 flex items-center justify-center shadow-2xl
                ${isMyTurn && canDraw
                  ? 'ring-4 ring-yellow-400 ring-offset-2 shadow-yellow-300/50'
                  : ''
                }
              `}
            >
              <span className="text-white text-base font-black opacity-40 tracking-widest select-none rotate-[-15deg]">
                UNO
              </span>
              {/* 剩余数量 badge */}
              <div className="absolute -bottom-2 -right-2 min-w-[28px] h-7 px-1 bg-gray-800 text-white text-xs rounded-full flex items-center justify-center font-bold border-2 border-white shadow">
                {drawPileCount > 99 ? '99+' : drawPileCount}
              </div>
            </div>
          </button>
          <span className="text-xs text-gray-500 font-medium">摸牌堆</span>
        </div>

        {/* 中间箭头 */}
        <div className="flex flex-col items-center gap-1 text-gray-400">
          <div className="text-xl">→</div>
        </div>

        {/* 弃牌堆（当前顶牌，大号显示） */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative" ref={discardPileRef}>
            {/* 背景阴影层，模拟弃牌堆厚度 */}
            {topCard && (
              <>
                <div className="absolute top-1.5 left-1.5 w-24 h-36 rounded-xl bg-gray-400 opacity-30" />
                <div className="absolute top-0.5 left-0.5 w-24 h-36 rounded-xl bg-gray-400 opacity-50" />
              </>
            )}
            <TopCardDisplay card={topCard} currentColor={currentColor} />
          </div>
          <span className="text-xs text-gray-500 font-medium">弃牌堆</span>
        </div>
      </div>
    </div>
  )
}
