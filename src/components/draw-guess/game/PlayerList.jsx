/**
 * PlayerList - 玩家列表
 * 按团队分组显示玩家状态
 */

import { Card } from '@/components/ui/card'
import { Crown, Wifi, WifiOff, Palette, User } from 'lucide-react'

// 团队颜色配置
const TEAM_COLORS = [
  { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', dot: 'bg-red-500' },
  { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', dot: 'bg-blue-500' },
  { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200', dot: 'bg-green-500' },
  { bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-200', dot: 'bg-yellow-500' }
]

/**
 * @param {Object} props
 * @param {Array} props.players - 玩家列表
 * @param {Array} props.teams - 团队列表
 * @param {string} props.currentUserId - 当前用户ID
 * @param {string} props.hostId - 房主ID
 * @param {string} props.describerId - 描述者ID
 */
export default function PlayerList({
  players = [],
  teams = [],
  currentUserId,
  hostId,
  describerId
}) {
  // 按团队分组
  const getPlayersByTeam = () => {
    const grouped = {}
    teams.forEach((team, index) => {
      grouped[team.id] = {
        team,
        color: TEAM_COLORS[index] || TEAM_COLORS[0],
        players: players.filter(p => p.team_id === team.id)
      }
    })
    return grouped
  }

  const playersByTeam = getPlayersByTeam()

  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 mb-2">
        <User className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-800">玩家</span>
        <span className="text-xs text-gray-400 ml-auto">
          {players.filter(p => p.status === 'connected').length} 在线
        </span>
      </div>

      <div className="space-y-2">
        {teams.map((team, index) => {
          const teamData = playersByTeam[team.id]
          const color = teamData?.color || TEAM_COLORS[0]

          return (
            <div key={team.id} className={`${color.bg} rounded-lg p-2 border ${color.border}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <div className={`w-2 h-2 rounded-full ${color.dot}`} />
                <span className={`text-xs font-medium ${color.text}`}>
                  {team.team_name || `团队 ${team.team_num}`}
                </span>
                {team.score > 0 && (
                  <span className={`text-xs font-bold ml-auto ${color.text}`}>
                    {team.score} 分
                  </span>
                )}
              </div>
              
              <div className="flex flex-wrap gap-1">
                {teamData?.players?.map(player => {
                  const isHost = player.user_id === hostId
                  const isDescriber = player.user_id === describerId
                  const isCurrentUser = player.user_id === currentUserId
                  const isDisconnected = player.status === 'disconnected'

                  return (
                    <div
                      key={player.id}
                      className={`px-2 py-0.5 rounded text-xs flex items-center gap-1 ${
                        isCurrentUser 
                          ? 'bg-white border border-blue-300 text-blue-600' 
                          : 'bg-white/70 text-gray-700'
                      } ${isDisconnected ? 'opacity-50' : ''}`}
                    >
                      {/* 连接状态 */}
                      {isDisconnected ? (
                        <WifiOff className="w-3 h-3 text-gray-400" />
                      ) : (
                        <Wifi className="w-3 h-3 text-green-400" />
                      )}
                      
                      {/* 名称 */}
                      <span>{player.display_name}</span>
                      
                      {/* 标记 */}
                      {isHost && <Crown className="w-3 h-3 text-yellow-500" />}
                      {isDescriber && <Palette className="w-3 h-3 text-orange-500" />}
                      {isCurrentUser && <span className="text-gray-400">(你)</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
