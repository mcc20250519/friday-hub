/**
 * DrawAndGuessSettings - 游戏设置和等待室
 * 显示房间配置、玩家列表、团队分配
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { 
  Play, LogOut, Users, Copy, Check, Crown, 
  RefreshCw, Settings, Loader2, Bot, UserX, Sparkles
} from 'lucide-react'
import { toast } from '@/hooks/useToast'

// 团队颜色配置
const TEAM_COLORS = [
  { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', name: '红队', dot: 'bg-red-500' },
  { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', name: '蓝队', dot: 'bg-blue-500' },
  { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200', name: '绿队', dot: 'bg-green-500' },
  { bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-200', name: '黄队', dot: 'bg-yellow-500' }
]

/**
 * @param {Object} props
 * @param {Object} props.room - 房间数据
 * @param {Array} props.players - 玩家列表
 * @param {Array} props.teams - 团队列表
 * @param {boolean} props.isHost - 是否是房主
 * @param {Object} props.currentPlayer - 当前玩家
 * @param {Function} props.onStartGame - 开始游戏
 * @param {Function} props.onLeaveRoom - 离开房间
 * @param {Function} props.onRestartGame - 重新开始
 * @param {Function} props.onAddBot - 添加机器人
 * @param {Function} props.onRemoveBot - 移除机器人
 * @param {Function} props.onFillBots - 一键补满机器人
 * @param {boolean} props.isLoading - 加载状态
 */
