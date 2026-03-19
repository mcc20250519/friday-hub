/**
 * RoomLobby - 游戏等待室主界面
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Play, LogOut, Users, Loader2, Bot, BarChart2 } from 'lucide-react'
import { toast } from '@/hooks/useToast'
import { MIN_PLAYERS, GAME_MODES, GAME_MODE_INFO, SCORING_MODES } from '@/lib/uno/constants'
import { getRankings } from '@/lib/uno/scoring'
import { getDisplayName } from '@/hooks/uno/useUnoRoom'
import ExitAnimation from '../shared/ExitAnimation'
import PlayerSlot from './PlayerSlot'
import InviteLink from './InviteLink'

/**
 * @param {Object} props
 * @param {Object} props.room - 房间数据
 * @param {Array} props.players - 玩家列表（含 profiles）
 * @param {boolean} props.isHost - 是否是房主
 * @param {Object|null} props.myPlayer - 当前用户的玩家记录
 * @param {Function} props.startGame - 开始游戏函数
 * @param {Function} props.leaveRoom - 离开房间函数
 * @param {Function} props.handleAddBot - 添加单个机器人函数
 * @param {Function} props.handleAddAllBots - 一键添加所有机器人函数
 */
export default function RoomLobby({
  room,
  players,
  isHost,
  myPlayer,
  startGame,
  leaveRoom,
  handleAddBot,
  handleAddAllBots,
  addingBot = false,
}) {
  const navigate = useNavigate()
  const [starting, setStarting] = useState(false)
  const [leaving, setLeaving] = useState(false)
  // 离开动画是否正在播放
  const [showLeaveAnim, setShowLeaveAnim] = useState(false)
  const [selectedMode, setSelectedMode] = useState(room?.game_mode || GAME_MODES.STANDARD)
  // 娱乐模式专用：排名模式开关（false=基础，true=排名）
  const [rankingMode, setRankingMode] = useState(
    room?.scoring_mode === SCORING_MODES.RANKING
  )

  // ── 开始游戏 ─────────────────────────────────────────────────

  const handleStartGame = async () => {
    if (players.length < MIN_PLAYERS) {
      toast.warning('人数不足', `至少需要 ${MIN_PLAYERS} 名玩家才能开始游戏`)
      return
    }

    const scoringMode = selectedMode === GAME_MODES.ENTERTAINMENT && rankingMode
      ? SCORING_MODES.RANKING
      : SCORING_MODES.BASIC

    setStarting(true)
    try {
      await startGame(selectedMode, scoringMode)
      // 将游戏模式和计分模式持久化到 localStorage，防止刷新后丢失
      if (room?.id) {
        localStorage.setItem(`uno_game_mode_${room.id}`, selectedMode)
        localStorage.setItem(`uno_scoring_mode_${room.id}`, scoringMode)
      }
      toast.success('游戏开始！', '准备好了吗？')
      // 注意：成功后不重置 starting，保持确认卡片显示直到页面切换
      // 避免 Realtime 推送 room 更新时 Lobby 短暂重显模式选择区造成闪烁
    } catch (err) {
      toast.error('开始失败', err.message || '无法开始游戏')
      // 失败时才重置，允许用户重试
      setStarting(false)
    }
  }

  // ── 离开房间 ─────────────────────────────────────────────────
  // 动画与 leaveRoom() 并行执行，两者都完成后才 navigate('/games')
  // 这样接口很快时用户感知是"动画播完就走"，接口慢时等接口完成

  const handleLeaveRoom = () => {
    if (leaving) return
    setLeaving(true)
    setShowLeaveAnim(true)
  }

  // ── 生成槽位（固定 max_players 个） ──────────────────────────

  const slots = []
  for (let i = 0; i < room.max_players; i++) {
    const player = players.find((p) => p.seat_index === i)
    slots.push(
      <PlayerSlot
        key={i}
        player={player}
        isHost={player?.user_id === room.host_id}
        isMe={player?.user_id === myPlayer?.user_id}
        seatIndex={i}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      {/* UNO 风格离开动画：与 leaveRoom 并行，两者都完成后 navigate */}
      {showLeaveAnim && (
        <ExitAnimation
          leaveAction={leaveRoom}
          onDone={() => navigate('/games')}
        />
      )}

      <div className="max-w-4xl mx-auto space-y-6">
        {/* 顶部标题 */}
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
            UNO 游戏大厅
          </h1>
          <p className="text-gray-500">快叫小伙伴们上车！</p>
        </div>

        {/* 游戏模式选择卡片（房主可改，开始游戏后隐藏防止闪烁） */}
        {isHost && !starting && (
          <Card className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <div className="mb-3 flex items-center gap-2">
              <span className="font-semibold text-gray-800">📋 挑个玩法</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(GAME_MODE_INFO).map(([mode, info]) => (
                <button
                  key={mode}
                  onClick={() => setSelectedMode(mode)}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    selectedMode === mode
                      ? 'border-blue-500 bg-blue-100 shadow-md'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-1">{info.emoji}</div>
                  <div className="font-semibold text-gray-800 text-sm">{info.label}</div>
                  <div className="text-xs text-gray-600 mt-1">{info.description}</div>
                </button>
              ))}
            </div>

            {/* 娱乐模式专用：排名模式开关 */}
            {selectedMode === GAME_MODES.ENTERTAINMENT && (
              <div className="mt-3 pt-3 border-t border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-gray-800">
                      🏅 排名模式
                      <span className={`ml-2 text-xs font-normal px-1.5 py-0.5 rounded-full ${
                        rankingMode ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {rankingMode ? '已开启' : '已关闭'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {rankingMode
                        ? '继续游戏直到决出最后一名，名次越靠前积分越高'
                        : '开启后：继续游戏决出所有名次，名次越靠前积分越高'}
                    </div>
                  </div>
                  <button
                    onClick={() => setRankingMode((v) => !v)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      rankingMode ? 'bg-purple-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        rankingMode ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                {rankingMode && (
                  <div className="mt-2 text-xs text-purple-700 bg-purple-50 rounded-lg px-3 py-2 border border-purple-200">
                    💡 积分公式：第 i 名得 (总人数 - i + 1) 分，第 1 名额外 +1 分
                  </div>
                )}
              </div>
            )}
          </Card>
        )}

        {/* 开始游戏后：显示已确认的模式（替代选择区，避免闪烁） */}
        {isHost && starting && (
          <Card className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{GAME_MODE_INFO[selectedMode]?.emoji}</span>
              <div>
                <div className="font-semibold text-gray-800 text-sm">
                  {GAME_MODE_INFO[selectedMode]?.label}
                </div>
                <div className="text-xs text-gray-500">已确认游戏模式，正在启动...</div>
              </div>
            </div>
          </Card>
        )}

        {/* 主内容区域 */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* 左侧：玩家列表 */}
          <Card className="md:col-span-2 p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                <span className="font-semibold text-gray-800">
                  玩家列表 ({players.length}/{room.max_players})
                </span>
              </div>
              {isHost && (
                <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full font-medium">
                  👑 你是房主
                </span>
              )}
            </div>

            {/* 玩家槽位 */}
            <div className="space-y-3">{slots}</div>

            {/* 底部按钮 */}
            <div className="mt-6 flex gap-3">
              {isHost ? (
                <Button
                  onClick={handleStartGame}
                  disabled={players.length < MIN_PLAYERS}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold h-12"
                >
                  {starting ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      启动中...
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5 mr-2" />
                      开始游戏
                    </>
                  )}
                </Button>
              ) : (
                <div className="flex-1 h-12 flex items-center justify-center bg-gray-100 rounded-lg text-gray-500 text-sm">
                  等待房主开始游戏...
                </div>
              )}

              <Button
                onClick={handleLeaveRoom}
                disabled={leaving}
                variant="outline"
                className="h-12 border-red-200 text-red-600 hover:bg-red-50"
              >
                <>
                  <LogOut className="h-5 w-5 mr-2" />
                  {leaving ? '正在开溜...' : '溜了溜了'}
                </>
              </Button>
            </div>

            {/* 人数不足时：添加机器人 or 提示 */}
            {isHost && players.length < MIN_PLAYERS && (
              <div className="mt-4 space-y-2">
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700">
                  ⚠️ 人不够呀，至少得 {MIN_PLAYERS} 个人才能开局，快去摇人！
                </div>
                {handleAddBot && (
                  <div className="flex gap-2">
                    <Button
                      onClick={handleAddBot}
                      disabled={addingBot || players.length >= room.max_players}
                      variant="outline"
                      className="flex-1 h-10 border-blue-200 text-blue-600 hover:bg-blue-50 text-sm"
                    >
                      {addingBot ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          添加中...
                        </>
                      ) : (
                        <>
                          <Bot className="h-4 w-4 mr-2" />
                          添加1个机器人
                        </>
                      )}
                    </Button>
                    {handleAddAllBots && players.length < room.max_players && (
                      <Button
                        onClick={handleAddAllBots}
                        disabled={addingBot || players.length >= room.max_players}
                        variant="outline"
                        className="flex-1 h-10 border-purple-200 text-purple-600 hover:bg-purple-50 text-sm"
                      >
                        {addingBot ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            添加中...
                          </>
                        ) : (
                          <>
                            <Bot className="h-4 w-4 mr-2" />
                            一键补满
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
            {/* 已达最少人数但还有空位时也显示添加机器人按钮 */}
            {isHost && players.length >= MIN_PLAYERS && players.length < room.max_players && handleAddBot && (
              <div className="mt-3 flex gap-2">
                <Button
                  onClick={handleAddBot}
                  disabled={addingBot}
                  variant="outline"
                  size="sm"
                  className="flex-1 border-blue-200 text-blue-600 hover:bg-blue-50 text-xs"
                >
                  {addingBot ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Bot className="h-3 w-3 mr-1" />
                  )}
                  添加1个
                </Button>
                {handleAddAllBots && (
                  <Button
                    onClick={handleAddAllBots}
                    disabled={addingBot}
                    variant="outline"
                    size="sm"
                    className="flex-1 border-purple-200 text-purple-600 hover:bg-purple-50 text-xs"
                  >
                    {addingBot ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Bot className="h-3 w-3 mr-1" />
                    )}
                    一键补满
                  </Button>
                )}
              </div>
            )}
          </Card>

          {/* 右侧：邀请链接 + 计分板 + 规则 */}
          <div className="space-y-4">
            <InviteLink roomCode={room.room_code} />

            {/* 计分板卡片：始终显示，随玩家加入动态更新 */}
            {(() => {
              const hasHistory = room?.score_board?.records?.length > 0
              const isEntertainment = room?.game_mode === GAME_MODES.ENTERTAINMENT
              const medals = ['🥇', '🥈', '🥉']

              // 有历史积分：使用积分板记录（已排序）
              // 无历史积分：用当前玩家列表初始化，积分全为 0
              const displayRows = hasHistory
                ? getRankings(room.score_board).map((r) => ({
                    playerId: r.playerId,
                    name: r.playerName,
                    totalScore: r.totalScore,
                    roundsPlayed: r.roundsPlayed,
                    rank: r.rank,
                  }))
                : players.map((p, idx) => ({
                    playerId: p.user_id,
                    name: getDisplayName(p.profiles),
                    totalScore: 0,
                    roundsPlayed: 0,
                    rank: idx + 1,
                  }))

              if (displayRows.length === 0) return null

              return (
                <Card className="p-4 bg-white">
                  <div className="text-sm font-semibold text-gray-800 mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart2 className="h-4 w-4 text-yellow-500" />
                      <span>累计积分板</span>
                    </div>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {hasHistory ? `共 ${room.score_board.totalRoundsPlayed} 局` : '暂未开始'}
                    </span>
                  </div>
                  {/* 表头 */}
                  <div
                    className="grid text-xs text-gray-400 font-medium px-2 pb-1 border-b border-gray-100"
                    style={{ gridTemplateColumns: '1.5rem 1fr 3rem 3rem' }}
                  >
                    <span></span>
                    <span>玩家</span>
                    <span className="text-center">{isEntertainment ? '积分' : '胜场'}</span>
                    <span className="text-center">局数</span>
                  </div>
                  <div className="space-y-1 mt-1 max-h-52 overflow-y-auto">
                    {displayRows.map((r) => {
                      const isMe = r.playerId === myPlayer?.user_id
                      const rankDisplay = hasHistory ? (medals[r.rank - 1] || `#${r.rank}`) : '–'
                      return (
                        <div
                          key={r.playerId}
                          className={`grid items-center gap-1 px-2 py-1.5 rounded-lg text-xs transition-colors ${
                            isMe
                              ? 'bg-yellow-50 border border-yellow-200 font-semibold'
                              : 'hover:bg-gray-50'
                          }`}
                          style={{ gridTemplateColumns: '1.5rem 1fr 3rem 3rem' }}
                        >
                          <span className="text-sm">{rankDisplay}</span>
                          <span className="truncate text-gray-800">
                            {r.name}
                            {isMe && <span className="ml-1 text-gray-400 font-normal">（你）</span>}
                          </span>
                          <span className={`text-center font-bold ${hasHistory ? 'text-purple-600' : 'text-gray-300'}`}>
                            {r.totalScore}
                          </span>
                          <span className="text-center text-gray-400">{r.roundsPlayed}</span>
                        </div>
                      )
                    })}
                  </div>
                </Card>
              )
            })()}

            {/* 游戏规则卡片 */}
            <Card className="p-4 bg-white">
              <div className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span className="text-xl">📖</span>
                快速规则
              </div>
              <ul className="text-xs text-gray-600 space-y-2">
                <li>🎯 目标：最先打完所有手牌获胜</li>
                <li>🎨 出牌：颜色或数字相同即可</li>
                <li>🚫 功能牌：跳过/反转/+2/万能牌</li>
                <li>🎺 剩1张时记得喊 UNO！</li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
