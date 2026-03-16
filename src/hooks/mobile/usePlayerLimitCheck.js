/**
 * usePlayerLimitCheck - 移动端玩家数量限制检查
 * 
 * 移动端最多支持 8 人游戏（性能和 UI 考虑）
 */

import { useState, useEffect } from 'react'

const MOBILE_MAX_PLAYERS = 8

/**
 * @param {Object} room - 房间信息
 * @param {Array} players - 玩家列表
 * @returns {Object} { canJoin, isOverLimit, maxPlayers, showWarning }
 */
export function usePlayerLimitCheck(room, players) {
  const [showWarning, setShowWarning] = useState(false)

  const playerCount = players?.length || 0
  const isOverLimit = playerCount > MOBILE_MAX_PLAYERS
  const canJoin = !isOverLimit && playerCount < (room?.max_players || 10)

  // 检测是否超过移动端限制
  useEffect(() => {
    if (isOverLimit) {
      setShowWarning(true)
    }
  }, [isOverLimit])

  return {
    canJoin,
    isOverLimit,
    maxPlayers: MOBILE_MAX_PLAYERS,
    currentPlayers: playerCount,
    showWarning,
    dismissWarning: () => setShowWarning(false),
  }
}

export default usePlayerLimitCheck
