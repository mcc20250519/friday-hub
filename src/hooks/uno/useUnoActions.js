/**
 * useUnoActions - 出牌、摸牌、喊UNO等操作
 */

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/store/AuthContext'
import { canPlayCard, getNextState } from '@/lib/uno/rules'
import { reshuffleDiscardPile } from '@/lib/uno/deck'
import { CARD_TYPES, ROOM_STATUS, GAME_MODES } from '@/lib/uno/constants'
import { toast } from '@/hooks/useToast'

/**
 * @param {string}   roomId             - 房间 ID
 * @param {Object}   gameState          - 当前游戏状态
 * @param {Array}    playerIds          - 按座位顺序排列的玩家 ID 数组
 * @param {string}   [gameMode]         - 游戏模式（由 GameBoard 从 gameState 读取后传入）
 * @param {string}   [scoringMode]      - 积分模式（娱乐模式专用，'basic' 或 'ranking'）
 * @param {Function} [onOptimisticUpdate] - 出牌/摸牌成功后立即回调，用于乐观更新本地 UI
 *                                         参数为下一个游戏状态（camelCase 格式）
 */
export function useUnoActions(roomId, gameState, playerIds, gameMode = GAME_MODES.STANDARD, scoringMode, onOptimisticUpdate) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // ── 写入操作日志 ─────────────────────────────────────────────

  const logAction = useCallback(
    async (actionType, card = null, chosenColor = null) => {
      try {
        await supabase.from('uno_actions').insert({
          room_id: roomId,
          user_id: user.id,
          action_type: actionType,
          card: card,
          chosen_color: chosenColor,
        })
      } catch (err) {
        console.error('记录操作日志失败:', err)
        // 日志失败不影响游戏继续
      }
    },
    [roomId, user]
  )

  // ── 更新游戏状态到数据库 ─────────────────────────────────────

  const persistState = useCallback(
    async (newState) => {
      // ── 主状态 + UNO 状态 + 排名列表合并写入（原子写入，避免时序问题）──
      const payload = {
        current_player_index: newState.currentPlayerIndex,
        direction: newState.direction,
        current_color: newState.currentColor,
        top_card: newState.topCard,
        draw_pile: newState.drawPile,
        discard_pile: newState.discardPile,
        hands: newState.hands,
        pending_draw_count: newState.pendingDrawCount,
        winner_id: newState.winnerId || null,
        updated_at: new Date().toISOString(),
        uno_called: newState.unoCalled || {},
        rank_list: newState.rankList || [],   // 娱乐版排名列表
        // PRD: UNO 窗口状态
        uno_window_open: newState.unoWindowOpen ?? false,
        uno_window_owner: newState.unoWindowOwner ?? null,
        reported_this_window: newState.reportedThisWindow || [],
      }

      let { error } = await supabase
        .from('uno_game_state')
        .update(payload)
        .eq('room_id', roomId)

      if (error) {
        // 如果 uno_called 列不存在则降级（不含 uno_called）
        if (error.message?.includes('uno_called')) {
          console.warn('[UNO] uno_called 列不存在，降级写入（请执行 SQL patch）')
          const { uno_called: _omit, ...fallbackPayload } = payload
          const fallback = await supabase
            .from('uno_game_state')
            .update(fallbackPayload)
            .eq('room_id', roomId)
          if (fallback.error) throw fallback.error
        } else {
          throw error
        }
      }
    },
    [roomId]
  )

  // ── 处理摸牌堆耗尽 ───────────────────────────────────────────

  const handleReshuffleIfNeeded = useCallback(
    async (state) => {
      if (!state.needReshuffle) return state

      const { newDrawPile, newTopCard } = reshuffleDiscardPile(
        state.discardPile || []
      )

      if (newDrawPile.length === 0) {
        toast.warning('牌堆已空', '已无法继续摸牌')
        return { ...state, needReshuffle: false }
      }

      toast.info('重新洗牌', '弃牌堆已重新洗牌补充摸牌堆')

      return {
        ...state,
        needReshuffle: false,
        drawPile: newDrawPile,
        topCard: newTopCard,
        discardPile: newTopCard ? [newTopCard] : [],
      }
    },
    []
  )

  // ── 构建 getNextState 可用的状态格式 ─────────────────────────

  const buildStateForRules = useCallback(() => {
    if (!gameState) return null
    return {
      currentPlayerIndex: gameState.current_player_index,
      direction: gameState.direction,
      currentColor: gameState.current_color,
      topCard: gameState.top_card,
      drawPile: gameState.draw_pile || [],
      discardPile: gameState.discard_pile || [],
      hands: gameState.hands || {},
      pendingDrawCount: gameState.pending_draw_count || 0,
      winnerId: gameState.winner_id,
      unoCalled: gameState.uno_called || {},  // 传入 UNO 状态
      rankList: gameState.rank_list || [],    // 传入排名列表（娱乐版）
      gameMode,  // 传入游戏模式（给 rules-entertainment.js 用）
      // PRD: UNO 窗口状态
      unoWindowOpen: gameState.uno_window_open ?? false,
      unoWindowOwner: gameState.uno_window_owner ?? null,
      reportedThisWindow: gameState.reported_this_window || [],
    }
  }, [gameState, gameMode])

  // ── 出牌 ─────────────────────────────────────────────────────

  const playCard = useCallback(
    async (card, chosenColor = null) => {
      if (!gameState || !user) return
      setLoading(true)
      setError(null)

      try {
        // 前端校验
        const isWild =
          card.type === CARD_TYPES.WILD || card.type === CARD_TYPES.WILD4
        if (isWild && !chosenColor) {
          throw new Error('请选择颜色')
        }

        if (
          !canPlayCard(
            card,
            gameState.top_card,
            gameState.current_color,
            gameState.pending_draw_count || 0,  // 娱乐模式叠加链需要传入
            gameMode
          )
        ) {
          throw new Error('这张牌不能出')
        }

        // 计算下一状态（传入 gameMode 和 scoringMode，让规则引擎走正确分支）
        const currentState = buildStateForRules()
        let nextState = getNextState(
          currentState,
          { type: 'play', userId: user.id, card, chosenColor },
          playerIds,
          { gameMode, scoringMode }
        )

        // 处理重洗
        nextState = await handleReshuffleIfNeeded(nextState)

        // 持久化
        await persistState(nextState)

        // 乐观更新本地状态（不等 Realtime 推送，让 UI 立即响应）
        if (onOptimisticUpdate) {
          onOptimisticUpdate(nextState)
        }

        // 记录日志
        await logAction('play', card, chosenColor)

        // 如果有赢家，更新房间状态
        if (nextState.winnerId) {
          await supabase
            .from('uno_rooms')
            .update({ status: ROOM_STATUS.FINISHED })
            .eq('id', roomId)
        }
      } catch (err) {
        setError(err.message || '出牌失败')
        toast.error('出牌失败', err.message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [
      gameState,
      user,
      playerIds,
      buildStateForRules,
      persistState,
      logAction,
      handleReshuffleIfNeeded,
      roomId,
      scoringMode,
    ]
  )

  // ── 摸牌 ─────────────────────────────────────────────────────

  const drawCard = useCallback(async () => {
    if (!gameState || !user) return
    setLoading(true)
    setError(null)

    try {
      let currentState = buildStateForRules()

      // 处理摸牌堆耗尽
      if (
        currentState.drawPile.length <
        Math.max(currentState.pendingDrawCount, 1)
      ) {
        const { newDrawPile } = reshuffleDiscardPile(
          currentState.discardPile || []
        )
        if (newDrawPile.length > 0) {
          currentState = {
            ...currentState,
            drawPile: newDrawPile,
            discardPile: currentState.discardPile.slice(-1), // 只保留顶牌
          }
          toast.info('重新洗牌', '弃牌堆已重新洗牌')
        }
      }

      let nextState = getNextState(
        currentState,
        { type: 'draw', userId: user.id },
        playerIds,
        { gameMode, scoringMode }
      )

      nextState = await handleReshuffleIfNeeded(nextState)

      await persistState(nextState)

      // 乐观更新本地状态
      if (onOptimisticUpdate) {
        onOptimisticUpdate(nextState)
      }

      await logAction('draw')
    } catch (err) {
      setError(err.message || '摸牌失败')
      toast.error('摸牌失败', err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [
    gameState,
    user,
    playerIds,
    gameMode,
    buildStateForRules,
    persistState,
    logAction,
    handleReshuffleIfNeeded,
    scoringMode,
  ])

  // ── 统一惩罚处理函数 ─────────────────────────────────────────
  // 让目标玩家摸指定数量的牌
  // penaltyType: 'false_uno' | 'missed_uno' | 'false_report'
  // 注意：此函数必须在 callUno 之前定义，因为 callUno 依赖它

  const applyPenalty = useCallback(async (targetPlayerId, cardCount, penaltyType = 'penalty') => {
    if (!gameState) return { success: false }

    try {
      const currentState = buildStateForRules()
      const targetHand = currentState.hands[targetPlayerId] || []
      let drawPile = [...currentState.drawPile]
      const newCards = []

      // 处理牌堆不够的情况
      if (drawPile.length < cardCount) {
        const { newDrawPile } = reshuffleDiscardPile(currentState.discardPile || [])
        drawPile = newDrawPile
        if (drawPile.length < cardCount) {
          toast.warning('牌堆不足', '无法完成惩罚摸牌')
          return { success: false }
        }
      }

      // 摸牌
      for (let i = 0; i < cardCount; i++) {
        const card = drawPile.pop()
        if (card) newCards.push(card)
      }

      // 更新手牌
      const newHands = {
        ...currentState.hands,
        [targetPlayerId]: [...targetHand, ...newCards],
      }

      // 如果惩罚后手牌 >= 2，重置 UNO 状态
      const newUnoCalled = { ...currentState.unoCalled }
      if (newHands[targetPlayerId].length >= 2) {
        delete newUnoCalled[targetPlayerId]
      }

      // 构建新状态
      const nextState = {
        ...currentState,
        drawPile,
        hands: newHands,
        unoCalled: newUnoCalled,
        // 关闭 UNO 窗口（被罚后手牌可能 > 1）
        unoWindowOpen: false,
        unoWindowOwner: null,
      }

      // 持久化
      const payload = {
        draw_pile: nextState.drawPile,
        hands: nextState.hands,
        uno_called: nextState.unoCalled,
        uno_window_open: false,
        uno_window_owner: null,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from('uno_game_state')
        .update(payload)
        .eq('room_id', roomId)

      if (error) throw error

      // 显示提示
      const targetPlayer = targetPlayerId === user?.id ? '你' : targetPlayerId
      toast.warning('惩罚！', `${targetPlayer} 摸了 ${cardCount} 张牌（${penaltyType}）`)

      return { success: true, cardsDrawn: cardCount }
    } catch (err) {
      console.error('[UNO] applyPenalty 失败:', err)
      return { success: false, error: err.message }
    }
  }, [gameState, buildStateForRules, roomId, user])

  // ── 喊 UNO（新版本：常态化按钮，支持合法窗口判定）───────────
  // PRD: 合法点击时间窗口 = 玩家打出倒数第二张牌的瞬间到下一位玩家完成第一个操作的瞬间
  // 判定逻辑：
  //   1. 先检查 UNO 窗口状态（服务器确认的状态，无延迟问题）
  //   2. 窗口开启且归属自己 → 允许喊 UNO
  //   3. 窗口关闭或不属于自己 → 根据手牌数判断是否惩罚

  const callUno = useCallback(async () => {
    if (!user || !gameState) return { success: false }

    const unoWindowOpen = gameState.uno_window_open
    const unoWindowOwner = gameState.uno_window_owner
    const myHand = gameState.hands?.[user.id] || []
    const currentUnoCalled = gameState.uno_called || {}

    // 情况1：已在合法窗口内，允许喊 UNO（窗口状态由规则引擎确认，无延迟问题）
    if (unoWindowOpen && unoWindowOwner === user.id) {
      // 检查是否已喊过
      if (currentUnoCalled[user.id] === true) {
        return { success: false, reason: 'already_called' }
      }

      // 合法喊UNO
      toast.success('UNO！', '🎺 你喊出了 UNO！')

      // 写入数据库
      const { error } = await supabase
        .from('uno_game_state')
        .update({
          uno_called: { ...currentUnoCalled, [user.id]: true },
        })
        .eq('room_id', roomId)

      if (error) {
        console.warn('[UNO] callUno 写入失败:', error.message)
        return { success: false, reason: 'db_error' }
      }

      return { success: true }
    }

    // 情况2：窗口外点击，根据手牌数判断
    // - 手牌 >= 2：误触惩罚（摸2张）
    // - 手牌 == 1 但窗口已关闭：无效，可能是窗口过期了
    // - 手牌 == 0：无效（已出完牌）
    
    if (myHand.length >= 2) {
      // 误触惩罚
      await applyPenalty(user.id, 2, '误触UNO按钮')
      return { success: false, reason: 'penalty' }
    }

    if (myHand.length === 1) {
      // 窗口已关闭，可能过期了
      return { success: false, reason: 'window_expired' }
    }

    // 手牌 == 0 或其他情况
    return { success: false, reason: 'invalid' }
  }, [user, gameState, roomId, applyPenalty])

  // ── 举报玩家没喊UNO ───────────────────────────────────────────

  const reportPlayer = useCallback(async (targetPlayerId) => {
    if (!user || !gameState) return { success: false }

    try {
      const currentUnoCalled = gameState.uno_called || {}
      const targetHand = gameState.hands?.[targetPlayerId] || []
      const unoWindowOpen = gameState.uno_window_open
      const unoWindowOwner = gameState.uno_window_owner

      // 校验举报条件
      // 1. 目标手牌必须为1
      if (targetHand.length !== 1) {
        return { success: false, reason: 'hand_count_invalid' }
      }

      // 2. UNO窗口必须开启且属于目标玩家
      if (!unoWindowOpen || unoWindowOwner !== targetPlayerId) {
        return { success: false, reason: 'window_closed' }
      }

      // 3. 检查目标是否已喊UNO
      if (currentUnoCalled[targetPlayerId] === true) {
        // 举报失败：目标已喊UNO，举报者摸1张牌
        await applyPenalty(user.id, 1, '举报失败')
        toast.error('举报失败', '对方已经喊了UNO，你罚摸1张！')
        return { success: false, reason: 'already_called', penaltyToReporter: true }
      }

      // 举报成功：目标摸2张牌
      await applyPenalty(targetPlayerId, 2, '没喊UNO被抓')
      toast.success('举报成功！', `抓住了对方没喊UNO！`)

      // 记录已举报，防止重复
      const { error } = await supabase
        .from('uno_game_state')
        .update({
          reported_this_window: [...(gameState.reported_this_window || []), targetPlayerId],
        })
        .eq('room_id', roomId)

      if (error) {
        console.warn('[UNO] 记录举报失败:', error.message)
      }

      return { success: true }
    } catch (err) {
      console.error('[UNO] reportPlayer 失败:', err)
      return { success: false, error: err.message }
    }
  }, [user, gameState, roomId, applyPenalty])

  return {
    playCard,
    drawCard,
    callUno,
    applyPenalty,
    reportPlayer,
    loading,
    error,
    setError,
  }
}
