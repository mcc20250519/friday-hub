/**
 * PlayerSlot - 单个玩家槽位组件
 */

import { Crown, User } from 'lucide-react'
import { getDisplayName } from '@/hooks/uno/useUnoRoom'

/**
 * @param {Object} props
 * @param {Object|null} props.player - 玩家数据（含 profiles 联表数据）
 * @param {boolean} props.isHost - 是否是房主
 * @param {boolean} props.isMe - 是否是当前用户
 * @param {number} props.seatIndex - 座位号（0-3）
 */
export default function PlayerSlot({ player, isHost, isMe, seatIndex }) {
  const isEmpty = !player

  if (isEmpty) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50">
        {/* 空座位图标 */}
        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
          <User className="h-5 w-5 text-gray-400" />
        </div>

        {/* 空座位文字 */}
        <div>
          <div className="text-sm font-medium text-gray-400">等待玩家加入...</div>
          <div className="text-xs text-gray-300">座位 {seatIndex + 1}</div>
        </div>
      </div>
    )
  }

  const displayName = getDisplayName(player.profiles, player.profiles?.email)
  const avatarUrl = player.profiles?.avatar_url
  const initial = displayName.charAt(0).toUpperCase()

  // 颜色映射（每个座位一种颜色）
  const seatColors = [
    'from-purple-500 to-purple-600',
    'from-blue-500 to-blue-600',
    'from-green-500 to-green-600',
    'from-orange-500 to-orange-600',
  ]
  const bgColor = seatColors[seatIndex % seatColors.length]

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
        isMe
          ? 'border-purple-400 bg-purple-50'
          : 'border-gray-200 bg-white'
      }`}
    >
      {/* 头像 */}
      <div className="relative flex-shrink-0">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div
            className={`w-10 h-10 rounded-full bg-gradient-to-br ${bgColor} flex items-center justify-center text-white font-bold text-base`}
          >
            {initial}
          </div>
        )}

        {/* 房主皇冠标记 */}
        {isHost && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
            <Crown className="h-3 w-3 text-yellow-900" />
          </div>
        )}
      </div>

      {/* 玩家信息 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-800 truncate">
            {displayName}
          </span>
          {isMe && (
            <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded font-medium">
              我
            </span>
          )}
        </div>
        <div className="text-xs text-gray-400">
          {isHost ? '👑 房主' : `座位 ${seatIndex + 1}`}
        </div>
      </div>

      {/* 准备状态 */}
      <div
        className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${
          player.is_ready
            ? 'bg-green-100 text-green-600'
            : 'bg-gray-100 text-gray-400'
        }`}
      >
        {player.is_ready ? '✓ 已就绪' : '等待中'}
      </div>
    </div>
  )
}
