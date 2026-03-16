/**
 * MobileHandCards - 移动端扇形手牌组件
 * 
 * 将卡牌以扇形排列显示在屏幕底部，支持点击选择
 */

import { useState, useEffect, useRef, useMemo } from 'react'
import MobileCard from './MobileCard'
import { calculateFanLayout, getResponsiveCardSize } from '@/utils/mobile/handCardLayout'
import { canPlayCard } from '@/lib/uno/rules'

/**
 * @param {Object} props
 * @param {Array} props.cards - 手牌列表
 * @param {Array} props.selectedCards - 已选中的卡牌
 * @param {Object} props.topCard - 当前出牌堆顶卡牌
 * @param {string} props.currentColor - 当前花色
 * @param {Function} props.onSelectCard - 选择卡牌回调
 * @param {boolean} props.disabled - 是否禁用（非自己的回合）
 * @param {number} props.containerHeight - 容器高度
 */
export default function MobileHandCards({
  cards = [],
  selectedCards = [],
  topCard,
  currentColor,
  onSelectCard,
  disabled = false,
  containerHeight = 180,
}) {
  const containerRef = useRef(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [cardSize, setCardSize] = useState({ cardWidth: 70, cardHeight: 98 })

  // 监听容器宽度变化
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth
        setContainerWidth(width)
        setCardSize(getResponsiveCardSize(width))
      }
    }

    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  // 计算扇形布局
  const layout = useMemo(() => {
    if (!containerWidth || cards.length === 0) {
      return { cardPositions: [] }
    }
    return calculateFanLayout(
      cards.length,
      containerWidth,
      containerHeight,
      cardSize.cardWidth
    )
  }, [cards.length, containerWidth, containerHeight, cardSize.cardWidth])

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
      <div
        ref={containerRef}
        className="w-full flex items-center justify-center text-gray-400"
        style={{ height: `${containerHeight}px` }}
      >
        <p>暂无手牌</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden"
      style={{ height: `${containerHeight}px` }}
    >
      {/* 扇形手牌 */}
      {layout.cardPositions.map((position, index) => {
        const card = cards[index]
        if (!card) return null

        const isSelected = selectedCards.some((c) => c.id === card.id)
        const isPlayable = getCardPlayability(card)

        // 计算卡牌样式（位置、旋转、z-index）
        const cardStyle = {
          position: 'absolute',
          left: `${position.x - cardSize.cardWidth / 2}px`,
          top: `${position.y - cardSize.cardHeight / 2}px`,
          transform: `rotate(${position.rotation}deg) ${isSelected ? 'translateY(-20px)' : ''}`,
          transformOrigin: 'center center',
          zIndex: isSelected ? 1000 : position.zIndex,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }

        return (
          <div key={card.id || `card-${index}`} style={cardStyle}>
            <MobileCard
              card={card}
              isPlayable={isPlayable}
              isSelected={isSelected}
              onClick={() => handleCardClick(card)}
              width={cardSize.cardWidth}
              height={cardSize.cardHeight}
            />
          </div>
        )
      })}
    </div>
  )
}
