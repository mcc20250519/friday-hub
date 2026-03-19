/**
 * TeamScoreboard - 团队计分板
 * 显示所有团队和分数，实时更新
 */

import { Card } from '@/components/ui/card'
import { Trophy, Crown } from 'lucide-react'

// 团队颜色配置
const TEAM_COLORS = [
  { bg: 'bg-red-500', light: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
  { bg: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  { bg: 'bg-green-500', light: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
  { bg: 'bg-yellow-500', light: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-200' }
]

/**
 * @param {Object} props
 * @param {Array} props.teams - 团队列表
 * @param {string} props.currentTeamId - 当前团队ID
 * @param {number} props.targetScore - 目标分数
 */
export default function TeamScoreboard({ 
  teams = [], 
  currentTeamId,
  targetScore = 2 
}) {
  // 按分数排序
  const sortedTeams = [...teams].sort((a, b) => (b.score || 0) - (a.score || 0))
  const leadingScore = sortedTeams[0]?.score || 0

  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 mb-2">
        <Trophy className="w-4 h-4 text-yellow-500" />
        <span className="text-sm font-medium text-gray-800">积分榜</span>
        <span className="text-xs text-gray-400 ml-auto">
          目标: {targetScore} 分
        </span>
      </div>

      <div className="space-y-2">
        {sortedTeams.map((team, index) => {
          const colorConfig = TEAM_COLORS[index] || TEAM_COLORS[0]
          const isLeading = team.score === leadingScore && team.score > 0
          const isCurrentTeam = team.id === currentTeamId

          return (
            <div 
              key={team.id}
              className={`flex items-center gap-2 p-2 rounded-lg ${
                isCurrentTeam ? `${colorConfig.light} border ${colorConfig.border}` : 'bg-gray-50'
              } ${isLeading ? 'ring-2 ring-yellow-400' : ''}`}
            >
              {/* 排名 */}
              <div className={`w-6 h-6 rounded-full ${colorConfig.bg} flex items-center justify-center text-white text-xs font-bold`}>
                {index + 1}
              </div>

              {/* 团队信息 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className={`text-sm font-medium truncate ${colorConfig.text}`}>
                    {team.team_name || `团队 ${team.team_num}`}
                  </span>
                  {isLeading && (
                    <Crown className="w-3 h-3 text-yellow-500" />
                  )}
                </div>
                <div className="text-xs text-gray-400">
                  {team.players_count || 0} 人
                </div>
              </div>

              {/* 分数 */}
              <div className="text-right">
                <div className={`text-xl font-bold ${colorConfig.text}`}>
                  {team.score || 0}
                </div>
                <div className="text-xs text-gray-400">分</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 进度条 */}
      {leadingScore > 0 && (
        <div className="mt-3 pt-2 border-t border-gray-100">
          <div className="text-xs text-gray-500 mb-1">领先进度</div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (leadingScore / targetScore) * 100)}%` }}
            />
          </div>
        </div>
      )}
    </Card>
  )
}
