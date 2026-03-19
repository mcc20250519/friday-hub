/**
 * 你说我猜 - 游戏逻辑工具函数
 */

import { supabase } from '../supabase'
import { selectRandomWord, getWordsForRoom } from './wordApi'

/**
 * 开始游戏
 * @param {string} roomId - 房间ID
 * @param {string} hostId - 房主ID
 * @returns {Promise<{data, error}>}
 */
export async function startGame(roomId, hostId) {
  try {
    // 获取房间信息
    const { data: room, error: roomError } = await supabase
      .from('draw_guess_rooms')
      .select(`
        *,
        players:draw_guess_players(*),
        teams:draw_guess_teams(*)
      `)
      .eq('id', roomId)
      .single()

    if (roomError || !room) {
      return { data: null, error: '房间不存在' }
    }

    // 验证房主权限
    if (room.host_id !== hostId) {
      return { data: null, error: '只有房主可以开始游戏' }
    }

    // 验证玩家数量
    const connectedPlayers = room.players?.filter(p => p.status === 'connected') || []
    if (connectedPlayers.length < 2) {
      return { data: null, error: '至少需要 2 名玩家' }
    }

    // 获取词库
    const { data: words } = await getWordsForRoom(roomId, room.word_source)
    if (!words || words.length === 0) {
      return { data: null, error: '词库为空，无法开始游戏' }
    }

    // 选择第一个词语
    const firstWord = selectRandomWord(words, [])

    // 分配第一个描述者（按加入顺序）
    const sortedPlayers = [...connectedPlayers].sort((a, b) => 
      new Date(a.joined_at) - new Date(b.joined_at)
    )
    const firstDescriber = sortedPlayers[0]

    // 更新房间状态
    const { error: updateError } = await supabase
      .from('draw_guess_rooms')
      .update({
        status: 'active',
        current_round: 1,
        current_phase: 'description',
        current_describer_id: firstDescriber.user_id,
        current_word: firstWord.word,
        phase_started_at: new Date().toISOString(),
        hints_revealed: []
      })
      .eq('id', roomId)

    if (updateError) {
      return { data: null, error: updateError.message }
    }

    // 更新描述者状态
    await supabase
      .from('draw_guess_players')
      .update({ is_describer: true })
      .eq('id', firstDescriber.id)

    // 其他玩家设为非描述者
    await supabase
      .from('draw_guess_players')
      .update({ is_describer: false })
      .eq('room_id', roomId)
      .neq('id', firstDescriber.id)

    // 重置团队提示使用次数
    await supabase
      .from('draw_guess_teams')
      .update({ hints_used: 0 })
      .eq('room_id', roomId)

    // 创建第一轮记录
    const { data: round, error: roundError } = await supabase
      .from('draw_guess_rounds')
      .insert({
        room_id: roomId,
        round_num: 1,
        describer_player_id: firstDescriber.id,
        target_word: firstWord.word,
        canvas_data: [],
        guesses: []
      })
      .select()
      .single()

    if (roundError) {
      console.error('创建轮次失败:', roundError)
    }

    return {
      data: {
        round: 1,
        phase: 'description',
        describer: firstDescriber,
        word: firstWord.word,
        roundId: round?.id
      },
      error: null
    }
  } catch (err) {
    console.error('开始游戏异常:', err)
    return { data: null, error: err.message }
  }
}

/**
 * 分配下一个描述者
 * @param {string} roomId - 房间ID
 * @returns {Promise<{data, error}>}
 */
export async function assignNextDescriber(roomId) {
  try {
    // 获取房间和玩家信息
    const { data: room } = await supabase
      .from('draw_guess_rooms')
      .select('*')
      .eq('id', roomId)
      .single()

    const { data: players } = await supabase
      .from('draw_guess_players')
      .select('*')
      .eq('room_id', roomId)
      .eq('status', 'connected')
      .order('joined_at', { ascending: true })

    if (!players || players.length === 0) {
      return { data: null, error: '没有可用玩家' }
    }

    // 找到当前描述者索引
    const currentIndex = players.findIndex(p => p.user_id === room.current_describer_id)
    
    // 下一个描述者（循环）
    const nextIndex = (currentIndex + 1) % players.length
    const nextDescriber = players[nextIndex]

    // 更新描述者状态
    await supabase
      .from('draw_guess_players')
      .update({ is_describer: false })
      .eq('room_id', roomId)

    await supabase
      .from('draw_guess_players')
      .update({ is_describer: true })
      .eq('id', nextDescriber.id)

    // 更新描述次数
    await supabase.rpc('increment_rounds_described', { player_id: nextDescriber.id })

    return { data: nextDescriber, error: null }
  } catch (err) {
    console.error('分配描述者异常:', err)
    return { data: null, error: err.message }
  }
}

