/**
 * MobileOpponentArea - 移动端对手信息区域
 * 
 * 显示对手玩家的基本信息（昵称、卡牌数量）
 */

import { useState } from 'react'
import { ChevronDown, Users } from 'lucide-react'

/**
 * 获取玩家头像颜色
 */
function getAvatarColor(userId) {
  const colors = [
    'bg-red-500',
    'bg-yellow-500',
    'bg-green-500',
    'bg-blue-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
  ]
  const hash = userId?.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) || 0
  return colors[hash % colors.length]
}

/**
 * 单个对手卡片
 */
function OpponentCard({ opponent, isCurrentPlayer, position }) {
  const avatarColor = getAvatarColor(opponent.user_id)
  // 优先从 profiles 对象中读取，Bot 和真实玩家都在 profiles 里
  const displayName = opponent.profiles?.nickname || opponent.profiles?.username || '玩家'
  const cardCount = opponent.card_count || 0

  return (
    <div
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg
        ${isCurrentPlayer ? 'bg-purple-100 ring-2 ring-purple-400' : 'bg-gray-100'}
        transition-all duration-200
      `}
    >
      {/* 头像 */}
      <div className={`w-8 h-8 rounded-full ${avatarColor} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
        {displayName[0]?.toUpperCase()}
      </div>

      {/* 信息 */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 truncate">
          {displayName}
        </div>
        {position && (
          <div className="text-xs text-gray-500">
            {position}
          </div>
        )}
      </div>

      {/* 卡牌数量 */}
      <div className={`
        px-2 py-1 rounded-md text-xs font-bold
        ${cardCount === 1 ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-gray-700'}
      `}>
        {cardCount} 张
      </div>
    </div>
  )
}

/**
 * @param {Object} props
 * @param {Array} props.opponents - 对手列表
 * @param {string} props.currentPlayerId - 当前出牌玩家 ID
 * @param {number} props.maxVisible - 最多显示对手数量（默认 3）
 */
export default function MobileOpponentArea({
  opponents = [],
  currentPlayerId,
  maxVisible = 3,
}) {
  const [showAll, setShowAll] = useState(false)

  // 确定显示的对手（最多 maxVisible 个，或全部）
  const visibleOpponents = showAll ? opponents : opponents.slice(0, maxVisible)
  const hasMore = opponents.length > maxVisible

  // 确定相对位置（上家、下家等）
  const getPosition = (index) => {
    const total = opponents.length
    if (total <= 2) return null
    
    if (index === 0) return '上家'
    if (index === total - 1) return '下家'
    return null
  }

  if (opponents.length === 0) {
    return (
      <div className="w-full h-20 flex items-center justify-center text-gray-400">
        <Users className="w-5 h-5 mr-2" />
        <span>等待其他玩家...</span>
      </div>
    )
  }

  return (
    <div className="w-full space-y-2">
      {/* 对手卡片列表 */}
      <div className={`
        ${showAll ? 'space-y-2' : 'flex gap-2 overflow-x-auto scrollbar-hide'}
        ${!showAll && 'snap-x snap-mandatory'}
      `}>
        {visibleOpponents.map((opponent, index) => (
          <div
            key={opponent.user_id}
            className={!showAll ? 'flex-shrink-0 w-64 snap-start' : ''}
          >
            <OpponentCard
              opponent={opponent}
              isCurrentPlayer={opponent.user_id === currentPlayerId}
              position={getPosition(index)}
            />
          </div>
        ))}
      </div>

      {/* 展开/收起按钮 */}
      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full py-2 text-sm text-gray-600 hover:text-gray-900 flex items-center justify-center gap-1 transition-colors"
        >
          {showAll ? '收起' : `查看全部 (${opponents.length})`}
          <ChevronDown
            className={`w-4 h-4 transition-transform ${showAll ? 'rotate-180' : ''}`}
          />
        </button>
      )}
    </div>
  )
}
