/**
 * UNO 计分引擎（纯函数，无副作用）
 *
 * 官方规则（standard）：
 *   获胜者 +1 分，其余 0 分
 *
 * 娱乐规则（entertainment）：
 *   基础模式（basic）：   第一名 +3 分，其余 0 分
 *   排名模式（ranking）： score(rank, N) = (N - rank + 1) + (rank === 1 ? 1 : 0)
 */

import { GAME_MODES, SCORING_MODES, STANDARD_WIN_SCORE, ENTERTAINMENT_WIN_SCORE } from './constants'

// ─────────────────────────────────────────────────────────────
// 核心计算函数
// ─────────────────────────────────────────────────────────────

/**
 * 计算本局每位玩家得分
 *
 * @param {string}   gameMode    - 'standard' | 'entertainment'
 * @param {string}   scoringMode - 'basic' | 'ranking'（娱乐专用）
 * @param {string[]} rankList    - 按排名顺序的 userId 数组
 *                                 官方模式：只有 [winnerId]
 *                                 娱乐排名：完整排名 [第1名, ..., 第N名]
 * @param {string[]} allPlayerIds - 本局所有参与玩家 ID（用于补全未出现在 rankList 的玩家）
 * @returns {{ playerId: string, scoreEarned: int, rank: int }[]}
 */
export function calculateRoundScore(gameMode, scoringMode, rankList, allPlayerIds) {
  const n = allPlayerIds.length

  // 确保所有玩家都出现在结果中，rankList 里没有的视为 0 分
  const result = allPlayerIds.map((playerId) => {
    const rank = rankList.indexOf(playerId) + 1  // 0 表示不在 rankList

    let scoreEarned = 0

    if (gameMode === GAME_MODES.STANDARD) {
      // 官方模式：只有第 1 名（winnerId）得分
      scoreEarned = rank === 1 ? STANDARD_WIN_SCORE : 0

    } else {
      // 娱乐模式
      if (scoringMode === SCORING_MODES.RANKING && rank > 0) {
        // 排名模式：score(rank, N) = (N - rank + 1) + (rank === 1 ? 1 : 0)
        scoreEarned = (n - rank + 1) + (rank === 1 ? 1 : 0)
      } else if (rank === 1) {
        // 基础模式：只有第 1 名得分
        scoreEarned = ENTERTAINMENT_WIN_SCORE
      }
    }

    return { playerId, rank: rank || n + 1, scoreEarned }
  })

  return result
}

/**
 * 将本局结算结果合并进累计计分板
 *
 * @param {Object|null} currentBoard - 当前计分板（可为 null，表示首局）
 * @param {Object} params
 * @param {string}   params.roomId
 * @param {string}   params.gameMode
 * @param {string}   params.scoringMode
 * @param {{ playerId: string, scoreEarned: int, rank: int }[]} params.roundResults - calculateRoundScore 的返回值
 * @param {{ userId: string, profiles: Object }[]} params.players - 玩家列表（含 profiles 用于获取名称）
 * @param {Function} params.getDisplayName - (profiles) => string
 * @returns {Object} 更新后的计分板
 */
export function updateScoreBoard(currentBoard, { roomId, gameMode, scoringMode, roundResults, players, getDisplayName }) {
  const prevRecords = currentBoard?.records || []
  const totalRoundsPlayed = (currentBoard?.totalRoundsPlayed || 0) + 1

  // 将本局结果合并进每个玩家的累计记录
  const newRecords = roundResults.map(({ playerId, scoreEarned, rank }) => {
    const prev = prevRecords.find((r) => r.playerId === playerId)
    const playerInfo = players.find((p) => p.user_id === playerId)
    const playerName = playerInfo
      ? getDisplayName(playerInfo.profiles || playerInfo.profile)
      : '未知玩家'

    return {
      playerId,
      playerName,
      totalScore: (prev?.totalScore || 0) + scoreEarned,
      roundsPlayed: (prev?.roundsPlayed || 0) + 1,
      lastRoundScore: scoreEarned,
      lastRoundRank: rank,
    }
  })

  // 补充本局未参与的旧玩家（保留其历史数据）
  for (const prev of prevRecords) {
    if (!newRecords.find((r) => r.playerId === prev.playerId)) {
      newRecords.push({ ...prev, lastRoundScore: 0, lastRoundRank: null })
    }
  }

  // 按 totalScore 降序排列（同分按 lastRoundRank 升序）
  newRecords.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore
    // 同分：本局名次靠前的排前面（null 排最后）
    const ra = a.lastRoundRank ?? 999
    const rb = b.lastRoundRank ?? 999
    return ra - rb
  })

  return {
    roomId,
    gameMode,
    scoringMode,
    totalRoundsPlayed,
    records: newRecords,
  }
}

/**
 * 获取计分板排名列表（已按 totalScore 降序）
 *
 * @param {Object} scoreBoard
 * @returns {{ rank: int, playerId: string, playerName: string, totalScore: int, roundsPlayed: int, lastRoundScore: int, lastRoundRank: int }[]}
 */
export function getRankings(scoreBoard) {
  if (!scoreBoard?.records) return []
  return scoreBoard.records.map((r, idx) => ({ rank: idx + 1, ...r }))
}

/**
 * 创建空计分板
 */
export function createEmptyScoreBoard(roomId, gameMode, scoringMode) {
  return {
    roomId,
    gameMode,
    scoringMode,
    totalRoundsPlayed: 0,
    records: [],
  }
}