/**
 * 验证猜测答案
 * @param {string} guess - 猜测的答案
 * @param {string} targetWord - 目标词语
 * @returns {boolean}
 */
export function validateGuess(guess, targetWord) {
  if (!guess || !targetWord) return false

  // 去除空格并转为小写比较
  const normalizedGuess = guess.trim().toLowerCase()
  const normalizedTarget = targetWord.trim().toLowerCase()

  return normalizedGuess === normalizedTarget
}

/**
 * 提交猜测
 * @param {string} roomId - 房间ID
 * @param {string} roundId - 轮次ID
 * @param {string} userIdOrPlayerId - 用户ID 或 玩家ID（机器人）
 * @param {string} guess - 猜测内容
 * @returns {Promise<{data, error}>}
 */
export async function submitGuess(roomId, roundId, userIdOrPlayerId, guess) {
  try {
    // 获取当前轮次信息
    const { data: round } = await supabase
      .from('draw_guess_rounds')
      .select('*')
      .eq('id', roundId)
      .single()

    if (!round) {
      return { data: null, error: '轮次不存在' }
    }

    // 尝试通过 user_id 查找玩家（普通用户）
    let { data: player } = await supabase
      .from('draw_guess_players')
      .select('*, team:draw_guess_teams(*)')
      .eq('room_id', roomId)
      .eq('user_id', userIdOrPlayerId)
      .single()

    // 如果找不到，尝试通过 player.id 查找（机器人）
    if (!player) {
      const { data: botPlayer } = await supabase
        .from('draw_guess_players')
        .select('*, team:draw_guess_teams(*)')
        .eq('id', userIdOrPlayerId)
        .eq('room_id', roomId)
        .eq('is_bot', true)
        .single()
      
      if (botPlayer) {
        player = botPlayer
      }
    }

    if (!player) {
      return { data: null, error: '玩家不存在' }
    }

    // 检查是否是描述者（描述者不能猜）
    if (player.is_describer) {
      return { data: null, error: '描述者不能参与猜测' }
    }

    // 验证答案
    const isCorrect = validateGuess(guess, round.target_word)

    // 记录猜测
    const guesses = round.guesses || []
    const newGuess = {
      user_id: player.user_id,  // 机器人没有 user_id，会是 null
      player_id: player.id,
      team_id: player.team_id,
      guess: guess.trim(),
      is_correct: isCorrect,
      is_bot: player.is_bot || false,
      timestamp: new Date().toISOString()
    }

    // 如果是正确答案且是第一个猜对的团队
    let awardResult = null
    if (isCorrect && !round.correct_guess) {
      // 给团队加分
      const { error: scoreError } = await supabase
        .from('draw_guess_teams')
        .update({ score: (player.team?.score || 0) + 1 })
        .eq('id', player.team_id)

      if (!scoreError) {
        // 更新玩家正确猜测次数
        await supabase
          .from('draw_guess_players')
          .update({ correct_guesses: (player.correct_guesses || 0) + 1 })
          .eq('id', player.id)

        // 更新轮次记录
        await supabase
          .from('draw_guess_rounds')
          .update({
            correct_guess: guess.trim(),
            correct_guess_at: new Date().toISOString(),
            guessing_team_id: player.team_id,
            guesses: [...guesses, newGuess]
          })
          .eq('id', roundId)

        awardResult = {
          teamId: player.team_id,
          newScore: (player.team?.score || 0) + 1
        }
      }
    } else {
      // 只是记录猜测
      await supabase
        .from('draw_guess_rounds')
        .update({ guesses: [...guesses, newGuess] })
        .eq('id', roundId)
    }

    // 记录操作
    await supabase
      .from('draw_guess_actions')
      .insert({
        room_id: roomId,
        round_id: roundId,
        user_id: player.user_id,  // 机器人没有 user_id，会是 null
        action_type: 'guess',
        action_data: { 
          guess: guess.trim(), 
          is_correct: isCorrect,
          player_id: player.id,  // 用 player_id 标识是谁
          is_bot: player.is_bot || false 
        }
      })

    return {
      data: {
        isCorrect,
        award: awardResult
      },
      error: null
    }
  } catch (err) {
    console.error('提交猜测异常:', err)
    return { data: null, error: err.message }
  }
}