export default function DrawAndGuessSettings({
  room,
  players,
  teams,
  isHost,
  currentPlayer,
  onStartGame,
  onLeaveRoom,
  onRestartGame,
  onAddBot,
  onRemoveBot,
  onFillBots,
  isLoading
}) {
  const [copied, setCopied] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [addingBot, setAddingBot] = useState(false)
  const [fillingBots, setFillingBots] = useState(false)

  // 复制房间码
  const handleCopyRoomCode = async () => {
    if (!room?.room_code) return

    try {
      await navigator.clipboard.writeText(room.room_code)
      setCopied(true)
      toast.success('已复制', `房间码 ${room.room_code} 已复制到剪贴板`)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast.error('复制失败', '请手动复制房间码')
    }
  }

  // 离开房间
  const handleLeave = async () => {
    if (leaving) return
    setLeaving(true)
    await onLeaveRoom?.()
  }

  // 添加机器人
  const handleAddBot = async () => {
    if (addingBot) return
    setAddingBot(true)
    const result = await onAddBot?.()
    if (result?.error) {
      toast.error('添加失败', result.error)
    } else if (result?.data) {
      toast.success('机器人已加入', `${result.data.bot.display_name} 已加入游戏`)
    }
    setAddingBot(false)
  }

  // 一键补满机器人
  const handleFillBots = async () => {
    if (fillingBots) return
    setFillingBots(true)
    const result = await onFillBots?.()
    if (result?.error) {
      toast.error('补满失败', result.error)
    } else if (result?.data) {
      if (result.data.addedCount > 0) {
        toast.success('补满成功', `已添加 ${result.data.addedCount} 个机器人`)
      } else {
        toast.info('无需补满', '房间已满')
      }
    }
    setFillingBots(false)
  }

  // 移除机器人
  const handleRemoveBot = async (botId) => {
    const result = await onRemoveBot?.(botId)
    if (result?.error) {
      toast.error('移除失败', result.error)
    }
  }

  // 按团队分组玩家
  const getPlayersByTeam = () => {
    const grouped = {}
    teams?.forEach(team => {
      grouped[team.id] = {
        team,
        players: players?.filter(p => p.team_id === team.id && p.status === 'connected') || []
      }
    })
    return grouped
  }

  const playersByTeam = getPlayersByTeam()
  const connectedPlayers = players?.filter(p => p.status === 'connected') || []
  const maxPlayers = (room?.num_teams || 2) * (room?.players_per_team || 2)
  const canStart = connectedPlayers.length >= 2 && connectedPlayers.length <= maxPlayers
  const botPlayers = connectedPlayers.filter(p => p.is_bot === true)
  const canAddBot = isHost && room?.status === 'waiting' && connectedPlayers.length < maxPlayers
  const emptySlots = maxPlayers - connectedPlayers.length

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-yellow-50 to-pink-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* 标题 */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">你说我猜</h1>
          <p className="text-gray-500">等待玩家加入...</p>
        </div>

        {/* 房间码卡片 */}
        <Card className="p-4 bg-gradient-to-r from-orange-50 to-pink-50 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500 mb-1">房间码</div>
              <div className="text-3xl font-bold font-mono tracking-widest text-gray-800">
                {room?.room_code || '------'}
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleCopyRoomCode}
              className="flex items-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-500" />
                  已复制
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  复制
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* 房间配置 */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Settings className="w-5 h-5 text-gray-500" />
            <span className="font-medium text-gray-800">游戏配置</span>
            {isHost && (
              <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">
                房主
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="flex justify-between md:block">
              <span className="text-gray-500">团队数</span>
              <span className="font-medium">{room?.num_teams || 2} 队</span>
            </div>
            <div className="flex justify-between md:block">
              <span className="text-gray-500">每队人数</span>
              <span className="font-medium">{room?.players_per_team || 2} 人</span>
            </div>
            <div className="flex justify-between md:block">
              <span className="text-gray-500">描述时间</span>
              <span className="font-medium">{room?.description_time_sec || 60} 秒</span>
            </div>
            <div className="flex justify-between md:block">
              <span className="text-gray-500">猜测时间</span>
              <span className="font-medium">{room?.guessing_time_sec || 30} 秒</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-gray-100 text-sm">
            <span className="text-gray-500">胜利条件：</span>
            <span className="font-medium">
              BO{room?.target_rounds || 3}（先得 {Math.ceil((room?.target_rounds || 3) / 2)} 分获胜）
            </span>
          </div>
        </Card>

        {/* 玩家列表 */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-500" />
              <span className="font-medium text-gray-800">玩家列表</span>
            </div>
            <span className="text-sm text-gray-500">
              {connectedPlayers.length} / {maxPlayers} 人
            </span>
          </div>

          <div className="space-y-3">
            {teams?.map((team, index) => {
              const teamData = playersByTeam[team.id]
              const teamColor = TEAM_COLORS[index] || TEAM_COLORS[0]

              return (
                <div 
                  key={team.id} 
                  className={`${teamColor.bg} rounded-lg p-3 border ${teamColor.border}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-3 h-3 rounded-full ${teamColor.dot}`} />
                    <span className={`font-medium ${teamColor.text}`}>
                      {team.team_name || teamColor.name}
                    </span>
                    <span className="text-xs text-gray-400">
                      ({teamData?.players?.length || 0}/{room?.players_per_team || 2})
                    </span>
                    {team.score > 0 && (
                      <span className={`ml-auto font-bold ${teamColor.text}`}>
                        {team.score} 分
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {teamData?.players?.map(player => (
                      <div
                        key={player.id}
                        className="px-2 py-1 rounded-full bg-white border border-gray-200 flex items-center gap-1.5"
                      >
                        {player.is_bot && (
                          <Bot className="w-3 h-3 text-purple-500" />
                        )}
                        <span className="text-sm text-gray-700">{player.display_name}</span>
                        {player.user_id === room?.host_id && (
                          <Crown className="w-3 h-3 text-yellow-500" />
                        )}
                        {player.user_id === currentPlayer?.user_id && (
                          <span className="text-xs text-gray-400">(你)</span>
                        )}
                        {player.is_describer && (
                          <span className="text-xs px-1 py-0.5 bg-orange-100 text-orange-600 rounded">
                            描述者
                          </span>
                        )}
                        {/* 房主可以移除机器人 */}
                        {isHost && player.is_bot && room?.status === 'waiting' && (
                          <button
                            onClick={() => handleRemoveBot(player.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                            title="移除机器人"
                          >
                            <UserX className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                    {/* 空位 */}
                    {Array.from({ length: (room?.players_per_team || 2) - (teamData?.players?.length || 0) }).map((_, i) => (
                      <div
                        key={`empty-${i}`}
                        className="px-2 py-1 rounded-full bg-white/50 border border-dashed border-gray-300"
                      >
                        <span className="text-sm text-gray-400">空位</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        {/* 操作按钮 */}
        <div className="space-y-3">
          {/* 机器人操作按钮 */}
          {canAddBot && (
            <div className="flex gap-2">
              <Button
                onClick={handleAddBot}
                disabled={addingBot || isLoading}
                variant="outline"
                className="flex-1 h-10 border-purple-200 text-purple-600 hover:bg-purple-50"
              >
                {addingBot ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    添加中...
                  </>
                ) : (
                  <>
                    <Bot className="w-4 h-4 mr-2" />
                    添加机器人
                  </>
                )}
              </Button>
              {emptySlots > 1 && (
                <Button
                  onClick={handleFillBots}
                  disabled={fillingBots || isLoading}
                  variant="outline"
                  className="flex-1 h-10 border-green-200 text-green-600 hover:bg-green-50"
                >
                  {fillingBots ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      补满中...
                    </>
                  ) : (
                    <>
                      <Users className="w-4 h-4 mr-2" />
                      一键补满 ({emptySlots})
                    </>
                  )}
                </Button>
              )}
            </div>
          )}

          {/* 机器人提示 */}
          {isHost && botPlayers.length > 0 && room?.status === 'waiting' && (
            <div className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-700">
              <Sparkles className="w-4 h-4" />
              <span>已有 {botPlayers.length} 个机器人，它们会自动参与游戏</span>
            </div>
          )}

          {/* 房主操作 */}
          {isHost && room?.status === 'waiting' && (
            <Button
              onClick={onStartGame}
              disabled={!canStart || isLoading}
              className="w-full h-12 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-semibold"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  启动中...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  开始游戏
                </>
              )}
            </Button>
          )}

          {/* 房主重新开始 */}
          {isHost && room?.status === 'finished' && (
            <Button
              onClick={onRestartGame}
              disabled={isLoading}
              className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              再来一局
            </Button>
          )}

          {/* 等待开始提示 */}
          {!isHost && room?.status === 'waiting' && (
            <div className="w-full h-12 flex items-center justify-center bg-gray-100 rounded-lg text-gray-500 text-sm">
              等待房主开始游戏...
            </div>
          )}

          {/* 离开房间 */}
          <Button
            variant="outline"
            onClick={handleLeave}
            disabled={leaving || isLoading}
            className="w-full h-10 border-red-200 text-red-600 hover:bg-red-50"
          >
            <LogOut className="w-4 h-4 mr-2" />
            {leaving ? '离开中...' : '离开房间'}
          </Button>
        </div>

        {/* 人数不足提示 */}
        {isHost && connectedPlayers.length < 2 && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700">
            至少需要 2 名玩家才能开始游戏
          </div>
        )}
      </div>
    </div>
  )
}
