/**
 * UNO 牌组生成与发牌逻辑
 *
 * 单副标准 UNO 牌组共 108 张：
 *  - 每色 0 × 1 + 1-9 × 2 = 19 张 × 4 色 = 76 张
 *  - 每色 Skip × 2 + Reverse × 2 + Draw2 × 2 = 6 × 4 = 24 张
 *  - Wild × 4 + Wild+4 × 4 = 8 张
 *  总计：76 + 24 + 8 = 108 张
 *
 * 7 人及以上使用双副牌组共 216 张（两副 108 张合并）。
 */

import { COLORS, CARD_TYPES, INITIAL_HAND_SIZE, DOUBLE_DECK_THRESHOLD } from './constants'

let _cardIdCounter = 0

/**
 * 生成一张牌
 */
function makeCard(color, type, value = null) {
  return {
    id: `card_${++_cardIdCounter}`,
    color,
    type,
    value, // 数字牌为 0-9，功能牌为 null
  }
}

/**
 * 生成单副 108 张 UNO 牌组（内部使用，不重置计数器）
 */
function createSingleDeck() {
  const deck = []

  COLORS.forEach((color) => {
    // 数字牌：0 × 1，1-9 × 2
    deck.push(makeCard(color, CARD_TYPES.NUMBER, 0))
    for (let num = 1; num <= 9; num++) {
      deck.push(makeCard(color, CARD_TYPES.NUMBER, num))
      deck.push(makeCard(color, CARD_TYPES.NUMBER, num))
    }

    // 功能牌：每种 × 2
    for (let i = 0; i < 2; i++) {
      deck.push(makeCard(color, CARD_TYPES.SKIP))
      deck.push(makeCard(color, CARD_TYPES.REVERSE))
      deck.push(makeCard(color, CARD_TYPES.DRAW2))
    }
  })

  // Wild 牌：各 4 张
  for (let i = 0; i < 4; i++) {
    deck.push(makeCard('black', CARD_TYPES.WILD))
    deck.push(makeCard('black', CARD_TYPES.WILD4))
  }

  return deck
}

/**
 * 生成 UNO 牌组
 * @param {number} [playerCount=4] - 玩家人数，≥ DOUBLE_DECK_THRESHOLD 时使用双副牌
 * @returns {Array} 108 或 216 张牌的数组
 */
export function createDeck(playerCount = 4) {
  _cardIdCounter = 0 // 每次创建时重置计数器

  if (playerCount >= DOUBLE_DECK_THRESHOLD) {
    // 双副牌：两副 108 张合并，id 全局唯一
    return [...createSingleDeck(), ...createSingleDeck()]
  }
  return createSingleDeck()
}

/**
 * Fisher-Yates 洗牌算法
 * @param {Array} deck 牌组
 * @returns {Array} 洗完的牌组（原数组的副本）
 */
