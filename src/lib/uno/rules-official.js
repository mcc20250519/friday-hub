/**
 * UNO 官方 Mattel 规则引擎
 *
 * 核心特征：
 *  - +2 / +4 不可叠加，受罚玩家必须摸牌
 *  - 首位打完手牌即获胜，游戏立即结束
 *  - Wild Draw Four 有质疑机制（本版本暂不实现，留扩展点）
 */

import { CARD_TYPES } from './constants'

/**
 * 判断一张牌是否可在当前顶牌上出（官方规则）
 */
export function canPlayCardOfficial(card, topCard, currentColor) {
  if (card.type === CARD_TYPES.WILD || card.type === CARD_TYPES.WILD4) return true
  if (card.color === currentColor) return true
  if (
    card.type === CARD_TYPES.NUMBER &&
    topCard.type === CARD_TYPES.NUMBER &&
    card.value === topCard.value
  ) return true
  if (
    card.type !== CARD_TYPES.NUMBER &&
    topCard.type !== CARD_TYPES.WILD &&
    topCard.type !== CARD_TYPES.WILD4 &&
    card.type === topCard.type
  ) return true
  return false
}

/**
 * 官方规则：是否必须摸牌
 * - 有 pendingDrawCount > 0 → 必须摸，不可叠加
 * - 无可出牌 → 必须摸
 */
export function mustDrawOfficial(hand, topCard, currentColor, pendingDrawCount) {
  if (pendingDrawCount > 0) return true
  return hand.filter((c) => canPlayCardOfficial(c, topCard, currentColor)).length === 0
}

/**
 * 官方规则：计算下一状态（纯函数）
 * @param {Object} state  当前状态
 * @param {Object} action { type, userId, card?, chosenColor? }
 * @param {Array}  playerIds 按座位顺序的玩家 ID 数组
 */
