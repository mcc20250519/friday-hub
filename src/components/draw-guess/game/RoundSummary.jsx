/**
 * RoundSummary - 轮次总结
 * 显示本轮结果和下一轮按钮
 */

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Trophy, ArrowRight, Check, Clock, 
  Users, Target, Loader2 
} from 'lucide-react'

// 团队颜色配置
const TEAM_COLORS = [
  { bg: 'bg-red-100', text: 'text-red-600', border: 'border-red-300' },
  { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-300' },
  { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-300' },
  { bg: 'bg-yellow-100', text: 'text-yellow-600', border: 'border-yellow-300' }
]

/**
 * @param {Object} props
 * @param {string} props.word - 正确答案
 * @param {Object} props.winningTeam - 获胜团队
 * @param {Array} props.teams - 团队列表（含分数）
 * @param {number} props.roundNumber - 轮次号
 * @param {number} props.totalRounds - 总轮次
 * @param {Function} props.onNextRound - 下一轮回调
 * @param {boolean} props.isHost - 是否是房主
 * @param {boolean} props.isLoading - 加载中
 */
export default function RoundSummary({
  word,
  winningTeam,
  teams = [],
  roundNumber,
  totalRounds,
  onNextRound,
  isHost,
  isLoading
}) {
  // 按分数排序
  const sortedTeams = [...teams].sort((a, b) => (b.score || 0) - (a.score || 0))
  
  // 格式化时间
  const formatTime = (seconds) => {
    if (!seconds) return '--'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-4 md:p-6">
      <div className="max-w-md mx-auto space-y-4">
        {/* 标题 */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full mb-3">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">轮次结束</h2>
          <p className="text-gray-500">第 {roundNumber} / {totalRounds} 轮</p>
        </div>

        {/* 正确答案 */}
        <Card className="p-4 bg-white text-center">
          <div className="text-sm text-gray-500 mb-1">正确答案</div>
          <div className="text-3xl font-bold text-emerald-600 mb-2">{word}</div>
          {winningTeam && (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
              <Check className="w-4 h-4 text-green-500" />
              <span>{winningTeam.team_name || '团队'} 猜对了！</span>
            </div>
          )}
        </Card>

        {/* 积分榜 */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-gray-500" />
            <span className="font-medium text-gray-800">当前排名</span>
          </div>
          
          <div className="space-y-2">
            {sortedTeams.map((team, index) => {
              const color = TEAM_COLORS[teams.findIndex(t => t.id === team.id)] || TEAM_COLORS[0]
              const isWinner = winningTeam?.id === team.id

              return (
                <div 
                  key={team.id}
                  className={`flex items-center gap-3 p-2 rounded-lg ${
                    isWinner ? `${color.bg} border-2 ${color.border}` : 'bg-gray-50'
                  }`}
                >
                  {/* 排名 */}
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                    index === 0 ? 'bg-yellow-400 text-white' :
                    index === 1 ? 'bg-gray-300 text-white' :
                    index === 2 ? 'bg-orange-400 text-white' :
                    'bg-gray-200 text-gray-600'
                  }`}>
                    {index + 1}
                  </div>

                  {/* 团队名 */}
                  <div className="flex-1">
                    <div className={`font-medium ${color.text}`}>
                      {team.team_name || `团队 ${team.team_num}`}
                    </div>
                    {isWinner && (
                      <div className="text-xs text-green-600">本轮获胜</div>
                    )}
                  </div>

                  {/* 分数 */}
                  <div className="text-xl font-bold text-gray-800">
                    {team.score || 0}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        {/* 操作按钮 */}
        {isHost ? (
          <Button
            onClick={onNextRound}
            disabled={isLoading}
            className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                处理中...
              </>
            ) : (
              <>
                <ArrowRight className="w-5 h-5 mr-2" />
                下一轮
              </>
            )}
          </Button>
        ) : (
          <div className="w-full h-12 flex items-center justify-center bg-gray-100 rounded-lg text-gray-500 text-sm">
            等待房主进入下一轮...
          </div>
        )}
      </div>
    </div>
  )
}