export function shuffleDeck(deck) {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * 发牌
 * @param {Array} deck 已洗好的牌组
 * @param {number} playerCount 玩家数量
 * @param {Array} playerIds 玩家 userId 数组（按座位顺序）
 * @returns {{ hands: Object, remaining: Array, topCard: Object, skippedTopCards: Array }}
 *   hands: { userId: [cards] }
 *   remaining: 剩余摸牌堆
 *   topCard: 第一张翻开的数字牌（保证是数字牌 0-9）
 *   skippedTopCards: 被跳过的功能牌列表（供开场动画"重翻"效果使用）
 *
 * PRD 规则：起始牌必须是数字牌（0-9），所有功能牌（Skip/Reverse/Draw2/Wild/Wild4）
 * 均放回牌堆底部并重新翻，直到翻出数字牌为止。
 */
export function dealCards(deck, playerCount, playerIds) {
  let pile = [...deck]
  const hands = {}

  // 初始化每个玩家的手牌
  playerIds.forEach((id) => {
    hands[id] = []
  })

  // 每人发 INITIAL_HAND_SIZE 张
  for (let round = 0; round < INITIAL_HAND_SIZE; round++) {
    for (let p = 0; p < playerCount; p++) {
      const card = pile.shift()
      hands[playerIds[p]].push(card)
    }
  }

  // 翻开第一张作为起始牌：必须是数字牌（0-9）
  // 所有功能牌（Skip / Reverse / Draw2 / Wild / Wild4）均放回底部重新翻
  // 记录被跳过的功能牌序列，供开场动画"重翻"效果播放
  const skippedTopCards = []
  let topCard = null
  let safetyLimit = pile.length + 1  // 防止无限循环（理论上不会发生）

  while (pile.length > 0 && safetyLimit-- > 0) {
    const candidate = pile.shift()
    if (candidate.type === CARD_TYPES.NUMBER) {
      // 数字牌：合法起始牌
      topCard = candidate
      break
    }
    // 任何功能牌（Skip/Reverse/Draw2/Wild/Wild4）：放回底部，记录供动画用
    skippedTopCards.push(candidate)
    pile.push(candidate)
  }

  // 兜底：如果牌堆中全是功能牌（极端情况），强制用第一张
  if (!topCard && pile.length > 0) {
    topCard = pile.shift()
  }

  return {
    hands,
    remaining: pile,
    topCard,
    skippedTopCards,  // 被跳过的功能牌（供开场动画重翻效果使用）
  }
}

/**
 * 官方规则：摘牌决先手
 *
 * 规则：
 *  - 所有玩家各摸一张牌，牌面数字最大者先出
 *  - 若摸到功能牌（非数字）则重新摸，直到拿到数字牌
 *  - 若有平局（数字相同），平局玩家重新摸
 *  - 完成后将这些牌放回牌堆重新洗牌
 *
 * @param {Array}  drawPile  当前摸牌堆（会被修改并返回重新洗牌的版本）
 * @param {Array}  playerIds 玩家 ID 数组
 * @returns {{
 *   firstPlayerIndex: number,
 *   drawPile: Array,
 *   comparisonRounds: Array  // 每轮比牌结果，供开场动画播放
 * }}
 *   firstPlayerIndex: 先手玩家在 playerIds 中的索引
 *   drawPile: 放回抽到牌、重新洗牌后的摸牌堆
 *   comparisonRounds: [{ playerId, card, value, isWinner }][] 每轮的摸牌结果
 */
export function determineFirstPlayerOfficial(drawPile, playerIds) {
  let pile = [...drawPile]
  const playerCount = playerIds.length
  const comparisonRounds = []  // 记录每轮比牌结果，用于动画回放

  // 最多循环 10 次，防止无限循环（理论上不会发生）
  for (let attempt = 0; attempt < 10; attempt++) {
    const drawnCards = []

    // 每个玩家摸一张数字牌
    for (let i = 0; i < playerCount; i++) {
      let card = null
      let tries = 0
      // 不断摸直到摸到数字牌
      while (tries < pile.length) {
        const candidate = pile.shift()
        if (candidate.type === CARD_TYPES.NUMBER) {
          card = candidate
          break
        }
        // 功能牌放回底部
        pile.push(candidate)
        tries++
      }
      // 兜底：若牌堆全是功能牌（极端情况），重洗后继续
      if (!card) {
        pile = shuffleDeck(pile)
        i-- // 重试当前玩家
        continue
      }
      drawnCards.push({ playerId: playerIds[i], card })
    }

    // 找出数字最大值
    const maxValue = Math.max(...drawnCards.map((d) => d.card.value))

    // 找出所有达到最大值的玩家
    const winners = drawnCards.filter((d) => d.card.value === maxValue)

    // 将所有抽到的牌放回牌堆底部
    drawnCards.forEach((d) => pile.push(d.card))

    // 记录本轮比牌结果（供开场动画使用）
    comparisonRounds.push(
      drawnCards.map((d) => ({
        playerId: d.playerId,
        card: d.card,
        value: d.card.value,
        isWinner: d.card.value === maxValue,
      }))
    )

    if (winners.length === 1) {
      // 无平局：找到先手玩家
      const firstPlayerId = winners[0].playerId
      const firstPlayerIndex = playerIds.indexOf(firstPlayerId)
      // 重新洗牌
      const newPile = shuffleDeck(pile)
      return { firstPlayerIndex, drawPile: newPile, comparisonRounds }
    }

    // 有平局：只有平局玩家参与下一轮，但 playerIds 顺序保持（用索引筛选）
    // 简化处理：重新洗牌后重试（平局玩家重新摸）
    pile = shuffleDeck(pile)
    // 继续下一次循环
  }

  // 兜底：返回索引 0
  return { firstPlayerIndex: 0, drawPile: shuffleDeck(pile), comparisonRounds }
}

/**
 * 娱乐规则：随机决先手
 * @param {Array} playerIds 玩家 ID 数组
 * @returns {{ firstPlayerIndex: number }}
 */
export function determineFirstPlayerRandom(playerIds) {
  const firstPlayerIndex = Math.floor(Math.random() * playerIds.length)
  return { firstPlayerIndex }
}

/**
 * 根据起始牌类型，计算起始游戏状态的修正
 *
 * 官方 UNO 规则：第一张翻开的牌若是特殊牌，有特定效果：
 *  - Wild Draw Four → 放回牌堆重新翻（dealCards 已处理 Wild4，此处为 Wild 的补充处理）
 *  - Wild           → 起始玩家选色（写入 needs_color_pick: true，等待前端选色）
 *  - Skip           → 起始玩家被跳过，下一位出牌
 *  - Reverse        → 方向变为逆时针（-1），起始玩家仍先出
 *  - Draw Two       → 起始玩家需摸 2 张，回合跳至下一位
 *
 * @param {Object} topCard         翻开的起始牌
 * @param {number} firstPlayerIdx  先手玩家索引
 * @param {number} playerCount     玩家总数
 * @param {number} direction       初始方向（默认 1）
 * @param {Object} hands           当前各玩家手牌 { userId: [cards] }
 * @param {string[]} playerIds     按座位排序的玩家 ID 数组
 * @param {Array}  drawPile        当前摸牌堆
 * @returns {{
 *   currentPlayerIndex: number,
 *   direction: number,
 *   pendingDrawCount: number,
 *   topCard: Object,
 *   currentColor: string,
 *   drawPile: Array,
 *   hands: Object,
 *   needsColorPick: boolean,
 * }}
 */
export function applyFirstCardEffect(topCard, firstPlayerIdx, playerCount, direction, hands, playerIds, drawPile) {
  let currentPlayerIndex = firstPlayerIdx
  let dir = direction
  let pendingDrawCount = 0
  let pile = [...drawPile]
  const h = JSON.parse(JSON.stringify(hands))
  let needsColorPick = false
  let currentColor = topCard.color

  switch (topCard.type) {
    case CARD_TYPES.REVERSE:
      // 改变方向，起始玩家仍先出
      dir = -direction
      // 起始玩家不变
      break

    case CARD_TYPES.SKIP:
      // 起始玩家跳过，下一位出牌
      currentPlayerIndex = (firstPlayerIdx + direction + playerCount) % playerCount
      break

    case CARD_TYPES.DRAW2: {
      // 起始玩家摸 2 张，回合转给下一位
      const drawn = pile.splice(0, 2)
      const pid = playerIds[firstPlayerIdx]
      h[pid] = [...(h[pid] || []), ...drawn]
      pendingDrawCount = 0
      currentPlayerIndex = (firstPlayerIdx + direction + playerCount) % playerCount
      break
    }

    case CARD_TYPES.WILD:
      // 起始玩家需要选色，标记待选色
      needsColorPick = true
      currentColor = null  // 等待选色
      break

    default:
      // 数字牌 / 其他：起始玩家正常出牌
      break
  }

  return {
    currentPlayerIndex,
    direction: dir,
    pendingDrawCount,
    topCard,
    currentColor,
    drawPile: pile,
    hands: h,
    needsColorPick,
  }
}

/**
 * 重新洗弃牌堆（摸牌堆耗尽时调用）
 * 将弃牌堆（除顶牌外）重新洗牌作为新摸牌堆
 * @param {Array} discardPile 弃牌堆
 * @returns {{ newDrawPile: Array, newTopCard: Object }}
 */
export function reshuffleDiscardPile(discardPile) {
  if (discardPile.length === 0) {
    return { newDrawPile: [], newTopCard: null }
  }

  const topCard = discardPile[discardPile.length - 1]
  const toReshuffle = discardPile.slice(0, -1)

  // Wild 牌重新洗牌前清除已选颜色
  const cleaned = toReshuffle.map((card) => {
    if (card.type === CARD_TYPES.WILD || card.type === CARD_TYPES.WILD4) {
      return { ...card, chosenColor: null }
    }
    return card
  })

  return {
    newDrawPile: shuffleDeck(cleaned),
    newTopCard: topCard,
  }
}
