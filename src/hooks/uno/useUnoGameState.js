/**
 * useUnoGameState - 游戏状态读取 + 实时订阅
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/store/AuthContext'
import {
  createDeck, shuffleDeck, dealCards,
  determineFirstPlayerOfficial, determineFirstPlayerRandom, applyFirstCardEffect,
} from '@/lib/uno/deck'
import { GAME_MODES } from '@/lib/uno/constants'

/**
 * @param {string|null} roomId    - 房间 ID
 * @param {Array}       players   - 房间玩家列表（含 user_id 按 seat_index 排序）
 * @param {string}      [gameMode] - 游戏模式（从房间数据传入）
 */
export function useUnoGameState(roomId, players, gameMode = GAME_MODES.STANDARD) {
  const { user } = useAuth()

  const [gameState, setGameState] = useState(null)
  // 初始为 true，防止组件挂载时 GameBoard 抢先初始化
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const channelRef = useRef(null)
  const prevRoomStatusRef = useRef(null)  // 追踪房间状态变化

  // ── 从数据库读取游戏状态 ────────────────────────────────────

  const fetchGameState = useCallback(async () => {
    if (!roomId) return null
    const { data, error } = await supabase
      .from('uno_game_state')
      .select('*')
      .eq('room_id', roomId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  }, [roomId])

  // ── 初始化游戏状态（房主调用，发牌）────────────────────────

  const initializeGameState = useCallback(async () => {
    if (!players || players.length === 0) return

    const playerIds = players
      .sort((a, b) => a.seat_index - b.seat_index)
      .map((p) => p.user_id)

    const playerCount = playerIds.length

    // ── Step 1：生成牌组并发牌 ────────────────────────────────
    const deck = shuffleDeck(createDeck(playerCount))
    const { hands, remaining, topCard, skippedTopCards } = dealCards(deck, playerCount, playerIds)

    // ── Step 2：决定先手玩家 ───────────────────────────────────
    // 官方模式：各摸一张数字牌，数字最大者先出（平局重摸）
    // 娱乐模式：随机选取先手玩家
    let firstPlayerIndex
    let drawPileAfterDetermination

    // comparisonRounds: 官方模式下每轮比牌结果，供开场动画播放
    // 娱乐模式为空数组
    let comparisonRounds = []

    if (gameMode === GAME_MODES.STANDARD) {
      const result = determineFirstPlayerOfficial(remaining, playerIds)
      firstPlayerIndex = result.firstPlayerIndex
      drawPileAfterDetermination = result.drawPile
      comparisonRounds = result.comparisonRounds || []
    } else {
      const result = determineFirstPlayerRandom(playerIds)
      firstPlayerIndex = result.firstPlayerIndex
      drawPileAfterDetermination = remaining
    }

    // ── Step 3：处理起始牌特殊效果 ───────────────────────────
    // Wild Draw Four 情况已在 dealCards 内处理（放回重翻）
    // 此处处理：Wild / Skip / Reverse / Draw Two
    const firstCardEffect = applyFirstCardEffect(
      topCard,
      firstPlayerIndex,
      playerCount,
      1,             // 初始方向为顺时针
      hands,
      playerIds,
      drawPileAfterDetermination,
    )

    // ── Step 4：构建最终初始状态 ──────────────────────────────
    const initialState = {
      room_id: roomId,
      current_player_index: firstCardEffect.currentPlayerIndex,
      direction: firstCardEffect.direction,
      current_color: firstCardEffect.currentColor,
      top_card: firstCardEffect.topCard,
      draw_pile: firstCardEffect.drawPile,
      discard_pile: [topCard],
      hands: firstCardEffect.hands,
      pending_draw_count: firstCardEffect.pendingDrawCount,
      winner_id: null,
      uno_called: {},   // 初始化 UNO 状态
      rank_list: [],    // 排名列表（娱乐版）
      game_mode: gameMode,  // 记录游戏模式，供所有客户端读取
      // 先手提示：让所有客户端知道谁是起始玩家
      // 前端读到后展示 1.5s 提示动画，不影响游戏逻辑
      first_player_id: playerIds[firstPlayerIndex],
      // Wild 起始牌待选色标记
      needs_color_pick: firstCardEffect.needsColorPick ? playerIds[firstPlayerIndex] : null,
      // 开场动画数据：供前端开场状态机回放动画用（不影响游戏逻辑）
      // official 模式包含 comparisonRounds（每轮比牌结果）
      // 开场动画结束后此字段不再使用
      opening_data: {
        gameMode,
        playerIds,
        firstPlayerIndex,
        topCard,                    // 原始起始牌（带色和类型）
        firstCardEffectType: firstCardEffect.needsColorPick ? 'wild' :
          topCard.type !== 'number' ? topCard.type : 'none',
        comparisonRounds,           // 官方模式：[{ playerId, card, value, isWinner }[]]
        // ⚠️ 发牌动画用原始手牌（dealCards 发出的 7 张），而非 firstCardEffect 处理后的手牌
        // firstCardEffect 可能因起始牌是 Draw Two 导致先手玩家多出 2 张，不应在动画中体现
        hands: Object.fromEntries(
          playerIds.map((id) => [id, hands[id] || []])
        ),
        // 翻起始牌时被跳过的功能牌列表，供开场动画"重翻"效果播放
        // 每次翻出功能牌展示 600ms 后飞回牌堆底部并重新翻牌
        skippedTopCards: skippedTopCards || [],
      },
      // PRD: UNO 窗口初始状态
      uno_window_open: false,
      uno_window_owner: null,
      reported_this_window: [],
    }

    // 使用 upsert，如果已存在则更新（处理重复初始化或旧记录残留）
    const { data, error } = await supabase
      .from('uno_game_state')
      .upsert(initialState, {
        onConflict: 'room_id', // 根据 room_id 唯一约束判断
      })
      .select()
      .single()

    if (error) throw error
    return data
  }, [roomId, players, gameMode])

  // ── 初始化加载 ───────────────────────────────────────────────

  useEffect(() => {
    if (!roomId || !user) {
      // 没有 roomId 或 user 时，标记加载完成
      setLoading(false)
      return
    }

    let mounted = true

    const init = async () => {
      setLoading(true)
      setError(null)
      try {
        const state = await fetchGameState()
        if (!mounted) return
        if (state) {
          setGameState(state)
        }
        subscribeToGameState()
      } catch (err) {
        if (!mounted) return
        setError(err.message || '加载游戏状态失败')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    init()

    return () => {
      mounted = false
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [roomId, user])

  // ── Realtime 订阅游戏状态 ────────────────────────────────────

  const subscribeToGameState = useCallback(() => {
    if (!roomId) return

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    const channel = supabase
      .channel(`uno_game_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'uno_game_state',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setGameState(payload.new)
          } else if (payload.eventType === 'DELETE') {
            // 游戏状态被删除（返回房间时），清除本地状态
            setGameState(null)
          }
        }
      )
      .subscribe((status) => {
        // 订阅状态回调：跟踪连接状态
        // 'SUBSCRIBED' | 'CLOSED' | 'TIMED_OUT' | 'CHANNEL_ERROR'
        if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          console.warn('[UNO] Realtime 订阅断开:', status)
        }
      })

    channelRef.current = channel
  }, [roomId])

  // ── 页面可见性处理：切换标签页回来时主动同步状态 ────────────────
  useEffect(() => {
    if (!roomId || !user) return

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        // 页面切换回来时：主动从数据库拉取最新状态
        // 同时检查 WebSocket 连接状态，必要时重新订阅
        try {
          const latestState = await fetchGameState()
          if (latestState) {
            setGameState(latestState)
          }
          // 检查 Realtime 连接，必要时重连
          // Supabase channel 状态: 'closed' | 'errored' | 'joined' | 'joining' | 'leaving' | 'waiting'
          const channelState = channelRef.current?.state
          const needsResubscribe = !channelState || 
            channelState === 'closed' || 
            channelState === 'errored' ||
            channelState === 'waiting'
          if (needsResubscribe) {
            console.log('[UNO] Realtime 连接异常，重新订阅, state:', channelState)
            subscribeToGameState()
          }
        } catch (err) {
          console.warn('[UNO] 页面切换回来同步状态失败:', err)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [roomId, user, fetchGameState, subscribeToGameState])

  // ── 定期心跳检查：确保 Realtime 连接活跃 ────────────────────────
  useEffect(() => {
    if (!roomId || !user) return

    // 每 30 秒检查一次连接状态
    const heartbeatInterval = setInterval(async () => {
      // 仅在页面可见时检查
      if (document.visibilityState !== 'visible') return
      
      const channelState = channelRef.current?.state
      // 如果连接异常，尝试重新订阅
      if (!channelState || channelState === 'closed' || channelState === 'errored') {
        console.log('[UNO] 心跳检测发现连接异常，重新订阅, state:', channelState)
        try {
          // 先拉取最新状态（防止重连期间丢失更新）
          const latestState = await fetchGameState()
          if (latestState) {
            setGameState(latestState)
          }
          subscribeToGameState()
        } catch (err) {
          console.warn('[UNO] 心跳重连失败:', err)
        }
      }
    }, 30000) // 30 秒

    return () => {
      clearInterval(heartbeatInterval)
    }
  }, [roomId, user, fetchGameState, subscribeToGameState])

  // ── 衍生状态（隐私保护） ─────────────────────────────────────

  const playerIds = players
    ? players.sort((a, b) => a.seat_index - b.seat_index).map((p) => p.user_id)
    : []

  // 当前用户的手牌（只有自己能看到）
  const myHand = gameState?.hands?.[user?.id] || []

  // 从 game_state 读取实际生效的游戏模式（入局后以数据库为准）
  const activeGameMode = gameState?.game_mode || gameMode

  // 排名列表（娱乐版：按出完牌先后顺序的 userId 数组）
  const rankList = gameState?.rank_list || []

  // 对手信息（只暴露牌数，不暴露具体牌）
  const opponents = playerIds
    .filter((id) => id !== user?.id)
    .map((id) => {
      const playerRecord = players?.find((p) => p.user_id === id)
      const handCount = gameState?.hands?.[id]?.length ?? 0
      const seatIndex = playerRecord?.seat_index ?? 0
      const isCurrentTurn =
        gameState?.current_player_index !== undefined &&
        playerIds[gameState.current_player_index] === id
      // 娱乐版：已出完牌（在 rankList 中）的玩家标记
      const rankPosition = rankList.indexOf(id)
      const isFinished = rankPosition >= 0

      return {
        userId: id,
        seatIndex,
        profile: playerRecord?.profiles,
        handCount,
        isCurrentTurn,
        isFinished,
        rankPosition,  // 0=第1名，1=第2名，-1=未出完
      }
    })

  // 是否轮到我
  const isMyTurn =
    gameState !== null &&
    playerIds.length > 0 &&
    playerIds[gameState.current_player_index] === user?.id

  // 当前玩家是否已喊 UNO（只有 true 才算喊了，false=待确认，'missed'=未喊受罚）
  const myUnoCalled = gameState?.uno_called?.[user?.id] === true

  // ── UNO 窗口状态（PRD：常态化按钮 + 举报系统）───────────────
  // unoWindowOpen: 是否有玩家的 UNO 窗口开启
  // unoWindowOwner: 当前窗口归属的玩家 ID（谁刚打出倒数第二张牌）
  // reportedThisWindow: 本窗口已被举报的玩家列表
  const unoWindowOpen = gameState?.uno_window_open ?? false
  const unoWindowOwner = gameState?.uno_window_owner ?? null
  const reportedThisWindow = gameState?.reported_this_window ?? []

  // 当前玩家的 UNO 窗口是否开启（用于判断是否可以喊 UNO）
  const myUnoWindowOpen = unoWindowOpen && unoWindowOwner === user?.id

  // 娱乐版：我是否已经出完牌
  const myRankPosition = rankList.indexOf(user?.id)
  const myIsFinished = myRankPosition >= 0

  return {
    gameState,
    myHand,
    opponents,
    topCard: gameState?.top_card || null,
    currentColor: gameState?.current_color || null,
    isMyTurn,
    direction: gameState?.direction ?? 1,
    pendingDrawCount: gameState?.pending_draw_count ?? 0,
    winnerId: gameState?.winner_id || null,
    unoCalled: gameState?.uno_called || {},  // 所有玩家的 UNO 状态
    myUnoCalled,   // 我是否已喊 UNO
    gameMode: activeGameMode,  // 当前生效的游戏模式
    rankList,      // 排名列表（娱乐版）
    myIsFinished,  // 娱乐版：我是否已出完牌
    myRankPosition,// 娱乐版：我的排名位次（0=第1名，-1=未出完）
    playerIds,
    // 先手信息（游戏开始时用于展示提示动画）
    firstPlayerId: gameState?.first_player_id || null,
    // Wild 起始牌待选色：值为需要选色的玩家 ID，null 表示无需选色
    needsColorPick: gameState?.needs_color_pick || null,
    // 开场动画数据（发牌/比牌信息），开场结束后不再使用
    openingData: gameState?.opening_data || null,
    // UNO 窗口状态（PRD：常态化按钮 + 举报系统）
    unoWindowOpen,
    unoWindowOwner,
    reportedThisWindow,
    myUnoWindowOpen,
    loading,
    error,
    initializeGameState,
    fetchGameState,
    setGameState,
    subscribeToGameState,  // 断线重连时需要重新订阅
  }
}
