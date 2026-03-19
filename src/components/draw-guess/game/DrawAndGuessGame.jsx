/**
 * DrawAndGuessGame - 游戏主页面容器
 * 根据游戏阶段渲染不同内容，管理整体布局
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import DrawAndGuessSettings from '../lobby/DrawAndGuessSettings'
import GameCanvas from './GameCanvas'
import GameGuessInput from './GameGuessInput'
import TeamScoreboard from './TeamScoreboard'
import PlayerList from './PlayerList'
import PhaseDisplay from './PhaseDisplay'
import RoundSummary from './RoundSummary'
import GameResult from './GameResult'
import { useDrawingCanvas } from '@/hooks/draw-guess/useDrawingCanvas'
import { Button } from '@/components/ui/button'
import { LogOut, Lightbulb } from 'lucide-react'
import { toast } from '@/hooks/useToast'

/**
 * @param {Object} props
 * @param {Object} props.gameHook - useDrawAndGuessGame hook 返回的对象
 */
export default function DrawAndGuessGame({ gameHook }) {
  const navigate = useNavigate()
  const [isLeaving, setIsLeaving] = useState(false)

  // 从 gameHook 解构状态
  const {
    room,
    players,
    teams,
    rankedTeams,
    currentPlayer,
    currentTeam,
    isHost,
    currentRound,
    currentRoundId,
    currentDescriber,
    currentWord,
    currentPhase,
    timeRemaining,
    hintsRevealed,
    guesses,
    drawingData,
    setDrawingData,
    isConnected,
    isLoading,
    error,
    startGame,
    submitGuess,
    requestHint,
    nextRound,
    restartGame,
    leaveRoom,
    broadcastDrawing,
    addBot,
    removeBot,
    fillBots
  } = gameHook

  // 绘图 Hook
  const canvasHook = useDrawingCanvas({
    width: 800,
    height: 500,
    onStroke: (stroke) => {
      if (currentRoundId && currentDescriber?.user_id === currentPlayer?.user_id) {
        setDrawingData(prev => [...prev, stroke])
        broadcastDrawing(currentRoundId, stroke)
      }
    }
  })

  // 恢复绘图数据
  useEffect(() => {
    if (drawingData && drawingData.length > 0) {
      canvasHook.restoreCanvasData(drawingData)
    }
  }, [drawingData])

  // 是否是描述者
  const isDescriber = currentDescriber?.user_id === currentPlayer?.user_id

  // 处理猜测提交
  const handleSubmitGuess = async (guess) => {
    const result = await submitGuess(guess)
    if (result.error) {
      toast.error('提交失败', result.error)
    } else if (result.data?.isCorrect) {
      toast.success('猜对了！', '太棒了！')
    }
    return result
  }

  // 处理提示请求
  const handleRequestHint = async () => {
    if (!currentTeam) return
    const result = await requestHint(currentTeam.id)
    if (result.error) {
      toast.error('提示失败', result.error)
    } else {
      toast.info('提示', `揭示了一个字符`)
    }
  }

  // 处理离开
  const handleLeave = async () => {
    setIsLeaving(true)
    await leaveRoom()
    navigate('/games/draw-and-guess')
  }

  // 错误提示
  useEffect(() => {
    if (error) {
      toast.error('错误', error)
    }
  }, [error])

  // 连接状态跟踪 - 只在真正断开时显示
  const [hasShownConnectionWarning, setHasShownConnectionWarning] = useState(false)

  // 连接状态提示
  useEffect(() => {
    // 只在曾经连接成功且现在断开时才显示警告
    if (!isConnected && room && hasShownConnectionWarning) {
      toast.warning('连接中断', '正在尝试重新连接...')
    } else if (isConnected && room && !hasShownConnectionWarning) {
      // 首次成功连接时，标记已连接过
      setHasShownConnectionWarning(true)
    }
  }, [isConnected, room, hasShownConnectionWarning])

  // 根据阶段渲染不同内容
  const renderGameContent = () => {
    // 等待阶段 -> 设置页面
    if (currentPhase === 'waiting' || !room) {
      return (
        <DrawAndGuessSettings
          room={room}
          players={players}
          teams={teams}
          isHost={isHost}
          currentPlayer={currentPlayer}
          onStartGame={startGame}
          onLeaveRoom={handleLeave}
          onRestartGame={restartGame}
          onAddBot={addBot}
          onRemoveBot={removeBot}
          onFillBots={fillBots}
          isLoading={isLoading}
        />
      )
    }

    // 游戏结束
    if (currentPhase === 'finished') {
      const winner = teams.find(t => t.score >= Math.ceil((room.target_rounds || 3) / 2))
      return (
        <GameResult
          winner={winner}
          teams={teams}
          players={players}
          isHost={isHost}
          onRestart={restartGame}
          onLeave={handleLeave}
          isLoading={isLoading}
        />
      )
    }

    // 轮次结束
    if (currentPhase === 'round_end') {
      const winningTeam = teams.find(t => {
        const lastGuess = guesses?.find(g => g.is_correct)
        return lastGuess?.team_id === t.id
      })

      return (
        <RoundSummary
          word={currentWord}
          winningTeam={winningTeam}
          teams={teams}
          roundNumber={currentRound}
          totalRounds={room.target_rounds || 3}
          onNextRound={nextRound}
          isHost={isHost}
          isLoading={isLoading}
        />
      )
    }

    // 游戏进行中
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-yellow-50 to-pink-50 p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          {/* 顶部：阶段显示 */}
          <PhaseDisplay
            phase={currentPhase}
            timeRemaining={timeRemaining}
            word={currentWord}
            hintsRevealed={hintsRevealed}
            isDescriber={isDescriber}
            describerName={currentDescriber?.display_name}
          />

          <div className="grid md:grid-cols-3 gap-4 mt-4">
            {/* 左侧：玩家列表 */}
            <div className="space-y-4 order-2 md:order-1">
              <PlayerList
                players={players}
                teams={teams}
                currentUserId={currentPlayer?.user_id}
                hostId={room?.host_id}
                describerId={currentDescriber?.user_id}
              />
              
              <TeamScoreboard
                teams={teams}
                currentTeamId={currentTeam?.id}
                targetScore={Math.ceil((room.target_rounds || 3) / 2)}
              />
            </div>

            {/* 中间：画布/猜测区 */}
            <div className="md:col-span-2 space-y-4 order-1 md:order-2">
              {/* 画布 */}
              <GameCanvas
                canvasHook={canvasHook}
                isDescriber={isDescriber}
                readOnly={!isDescriber}
              />

              {/* 猜测输入（猜测阶段） */}
              {currentPhase === 'guessing' && !isDescriber && (
                <div className="space-y-2">
                  <GameGuessInput
                    guesses={guesses}
                    onSubmitGuess={handleSubmitGuess}
                    disabled={isDescriber}
                    currentUserId={currentPlayer?.user_id}
                  />
                  
                  {/* 提示按钮 */}
                  {currentTeam && (currentTeam.hints_used || 0) < 2 && (
                    <Button
                      variant="outline"
                      onClick={handleRequestHint}
                      className="w-full"
                    >
                      <Lightbulb className="w-4 h-4 mr-2" />
                      请求提示 ({2 - (currentTeam.hints_used || 0)} 次剩余)
                    </Button>
                  )}
                </div>
              )}

              {/* 描述阶段提示 */}
              {currentPhase === 'description' && !isDescriber && (
                <div className="p-4 bg-blue-50 rounded-lg text-center text-blue-700">
                  {currentDescriber?.display_name} 正在描述...
                </div>
              )}
            </div>
          </div>

          {/* 底部：离开按钮 */}
          <div className="mt-4 text-center">
            <Button
              variant="ghost"
              onClick={handleLeave}
              disabled={isLeaving}
              className="text-gray-500"
            >
              <LogOut className="w-4 h-4 mr-2" />
              离开游戏
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return renderGameContent()
}
