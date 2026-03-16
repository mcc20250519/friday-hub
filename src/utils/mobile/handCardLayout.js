/**
 * 手牌扇形布局计算工具
 * 
 * 根据卡牌数量计算扇形排列的位置和旋转角度
 */

/**
 * 计算扇形手牌的布局参数
 * 
 * @param {number} cardCount - 卡牌数量
 * @param {number} containerWidth - 容器宽度
 * @param {number} containerHeight - 容器高度（手牌区域）
 * @param {number} cardWidth - 单张卡牌宽度
 * @returns {Object} 布局参数 { fanAngle, radius, centerX, centerY, cardPositions }
 */
export function calculateFanLayout(cardCount, containerWidth, containerHeight, cardWidth = 70) {
  if (cardCount === 0) {
    return { fanAngle: 0, radius: 0, centerX: 0, centerY: 0, cardPositions: [] }
  }

  // 1. 根据卡牌数量动态调整扇形总角度
  let fanAngle
  if (cardCount <= 3) {
    fanAngle = 40 // 很少的卡牌，角度小
  } else if (cardCount <= 7) {
    fanAngle = 60 + (cardCount - 3) * 10 // 4-7张: 70°-100°
  } else {
    fanAngle = Math.min(120, 100 + (cardCount - 7) * 5) // 8+张: 最多120°
  }

  // 2. 计算半径（根据容器大小和卡牌宽度）
  // 半径需要足够大，使卡牌不重叠，但又不能太大导致超出容器
  const minRadius = (cardWidth * cardCount) / (2 * Math.PI) * 3 // 基于周长估算
  const maxRadius = Math.min(containerWidth * 0.8, containerHeight * 2)
  const radius = Math.max(minRadius, Math.min(maxRadius, 180))

  // 3. 扇心位置（在手牌区域底部中央的下方）
  const centerX = containerWidth / 2
  const centerY = containerHeight + radius * 0.6 // 扇心在容器下方

  // 4. 计算每张卡牌的位置和旋转角度
  const cardPositions = []
  const angleStep = cardCount > 1 ? fanAngle / (cardCount - 1) : 0
  const startAngle = 90 - fanAngle / 2 // 起始角度（从左侧开始）

  for (let i = 0; i < cardCount; i++) {
    const angle = startAngle + i * angleStep
    const angleRad = (angle * Math.PI) / 180

    // 卡牌位置（扇形上的点）
    const x = centerX + radius * Math.cos(angleRad)
    const y = centerY - radius * Math.sin(angleRad)

    // 卡牌旋转角度（朝向扇心）
    const rotation = angle - 90

    cardPositions.push({
      index: i,
      x,
      y,
      rotation,
      angle,
      zIndex: cardCount - Math.abs(i - cardCount / 2), // 中间的卡牌 z-index 最高
    })
  }

  return {
    fanAngle,
    radius,
    centerX,
    centerY,
    cardPositions,
  }
}

/**
 * 获取响应式卡牌尺寸
 * 
 * @param {number} screenWidth - 屏幕宽度
 * @returns {Object} { cardWidth, cardHeight }
 */
export function getResponsiveCardSize(screenWidth) {
  if (screenWidth < 360) {
    // xs: 超小屏幕
    return { cardWidth: 50, cardHeight: 70 }
  } else if (screenWidth < 480) {
    // sm: 小屏幕
    return { cardWidth: 60, cardHeight: 84 }
  } else if (screenWidth < 640) {
    // md: 中等屏幕
    return { cardWidth: 70, cardHeight: 98 }
  } else {
    // lg+: 大屏幕
    return { cardWidth: 80, cardHeight: 112 }
  }
}

/**
 * 检查两张卡牌是否重叠
 * 
 * @param {Object} card1 - 第一张卡牌的位置信息
 * @param {Object} card2 - 第二张卡牌的位置信息
 * @param {number} cardWidth - 卡牌宽度
 * @param {number} cardHeight - 卡牌高度
 * @returns {boolean} 是否重叠
 */
export function checkCardOverlap(card1, card2, cardWidth, cardHeight) {
  // 简化碰撞检测：使用圆形边界框
  const radius = Math.max(cardWidth, cardHeight) / 2
  const distance = Math.sqrt(
    Math.pow(card2.x - card1.x, 2) + Math.pow(card2.y - card1.y, 2)
  )
  return distance < radius * 1.5 // 1.5 是安全系数
}

export default {
  calculateFanLayout,
  getResponsiveCardSize,
  checkCardOverlap,
}