/**
 * 结束当前轮次
 * @param {string} roomId - 房间ID
 * @param {string} roundId - 轮次ID
 * @returns {Promise<{data, error}>}
 */
export async function endRound(roomId, roundId) {
  try {
    // 获取房间信息
    const { data: room } = await supabase
      .from('draw_guess_rooms')
      .select(`
        *,
        teams:draw_guess_teams(*)
      `)
      .eq('id', roomId)
      .single()

    if (!room) {
      return { data: null, error: '房间不存在' }
    }

    // 更新轮次结束时间
    await supabase
      .from('draw_guess_rounds')
      .update({
        finished_at: new Date().toISOString(),
        round_duration_sec: Math.floor(
          (Date.now() - new Date(room.phase_started_at).getTime()) / 1000
        )
      })
      .eq('id', roundId)

    // 检查是否有团队达到目标分数
    const targetScore = Math.ceil(room.target_rounds / 2)
    const winner = room.teams?.find(t => t.score >= targetScore)

    if (winner) {
      // 游戏结束
      await supabase
        .from('draw_guess_rooms')
        .update({
          status: 'finished',
          current_phase: 'finished',
          finished_at: new Date().toISOString()
        })
        .eq('id', roomId)

      return {
        data: {
          gameEnded: true,
          winner
        },
        error: null
      }
    }

    // 继续下一轮
    const nextRound = room.current_round + 1

    // 分配下一个描述者
    const { data: nextDescriber, error: describerError } = await assignNextDescriber(roomId)
    if (describerError) {
      return { data: null, error: describerError }
    }

    // 获取新词语
    const { data: words } = await getWordsForRoom(roomId, room.word_source)
    const usedWords = await getUsedWords(roomId)
    const newWord = selectRandomWord(words || [], usedWords)

    if (!newWord) {
      return { data: null, error: '没有可用词语' }
    }

    // 创建新轮次
    const { data: newRound, error: roundError } = await supabase
      .from('draw_guess_rounds')
      .insert({
        room_id: roomId,
        round_num: nextRound,
        describer_player_id: nextDescriber.id,
        target_word: newWord.word,
        canvas_data: [],
        guesses: []
      })
      .select()
      .single()

    if (roundError) {
      return { data: null, error: roundError.message }
    }

    // 更新房间状态
    await supabase
      .from('draw_guess_rooms')
      .update({
        current_round: nextRound,
        current_phase: 'description',
        current_describer_id: nextDescriber.user_id,
        current_word: newWord.word,
        phase_started_at: new Date().toISOString(),
        hints_revealed: []
      })
      .eq('id', roomId)

    // 重置团队提示使用次数
    await supabase
      .from('draw_guess_teams')
      .update({ hints_used: 0 })
      .eq('room_id', roomId)

    return {
      data: {
        gameEnded: false,
        nextRound,
        describer: nextDescriber,
        word: newWord.word,
        roundId: newRound?.id
      },
      error: null
    }
  } catch (err) {
    console.error('结束轮次异常:', err)
    return { data: null, error: err.message }
  }
}

/**
 * 获取已使用的词语
 * @param {string} roomId - 房间ID
 * @returns {Promise<string[]>}
 */
async function getUsedWords(roomId) {
  const { data: rounds } = await supabase
    .from('draw_guess_rounds')
    .select('target_word')
    .eq('room_id', roomId)

  return rounds?.map(r => r.target_word) || []
}

/**
 * 请求提示
 * @param {string} roomId - 房间ID
 * @param {string} teamId - 团队ID
 * @returns {Promise<{data, error}>}
 */
