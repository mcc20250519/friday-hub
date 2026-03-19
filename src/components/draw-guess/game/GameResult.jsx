/**
 * GameResult - 游戏结果
 * 显示获胜团队和最终排名
 */

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Trophy, Crown, Medal, RefreshCw, 
  LogOut, Loader2, PartyPopper 
} from 'lucide-react'

// 团队颜色配置
const TEAM_COLORS = [
  { bg: 'bg-red-100', text: 'text-red-600', border: 'border-red-300', gradient: 'from-red-400 to-rose-500' },
  { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-300', gradient: 'from-blue-400 to-indigo-500' },
  { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-300', gradient: 'from-green-400 to-emerald-500' },
  { bg: 'bg-yellow-100', text: 'text-yellow-600', border: 'border-yellow-300', gradient: 'from-yellow-400 to-amber-500' }
]

/**
 * @param {Object} props
 * @param {Object} props.winner - 获胜团队
 * @param {Array} props.teams - 团队列表
 * @param {Array} props.players - 玩家列表
 * @param {boolean} props.isHost - 是否是房主
 * @param {Function} props.onRestart - 重新开始
 * @param {Function} props.onLeave - 离开房间
 * @param {boolean} props.isLoading - 加载中
 */
export default function GameResult({
  winner,
  teams = [],
  players = [],
  isHost,
  onRestart,
  onLeave,
  isLoading
}) {
  // 按分数排序
  const sortedTeams = [...teams].sort((a, b) => (b.score || 0) - (a.score || 0))
  const winnerColor = TEAM_COLORS[teams.findIndex(t => t.id === winner?.id)] || TEAM_COLORS[0]

  // 庆祝动画（简单的 CSS 动画替代 confetti）
  const celebrate = () => {
    // 可以在这里添加 confetti 库或简单动画
    console.log('Celebrating!')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 p-4 md:p-6">
      <div className="max-w-md mx-auto space-y-4">
        {/* 获胜者 */}
        <div className="text-center py-6">
          <div className={`inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br ${winnerColor.gradient} rounded-full mb-4 shadow-lg`}>
            <Trophy className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">游戏结束</h1>
          <div className={`text-xl font-semibold ${winnerColor.text}`}>
            {winner?.team_name || '团队'} 获胜！
          </div>
          <div className="text-gray-500 mt-1">
            最终得分: {winner?.score || 0} 分
          </div>
        </div>

        {/* 最终排名 */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Medal className="w-5 h-5 text-yellow-500" />
            <span className="font-medium text-gray-800">最终排名</span>
          </div>

          <div className="space-y-2">
            {sortedTeams.map((team, index) => {
              const color = TEAM_COLORS[teams.findIndex(t => t.id === team.id)] || TEAM_COLORS[0]
              const teamPlayers = players.filter(p => p.team_id === team.id)

              return (
                <div 
                  key={team.id}
                  className={`p-3 rounded-lg border ${
                    index === 0 
                      ? `${color.bg} ${color.border} border-2` 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* 排名 */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0 ? 'bg-yellow-400 text-white' :
                      index === 1 ? 'bg-gray-300 text-white' :
                      index === 2 ? 'bg-orange-400 text-white' :
                      'bg-gray-200 text-gray-600'
                    }`}>
                      {index === 0 ? <Crown className="w-4 h-4" /> : index + 1}
                    </div>

                    {/* 团队信息 */}
                    <div className="flex-1">
                      <div className={`font-medium ${index === 0 ? color.text : 'text-gray-800'}`}>
                        {team.team_name || `团队 ${team.team_num}`}
                      </div>
                      <div className="text-xs text-gray-500">
                        {teamPlayers.map(p => p.display_name).join(', ')}
                      </div>
                    </div>

                    {/* 分数 */}
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-800">
                        {team.score || 0}
                      </div>
                      <div className="text-xs text-gray-400">分</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        {/* 操作按钮 */}
        <div className="space-y-3">
          {/* 房主操作 */}
          {isHost && (
            <Button
              onClick={onRestart}
              disabled={isLoading}
              className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  处理中...
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5 mr-2" />
                  再来一局
                </>
              )}
            </Button>
          )}

          {/* 离开房间 */}
          <Button
            variant="outline"
            onClick={onLeave}
            disabled={isLoading}
            className="w-full h-10 border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            <LogOut className="w-4 h-4 mr-2" />
            离开房间
          </Button>
        </div>
      </div>
    </div>
  )
}