export function getNextStateOfficial(state, action, playerIds) {
  const {
    currentPlayerIndex,
    direction,
    currentColor,
    topCard,
    drawPile,
    hands,
    discardPile = [],
    pendingDrawCount,
    unoCalled = {},
    // PRD: UNO 窗口状态
    unoWindowOpen = false,
    unoWindowOwner = null,
    reportedThisWindow = [],
  } = state

  const { type, userId, card, chosenColor } = action
  const playerCount = playerIds.length

  if (playerIds[currentPlayerIndex] !== userId) {
    throw new Error('不是你的回合')
  }

  // 克隆状态
  const ns = {
    currentPlayerIndex,
    direction,
    currentColor,
    topCard,
    drawPile: [...drawPile],
    discardPile: [...discardPile],
    hands: JSON.parse(JSON.stringify(hands)),
    pendingDrawCount,
    winnerId: null,
    unoCalled: { ...unoCalled },
    rankList: [],  // 官方版不使用，始终为空
    // PRD: UNO 窗口状态
    unoWindowOpen,
    unoWindowOwner,
    reportedThisWindow: [...reportedThisWindow],
  }

  switch (type) {
    case 'play': {
      if (ns.unoCalled[userId] === 'missed') throw new Error('你上轮没有喊 UNO，本轮只能摸牌！')
      if (!canPlayCardOfficial(card, topCard, currentColor)) throw new Error('无法出这张牌')

      // PRD: 下一位玩家开始操作 → 先关闭上一个 UNO 窗口
      // 窗口持续到下一位玩家真正开始操作（出牌或摸牌）
      if (unoWindowOpen && unoWindowOwner !== userId) {
        ns.unoWindowOpen = false
        ns.unoWindowOwner = null
        ns.reportedThisWindow = []
      }

      const hand = ns.hands[userId]
      const idx = hand.findIndex((c) => c.id === card.id)
      if (idx === -1) throw new Error('手牌中没有这张牌')
      hand.splice(idx, 1)

      ns.discardPile.push(card)
      ns.topCard = card

      if (card.type === CARD_TYPES.WILD || card.type === CARD_TYPES.WILD4) {
        if (!chosenColor) throw new Error('Wild 牌必须选择颜色')
        ns.currentColor = chosenColor
      } else {
        ns.currentColor = card.color
      }

      // 出完手牌 → 获胜
      if (hand.length === 0) {
        ns.winnerId = userId
        // PRD: 直接获胜时关闭 UNO 窗口
        ns.unoWindowOpen = false
        ns.unoWindowOwner = null
        ns.reportedThisWindow = []
        return ns
      }

      // PRD: 出牌后手牌剩1张 → 开启 UNO 窗口
      // 窗口归属为当前出牌玩家，持续到下一位玩家开始操作
      if (hand.length === 1) {
        ns.unoWindowOpen = true
        ns.unoWindowOwner = userId
        ns.reportedThisWindow = []  // 新窗口清空举报记录
        // 同时保留旧的 unoCalled 逻辑（兼容）
        if (!ns.unoCalled[userId]) {
          ns.unoCalled = { ...ns.unoCalled, [userId]: false }
        }
      }
      // 注意：手牌 > 1 张时，不清除窗口状态，因为窗口本来就不属于当前玩家

      // 功能牌效果 - 只更新回合，不清除 UNO 窗口
      // 窗口会在下一位玩家开始操作时关闭
      switch (card.type) {
        case CARD_TYPES.SKIP:
          ns.currentPlayerIndex = (currentPlayerIndex + direction * 2 + playerCount) % playerCount
          ns.pendingDrawCount = 0
          break

        case CARD_TYPES.REVERSE:
          if (playerCount === 2) {
            // 2人时等同 Skip
            ns.currentPlayerIndex = currentPlayerIndex
          } else {
            ns.direction = -direction
            ns.currentPlayerIndex = (currentPlayerIndex + ns.direction + playerCount) % playerCount
          }
          ns.pendingDrawCount = 0
          break

        case CARD_TYPES.DRAW2:
          // 官方：不可叠加，直接赋值
          ns.pendingDrawCount = 2
          ns.currentPlayerIndex = (currentPlayerIndex + direction + playerCount) % playerCount
          break

        case CARD_TYPES.WILD4:
          // 官方：不可叠加，直接赋值
          ns.pendingDrawCount = 4
          ns.currentPlayerIndex = (currentPlayerIndex + direction + playerCount) % playerCount
          break

        default:
          ns.currentPlayerIndex = (currentPlayerIndex + direction + playerCount) % playerCount
          ns.pendingDrawCount = 0
      }
      break
    }

    case 'draw': {
      // PRD: 下一位玩家开始操作 → 关闭上一个 UNO 窗口
      if (unoWindowOpen && unoWindowOwner !== userId) {
        ns.unoWindowOpen = false
        ns.unoWindowOwner = null
        ns.reportedThisWindow = []
      }

      const drawCount = pendingDrawCount > 0 ? pendingDrawCount : 1
      if (ns.drawPile.length < drawCount) {
        return { ...ns, needReshuffle: true }
      }

      const drawn = ns.drawPile.splice(0, drawCount)
      ns.hands[userId].push(...drawn)

      const handAfter = ns.hands[userId]
      const unoStatus = ns.unoCalled[userId]
      const shouldClear =
        unoStatus === 'missed' ||
        unoStatus === false ||
        (unoStatus === true && handAfter.length > 1)

      if (shouldClear) {
        const u = { ...ns.unoCalled }
        delete u[userId]
        ns.unoCalled = u
      }

      ns.pendingDrawCount = 0
      ns.currentPlayerIndex = (currentPlayerIndex + direction + playerCount) % playerCount
      break
    }

    case 'uno': {
      const playerHand = ns.hands[userId] || []
      if (playerHand.length === 1) {
        ns.unoCalled = { ...ns.unoCalled, [userId]: true }
      }
      break
    }

    default:
      throw new Error(`未知动作类型: ${type}`)
  }

  return ns
}
