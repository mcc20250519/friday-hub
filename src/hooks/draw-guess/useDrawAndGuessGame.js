/**
 * 你说我猜 - 游戏主状态 Hook
 * 管理完整的游戏状态和操作
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import {
  createRoom as apiCreateRoom,
  joinRoom as apiJoinRoom,
  leaveRoom as apiLeaveRoom,
  getRoom as apiGetRoom,
  startGame as apiStartGame,
  submitGuess as apiSubmitGuess,
  requestHint as apiRequestHint,
  endRound as apiEndRound,
  restartGame as apiRestartGame,
  transitionPhase as apiTransitionPhase,
  getWordsForRoom,
  saveRoundDrawing,
  addBotToRoom,
  removeBotFromRoom,
  fillBotsToRoom
} from '../../lib/draw-guess'
import { useRealtimeSync } from './useRealtimeSync'
import { useGamePhase } from './useGamePhase'
import { useDrawGuessBot } from './useDrawGuessBot'

/**
 * 游戏主状态 Hook
 * @param {string} userId - 当前用户ID
 * @returns {Object} 游戏状态和操作方法
 */
export function useDrawAndGuessGame(userId) {
  // 房间状态
  const [room, setRoom] = useState(null)
  const [players, setPlayers] = useState([])
  const [teams, setTeams] = useState([])
  
  // 游戏状态
  const [currentRound, setCurrentRound] = useState(null)
  const [currentRoundId, setCurrentRoundId] = useState(null)
  const [currentDescriber, setCurrentDescriber] = useState(null)
  const [currentWord, setCurrentWord] = useState(null)
  const [currentPhase, setCurrentPhase] = useState('waiting')
  const [phaseStartedAt, setPhaseStartedAt] = useState(null)
  const [hintsRevealed, setHintsRevealed] = useState([])
  
  // 猜测记录
  const [guesses, setGuesses] = useState([])
  
  // UI 状态
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isHost, setIsHost] = useState(false)
  
  // 绘图数据
  const [drawingData, setDrawingData] = useState([])
  
  // Refs
  const roomRef = useRef(null)

  // 实时同步
  const {
    isConnected,
    subscribeToRoom,
    subscribeToPlayers,
    subscribeToTeams,
    subscribeToRound,
    subscribeToDrawingEvents,
    subscribeToGuesses,
    broadcastDrawing,
    broadcastGuess,
    broadcastHint,
    unsubscribeAll
  } = useRealtimeSync(room?.id, userId)

  // 游戏阶段管理
  const {
    timeRemaining,
    startPhaseTimer,
    stopPhaseTimer,
    onPhaseTimeout
  } = useGamePhase(room)

  // 创建房间
  const createRoom = useCallback(async (config) => {
    setIsLoading(true)
    setError(null)

    const { data, error: err } = await apiCreateRoom(userId, config)

    if (err) {
      setError(err)
      setIsLoading(false)
      return { error: err }
    }

    setRoom(data)
    setTeams(data.teams || [])
    setPlayers(data.currentPlayer ? [data.currentPlayer] : [])
    setIsHost(true)
    roomRef.current = data

    // 订阅房间变化
    setupSubscriptions(data.id)

    setIsLoading(false)
    return { data }
  }, [userId])

  // 加入房间
  const joinRoom = useCallback(async (roomCode, displayName) => {
    setIsLoading(true)
    setError(null)

    const { data, error: err } = await apiJoinRoom(userId, roomCode, displayName)

    if (err) {
      setError(err)
      setIsLoading(false)
      return { error: err }
    }

    setRoom(data.room)
    setIsHost(data.room.host_id === userId)
    roomRef.current = data.room

    // 获取完整房间信息
    const { data: fullRoom } = await apiGetRoom(data.room.id)
    if (fullRoom) {
      setTeams(fullRoom.teams || [])
      setPlayers(fullRoom.players || [])
    }

    // 订阅房间变化
    setupSubscriptions(data.room.id)

    setIsLoading(false)
    return { data }
  }, [userId])

  // 离开房间
  const leaveRoom = useCallback(async () => {
    if (!room) return

    const { error: err } = await apiLeaveRoom(userId, room.id)
    
    unsubscribeAll()
    
    setRoom(null)
    setPlayers([])
    setTeams([])
    setCurrentRound(null)
    setCurrentDescriber(null)
    setCurrentWord(null)
    setCurrentPhase('waiting')
    setGuesses([])
    setDrawingData([])
    setIsHost(false)
    roomRef.current = null

    return { error: err }
  }, [room, userId, unsubscribeAll])

  // 开始游戏
  const startGame = useCallback(async () => {
    if (!room || !isHost) {
      setError('只有房主可以开始游戏')
      return { error: '只有房主可以开始游戏' }
    }

    setIsLoading(true)
    setError(null)

    const { data, error: err } = await apiStartGame(room.id, userId)

    if (err) {
      setError(err)
      setIsLoading(false)
      return { error: err }
    }

    setCurrentRound(data.round)
    setCurrentPhase(data.phase)
    setCurrentDescriber(data.describer)
    setCurrentWord(isHost || data.describer?.user_id === userId ? data.word : null)
    setCurrentRoundId(data.roundId)

    // 启动描述阶段计时器
    if (room.description_time_sec) {
      startPhaseTimer('description', room.description_time_sec, async () => {
        await apiTransitionPhase(room.id, 'guessing')
      })
    }

    setIsLoading(false)
    return { data }
  }, [room, isHost, userId, startPhaseTimer])

  // 提交猜测
  const submitGuess = useCallback(async (guess) => {
    if (!currentRoundId || !room) {
      return { error: '当前没有进行中的轮次' }
    }

    const { data, error: err } = await apiSubmitGuess(room.id, currentRoundId, userId, guess)

    if (err) {
      return { error: err }
    }

    // 如果猜对了，结束猜测阶段
    if (data.isCorrect) {
      stopPhaseTimer()
      await apiTransitionPhase(room.id, 'round_end')
      
      // 广播正确猜测
      broadcastGuess(currentRoundId, guess, true)
    } else {
      // 记录猜测
      setGuesses(prev => [...prev, {
        userId,
        guess,
        isCorrect: false,
        timestamp: new Date().toISOString()
      }])
    }

    return { data }
  }, [currentRoundId, room, userId, stopPhaseTimer, broadcastGuess])

  // 请求提示
  const requestHint = useCallback(async (teamId) => {
    if (!room) return { error: '房间不存在' }

    const { data, error: err } = await apiRequestHint(room.id, teamId)

    if (err) {
      return { error: err }
    }

    // 更新提示状态
    setHintsRevealed(prev => [...prev, { position: data.position, character: data.character }])

    // 广播提示
    broadcastHint(currentRoundId, data)

    return { data }
  }, [room, currentRoundId, broadcastHint])

  // 进入下一轮
  const nextRound = useCallback(async () => {
    if (!room || !currentRoundId) return

    setIsLoading(true)

    // 保存当前绘图数据
    if (drawingData.length > 0) {
      await saveRoundDrawing(currentRoundId, drawingData)
    }

    const { data, error: err } = await apiEndRound(room.id, currentRoundId)

    if (err) {
      setError(err)
      setIsLoading(false)
      return { error: err }
    }

    if (data.gameEnded) {
      // 游戏结束
      setCurrentPhase('finished')
      stopPhaseTimer()
    } else {
      // 下一轮
      setCurrentRound(data.nextRound)
      setCurrentDescriber(data.describer)
      setCurrentWord(isHost || data.describer?.user_id === userId ? data.word : null)
      setCurrentRoundId(data.roundId)
      setCurrentPhase('description')
      setGuesses([])
      setDrawingData([])
      setHintsRevealed([])

      // 启动新轮次计时器
      startPhaseTimer('description', room.description_time_sec, async () => {
        await apiTransitionPhase(room.id, 'guessing')
      })
    }

    setIsLoading(false)
    return { data }
  }, [room, currentRoundId, drawingData, isHost, userId, startPhaseTimer, stopPhaseTimer])

  // 结束游戏
  const endGame = useCallback(async () => {
    if (!room) return

    stopPhaseTimer()
    setCurrentPhase('finished')
  }, [room, stopPhaseTimer])

  // 重新开始游戏
  const restartGame = useCallback(async () => {
    if (!room || !isHost) {
      return { error: '只有房主可以重新开始游戏' }
    }

    setIsLoading(true)

    const { error: err } = await apiRestartGame(room.id, userId)

    if (err) {
      setError(err)
      setIsLoading(false)
      return { error: err }
    }

    // 重置状态
    setCurrentRound(null)
    setCurrentRoundId(null)
    setCurrentDescriber(null)
    setCurrentWord(null)
    setCurrentPhase('waiting')
    setGuesses([])
    setDrawingData([])
    setHintsRevealed([])

    // 重置团队分数
    const { data: updatedRoom } = await apiGetRoom(room.id)
    if (updatedRoom) {
      setTeams(updatedRoom.teams || [])
      setPlayers(updatedRoom.players || [])
    }

    setIsLoading(false)
    return { success: true }
  }, [room, isHost, userId])

  // 添加机器人
  const addBot = useCallback(async () => {
    if (!room || !isHost) {
      return { error: '只有房主可以添加机器人' }
    }

    const result = await addBotToRoom(room.id, userId)

    if (result.data && !result.error) {
      // 刷新玩家列表
      const { data: updatedRoom } = await apiGetRoom(room.id)
      if (updatedRoom) {
        setPlayers(updatedRoom.players || [])
      }
    }

    return result
  }, [room, isHost, userId])

  // 移除机器人
  const removeBot = useCallback(async (botPlayerId) => {
    if (!room || !isHost) {
      return { error: '只有房主可以移除机器人' }
    }

    const result = await removeBotFromRoom(room.id, botPlayerId, userId)

    if (!result.error) {
      // 刷新玩家列表
      const { data: updatedRoom } = await apiGetRoom(room.id)
      if (updatedRoom) {
        setPlayers(updatedRoom.players || [])
      }
    }

    return result
  }, [room, isHost, userId])

  // 一键补满机器人
  const fillBots = useCallback(async () => {
    if (!room || !isHost) {
      return { error: '只有房主可以添加机器人' }
    }

    const result = await fillBotsToRoom(room.id, userId)

    if (!result.error) {
      // 刷新玩家列表
      const { data: updatedRoom } = await apiGetRoom(room.id)
      if (updatedRoom) {
        setPlayers(updatedRoom.players || [])
      }
    } else {
      console.error('填充机器人失败:', result.error)
    }

    return result
  }, [room, isHost, userId])

  // 设置订阅
  const setupSubscriptions = useCallback((roomId) => {
    // 订阅房间状态变化
    subscribeToRoom((updatedRoom) => {
      setRoom(prev => ({ ...prev, ...updatedRoom }))
      setCurrentPhase(updatedRoom.current_phase)
      setCurrentRound(updatedRoom.current_round)
      setPhaseStartedAt(updatedRoom.phase_started_at)
      setHintsRevealed(updatedRoom.hints_revealed || [])

      // 检查描述者是否是自己，显示词语
      if (updatedRoom.current_describer_id === userId && updatedRoom.current_word) {
        setCurrentWord(updatedRoom.current_word)
      }

      setIsHost(updatedRoom.host_id === userId)
    })

    // 订阅玩家变化
    subscribeToPlayers((change) => {
      if (change.eventType === 'INSERT') {
        setPlayers(prev => [...prev, change.new])
      } else if (change.eventType === 'UPDATE') {
        setPlayers(prev => prev.map(p => 
          p.id === change.new.id ? { ...p, ...change.new } : p
        ))
      } else if (change.eventType === 'DELETE') {
        setPlayers(prev => prev.filter(p => p.id !== change.old.id))
      }
    })

    // 订阅团队变化
    subscribeToTeams((updatedTeam) => {
      setTeams(prev => prev.map(t => 
        t.id === updatedTeam.id ? { ...t, ...updatedTeam } : t
      ))
    })

    // 订阅绘图事件
    subscribeToDrawingEvents(currentRoundId, (drawingEvent) => {
      setDrawingData(prev => [...prev, drawingEvent])
    })

    // 订阅猜测事件
    subscribeToGuesses(currentRoundId, (guessEvent) => {
      setGuesses(prev => [...prev, guessEvent])
    })
  }, [subscribeToRoom, subscribeToPlayers, subscribeToTeams, 
      subscribeToDrawingEvents, subscribeToGuesses, currentRoundId, userId])

  // 当 currentRoundId 变化时重新订阅绘图和猜测
  useEffect(() => {
    if (currentRoundId && room) {
      subscribeToDrawingEvents(currentRoundId, (drawingEvent) => {
        setDrawingData(prev => [...prev, drawingEvent])
      })
      subscribeToGuesses(currentRoundId, (guessEvent) => {
        setGuesses(prev => [...prev, guessEvent])
      })
    }
  }, [currentRoundId, room, subscribeToDrawingEvents, subscribeToGuesses])

  // 清理
  useEffect(() => {
    return () => {
      stopPhaseTimer()
      unsubscribeAll()
    }
  }, [stopPhaseTimer, unsubscribeAll])

  // 计算当前玩家
  const currentPlayer = players.find(p => p.user_id === userId)

  // 计算当前团队
  const currentTeam = teams.find(t => t.id === currentPlayer?.team_id)

  // 计算分数排名
  const rankedTeams = [...teams].sort((a, b) => b.score - a.score)

  // 启用机器人 AI
  useDrawGuessBot({
    room,
    players,
    teams,
    currentPhase,
    currentWord,
    hintsRevealed,
    timeRemaining,
    currentRoundId,
    isHost
  })

  return {
    // 房间状态
    room,
    players,
    teams,
    rankedTeams,
    
    // 当前玩家状态
    currentPlayer,
    currentTeam,
    isHost,
    
    // 游戏状态
    currentRound,
    currentRoundId,
    currentDescriber,
    currentWord,
    currentPhase,
    phaseStartedAt,
    hintsRevealed,
    
    // 猜测和绘图
    guesses,
    drawingData,
    setDrawingData,
    
    // 计时器
    timeRemaining,
    
    // 连接状态
    isConnected,
    isLoading,
    error,
    
    // 操作
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    submitGuess,
    requestHint,
    nextRound,
    endGame,
    restartGame,
    addBot,
    removeBot,
    fillBots,
    
    // 广播
    broadcastDrawing,
    broadcastGuess,
    broadcastHint
  }
}
