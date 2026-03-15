/**
 * TurnIndicator - 回合指示器（方向 + 当前玩家）
 */

import { getDisplayName } from '@/hooks/uno/useUnoRoom'

/**
 * @param {Object} props
 * @param {number} props.direction - 1 顺时针, -1 逆时针
 * @param {Array} props.playerIds - 玩家 ID 数组（按座位顺序）
 * @param {number} props.currentPlayerIndex - 当前玩家索引
 * @param {Array} props.players - 玩家列表（含 profiles）
 * @param {string} props.myUserId - 当前用户 ID
 */
export default function TurnIndicator({
  direction,
  playerIds,
  currentPlayerIndex,
  players,
  myUserId,
}) {
  const currentPlayerId = playerIds?.[currentPlayerIndex]
  const currentPlayerRecord = players?.find((p) => p.user_id === currentPlayerId)
  const isMyTurn = currentPlayerId === myUserId

  const displayName = currentPlayerRecord
    ? getDisplayName(currentPlayerRecord.profiles)
    : '未知玩家'

  return (
    <div className="flex items-center justify-center gap-4 py-2">
      {/* 方向指示 */}
      <div
        className={`flex items-center gap-1 text-sm font-medium px-3 py-1 rounded-full ${
          direction === 1
            ? 'bg-blue-50 text-blue-600'
            : 'bg-purple-50 text-purple-600'
        } transition-all duration-500`}
      >
        <span
          className="text-lg transition-transform duration-500"
          style={{
            transform: direction === 1 ? 'rotate(0deg)' : 'rotate(180deg)',
          }}
        >
          🔄
        </span>
        <span>{direction === 1 ? '顺时针' : '逆时针'}</span>
      </div>

      {/* 当前玩家 */}
      <div
        className={`text-sm font-semibold px-3 py-1 rounded-full ${
          isMyTurn
            ? 'bg-yellow-100 text-yellow-700 animate-pulse'
            : 'bg-gray-100 text-gray-600'
        }`}
      >
        {isMyTurn ? `⚡ 你的回合` : `${displayName} 的回合`}
      </div>
    </div>
  )
}
