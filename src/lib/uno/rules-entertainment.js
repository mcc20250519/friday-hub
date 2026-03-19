/**
 * UNO 娱乐版规则引擎
 *
 * 核心特征：
 *  - +2 / +4 可叠加传递（pendingDrawCount 累加）
 *  - 所有玩家依次出完手牌，按顺序形成排名（rankList）
 *  - 场上仅剩最后1名有牌玩家时，该玩家自动排末位，游戏结束
 *  - Skip/+2/+4 自动跳过已出完牌（rankList 中）的玩家
 *  - 2人游戏 / 场上仅剩2人时 Reverse 等同于 Skip
 */

import { CARD_TYPES } from './constants'

/**
 * 判断一张牌是否可在当前顶牌上出（娱乐版）
 *
 * 叠加规则：
 *  - 顶牌是 +2（DRAW2）→ 可以叠加 +2 或 +4
 *  - 顶牌是 +4（WILD4）→ 只能叠加 +4（+4 力度更强，+2 不可反叠）
 *
 * 例：A出+2 → B出+2 → C出+4 → D出+4 → E无牌可叠 → E摸 2+2+4+4=12张
 */
export function canPlayCardEntertainment(card, topCard, currentColor, pendingDrawCount = 0) {
  // 叠加链激活时：根据顶牌类型决定哪些牌可以叠加
  if (pendingDrawCount > 0) {
    if (topCard.type === CARD_TYPES.WILD4) {
      // 顶牌是 +4：只能继续叠 +4
      return card.type === CARD_TYPES.WILD4
    }
    // 顶牌是 +2：可以叠 +2 或 +4
    return card.type === CARD_TYPES.DRAW2 || card.type === CARD_TYPES.WILD4
  }

  // 非叠加状态：Wild 牌始终可出
  if (card.type === CARD_TYPES.WILD || card.type === CARD_TYPES.WILD4) return true

  // 正常出牌规则（同官方）
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
 * 娱乐版：是否必须摸牌
 * - 叠加链激活（pendingDrawCount > 0）：
 *     · 顶牌是 +4 → 手中没有 +4 可叠加 → 必须摸
 *     · 顶牌是 +2 → 手中没有 +2 或 +4 可叠加 → 必须摸
 * - 无可出牌（正常情况）→ 必须摸
 */
export function mustDrawEntertainment(hand, topCard, currentColor, pendingDrawCount) {
  if (pendingDrawCount > 0) {
    let canStack
    if (topCard.type === CARD_TYPES.WILD4) {
      // 顶牌是 +4：只有 +4 可以叠加
      canStack = hand.some((c) => c.type === CARD_TYPES.WILD4)
    } else {
      // 顶牌是 +2：+2 或 +4 都可以叠加
      canStack = hand.some(
        (c) => c.type === CARD_TYPES.DRAW2 || c.type === CARD_TYPES.WILD4
      )
    }
    return !canStack
  }
  return hand.filter((c) => canPlayCardEntertainment(c, topCard, currentColor, 0)).length === 0
}

/**
 * 找到下一个仍在游戏中（手牌不为空）的玩家索引
 * @param {number} fromIndex 起始索引（不含）
 * @param {number} direction 方向 +1/-1
 * @param {Array} playerIds 玩家 ID 数组
 * @param {Object} hands 所有玩家手牌
 * @param {Array} rankList 已出完牌的玩家 ID 列表
 * @returns {number} 下一个仍在游戏中的玩家索引，-1 表示找不到
 */
function findNextActivePlayer(fromIndex, direction, playerIds, hands, rankList) {
  const count = playerIds.length
  for (let step = 1; step < count; step++) {
    const idx = ((fromIndex + direction * step) % count + count) % count
    const pid = playerIds[idx]
    if (!rankList.includes(pid) && (hands[pid] || []).length > 0) {
      return idx
    }
  }
  return -1
}

/**
 * 统计场上仍在游戏中的玩家数量
 */
function countActivePlayers(playerIds, hands, rankList) {
  return playerIds.filter(
    (pid) => !rankList.includes(pid) && (hands[pid] || []).length > 0
  ).length
}

/**
 * 娱乐版：计算下一状态（纯函数）
 * @param {Object} state   当前状态（包含 rankList）
 * @param {Object} action  { type, userId, card?, chosenColor? }
 * @param {Array}  playerIds 按座位顺序的玩家 ID 数组
 * @param {Object} [options] { scoringMode } - 积分模式，影响游戏结束判定
 */
export function getNextStateEntertainment(state, action, playerIds, options = {}) {
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
    rankList = [],
    // PRD: UNO 窗口状态
    unoWindowOpen = false,
    unoWindowOwner = null,
    reportedThisWindow = [],
  } = state

  const { type, userId, card, chosenColor } = action
  const playerCount = playerIds.length
  const { scoringMode } = options  // 积分模式：'basic' 或 'ranking'

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
    rankList: [...rankList],
    // PRD: UNO 窗口状态
    unoWindowOpen,
    unoWindowOwner,
    reportedThisWindow: [...reportedThisWindow],
  }

  switch (type) {
    case 'play': {
      if (ns.unoCalled[userId] === 'missed') throw new Error('你上轮没有喊 UNO，本轮只能摸牌！')
      if (!canPlayCardEntertainment(card, topCard, currentColor, pendingDrawCount)) {
        throw new Error('无法出这张牌')
      }

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

      // 出完手牌 → 加入排名
      if (hand.length === 0) {
        ns.rankList = [...ns.rankList, userId]
        // 清除该玩家的 UNO 状态
        const u = { ...ns.unoCalled }
        delete u[userId]
        ns.unoCalled = u
        // PRD: 关闭 UNO 窗口
        ns.unoWindowOpen = false
        ns.unoWindowOwner = null
        ns.reportedThisWindow = []

        // 检查游戏是否结束
        // 基础模式（scoringMode === 'basic'）：第一名产生后立即结束
        // 排名模式（scoringMode === 'ranking'）：继续游戏直到决出所有名次
        const remaining = countActivePlayers(playerIds, ns.hands, ns.rankList)

        // 基础模式：第一名产生后立即结束游戏
        if (scoringMode === 'basic' && ns.rankList.length >= 1) {
          ns.winnerId = ns.rankList[0]
          return ns
        }

        // 排名模式或未指定模式：继续游戏直到只剩 1 人
        if (remaining <= 1) {
          // 找出最后剩余的玩家，加入末位
          const lastPlayer = playerIds.find(
            (pid) => !ns.rankList.includes(pid) && (ns.hands[pid] || []).length > 0
          )
          if (lastPlayer) {
            ns.rankList = [...ns.rankList, lastPlayer]
          }
          // 游戏结束：winnerId = 第一名
          ns.winnerId = ns.rankList[0]
          return ns
        }

        // 游戏继续，把回合给下一个仍在游戏中的玩家
        const nextIdx = findNextActivePlayer(currentPlayerIndex, direction, playerIds, ns.hands, ns.rankList)
        if (nextIdx === -1) {
          // 理论上不会到这里（上面已处理 remaining <= 1）
          ns.winnerId = ns.rankList[0]
          return ns
        }
        ns.currentPlayerIndex = nextIdx
        ns.pendingDrawCount = 0
        return ns
      }

      // PRD: 出牌后手牌剩1张 → 开启 UNO 窗口
      // 窗口归属为当前出牌玩家，持续到下一位玩家开始操作
      if (hand.length === 1) {
        ns.unoWindowOpen = true
        ns.unoWindowOwner = userId
        ns.reportedThisWindow = []
        if (!ns.unoCalled[userId]) {
          ns.unoCalled = { ...ns.unoCalled, [userId]: false }
        }
      }
      // 注意：手牌 > 1 张时，不清除窗口状态，因为窗口本来就不属于当前玩家

      // 功能牌效果 - 只更新回合，不清除 UNO 窗口
      // 窗口会在下一位玩家开始操作时关闭
      switch (card.type) {
        case CARD_TYPES.SKIP: {
          // 跳过下一个仍在游戏中的玩家
          const skipIdx = findNextActivePlayer(currentPlayerIndex, direction, playerIds, ns.hands, ns.rankList)
          if (skipIdx === -1) break
          // 再找跳过后的下一个
          const afterSkipIdx = findNextActivePlayer(skipIdx, direction, playerIds, ns.hands, ns.rankList)
          ns.currentPlayerIndex = afterSkipIdx !== -1 ? afterSkipIdx : currentPlayerIndex
          ns.pendingDrawCount = 0
          break
        }

        case CARD_TYPES.REVERSE: {
          // 统计仍在游戏中的人数
          const activeCount = countActivePlayers(playerIds, ns.hands, ns.rankList)
          if (activeCount <= 2) {
            // 2人（含已出完牌只剩2人有牌）时等同 Skip
            const skipIdx2 = findNextActivePlayer(currentPlayerIndex, direction, playerIds, ns.hands, ns.rankList)
            if (skipIdx2 !== -1) {
              const afterSkip2 = findNextActivePlayer(skipIdx2, direction, playerIds, ns.hands, ns.rankList)
              ns.currentPlayerIndex = afterSkip2 !== -1 ? afterSkip2 : currentPlayerIndex
            }
          } else {
            ns.direction = -direction
            const nextIdx2 = findNextActivePlayer(currentPlayerIndex, ns.direction, playerIds, ns.hands, ns.rankList)
            ns.currentPlayerIndex = nextIdx2 !== -1 ? nextIdx2 : currentPlayerIndex
          }
          ns.pendingDrawCount = 0
          break
        }

        case CARD_TYPES.DRAW2:
          // 娱乐版：累加
          ns.pendingDrawCount = pendingDrawCount + 2
          {
            const nextDraw2 = findNextActivePlayer(currentPlayerIndex, direction, playerIds, ns.hands, ns.rankList)
            ns.currentPlayerIndex = nextDraw2 !== -1 ? nextDraw2 : currentPlayerIndex
          }
          break

        case CARD_TYPES.WILD4:
          // 娱乐版：累加
          ns.pendingDrawCount = pendingDrawCount + 4
          {
            const nextWild4 = findNextActivePlayer(currentPlayerIndex, direction, playerIds, ns.hands, ns.rankList)
            ns.currentPlayerIndex = nextWild4 !== -1 ? nextWild4 : currentPlayerIndex
          }
          break

        default:
          // 数字牌 / Wild
          ns.pendingDrawCount = 0
          {
            const nextDefault = findNextActivePlayer(currentPlayerIndex, direction, playerIds, ns.hands, ns.rankList)
            ns.currentPlayerIndex = nextDefault !== -1 ? nextDefault : currentPlayerIndex
          }
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
      const nextDrawIdx = findNextActivePlayer(currentPlayerIndex, direction, playerIds, ns.hands, ns.rankList)
      ns.currentPlayerIndex = nextDrawIdx !== -1 ? nextDrawIdx : currentPlayerIndex
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