export async function requestHint(roomId, teamId) {
  try {
    // 获取房间和团队信息
    const { data: room } = await supabase
      .from('draw_guess_rooms')
      .select('*')
      .eq('id', roomId)
      .single()

    const { data: team } = await supabase
      .from('draw_guess_teams')
      .select('*')
      .eq('id', teamId)
      .single()

    if (!room || !team) {
      return { data: null, error: '房间或团队不存在' }
    }

    // 检查提示次数限制（每队每轮最多 2 次）
    const maxHintsPerRound = 2
    if (team.hints_used >= maxHintsPerRound) {
      return { data: null, error: '本队本回合提示次数已用完' }
    }

    // 获取当前词语
    const word = room.current_word
    if (!word) {
      return { data: null, error: '当前没有词语' }
    }

    // 获取已揭示的位置
    const revealedPositions = room.hints_revealed || []
    
    // 找到未揭示的字符位置
    const availablePositions = []
    for (let i = 0; i < word.length; i++) {
      if (!revealedPositions.includes(i)) {
        availablePositions.push(i)
      }
    }

    if (availablePositions.length === 0) {
      return { data: null, error: '所有字符已揭示' }
    }

    // 随机选择一个位置
    const randomPos = availablePositions[Math.floor(Math.random() * availablePositions.length)]
    const revealedChar = word[randomPos]

    // 更新房间提示状态
    const newRevealed = [...revealedPositions, randomPos]
    await supabase
      .from('draw_guess_rooms')
      .update({ hints_revealed: newRevealed })
      .eq('id', roomId)

    // 更新团队提示使用次数
    await supabase
      .from('draw_guess_teams')
      .update({ hints_used: team.hints_used + 1 })
      .eq('id', teamId)

    return {
      data: {
        position: randomPos,
        character: revealedChar,
        hintsUsed: team.hints_used + 1,
        maxHints: maxHintsPerRound
      },
      error: null
    }
  } catch (err) {
    console.error('请求提示异常:', err)
    return { data: null, error: err.message }
  }
}

/**
 * 转换游戏阶段
 * @param {string} roomId - 房间ID
 * @param {string} newPhase - 新阶段 ('description' | 'guessing' | 'round_end')
 * @returns {Promise<{error}>}
 */
export async function transitionPhase(roomId, newPhase) {
  try {
    const { error } = await supabase
      .from('draw_guess_rooms')
      .update({
        current_phase: newPhase,
        phase_started_at: new Date().toISOString()
      })
      .eq('id', roomId)

    return { error: error?.message }
  } catch (err) {
    console.error('转换阶段异常:', err)
    return { error: err.message }
  }
}

/**
 * 重新开始游戏（保持玩家）
 * @param {string} roomId - 房间ID
 * @param {string} hostId - 房主ID
 * @returns {Promise<{data, error}>}
 */
export async function restartGame(roomId, hostId) {
  try {
    // 验证房主权限
    const { data: room } = await supabase
      .from('draw_guess_rooms')
      .select('*')
      .eq('id', roomId)
      .single()

    if (!room || room.host_id !== hostId) {
      return { data: null, error: '只有房主可以重新开始游戏' }
    }

    // 重置团队分数
    await supabase
      .from('draw_guess_teams')
      .update({ score: 0, hints_used: 0 })
      .eq('room_id', roomId)

    // 重置玩家状态
    await supabase
      .from('draw_guess_players')
      .update({
        is_describer: false,
        rounds_described: 0,
        correct_guesses: 0
      })
      .eq('room_id', roomId)

    // 删除旧轮次记录
    await supabase
      .from('draw_guess_rounds')
      .delete()
      .eq('room_id', roomId)

    // 删除旧操作记录
    await supabase
      .from('draw_guess_actions')
      .delete()
      .eq('room_id', roomId)

    // 重置房间状态
    await supabase
      .from('draw_guess_rooms')
      .update({
        status: 'waiting',
        current_round: 0,
        current_phase: 'waiting',
        current_describer_id: null,
        current_word: null,
        phase_started_at: null,
        finished_at: null,
        hints_revealed: []
      })
      .eq('id', roomId)

    return { data: { success: true }, error: null }
  } catch (err) {
    console.error('重新开始游戏异常:', err)
    return { data: null, error: err.message }
  }
}
