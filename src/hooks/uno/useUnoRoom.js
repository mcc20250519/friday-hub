/**
 * useUnoRoom - 房间管理 Hook
 * 负责创建房间、加入房间、离开房间、开始游戏
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/store/AuthContext'
import { ROOM_STATUS, MIN_PLAYERS, MAX_PLAYERS } from '@/lib/uno/constants'

/**
 * 生成 6 位随机邀请码（大写字母 + 数字）
 */
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 去掉易混淆字符 I O 1 0
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

/**
 * 获取玩家显示名称（优先 nickname → username → 邮箱前缀）
 */
export function getDisplayName(profile, email = '') {
  if (profile?.nickname) return profile.nickname
  if (profile?.username) return profile.username
  if (email) return email.split('@')[0]
  return '匿名玩家'
}

/**
 * @param {string|null} roomCode - 从路由参数获取的房间码
 */
export function useUnoRoom(roomCode) {
  const { user, profile } = useAuth()

  const [room, setRoom] = useState(null)
  const [players, setPlayers] = useState([]) // 含 profile 信息的玩家列表
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // 避免重复订阅
  const channelRef = useRef(null)

  // ── 读取房间 + 玩家 ─────────────────────────────────────────

  const fetchRoom = useCallback(async (code) => {
    if (!code) return null
    const { data, error } = await supabase
      .from('uno_rooms')
      .select('*')
      .eq('room_code', code.toUpperCase())
      .single()
    if (error) throw error
    return data
  }, [])

  const fetchPlayers = useCallback(async (roomId) => {
    if (!roomId) return []
    
    // 先获取玩家列表
    const { data: playersData, error: playersError } = await supabase
      .from('uno_players')
      .select('*')
      .eq('room_id', roomId)
      .order('seat_index', { ascending: true })
    
    if (playersError) throw playersError
    if (!playersData || playersData.length === 0) return []

    // 提取所有真实用户的 ID（排除 Bot）
    const userIds = playersData
      .map((p) => p.user_id)
      .filter((id) => id && !id.startsWith('bot_'))

    // 批量获取 profiles（只查询真实用户）
    let profilesMap = {}
    if (userIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, nickname, username, avatar_url')
        .in('id', userIds)
      
      if (!profilesError && profilesData) {
        profilesMap = Object.fromEntries(
          profilesData.map((p) => [p.id, p])
        )
      }
    }

    // 从 localStorage 获取 Bot profile
    const botMap = JSON.parse(localStorage.getItem('uno_bots') || '{}')

    // 组合数据：为每个玩家附加 profile
    return playersData.map((player) => {
      const isBot = botMap[player.user_id]
      return {
        ...player,
        profiles: isBot ? botMap[player.user_id] : (profilesMap[player.user_id] || null),
      }
    })
  }, [])

  // ── 初始化加载 ───────────────────────────────────────────────

  useEffect(() => {
    if (!roomCode || !user) return

    let mounted = true

    const init = async () => {
      setLoading(true)
      setError(null)
      try {
        const roomData = await fetchRoom(roomCode)
        if (!mounted) return
        setRoom(roomData)

        if (roomData) {
          const playersData = await fetchPlayers(roomData.id)
          if (!mounted) return
          setPlayers(playersData)

          // 订阅实时更新
          subscribeToRoom(roomData.id)
        }
      } catch (err) {
        if (!mounted) return
        setError(err.message || '加载房间失败')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    init()

    return () => {
      mounted = false
      unsubscribeFromRoom()
    }
  }, [roomCode, user])

  // ── Realtime 订阅 ────────────────────────────────────────────

  const subscribeToRoom = useCallback((roomId) => {
    // 清除旧订阅
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    const channel = supabase
      .channel(`uno_room_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'uno_rooms',
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setRoom(payload.new)
          } else if (payload.eventType === 'DELETE') {
            setRoom(null)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'uno_players',
          filter: `room_id=eq.${roomId}`,
        },
        async () => {
          // 重新获取完整玩家列表（含 profile）
          try {
            const playersData = await fetchPlayers(roomId)
            setPlayers(playersData)
          } catch (err) {
            console.error('刷新玩家列表失败:', err)
          }
        }
      )
      .subscribe((status) => {
        // 订阅状态回调：跟踪连接状态
        if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          console.warn('[UNO Room] Realtime 订阅断开:', status)
        }
      })

    channelRef.current = channel
  }, [fetchPlayers])

  const unsubscribeFromRoom = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
  }, [])

  // ── 页面可见性处理：切换标签页回来时主动同步状态 ────────────────
  useEffect(() => {
    if (!roomCode || !user) return

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        // 页面切换回来时：检查连接状态，必要时重连
        const channelState = channelRef.current?.state
        const needsResubscribe = !channelState || 
          channelState === 'closed' || 
          channelState === 'errored' ||
          channelState === 'waiting'
        if (needsResubscribe && room?.id) {
          console.log('[UNO Room] Realtime 连接异常，重新订阅, state:', channelState)
          subscribeToRoom(room.id)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [roomCode, user, room?.id, subscribeToRoom])

  // ── 创建房间 ─────────────────────────────────────────────────

  const createRoom = useCallback(async (playerCount = MAX_PLAYERS) => {
    if (!user) throw new Error('请先登录')
    
    // 验证玩家数有效性
    if (playerCount < 2 || playerCount > 10) {
      throw new Error('玩家数必须在 2-10 之间')
    }
    
    setLoading(true)
    setError(null)

    try {
      // 生成唯一房间码（最多重试 5 次）
      let code = ''
      let retries = 0
      while (retries < 5) {
        code = generateRoomCode()
        const { data: existing } = await supabase
          .from('uno_rooms')
          .select('id')
          .eq('room_code', code)
          .single()
        if (!existing) break
        retries++
      }

      // 创建房间
      const { data: newRoom, error: roomError } = await supabase
        .from('uno_rooms')
        .insert({
          room_code: code,
          host_id: user.id,
          status: ROOM_STATUS.WAITING,
          max_players: playerCount,
        })
        .select()
        .single()

      if (roomError) throw roomError

      // 房主自动加入房间（seat_index: 0）
      const { error: playerError } = await supabase
        .from('uno_players')
        .insert({
          room_id: newRoom.id,
          user_id: user.id,
          seat_index: 0,
          is_ready: true,
        })

      if (playerError) throw playerError

      setRoom(newRoom)
      return code
    } catch (err) {
      setError(err.message || '创建房间失败')
      throw err
    } finally {
      setLoading(false)
    }
  }, [user])

  // ── 加入房间 ─────────────────────────────────────────────────

  const joinRoom = useCallback(async (code) => {
    if (!user) throw new Error('请先登录')
    setLoading(true)
    setError(null)

    try {
      const targetRoom = await fetchRoom(code)

      if (!targetRoom) {
        throw new Error('房间不存在，请检查邀请码')
      }
      if (targetRoom.status === ROOM_STATUS.FINISHED) {
        throw new Error('游戏已结束')
      }
      if (new Date(targetRoom.expires_at) < new Date()) {
        throw new Error('房间已过期，请让朋友重新创建')
      }

      // 先检查是否已在房间（断线重连场景）
      const existingPlayers = await fetchPlayers(targetRoom.id)
      const alreadyIn = existingPlayers.some((p) => p.user_id === user.id)

      if (alreadyIn) {
        // 已在房间，直接加载状态（支持断线重连）
        setRoom(targetRoom)
        setPlayers(existingPlayers)
        subscribeToRoom(targetRoom.id)
        console.log('[UNO] 断线重连成功，玩家已在房间中')
        return
      }

      // 新玩家加入：检查游戏是否已开始
      if (targetRoom.status === ROOM_STATUS.PLAYING) {
        throw new Error('游戏已经开始，无法加入')
      }

      // 检查房间是否已满
      if (existingPlayers.length >= targetRoom.max_players) {
        throw new Error('房间已满，无法加入')
      }

      // 找到可用座位
      const occupiedSeats = existingPlayers.map((p) => p.seat_index)
      let nextSeat = 0
      while (occupiedSeats.includes(nextSeat)) nextSeat++

      // 加入房间
      const { error: playerError } = await supabase
        .from('uno_players')
        .insert({
          room_id: targetRoom.id,
          user_id: user.id,
          seat_index: nextSeat,
          is_ready: false,
        })

      if (playerError) throw playerError

      setRoom(targetRoom)
      setPlayers([...existingPlayers])
      subscribeToRoom(targetRoom.id)
    } catch (err) {
      setError(err.message || '加入房间失败')
      throw err
    } finally {
      setLoading(false)
    }
  }, [user, fetchRoom, fetchPlayers, subscribeToRoom])

  // ── 离开房间 ─────────────────────────────────────────────────

  const leaveRoom = useCallback(async () => {
    if (!user || !room) return
    setLoading(true)

    try {
      await supabase
        .from('uno_players')
        .delete()
        .eq('room_id', room.id)
        .eq('user_id', user.id)

      // 如果房主离开且还有其他玩家，转让房主（取 seat_index 最小的）
      if (room.host_id === user.id && players.length > 1) {
        const nextHost = players.find((p) => p.user_id !== user.id)
        if (nextHost) {
          await supabase
            .from('uno_rooms')
            .update({ host_id: nextHost.user_id })
            .eq('id', room.id)
        }
      }

      // 如果只剩房主自己，删除房间
      if (players.length <= 1) {
        await supabase.from('uno_rooms').delete().eq('id', room.id)
      }

      unsubscribeFromRoom()
      setRoom(null)
      setPlayers([])
    } catch (err) {
      setError(err.message || '离开房间失败')
    } finally {
      setLoading(false)
    }
  }, [user, room, players, unsubscribeFromRoom])

  // ── 开始游戏 ─────────────────────────────────────────────────

  const startGame = useCallback(async (gameMode, scoringMode) => {
    if (!user || !room) throw new Error('房间不存在')
    if (room.host_id !== user.id) throw new Error('只有房主才能开始游戏')
    if (players.length < MIN_PLAYERS) {
      throw new Error(`至少需要 ${MIN_PLAYERS} 名玩家才能开始`)
    }

    setLoading(true)
    setError(null)

    try {
      // 同时更新 status、game_mode、scoring_mode
      const updatePayload = { status: ROOM_STATUS.PLAYING }
      if (gameMode) updatePayload.game_mode = gameMode
      if (scoringMode) updatePayload.scoring_mode = scoringMode

      const { error } = await supabase
        .from('uno_rooms')
        .update(updatePayload)
        .eq('id', room.id)

      if (error) throw error
    } catch (err) {
      setError(err.message || '开始游戏失败')
      throw err
    } finally {
      setLoading(false)
    }
  }, [user, room, players])

  // ── 更新计分板 ────────────────────────────────────────────────

  const updateScoreBoardInDB = useCallback(async (newScoreBoard) => {
    if (!room) return
    const { error } = await supabase
      .from('uno_rooms')
      .update({ score_board: newScoreBoard })
      .eq('id', room.id)
    if (error) throw error
  }, [room])

  // ── 计算衍生状态 ─────────────────────────────────────────────

  // ── 刷新玩家列表 ────────────────────────────────────────────

  const refreshPlayers = useCallback(async () => {
    if (!room) return
    try {
      const playersData = await fetchPlayers(room.id)
      setPlayers(playersData)
    } catch (err) {
      console.error('刷新玩家列表失败:', err)
    }
  }, [room, fetchPlayers])

  const isHost = user && room && room.host_id === user.id
  const myPlayer = players.find((p) => p.user_id === user?.id)

  return {
    room,
    players,
    myPlayer,
    isHost,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    refreshPlayers,
    updateScoreBoardInDB,
    loading,
    error,
    setError,
  }
}
