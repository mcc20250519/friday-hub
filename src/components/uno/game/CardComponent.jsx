/**
 * CardComponent - 单张牌渲染组件
 */

import { CARD_TYPES, COLOR_CLASSES, CARD_SYMBOLS } from '@/lib/uno/constants'

/**
 * @param {Object} props
 * @param {Object} props.card - 牌数据 { id, color, type, value }
 * @param {boolean} props.faceDown - 是否显示牌背
 * @param {boolean} props.isPlayable - 是否可出（高亮效果）
 * @param {boolean} props.isSelected - 是否选中
 * @param {Function} props.onClick - 点击回调
 * @param {string} props.size - 尺寸 'sm' | 'md' | 'lg'
 */
export default function CardComponent({
  card,
  faceDown = false,
  isPlayable = false,
  isSelected = false,
  onClick,
  size = 'md',
}) {
  if (!card) return null

  // ── 尺寸映射 ─────────────────────────────────────────────────

  const sizeClasses = {
    sm: 'w-12 h-18 text-xs',
    md: 'w-16 h-24 text-sm',
    lg: 'w-20 h-30 text-base',
  }

  // ── 牌背显示 ─────────────────────────────────────────────────

  if (faceDown) {
    return (
      <div
        className={`${sizeClasses[size]} rounded-lg bg-gradient-to-br from-gray-700 to-gray-900 border-2 border-gray-600 flex items-center justify-center shadow-lg cursor-default flex-shrink-0`}
        onClick={onClick}
      >
        <div className="text-white text-2xl font-bold opacity-30">UNO</div>
      </div>
    )
  }

  // ── 牌面显示 ─────────────────────────────────────────────────

  const colorClasses = COLOR_CLASSES[card.color] || COLOR_CLASSES.black
  const isWild = card.type === CARD_TYPES.WILD || card.type === CARD_TYPES.WILD4

  // 显示内容（数字或符号）
  const displayContent =
    card.type === CARD_TYPES.NUMBER
      ? card.value
      : CARD_SYMBOLS[card.type] || '?'

  return (
    <button
      onClick={onClick}
      disabled={!isPlayable && onClick}
      className={`
        ${sizeClasses[size]}
        rounded-lg border-4 shadow-lg transform transition-all duration-200 flex-shrink-0
        ${colorClasses.bg}
        ${isWild ? 'bg-gradient-to-br from-red-500 via-yellow-500 to-blue-500' : ''}
        ${isSelected ? 'ring-4 ring-purple-400 -translate-y-2 scale-105' : ''}
        ${isPlayable && onClick ? `cursor-pointer hover:scale-105 hover:-translate-y-1 ${colorClasses.ring} ring-2` : ''}
        ${!isPlayable && onClick ? 'opacity-50 cursor-not-allowed' : ''}
        ${!onClick ? 'cursor-default' : ''}
        relative
      `}
    >
      {/* 白色内卡片 */}
      <div className="absolute inset-2 bg-white rounded-md flex flex-col justify-between p-1">
        {/* 左上角 */}
        <div
          className={`text-left font-bold leading-none ${
            isWild ? 'text-gray-900' : colorClasses.text
          }`}
        >
          {displayContent}
        </div>

        {/* 中央大号 */}
        <div
          className={`text-center font-bold ${
            size === 'sm' ? 'text-lg' : size === 'md' ? 'text-2xl' : 'text-3xl'
          } ${isWild ? 'text-gray-900' : colorClasses.text}`}
        >
          {displayContent}
        </div>

        {/* 右下角（镜像） */}
        <div
          className={`text-right font-bold leading-none transform rotate-180 ${
            isWild ? 'text-gray-900' : colorClasses.text
          }`}
        >
          {displayContent}
        </div>
      </div>
    </button>
  )
}
