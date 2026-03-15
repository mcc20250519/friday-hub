/**
 * UNO 游戏规则引擎 - 统一入口
 *
 * 根据 gameMode 分发到对应规则模块：
 *   'standard'      → rules-official.js（官方 Mattel 规则）
 *   'entertainment' → rules-entertainment.js（娱乐版叠加规则）
 *
 * 所有对外接口保持向后兼容：
 *   canPlayCard / mustDraw / getNextState / getPlayableCards / checkUno / checkWinner
 */

import { GAME_MODES } from './constants'
import {
  canPlayCardOfficial,
  mustDrawOfficial,
  getNextStateOfficial,
} from './rules-official'
import {
  canPlayCardEntertainment,
  mustDrawEntertainment,
  getNextStateEntertainment,
} from './rules-entertainment'

// ─────────────────────────────────────────────────────────────
// 统一对外接口（根据 gameMode 分发）
// ─────────────────────────────────────────────────────────────

/**
 * 判断一张牌是否可在当前顶牌上出
 * @param {Object} card
 * @param {Object} topCard
 * @param {string} currentColor
 * @param {number} [pendingDrawCount=0]  娱乐版叠加链用
 * @param {string} [gameMode='standard']
 */
export function canPlayCard(
  card,
  topCard,
  currentColor,
  pendingDrawCount = 0,
  gameMode = GAME_MODES.STANDARD
) {
  if (gameMode === GAME_MODES.ENTERTAINMENT) {
    return canPlayCardEntertainment(card, topCard, currentColor, pendingDrawCount)
  }
  return canPlayCardOfficial(card, topCard, currentColor)
}

/**
 * 判断玩家是否必须摸牌
 */
export function mustDraw(
  hand,
  topCard,
  currentColor,
  pendingDrawCount,
  gameMode = GAME_MODES.STANDARD
) {
  if (gameMode === GAME_MODES.ENTERTAINMENT) {
    return mustDrawEntertainment(hand, topCard, currentColor, pendingDrawCount)
  }
  return mustDrawOfficial(hand, topCard, currentColor, pendingDrawCount)
}

/**
 * 计算下一游戏状态（纯函数）
 * @param {Object} gameState  当前状态
 * @param {Object} action     { type, userId, card?, chosenColor? }
 * @param {Array}  playerIds  玩家 ID 数组（按座位顺序）
 * @param {Object} [options]  { gameMode }
 */
export function getNextState(
  gameState,
  action,
  playerIds,
  options = {}
) {
  const gameMode = options.gameMode || gameState.gameMode || GAME_MODES.STANDARD

  if (gameMode === GAME_MODES.ENTERTAINMENT) {
    return getNextStateEntertainment(gameState, action, playerIds)
  }
  return getNextStateOfficial(gameState, action, playerIds)
}

// ─────────────────────────────────────────────────────────────
// 通用工具函数（不区分模式）
// ─────────────────────────────────────────────────────────────

/**
 * 获取玩家可出的牌列表
 */
export function getPlayableCards(
  hand,
  topCard,
  currentColor,
  pendingDrawCount = 0,
  gameMode = GAME_MODES.STANDARD
) {
  return hand.filter((card) =>
    canPlayCard(card, topCard, currentColor, pendingDrawCount, gameMode)
  )
}

/**
 * 检查玩家是否应该喊 UNO（剩 1 张）
 */
export function checkUno(hand) {
  return hand.length === 1
}

/**
 * 检查玩家是否获胜（无手牌）
 */
export function checkWinner(hand) {
  return hand.length === 0
}
