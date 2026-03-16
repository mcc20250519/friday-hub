/**
 * MobileCard - 移动端单张卡牌组件
 * 复用 PC 端的卡牌渲染逻辑，但优化为移动端尺寸和触摸交互
 */

import { CARD_TYPES, COLOR_CLASSES, CARD_SYMBOLS } from '@/lib/uno/constants'

/**
 * @param {Object} props
 * @param {Object} props.card - 牌数据 { id, color, type, value }
 * @param {boolean} props.faceDown - 是否显示牌背
 * @param {boolean} props.isPlayable - 是否可出（高亮效果）
 * @param {boolean} props.isSelected - 是否选中
 * @param {Function} props.onClick - 点击回调
 * @param {number} props.width - 卡牌宽度（像素）
 * @param {number} props.height - 卡牌高度（像素）
 * @param {Object} props.style - 额外样式（用于扇形定位）
 */
export default function MobileCard({
  card,
  faceDown = false,
  isPlayable = false,
  isSelected = false,
  onClick,
  width = 70,
  height = 98,
  style = {},
}) {
  if (!card) return null

  // ── 牌背显示 ─────────────────────────────────────────────────

  if (faceDown) {
    return (
      <div
        className="rounded-lg bg-gradient-to-br from-gray-700 to-gray-900 border-2 border-gray-600 flex items-center justify-center shadow-lg cursor-default flex-shrink-0"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          ...style,
        }}
        onClick={onClick}
      >
        <div className="text-white text-xl font-bold opacity-30">UNO</div>
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

  // 响应式字体大小
  const fontSize = {
    corner: Math.max(10, width / 7),
    center: Math.max(16, width / 2.5),
  }

  return (
    <button
      onClick={onClick}
      disabled={!isPlayable && onClick}
      aria-label={`${card.color} ${card.type} ${card.value || ''}`}
      className={`
        rounded-lg border-4 shadow-lg transform transition-all duration-200 flex-shrink-0
        ${colorClasses.bg}
        ${isWild ? 'bg-gradient-to-br from-red-500 via-yellow-500 to-blue-500' : ''}
        ${isSelected ? 'ring-4 ring-purple-400 scale-105' : ''}
        ${isPlayable && onClick ? `cursor-pointer active:scale-95 ${colorClasses.ring} ring-2` : ''}
        ${!isPlayable && onClick ? 'opacity-50 cursor-not-allowed' : ''}
        ${!onClick ? 'cursor-default' : ''}
        relative
      `}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        touchAction: 'manipulation', // 禁用双击缩放
        ...style,
      }}
    >
      {/* 白色内卡片 */}
      <div className="absolute inset-2 bg-white rounded-md flex flex-col justify-between p-1">
        {/* 左上角 */}
        <div
          className={`text-left font-bold leading-none ${
            isWild ? 'text-gray-900' : colorClasses.text
          }`}
          style={{ fontSize: `${fontSize.corner}px` }}
        >
          {displayContent}
        </div>

        {/* 中央大号 */}
        <div
          className={`text-center font-bold ${isWild ? 'text-gray-900' : colorClasses.text}`}
          style={{ fontSize: `${fontSize.center}px` }}
        >
          {displayContent}
        </div>

        {/* 右下角（镜像） */}
        <div
          className={`text-right font-bold leading-none transform rotate-180 ${
            isWild ? 'text-gray-900' : colorClasses.text
          }`}
          style={{ fontSize: `${fontSize.corner}px` }}
        >
          {displayContent}
        </div>
      </div>
    </button>
  )
}
