/**
 * useDrawGuessBot - 机器人 AI Hook
 * 监听游戏状态，当轮到机器人时自动进行猜测或描述
 */

import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import {
  simulateBotGuess,
  calculateBotGuessDelay,
  shouldRequestHint,
  BOT_DIFFICULTY
} from '../../lib/draw-guess/botLogic'
import { submitGuess as apiSubmitGuess, requestHint as apiRequestHint } from '../../lib/draw-guess/gameLogic'

/**
 * 机器人 Hook
 * @param {Object} options
 * @param {Object} options.room - 房间信息
 * @param {Array} options.players - 玩家列表
 * @param {Array} options.teams - 团队列表
 * @param {string} options.currentPhase - 当前阶段
 * @param {string} options.currentWord - 当前词语
 * @param {Array} options.hintsRevealed - 已揭示的提示
 * @param {number} options.timeRemaining - 剩余时间
 * @param {string} options.currentRoundId - 当前轮次ID
 * @param {boolean} options.isHost - 是否是房主
 */
export function useDrawGuessBot({
  room,
  players,
  teams,
  currentPhase,
  currentWord,
  hintsRevealed,
  timeRemaining,
  currentRoundId,
  isHost
}) {
  // 防止并发执行的锁
  const pendingRef = useRef({})
  // 记录已处理的状态
  const processedRef = useRef({})
  // 猜测尝试次数（每个机器人）
  const guessAttemptsRef = useRef({})

  // 获取机器人列表
  const getBotPlayers = useCallback(() => {
    return players?.filter(p => p.is_bot === true && p.status === 'connected') || []
  }, [players])

  // 获取非描述者的机器人（可以猜测的）
  const getGuessingBots = useCallback(() => {
    return getBotPlayers().filter(bot => !bot.is_describer)
  }, [getBotPlayers])

  // 获取描述者机器人
  const getDescriberBot = useCallback(() => {
    return getBotPlayers().find(bot => bot.is_describer)
  }, [getBotPlayers])

  // 机器人猜测逻辑
  const handleBotGuess = useCallback(async (bot, word, hints) => {
    if (!bot || !word || !currentRoundId || !room) return

    // 使用 bot.id 作为唯一标识
    const botKey = bot.id
    const stateKey = `${botKey}_${currentRoundId}_${currentPhase}_${timeRemaining}`

    // 防止重复处理
    if (processedRef.current[stateKey] || pendingRef.current[botKey]) {
      return
    }

    // 标记为处理中
    pendingRef.current[botKey] = true

    try {
      // 获取或初始化猜测次数
      const attempts = guessAttemptsRef.current[botKey] || 0

      // 计算延迟时间
      const delay = calculateBotGuessDelay(BOT_DIFFICULTY.NORMAL, timeRemaining)
      await new Promise(resolve => setTimeout(resolve, delay))

      // 检查游戏状态是否已变化
      if (currentPhase !== 'guessing') {
        pendingRef.current[botId] = false
        return
      }

      // 模拟猜测
      const result = simulateBotGuess(word, hints, BOT_DIFFICULTY.NORMAL, attempts)

      if (result.shouldGuess && result.guess) {
        // 提交猜测 - 使用 bot.id 作为标识
        // 由于机器人没有 user_id，我们使用 bot.id 并标记为机器人操作
        // 这里需要房主代理提交
        await apiSubmitGuess(room.id, currentRoundId, bot.id, result.guess)

        // 更新猜测次数
        guessAttemptsRef.current[botKey] = attempts + 1

        // 如果猜对了，重置所有机器人的猜测次数
        if (result.isCorrect) {
          guessAttemptsRef.current = {}
        }
      }

      // 标记为已处理
      processedRef.current[stateKey] = true
    } catch (err) {
      console.error(`[Bot ${bot.display_name}] 猜测失败:`, err)
    } finally {
      pendingRef.current[botKey] = false
    }
  }, [currentPhase, currentRoundId, room, timeRemaining])

  // 机器人请求提示逻辑
  const handleBotHintRequest = useCallback(async (bot) => {
    if (!bot || !room) return

    const team = teams?.find(t => t.id === bot.team_id)
    if (!team) return

    // 检查是否应该请求提示
    if (shouldRequestHint(team.hints_used || 0, 2, timeRemaining)) {
      try {
        await apiRequestHint(room.id, team.id)
        console.log(`[Bot ${bot.display_name}] 请求了提示`)
      } catch (err) {
        console.error(`[Bot ${bot.display_name}] 请求提示失败:`, err)
      }
    }
  }, [room, teams, timeRemaining])

  // 监听猜测阶段
  useEffect(() => {
    // 只有房主运行机器人逻辑
    if (!isHost) return
    if (currentPhase !== 'guessing') return
    if (!currentWord) return

    // 获取可猜测的机器人
    const guessingBots = getGuessingBots()
    if (guessingBots.length === 0) return

    // 为每个机器人安排猜测
    guessingBots.forEach((bot, index) => {
      // 错开时间，避免同时猜测
      const offset = index * 1500 + Math.random() * 1000

      setTimeout(() => {
        handleBotGuess(bot, currentWord, hintsRevealed || [])
        // 同时考虑请求提示
        handleBotHintRequest(bot)
      }, offset)
    })

  }, [isHost, currentPhase, currentWord, getGuessingBots, handleBotGuess, handleBotHintRequest, hintsRevealed])

  // 清理：当轮次变化时重置状态
  useEffect(() => {
    processedRef.current = {}
    guessAttemptsRef.current = {}
    pendingRef.current = {}
  }, [currentRoundId])

  // 返回机器人信息
  return {
    botPlayers: getBotPlayers(),
    guessingBots: getGuessingBots(),
    describerBot: getDescriberBot()
  }
}
