/**
 * MobileHandCards - 移动端手牌组件
 * 
 * 横向滚动展示手牌，支持点击选择
 */

import MobileCard from './MobileCard'
import { canPlayCard } from '@/lib/uno/rules'

/**
 * @param {Object} props
 * @param {Array} props.cards - 手牌列表
 * @param {Array} props.selectedCards - 已选中的卡牌
 * @param {Object} props.topCard - 当前出牌堆顶卡牌
 * @param {string} props.currentColor - 当前花色
 * @param {Function} props.onSelectCard - 选择卡牌回调
 * @param {boolean} props.disabled - 是否禁用（非自己的回合）
 */
export default function MobileHandCards({
  cards = [],
  selectedCards = [],
  topCard,
  currentColor,
  onSelectCard,
  disabled = false,
}) {
  // 判断卡牌是否可出
  const getCardPlayability = (card) => {
    if (disabled || !topCard) return false
    return canPlayCard(card, topCard, currentColor)
  }

  // 处理卡牌点击
  const handleCardClick = (card) => {
    if (disabled) return
    if (onSelectCard) {
      onSelectCard(card)
    }
  }

  if (cards.length === 0) {
    return (
      <div className="w-full py-6 flex items-center justify-center text-gray-400">
        <p>暂无手牌</p>
      </div>
    )
  }

  return (
    <div className="w-full py-4">
      {/* 横向滚动容器 */}
      <div className="flex gap-3 px-4 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
        {cards.map((card, index) => {
          const isSelected = selectedCards.some((c) => c.id === card.id)
          const isPlayable = getCardPlayability(card)

          return (
            <div
              key={card.id || `card-${index}`}
              className={`
                flex-shrink-0 transition-all duration-200
                ${isSelected ? 'transform -translate-y-3 scale-105' : ''}
                ${isPlayable && !disabled ? 'cursor-pointer' : 'cursor-not-allowed'}
              `}
              onClick={() => handleCardClick(card)}
            >
              <MobileCard
                card={card}
                isPlayable={isPlayable}
                isSelected={isSelected}
                width={70}
                height={98}
              />
            </div>
          )
        })}
      </div>
      
      {/* 手牌数量提示 */}
      <div className="text-center mt-2 text-sm text-gray-500">
        {cards.length} 张手牌
      </div>
    </div>
  )
}
