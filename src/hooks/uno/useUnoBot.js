/**
 * useUnoBot - 机器人 AI Hook
 * 监听游戏状态，当轮到机器人时自动出牌
 *
 * UNO 时机：由 getNextState 自动处理
 *   - 出牌后手牌剩 1 张 → getNextState 自动将 unoCalled[botId] = true
 *   - persistState（写数据库）时一并写入 uno_called 字段
 *   - 无需额外的 UNO insert 操作，逻辑更简洁可靠
 */

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { decideBotMove } from '@/lib/uno/bot'
import { getNextState } from '@/lib/uno/rules'
import { reshuffleDiscardPile } from '@/lib/uno/deck'
import { ROOM_STATUS, GAME_MODES } from '@/lib/uno/constants'

export function useUnoBot({
  roomId,
  gameState,
  playerIds,
  botPlayerIds,
  isHost,
  winnerId,
  gameMode = GAME_MODES.STANDARD,
  openingReady = true, // 开场动画是否已完成（false=开场中，禁止出牌）
}) {
  // 防止并发重复执行的锁（per-bot）
  const pendingRef = useRef({})
  // 记录每个 bot 上次成功处理的 stateKey
  const lastSuccessKeyRef = useRef({})

  useEffect(() => {
    // 前置条件检查
    if (!gameState || !isHost || winnerId || botPlayerIds.length === 0) return
    if (playerIds.length === 0) return
    // 开场动画期间禁止机器人出牌，防止提前抢跑
    if (!openingReady) return

    const currentPlayerId = playerIds[gameState.current_player_index]
    if (!currentPlayerId) return

    const isBot = botPlayerIds.includes(currentPlayerId)
    if (!isBot) return

    const botId = currentPlayerId

    // stateKey：基于 updated_at + current_player_index，每次出牌后都会变化
    // 这样即使 current_player_index 不变（Skip/Reverse 后），updated_at 变化也会触发新一轮
    const stateKey = `${botId}_${gameState.updated_at}_${gameState.current_player_index}`

    if (lastSuccessKeyRef.current[botId] === stateKey) return
    // pendingRef 只用来防止同一 stateKey 的并发，不阻碍新 stateKey 的触发
    if (pendingRef.current[botId] === stateKey) return

    // 锁定当前 stateKey，防止重复处理同一状态
    pendingRef.current[botId] = stateKey

    // 在 effect 内直接捕获所有需要的值（闭包安全）
    const gs = gameState
    const pIds = [...playerIds]
    const currentRoomId = roomId
    const capturedStateKey = stateKey  // 闭包内捕获

    const run = async () => {
      // 思考延迟 600ms ~ 1200ms
      const delay = 600 + Math.random() * 600
      await new Promise((resolve) => setTimeout(resolve, delay))

      try {
        // 构建规则引擎格式（包含 unoCalled 和 rankList）
        const currentState = {
          currentPlayerIndex: gs.current_player_index,
          direction: gs.direction,
          currentColor: gs.current_color,
          topCard: gs.top_card,
          drawPile: [...(gs.draw_pile || [])],
          discardPile: [...(gs.discard_pile || [])],
          hands: JSON.parse(JSON.stringify(gs.hands || {})),
          pendingDrawCount: gs.pending_draw_count || 0,
          winnerId: gs.winner_id,
          unoCalled: { ...(gs.uno_called || {}) },  // 传入 UNO 状态
          rankList: [...(gs.rank_list || [])],      // 传入排名列表（娱乐版）
        }

        const botHand = currentState.hands[botId] || []
        if (botHand.length === 0) {
          console.warn('[Bot] 手牌为空，跳过')
          return
        }

        // ── Bot 决策（传入 gameMode）──────────────────────────────
        const { card, chosenColor } = decideBotMove(
          botHand,
          currentState.topCard,
          currentState.currentColor,
          currentState.pendingDrawCount,
          gameMode
        )

        let nextState

        if (card) {
          // ── 出牌（传入 gameMode）──────────────────────────────
          nextState = getNextState(
            currentState,
            { type: 'play', userId: botId, card, chosenColor },
            pIds,
            { gameMode }
          )
          // 机器人出牌后手牌剩 1 张时自动喊 UNO（写 true）
          // getNextState 写的是 false（待确认），机器人直接覆盖为 true
          const botHandAfter = nextState.hands[botId] || []
          if (botHandAfter.length === 1 && !nextState.winnerId) {
            nextState = {
              ...nextState,
              unoCalled: { ...nextState.unoCalled, [botId]: true },
            }
          }
        } else {
          // ── 摸牌 ─────────────────────────────────────────────
          let stateToUse = currentState
          const drawCount = Math.max(currentState.pendingDrawCount, 1)
          let skipDraw = false  // 标记是否跳过摸牌

          // 摸牌堆不足时先重洗
          if (currentState.drawPile.length < drawCount) {
            const { newDrawPile } = reshuffleDiscardPile(currentState.discardPile || [])
            if (newDrawPile.length > 0) {
              stateToUse = {
                ...currentState,
                drawPile: newDrawPile,
                discardPile: currentState.discardPile.slice(-1),
              }
            } else if (currentState.discardPile?.length <= 1) {
              // 弃牌堆只有顶牌或为空，无法洗牌，跳过本回合
              console.log('[Bot] 牌堆已空，跳过摸牌')
              skipDraw = true
            }
          }

          if (skipDraw) {
            // 直接切换到下一位玩家，不摸牌
            nextState = {
              ...currentState,
              currentPlayerIndex: (currentState.currentPlayerIndex + currentState.direction + pIds.length) % pIds.length,
              pendingDrawCount: 0,
            }
          } else {
            // getNextState 内部会自动处理：
            // 摸牌后手牌 > 1 张 → 清除 unoCalled[botId]
            nextState = getNextState(
              stateToUse,
              { type: 'draw', userId: botId },
              pIds,
              { gameMode }
            )
          }
        }

        // 处理 needReshuffle 标记
        if (nextState.needReshuffle) {
          const { newDrawPile, newTopCard } = reshuffleDiscardPile(nextState.discardPile || [])
          if (newDrawPile.length > 0) {
            nextState = {
              ...nextState,
              needReshuffle: false,
              drawPile: newDrawPile,
              topCard: newTopCard,
              discardPile: newTopCard ? [newTopCard] : [],
            }
          }
        }

        // ── 主状态 + UNO 状态 + 排名列表合并写入 ────────────────────
        // uno_called 与主状态原子写入，避免时序问题
        const updatePayload = {
          current_player_index: nextState.currentPlayerIndex,
          direction: nextState.direction,
          current_color: nextState.currentColor,
          top_card: nextState.topCard,
          draw_pile: nextState.drawPile,
          discard_pile: nextState.discardPile,
          hands: nextState.hands,
          pending_draw_count: nextState.pendingDrawCount,
          winner_id: nextState.winnerId || null,
          updated_at: new Date().toISOString(),
        }

        // 尝试写入 uno_called 和 rank_list（如列不存在则捕获错误后退到不含这些字段的写入）
        let { error: updateError } = await supabase
          .from('uno_game_state')
          .update({
            ...updatePayload,
            uno_called: nextState.unoCalled || {},
            rank_list: nextState.rankList || [],
          })
          .eq('room_id', currentRoomId)

        if (updateError) {
          // 如果是 uno_called 列不存在，降级写入不含 uno_called 的版本
          if (updateError.message?.includes('uno_called')) {
            console.warn('[Bot] uno_called 列不存在，降级写入:', updateError.message)
            const fallback = await supabase
              .from('uno_game_state')
              .update(updatePayload)
              .eq('room_id', currentRoomId)
            if (fallback.error) throw fallback.error
          } else {
            throw updateError
          }
        }

        // 标记已成功处理此 stateKey
        lastSuccessKeyRef.current[botId] = capturedStateKey

        // 记录操作日志
        await supabase.from('uno_actions').insert({
          room_id: currentRoomId,
          user_id: botId,
          action_type: card ? 'play' : 'draw',
          card: card || null,
          chosen_color: chosenColor || null,
        })

        // Bot 赢了 → 更新房间状态
        if (nextState.winnerId) {
          await supabase
            .from('uno_rooms')
            .update({ status: ROOM_STATUS.FINISHED })
            .eq('id', currentRoomId)
        }
      } catch (err) {
        console.error('[Bot] 操作失败:', err)
        // 出错时不更新 lastSuccessKeyRef，允许下次重试
      } finally {
        // 解锁：仅在当前 stateKey 完成时才释放，允许新 stateKey 触发
        if (pendingRef.current[botId] === capturedStateKey) {
          pendingRef.current[botId] = null
        }
      }
    }

    run()
    // 在 updated_at、current_player_index 变化或开场完成时触发
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState?.updated_at, gameState?.current_player_index, openingReady])
}
