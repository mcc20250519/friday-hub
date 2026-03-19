/**
 * GameResult - 游戏结算界面 + 累计积分板
 *
 * 支持三种展示场景：
 *  1. viewMode="result"（默认）：本局结算弹窗，显示胜负/排名及本局得分，可点击"查看积分板"
 *  2. viewMode="scoreboard"：独立积分板弹窗（游戏中随时查看），通过 onClose 关闭
 *
 * 计分逻辑：
 *  - standard + basic:   获胜者 +1 分，显示"胜场数"列
 *  - entertainment + basic:   第1名 +3 分，其余 0 分
 *  - entertainment + ranking: 按名次公式分配积分
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Trophy, Home, ArrowLeft, Loader2, X, BarChart2 } from 'lucide-react'
import { getDisplayName } from '@/hooks/uno/useUnoRoom'
import { GAME_MODES, SCORING_MODES } from '@/lib/uno/constants'
import { getRankings } from '@/lib/uno/scoring'

/**
 * @param {Object}   props
 * @param {string|null} props.winnerId      - 获胜玩家 ID（官方）/ 第一名 ID（娱乐）；viewMode="scoreboard" 时为 null
 * @param {Array}    props.players          - 玩家列表（含 profiles）
 * @param {string}   props.myUserId         - 当前用户 ID
 * @param {string}   props.roomCode         - 房间码
 * @param {Function|null} props.onReturnToRoom - 返回房间回调
 * @param {string}   [props.gameMode]       - 'standard' | 'entertainment'
 * @param {string[]} [props.rankList]       - 娱乐版排名 userId 数组
 * @param {{ playerId, scoreEarned, rank }[]} [props.roundResults] - 本局得分结果
 * @param {Object|null} [props.scoreBoard]  - 累计积分板对象
 * @param {string}   [props.scoringMode]    - 'basic' | 'ranking'
 * @param {string}   [props.viewMode]       - 'result'（默认）| 'scoreboard'
 * @param {Function} [props.onClose]        - viewMode="scoreboard" 时的关闭回调
 */
