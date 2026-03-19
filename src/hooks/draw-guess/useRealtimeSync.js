/**
 * 你说我猜 - 实时同步 Hook
 * 管理 Supabase Realtime 订阅和广播
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabase'

/**
 * 实时同步 Hook
 * @param {string} roomId - 房间ID
 * @param {string} userId - 用户ID
 * @returns {Object} 实时同步状态和方法
 */
export function useRealtimeSync(roomId, userId) {
  // 状态
  const [isConnected, setIsConnected] = useState(true) // 默认为 true，避免初始加载时的误报
  const [isError, setIsError] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('connecting')
  const hasConnectedRef = useRef(false) // 是否曾经连接成功过
  
  // Refs
  const channelsRef = useRef({})
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5

  // 订阅房间变化
  const subscribeToRoom = useCallback((onRoomUpdate) => {
    if (!roomId) return

    const channelName = `room:${roomId}`
    
    // 如果已存在订阅，先取消
    if (channelsRef.current[channelName]) {
      channelsRef.current[channelName].unsubscribe()
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'draw_guess_rooms',
          filter: `id=eq.${roomId}`
        },
        (payload) => {
          onRoomUpdate?.(payload.new)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
          setConnectionStatus('connected')
          hasConnectedRef.current = true
          reconnectAttemptsRef.current = 0
        } else if (status === 'CLOSED') {
          // 只有曾经连接成功过，才显示断开
          if (hasConnectedRef.current) {
            setIsConnected(false)
            setConnectionStatus('disconnected')
          }
        } else if (status === 'CHANNEL_ERROR') {
          // 只有曾经连接成功过，才显示错误
          if (hasConnectedRef.current) {
            setIsError(true)
            setConnectionStatus('error')
          }
          handleReconnect()
        }
      })

    channelsRef.current[channelName] = channel
    return channel
  }, [roomId])

  // 订阅玩家变化
  const subscribeToPlayers = useCallback((onPlayersUpdate) => {
    if (!roomId) return

    const channelName = `players:${roomId}`
    
    if (channelsRef.current[channelName]) {
      channelsRef.current[channelName].unsubscribe()
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'draw_guess_players',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          onPlayersUpdate?.({
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old
          })
        }
      )
      .subscribe()

    channelsRef.current[channelName] = channel
    return channel
  }, [roomId])

  // 订阅团队变化
  const subscribeToTeams = useCallback((onTeamsUpdate) => {
    if (!roomId) return

    const channelName = `teams:${roomId}`
    
    if (channelsRef.current[channelName]) {
      channelsRef.current[channelName].unsubscribe()
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'draw_guess_teams',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          onTeamsUpdate?.(payload.new)
        }
      )
      .subscribe()

    channelsRef.current[channelName] = channel
    return channel
  }, [roomId])

  // 订阅轮次变化
  const subscribeToRound = useCallback((roundId, onRoundUpdate) => {
    if (!roundId) return

    const channelName = `round:${roundId}`
    
    if (channelsRef.current[channelName]) {
      channelsRef.current[channelName].unsubscribe()
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'draw_guess_rounds',
          filter: `id=eq.${roundId}`
        },
        (payload) => {
          onRoundUpdate?.(payload.new)
        }
      )
      .subscribe()

    channelsRef.current[channelName] = channel
    return channel
  }, [])

  // 订阅绘图事件（通过 actions 表）
  const subscribeToDrawingEvents = useCallback((roundId, onDrawingEvent) => {
    if (!roundId) return

    const channelName = `drawing:${roundId}`
    
    if (channelsRef.current[channelName]) {
      channelsRef.current[channelName].unsubscribe()
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'draw_guess_actions',
          filter: `round_id=eq.${roundId}`
        },
        (payload) => {
          const action = payload.new
          if (action.action_type.startsWith('draw_')) {
            onDrawingEvent?.(action.action_data)
          }
        }
      )
      .subscribe()

    channelsRef.current[channelName] = channel
    return channel
  }, [])

  // 订阅猜测事件
  const subscribeToGuesses = useCallback((roundId, onGuess) => {
    if (!roundId) return

    const channelName = `guesses:${roundId}`
    
    if (channelsRef.current[channelName]) {
      channelsRef.current[channelName].unsubscribe()
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'draw_guess_actions',
          filter: `round_id=eq.${roundId}`
        },
        (payload) => {
          const action = payload.new
          if (action.action_type === 'guess') {
            onGuess?.(action.action_data)
          }
        }
      )
      .subscribe()

    channelsRef.current[channelName] = channel
    return channel
  }, [])

  // 广播绘图事件
  const broadcastDrawing = useCallback(async (roundId, drawingEvent) => {
    if (!roundId || !userId) return

    const { error } = await supabase
      .from('draw_guess_actions')
      .insert({
        room_id: roomId,
        round_id: roundId,
        user_id: userId,
        action_type: drawingEvent.type === 'stroke' ? 'draw_stroke' : 
                     drawingEvent.type === 'clear' ? 'draw_clear' : 'draw_undo',
        action_data: drawingEvent
      })

    if (error) {
      console.error('广播绘图事件失败:', error)
    }
  }, [roomId, userId])

  // 广播猜测
  const broadcastGuess = useCallback(async (roundId, guess, isCorrect) => {
    if (!roundId || !userId) return

    const { error } = await supabase
      .from('draw_guess_actions')
      .insert({
        room_id: roomId,
        round_id: roundId,
        user_id: userId,
        action_type: 'guess',
        action_data: { guess, is_correct: isCorrect }
      })

    if (error) {
      console.error('广播猜测失败:', error)
    }
  }, [roomId, userId])

  // 广播提示
  const broadcastHint = useCallback(async (roundId, hintData) => {
    if (!roundId || !userId) return

    const { error } = await supabase
      .from('draw_guess_actions')
      .insert({
        room_id: roomId,
        round_id: roundId,
        user_id: userId,
        action_type: 'hint',
        action_data: hintData
      })

    if (error) {
      console.error('广播提示失败:', error)
    }
  }, [roomId, userId])

  // 处理重连
  const handleReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.error('达到最大重连次数')
      return
    }

    reconnectAttemptsRef.current++
    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000)

    console.log(`尝试重连 (${reconnectAttemptsRef.current}/${maxReconnectAttempts})，延迟 ${delay}ms`)

    setTimeout(() => {
      // 重新订阅所有频道
      Object.values(channelsRef.current).forEach(channel => {
        if (channel && channel.state !== 'closed') {
          channel.subscribe()
        }
      })
    }, delay)
  }, [])

  // 取消所有订阅
  const unsubscribeAll = useCallback(() => {
    Object.values(channelsRef.current).forEach(channel => {
      if (channel) {
        channel.unsubscribe()
      }
    })
    channelsRef.current = {}
    setIsConnected(false)
    setConnectionStatus('disconnected')
  }, [])

  // 清理
  useEffect(() => {
    return () => {
      unsubscribeAll()
    }
  }, [unsubscribeAll])

  return {
    // 状态
    isConnected,
    isError,
    connectionStatus,
    
    // 订阅方法
    subscribeToRoom,
    subscribeToPlayers,
    subscribeToTeams,
    subscribeToRound,
    subscribeToDrawingEvents,
    subscribeToGuesses,
    
    // 广播方法
    broadcastDrawing,
    broadcastGuess,
    broadcastHint,
    
    // 控制方法
    unsubscribeAll,
    handleReconnect
  }
}
