/**
 * UNO Bot 逻辑
 * 提供简单的 AI 出牌策略，支持官方版和娱乐版
 */

import { CARD_TYPES, COLORS, GAME_MODES } from './constants'
import { getPlayableCards } from './rules'

/**
 * Bot 决策：选择要出的牌
 * @param {Array}  hand              Bot 手牌
 * @param {Object} topCard           当前顶牌
 * @param {string} currentColor      当前有效颜色
 * @param {number} pendingDrawCount  待摸牌数
 * @param {string} [gameMode]        游戏模式，默认官方版
 * @returns {{ card: Object|null, chosenColor: string|null }}
 */
export function decideBotMove(
  hand,
  topCard,
  currentColor,
  pendingDrawCount,
  gameMode = GAME_MODES.STANDARD
) {
  const isEntertainment = gameMode === GAME_MODES.ENTERTAINMENT

  // ── 娱乐版叠加链激活时 ──────────────────────────────────────
  if (isEntertainment && pendingDrawCount > 0) {
    // 优先叠加 +4（伤害更高）
    const wild4 = hand.find((c) => c.type === CARD_TYPES.WILD4)
    if (wild4) {
      return { card: wild4, chosenColor: chooseBestColor(hand) }
    }
    // 顶牌是 +2 时，才能用 +2 叠加（顶牌是 +4 时不能用 +2 反叠）
    if (topCard.type !== CARD_TYPES.WILD4) {
      const draw2 = hand.find((c) => c.type === CARD_TYPES.DRAW2)
      if (draw2) {
        return { card: draw2, chosenColor: null }
      }
    }
    // 没有可叠加的牌，必须摸牌
    return { card: null, chosenColor: null }
  }

  // ── 官方版：有待摸牌惩罚时，只能摸牌 ─────────────────────────
  if (!isEntertainment && pendingDrawCount > 0) {
    return { card: null, chosenColor: null }
  }

  // ── 获取可出的牌（娱乐版传 pendingDrawCount=0，链为空时正常出牌）
  const playableCards = getPlayableCards(hand, topCard, currentColor, 0, gameMode)

  if (playableCards.length === 0) {
    return { card: null, chosenColor: null }
  }

  // ── 出牌策略优先级 ────────────────────────────────────────────
  // 1. 功能牌（Skip / Reverse / +2）—— 优先攻击
  // 2. 数字牌
  // 3. Wild（变色）
  // 4. Wild+4（最后使用，保留作为关键打击）

  const nonWildCards = playableCards.filter(
    (c) => c.type !== CARD_TYPES.WILD && c.type !== CARD_TYPES.WILD4
  )

  if (nonWildCards.length > 0) {
    const actionCards = nonWildCards.filter((c) => c.type !== CARD_TYPES.NUMBER)
    const numberCards = nonWildCards.filter((c) => c.type === CARD_TYPES.NUMBER)

    if (actionCards.length > 0) {
      return { card: actionCards[0], chosenColor: null }
    }
    return { card: numberCards[0], chosenColor: null }
  }

  const wildCard = playableCards.find((c) => c.type === CARD_TYPES.WILD)
  if (wildCard) {
    return { card: wildCard, chosenColor: chooseBestColor(hand) }
  }

  const wild4 = playableCards.find((c) => c.type === CARD_TYPES.WILD4)
  if (wild4) {
    return { card: wild4, chosenColor: chooseBestColor(hand) }
  }

  return { card: playableCards[0], chosenColor: null }
}

/**
 * 为 Wild 牌选择最优颜色（手牌中数量最多的颜色）
 * @param {Array} hand - Bot 手牌
 * @returns {string} 颜色
 */
function chooseBestColor(hand) {
  const colorCount = {}
  COLORS.forEach((color) => {
    colorCount[color] = 0
  })

  hand.forEach((card) => {
    if (COLORS.includes(card.color)) {
      colorCount[card.color]++
    }
  })

  // 找出数量最多的颜色
  let maxCount = 0
  let bestColor = COLORS[0]

  COLORS.forEach((color) => {
    if (colorCount[color] > maxCount) {
      maxCount = colorCount[color]
      bestColor = color
    }
  })

  return bestColor
}

/**
 * 生成 Bot 玩家信息
 * @param {number} seatIndex - 座位索引
 * @returns {Object} 模拟的 profile 对象
 */
export function createBotProfile(seatIndex = 1) {
  const botNames = ['机器人小美', '机器人小智', '机器人小王']
  return {
    id: `bot_${Date.now()}_${seatIndex}`,
    nickname: botNames[seatIndex % botNames.length],
    username: `bot_${seatIndex}`,
    avatar_url: null,
    isBot: true, // 标记为机器人
  }
}