export default function GameResult({
  winnerId,
  players,
  myUserId,
  roomCode,
  onReturnToRoom,
  gameMode = GAME_MODES.STANDARD,
  rankList = [],
  roundResults = null,
  scoreBoard = null,
  scoringMode = SCORING_MODES.BASIC,
  viewMode = 'result',
  onClose,
}) {
  const navigate = useNavigate()
  const [returning, setReturning] = useState(false)
  // 控制是否显示积分板（从本局结算切换到积分板）
  const [showingScoreBoard, setShowingScoreBoard] = useState(viewMode === 'scoreboard')

  const handleReturnToRoom = async () => {
    if (!onReturnToRoom) return
    setReturning(true)
    try {
      await onReturnToRoom()
    } catch {
      setReturning(false)
    }
  }

  const isEntertainmentMode = gameMode === GAME_MODES.ENTERTAINMENT
  const isRankingMode = scoringMode === SCORING_MODES.RANKING

  // 获胜者信息
  const winnerRecord = players?.find((p) => p.user_id === winnerId)
  const winnerName = winnerRecord
    ? getDisplayName(winnerRecord.profiles)
    : '未知玩家'
  const isWinner = winnerId === myUserId

  // 娱乐版：本局排名展示数据
  const rankingData = isEntertainmentMode
    ? rankList.map((userId, idx) => {
        const player = players?.find((p) => p.user_id === userId)
        // 本局得分
        const earned = roundResults?.find((r) => r.playerId === userId)?.scoreEarned ?? null
        return {
          rank: idx + 1,
          userId,
          name: player ? getDisplayName(player.profiles) : '未知玩家',
          isMe: userId === myUserId,
          scoreEarned: earned,
        }
      })
    : []

  const myRank = rankingData.find((r) => r.isMe)?.rank
  const myRoundScore = roundResults?.find((r) => r.playerId === myUserId)?.scoreEarned ?? null

  // 官方模式：本局我的得分
  const myStandardScore = !isEntertainmentMode
    ? (winnerId === myUserId ? 1 : 0)
    : null

  // 累计积分板数据
  const scoreBoardRankings = getRankings(scoreBoard)
  const hasScoreBoard = scoreBoardRankings.length > 0

  // ── 积分板视图 ──────────────────────────────────────────────
  const ScoreBoardView = () => (
    <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl transform animate-in zoom-in-90 duration-300">
      {/* 标题 */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-5 w-5 text-yellow-500" />
          <h2 className="text-xl font-bold text-gray-800">累计积分板</h2>
          {scoreBoard?.totalRoundsPlayed > 0 && (
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              共 {scoreBoard.totalRoundsPlayed} 局
            </span>
          )}
        </div>
        {(viewMode === 'scoreboard' || showingScoreBoard) && onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* 积分表格 */}
      {hasScoreBoard ? (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {/* 表头 */}
          <div className="grid text-xs text-gray-400 font-medium px-3 pb-1 border-b border-gray-100"
            style={{ gridTemplateColumns: '2rem 1fr 4rem 4rem 4rem' }}
          >
            <span className="text-center">名</span>
            <span>玩家</span>
            <span className="text-center">
              {isEntertainmentMode ? '积分' : '胜场'}
            </span>
            <span className="text-center">上局</span>
            <span className="text-center">局数</span>
          </div>

          {scoreBoardRankings.map((r) => {
            const isMe = r.playerId === myUserId
            const medals = ['🥇', '🥈', '🥉']
            const rankDisplay = medals[r.rank - 1] || `#${r.rank}`
            return (
              <div
                key={r.playerId}
                className={`grid items-center gap-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isMe
                    ? 'bg-yellow-50 border-2 border-yellow-300'
                    : 'bg-gray-50 border border-gray-100'
                }`}
                style={{ gridTemplateColumns: '2rem 1fr 4rem 4rem 4rem' }}
              >
                <div className="text-center text-base">{rankDisplay}</div>
                <div className="font-semibold text-gray-800 truncate">
                  {r.playerName}
                  {isMe && <span className="ml-1 text-xs text-gray-400">（你）</span>}
                </div>
                <div className="text-center font-bold text-purple-600">
                  {r.totalScore}
                </div>
                <div className="text-center text-gray-500">
                  {r.lastRoundScore != null
                    ? (r.lastRoundScore > 0 ? `+${r.lastRoundScore}` : `${r.lastRoundScore}`)
                    : '–'}
                </div>
                <div className="text-center text-gray-400 text-xs">
                  {r.roundsPlayed}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center text-gray-400 text-sm py-8">
          暂无积分数据
        </div>
      )}

      {/* 积分规则说明 */}
      <div className="mt-4 text-xs text-gray-400 bg-gray-50 rounded-lg p-3">
        {isEntertainmentMode ? (
          isRankingMode ? (
            <>🏅 排名模式：第 i 名得 (N-i+1) 分，第1名额外 +1 分</>
          ) : (
            <>🎉 基础模式：第1名 +3 分，其余 0 分</>
          )
        ) : (
          <>🏆 官方规则：每局获胜 +1 分</>
        )}
      </div>

      {/* 纯积分板模式的关闭按钮 */}
      {viewMode === 'scoreboard' && !onClose && (
        <Button
          onClick={() => navigate('/games')}
          variant="outline"
          className="w-full mt-4 h-11 border-gray-300 text-gray-600 hover:bg-gray-50"
        >
          <Home className="h-5 w-5 mr-2" />
          返回游戏大厅
        </Button>
      )}

      {/* 从本局结算切过来：显示"返回结算"按钮 */}
      {showingScoreBoard && viewMode !== 'scoreboard' && (
        <Button
          onClick={() => setShowingScoreBoard(false)}
          variant="outline"
          className="w-full mt-4 h-11 border-gray-300 text-gray-600 hover:bg-gray-50"
        >
          ← 返回本局结算
        </Button>
      )}
    </div>
  )

  // ── 如果展示积分板 ──────────────────────────────────────────
  if (showingScoreBoard) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <ScoreBoardView />
      </div>
    )
  }

  // ── 本局结算视图（result 模式）──────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      {isEntertainmentMode ? (
        // ── 娱乐版：排名榜 ────────────────────────────────────────────
        <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl transform animate-in zoom-in-90 duration-300">
          {/* 标题 */}
          <div className="text-center mb-6">
            <div className="text-8xl mb-2">🎊</div>
            <h2 className="text-3xl font-bold text-gray-800">本局结束</h2>
            <p className="text-sm text-gray-500 mt-2">
              {isRankingMode ? '排名模式' : '基础模式'} · 排名已生成
            </p>
          </div>

          {/* 本局排名榜单 */}
          <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
            {rankingData.map((rank) => {
              const medals = ['🥇', '🥈', '🥉']
              const medal = medals[rank.rank - 1] || `#${rank.rank}`
              return (
                <div
                  key={rank.userId}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 ${
                    rank.isMe
                      ? 'border-yellow-400 bg-yellow-50 shadow-md'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="text-2xl min-w-12 text-center">{medal}</div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-800">
                      {rank.name}
                      {rank.isMe && <span className="ml-2 text-xs text-gray-500">（你）</span>}
                    </div>
                  </div>
                  {/* 本局得分标签 */}
                  {rank.scoreEarned != null && (
                    <div className={`text-sm font-bold px-2 py-0.5 rounded-full ${
                      rank.scoreEarned > 0
                        ? 'text-green-700 bg-green-100'
                        : 'text-gray-500 bg-gray-100'
                    }`}>
                      {rank.scoreEarned > 0 ? `+${rank.scoreEarned}` : '0'} 分
                    </div>
                  )}
                  <div className="text-sm font-bold text-gray-500 min-w-10 text-right">
                    第 {rank.rank} 名
                  </div>
                </div>
              )
            })}
          </div>

          {/* 我的成绩提示 */}
          {myRank && (
            <div className={`text-center p-3 rounded-lg mb-4 ${
              myRank === 1
                ? 'bg-yellow-100 border border-yellow-300'
                : 'bg-gray-100 border border-gray-300'
            }`}>
              {myRank === 1 ? (
                <>
                  <div className="text-2xl mb-1">🎉</div>
                  <p className="font-bold text-gray-800">
                    太棒了！你是第一名！
                    {myRoundScore != null && myRoundScore > 0 && (
                      <span className="ml-2 text-green-600">+{myRoundScore} 分</span>
                    )}
                  </p>
                </>
              ) : (
                <p className="text-gray-700">
                  你的名次是第 <span className="font-bold text-purple-600">{myRank}</span>
                  {myRoundScore != null && (
                    <span className={`ml-2 font-bold ${myRoundScore > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                      {myRoundScore > 0 ? `+${myRoundScore}` : '0'} 分
                    </span>
                  )}
                </p>
              )}
            </div>
          )}

          {/* 操作按钮 */}
          <div className="space-y-2">
            {/* 查看积分板 */}
            {hasScoreBoard && (
              <Button
                onClick={() => setShowingScoreBoard(true)}
                variant="outline"
                className="w-full h-10 border-yellow-300 text-yellow-700 hover:bg-yellow-50 text-sm"
              >
                <BarChart2 className="h-4 w-4 mr-2" />
                查看累计积分板
              </Button>
            )}
            {onReturnToRoom && (
              <Button
                onClick={handleReturnToRoom}
                disabled={returning}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white h-12"
              >
                {returning ? (
                  <><Loader2 className="h-5 w-5 mr-2 animate-spin" />返回中...</>
                ) : (
                  <><ArrowLeft className="h-5 w-5 mr-2" />返回房间</>
                )}
              </Button>
            )}
            <Button
              onClick={() => navigate('/games')}
              variant="outline"
              className="w-full h-11 border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              <Home className="h-5 w-5 mr-2" />
              返回游戏大厅
            </Button>
          </div>
        </div>
      ) : (
        // ── 官方版：简洁胜者弹窗 ────────────────────────────────────────
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl transform animate-in zoom-in-90 duration-300">
          {/* 动画效果 */}
          <div className="text-center mb-6">
            {isWinner ? (
              <>
                <div className="text-8xl mb-4 animate-bounce">🎉</div>
                <h2 className="text-3xl font-bold text-yellow-600 mb-2">
                  太棒了！
                </h2>
                <p className="text-gray-600">你是本局的 UNO 大师！</p>
              </>
            ) : (
              <>
                <div className="text-8xl mb-4">🏆</div>
                <h2 className="text-3xl font-bold text-gray-800 mb-2">
                  本局结束
                </h2>
                <p className="text-gray-600">
                  本局赢家：<span className="font-bold text-purple-600">{winnerName}</span>
                </p>
              </>
            )}
          </div>

          {/* 胜利者信息卡片 */}
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-4 mb-4 border-2 border-yellow-200">
            <div className="flex items-center gap-3">
              <Trophy className="h-8 w-8 text-yellow-500" />
              <div className="flex-1">
                <div className="text-sm text-gray-500">本局冠军</div>
                <div className="text-lg font-bold text-gray-800">{winnerName}</div>
              </div>
              {/* 胜者得分：官方模式固定 +1 */}
              <div className="text-right">
                <div className="text-xs text-gray-400">本局得分</div>
                <div className="text-xl font-bold text-green-600">+1</div>
              </div>
            </div>
            {/* 非胜者：额外显示自己得 0 分 */}
            {!isWinner && (
              <div className="mt-3 pt-3 border-t border-yellow-200 flex items-center justify-between text-sm">
                <span className="text-gray-500">你的得分</span>
                <span className="font-bold text-gray-400">0 分</span>
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="space-y-2">
            {/* 查看积分板 */}
            {hasScoreBoard && (
              <Button
                onClick={() => setShowingScoreBoard(true)}
                variant="outline"
                className="w-full h-10 border-yellow-300 text-yellow-700 hover:bg-yellow-50 text-sm"
              >
                <BarChart2 className="h-4 w-4 mr-2" />
                查看累计积分板
              </Button>
            )}
            {onReturnToRoom && (
              <Button
                onClick={handleReturnToRoom}
                disabled={returning}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white h-12"
              >
                {returning ? (
                  <><Loader2 className="h-5 w-5 mr-2 animate-spin" />返回中...</>
                ) : (
                  <><ArrowLeft className="h-5 w-5 mr-2" />返回房间</>
                )}
              </Button>
            )}
            <Button
              onClick={() => navigate('/games')}
              variant="outline"
              className="w-full h-11 border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              <Home className="h-5 w-5 mr-2" />
              返回游戏大厅
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
