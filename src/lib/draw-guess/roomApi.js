/**
 * 你说我猜 - 房间管理 API
 */

import { supabase } from '../supabase'

/**
 * 生成 6 位随机房间码
 * @returns {string} 房间码
 */
export function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * 创建房间
 * @param {string} userId - 用户ID
 * @param {Object} config - 房间配置
 * @param {number} config.numTeams - 团队数量 (2-4)
 * @param {number} config.playersPerTeam - 每队人数 (1-4)
 * @param {number} config.descriptionTime - 描述时间 (30-120秒)
 * @param {number} config.guessingTime - 猜测时间 (15-90秒)
 * @param {number} config.targetRounds - 目标轮数 (3/5/7)
 * @param {string} config.wordSource - 词源 ('predefined' | 'custom' | 'both')
 * @param {string} config.displayName - 显示名称
 * @returns {Promise<{data, error}>}
 */
export async function createRoom(userId, config) {
  try {
    // 生成唯一房间码
    let roomCode = generateRoomCode()
    let attempts = 0
    const maxAttempts = 10

    while (attempts < maxAttempts) {
      const { data: existing } = await supabase
        .from('draw_guess_rooms')
        .select('room_code')
        .eq('room_code', roomCode)
        .single()

      if (!existing) break
      roomCode = generateRoomCode()
      attempts++
    }

    if (attempts >= maxAttempts) {
      return { data: null, error: '无法生成唯一房间码，请重试' }
    }

    // 创建房间
    const { data: room, error: roomError } = await supabase
      .from('draw_guess_rooms')
      .insert({
        room_code: roomCode,
        host_id: userId,
        num_teams: config.numTeams || 2,
        players_per_team: config.playersPerTeam || 2,
        description_time_sec: config.descriptionTime || 60,
        guessing_time_sec: config.guessingTime || 30,
        target_rounds: config.targetRounds || 3,
        word_source: config.wordSource || 'predefined',
        status: 'waiting'
      })
      .select()
      .single()

    if (roomError) {
      console.error('创建房间失败:', roomError)
      return { data: null, error: roomError.message }
    }

    // 创建团队
    const teams = []
    const teamNames = ['红队', '蓝队', '绿队', '黄队']
    const teamColors = ['#EF4444', '#3B82F6', '#22C55E', '#EAB308']

    for (let i = 1; i <= room.num_teams; i++) {
      const { data: team, error: teamError } = await supabase
        .from('draw_guess_teams')
        .insert({
          room_id: room.id,
          team_num: i,
          team_name: teamNames[i - 1],
          score: 0,
          hints_used: 0
        })
        .select()
        .single()

      if (teamError) {
        console.error('创建团队失败:', teamError)
      } else {
        teams.push({ ...team, color: teamColors[i - 1] })
      }
    }

    // 创建者自动加入第一个团队
    const { data: player, error: playerError } = await supabase
      .from('draw_guess_players')
      .insert({
        room_id: room.id,
        user_id: userId,
        team_id: teams[0]?.id,
        display_name: config.displayName || '玩家',
        status: 'connected'
      })
      .select()
      .single()

    if (playerError) {
      console.error('创建玩家失败:', playerError)
    }

    return {
      data: {
        ...room,
        teams,
        currentPlayer: player
      },
      error: null
    }
  } catch (err) {
    console.error('创建房间异常:', err)
    return { data: null, error: err.message }
  }
}

/**
 * 加入房间
 * @param {string} userId - 用户ID
 * @param {string} roomCode - 房间码
 * @param {string} displayName - 显示名称
 * @returns {Promise<{data, error}>}
 */
export async function joinRoom(userId, roomCode, displayName = '玩家') {
  try {
    // 查找房间
    const { data: room, error: roomError } = await supabase
      .from('draw_guess_rooms')
      .select('*')
      .eq('room_code', roomCode.toUpperCase())
      .single()

    if (roomError || !room) {
      return { data: null, error: '房间不存在' }
    }

    if (room.status !== 'waiting') {
      return { data: null, error: '游戏已开始，无法加入' }
    }

    // 检查是否已经加入
    const { data: existingPlayer } = await supabase
      .from('draw_guess_players')
      .select('*')
      .eq('room_id', room.id)
      .eq('user_id', userId)
      .single()

    if (existingPlayer) {
      // 已加入，更新状态
      await supabase
        .from('draw_guess_players')
        .update({ status: 'connected', display_name: displayName })
        .eq('id', existingPlayer.id)

      return { data: { room, player: existingPlayer, rejoined: true }, error: null }
    }

    // 获取所有团队和玩家
    const { data: teams } = await supabase
      .from('draw_guess_teams')
      .select('*')
      .eq('room_id', room.id)
      .order('team_num')

    const { data: players } = await supabase
      .from('draw_guess_players')
      .select('*')
      .eq('room_id', room.id)

    // 检查房间是否已满
    const maxPlayers = room.num_teams * room.players_per_team
    if (players && players.length >= maxPlayers) {
      return { data: null, error: '房间已满' }
    }

    // 找到人数最少的团队
    const teamPlayerCounts = {}
    teams?.forEach(team => {
      teamPlayerCounts[team.id] = 0
    })
    players?.forEach(player => {
      if (player.team_id && teamPlayerCounts[player.team_id] !== undefined) {
        teamPlayerCounts[player.team_id]++
      }
    })

    let targetTeam = teams?.[0]
    let minCount = room.players_per_team + 1

    teams?.forEach(team => {
      const count = teamPlayerCounts[team.id] || 0
      if (count < minCount && count < room.players_per_team) {
        minCount = count
        targetTeam = team
      }
    })

    if (!targetTeam) {
      return { data: null, error: '所有团队已满' }
    }

    // 加入团队
    const { data: player, error: playerError } = await supabase
      .from('draw_guess_players')
      .insert({
        room_id: room.id,
        user_id: userId,
        team_id: targetTeam.id,
        display_name: displayName,
        status: 'connected'
      })
      .select()
      .single()

    if (playerError) {
      console.error('加入房间失败:', playerError)
      return { data: null, error: playerError.message }
    }

    return { data: { room, player, team: targetTeam, rejoined: false }, error: null }
  } catch (err) {
    console.error('加入房间异常:', err)
    return { data: null, error: err.message }
  }
}

/**
 * 离开房间
 * @param {string} userId - 用户ID
 * @param {string} roomId - 房间ID
 * @returns {Promise<{error}>}
 */
export async function leaveRoom(userId, roomId) {
  try {
    // 检查是否是房主
    const { data: room } = await supabase
      .from('draw_guess_rooms')
      .select('host_id')
      .eq('id', roomId)
      .single()

    if (room?.host_id === userId) {
      // 房主离开，删除整个房间
      const { error } = await supabase
        .from('draw_guess_rooms')
        .delete()
        .eq('id', roomId)

      return { error: error?.message }
    }

    // 普通玩家离开
    const { error } = await supabase
      .from('draw_guess_players')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', userId)

    return { error: error?.message }
  } catch (err) {
    console.error('离开房间异常:', err)
    return { error: err.message }
  }
}

/**
 * 获取房间信息
 * @param {string} roomId - 房间ID
 * @returns {Promise<{data, error}>}
 */
export async function getRoom(roomId) {
  try {
    const { data: room, error } = await supabase
      .from('draw_guess_rooms')
      .select(`
        *,
        teams:draw_guess_teams(*),
        players:draw_guess_players(*)
      `)
      .eq('id', roomId)
      .single()

    if (error) {
      console.error('获取房间失败:', error)
      return { data: null, error: error.message }
    }

    return { data: room, error: null }
  } catch (err) {
    console.error('获取房间异常:', err)
    return { data: null, error: err.message }
  }
}

/**
 * 通过房间码获取房间信息
 * @param {string} roomCode - 房间码
 * @returns {Promise<{data, error}>}
 */
export async function getRoomByCode(roomCode) {
  try {
    const { data: room, error } = await supabase
      .from('draw_guess_rooms')
      .select(`
        *,
        teams:draw_guess_teams(*),
        players:draw_guess_players(*)
      `)
      .eq('room_code', roomCode.toUpperCase())
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    return { data: room, error: null }
  } catch (err) {
    console.error('获取房间异常:', err)
    return { data: null, error: err.message }
  }
}

/**
 * 更新玩家状态（连接/断开）
 * @param {string} playerId - 玩家ID
 * @param {string} status - 状态 ('connected' | 'disconnected')
 * @returns {Promise<{error}>}
 */
export async function updatePlayerStatus(playerId, status) {
  try {
    const { error } = await supabase
      .from('draw_guess_players')
      .update({ status })
      .eq('id', playerId)

    return { error: error?.message }
  } catch (err) {
    console.error('更新玩家状态异常:', err)
    return { error: err.message }
  }
}

/**
 * 生成机器人 ID
 * @param {number} index - 机器人索引
 * @returns {string} 机器人ID
 */
export function generateBotId(index = 0) {
  return `bot_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 8)}`
}

/**
 * 机器人名称列表
 */
const BOT_NAMES = [
  '小机灵', '小聪明', '小迷糊', '小天才',
  '小机灵', '小博士', '小侦探', '小达人'
]

/**
 * 添加机器人到房间
 * @param {string} roomId - 房间ID
 * @param {string} hostId - 房主ID（用于验证权限）
 * @param {string} [preferredTeamId] - 指定团队ID（可选）
 * @returns {Promise<{data, error}>}
 */
export async function addBotToRoom(roomId, hostId, preferredTeamId = null) {
  try {
    // 验证房主权限
    const { data: room, error: roomError } = await supabase
      .from('draw_guess_rooms')
      .select('*')
      .eq('id', roomId)
      .single()

    if (roomError || !room) {
      return { data: null, error: '房间不存在' }
    }

    if (room.host_id !== hostId) {
      return { data: null, error: '只有房主可以添加机器人' }
    }

    if (room.status !== 'waiting') {
      return { data: null, error: '游戏已开始，无法添加机器人' }
    }

    // 获取所有团队和玩家
    const { data: teams } = await supabase
      .from('draw_guess_teams')
      .select('*')
      .eq('room_id', roomId)
      .order('team_num')

    const { data: players } = await supabase
      .from('draw_guess_players')
      .select('*')
      .eq('room_id', roomId)

    // 检查房间是否已满
    const maxPlayers = room.num_teams * room.players_per_team
    const connectedPlayers = players?.filter(p => p.status === 'connected') || []
    if (connectedPlayers.length >= maxPlayers) {
      return { data: null, error: '房间已满' }
    }

    // 计算现有机器人数量
    const existingBots = players?.filter(p => p.is_bot === true) || []
    const botIndex = existingBots.length

    // 找到目标团队
    let targetTeam = null

    if (preferredTeamId) {
      // 使用指定团队
      targetTeam = teams?.find(t => t.id === preferredTeamId)
      const teamPlayers = connectedPlayers.filter(p => p.team_id === preferredTeamId)
      if (teamPlayers.length >= room.players_per_team) {
        return { data: null, error: '指定团队已满' }
      }
    } else {
      // 自动分配到人数最少的团队
      const teamPlayerCounts = {}
      teams?.forEach(team => {
        teamPlayerCounts[team.id] = 0
      })
      players?.forEach(player => {
        if (player.team_id && teamPlayerCounts[player.team_id] !== undefined) {
          teamPlayerCounts[player.team_id]++
        }
      })

      let minCount = room.players_per_team + 1
      teams?.forEach(team => {
        const count = teamPlayerCounts[team.id] || 0
        if (count < minCount && count < room.players_per_team) {
          minCount = count
          targetTeam = team
        }
      })
    }

    if (!targetTeam) {
      return { data: null, error: '所有团队已满' }
    }

    // 创建机器人 - 使用 is_bot 标识，user_id 为 null
    const botName = BOT_NAMES[botIndex % BOT_NAMES.length]

    const { data: botPlayer, error: insertError } = await supabase
      .from('draw_guess_players')
      .insert({
        room_id: roomId,
        user_id: null,  // 机器人没有 user_id
        team_id: targetTeam.id,
        display_name: botName,
        status: 'connected',
        is_bot: true  // 标识为机器人
      })
      .select()
      .single()

    if (insertError) {
      console.error('创建机器人失败:', insertError)
      return { data: null, error: insertError.message }
    }

    return {
      data: {
        bot: botPlayer,
        team: targetTeam
      },
      error: null
    }
  } catch (err) {
    console.error('添加机器人异常:', err)
    return { data: null, error: err.message }
  }
}

/**
 * 移除机器人
 * @param {string} roomId - 房间ID
 * @param {string} botPlayerId - 机器人玩家记录ID（不是 user_id）
 * @param {string} hostId - 房主ID（用于验证权限）
 * @returns {Promise<{error}>}
 */
export async function removeBotFromRoom(roomId, botPlayerId, hostId) {
  try {
    // 验证房主权限
    const { data: room } = await supabase
      .from('draw_guess_rooms')
      .select('host_id')
      .eq('id', roomId)
      .single()

    if (!room || room.host_id !== hostId) {
      return { error: '只有房主可以移除机器人' }
    }

    // 验证是机器人（通过 id 删除，并验证 is_bot）
    const { error } = await supabase
      .from('draw_guess_players')
      .delete()
      .eq('id', botPlayerId)
      .eq('room_id', roomId)
      .eq('is_bot', true)

    return { error: error?.message }
  } catch (err) {
    console.error('移除机器人异常:', err)
    return { error: err.message }
  }
}

/**
 * 一键补满机器人
 * @param {string} roomId - 房间ID
 * @param {string} hostId - 房主ID（用于验证权限）
 * @returns {Promise<{data, error}>}
 */
export async function fillBotsToRoom(roomId, hostId) {
  try {
    console.log('开始填充机器人: roomId=', roomId, 'hostId=', hostId)
    
    // 验证房主权限
    const { data: room, error: roomError } = await supabase
      .from('draw_guess_rooms')
      .select('*')
      .eq('id', roomId)
      .single()

    if (roomError || !room) {
      console.error('房间不存在:', roomError)
      return { data: null, error: '房间不存在' }
    }

    console.log('房间数据:', room)

    if (room.host_id !== hostId) {
      console.error('权限错误: 当前用户不是房主')
      return { data: null, error: '只有房主可以添加机器人' }
    }

    if (room.status !== 'waiting') {
      console.error('房间状态错误:', room.status)
      return { data: null, error: '游戏已开始，无法添加机器人' }
    }

    // 获取所有团队和玩家
    const { data: teams } = await supabase
      .from('draw_guess_teams')
      .select('*')
      .eq('room_id', roomId)
      .order('team_num')

    const { data: players } = await supabase
      .from('draw_guess_players')
      .select('*')
      .eq('room_id', roomId)

    console.log('现有玩家:', players?.length, '团队:', teams?.length)

    // 计算需要添加的机器人数量
    const maxPlayers = room.num_teams * room.players_per_team
    const connectedPlayers = players?.filter(p => p.status === 'connected') || []
    const botsToAdd = maxPlayers - connectedPlayers.length

    console.log('最大玩家数:', maxPlayers, '当前玩家数:', connectedPlayers.length, '需要添加:', botsToAdd)

    if (botsToAdd <= 0) {
      console.log('房间已满或超满')
      return { data: { addedCount: 0, message: '房间已满' }, error: null }
    }

    // 计算现有机器人数量
    const existingBots = players?.filter(p => p.is_bot === true) || []
    let botIndex = existingBots.length

    // 计算每个团队的当前人数
    const teamPlayerCounts = {}
    teams?.forEach(team => {
      teamPlayerCounts[team.id] = 0
    })
    players?.forEach(player => {
      if (player.team_id && teamPlayerCounts[player.team_id] !== undefined) {
        teamPlayerCounts[player.team_id]++
      }
    })

    console.log('团队人数分布:', teamPlayerCounts)

    // 添加机器人
    const addedBots = []
    for (let i = 0; i < botsToAdd; i++) {
      // 找到人数最少的团队
      let targetTeam = null
      let minCount = room.players_per_team + 1

      teams?.forEach(team => {
        const count = teamPlayerCounts[team.id] || 0
        if (count < minCount && count < room.players_per_team) {
          minCount = count
          targetTeam = team
        }
      })

      if (!targetTeam) {
        console.log('找不到可用的团队')
        break
      }

      const botName = BOT_NAMES[botIndex % BOT_NAMES.length]
      botIndex++

      console.log(`添加机器人 ${botIndex}: ${botName} 到团队 ${targetTeam.id}`)

      const { data: botPlayer, error: insertError } = await supabase
        .from('draw_guess_players')
        .insert({
          room_id: roomId,
          user_id: null,
          team_id: targetTeam.id,
          display_name: botName,
          status: 'connected',
          is_bot: true
        })
        .select()
        .single()

      if (insertError) {
        console.error('创建机器人失败:', insertError)
        continue
      }

      console.log('机器人添加成功:', botPlayer.id)
      addedBots.push(botPlayer)
      teamPlayerCounts[targetTeam.id]++
    }

    console.log('总共添加了', addedBots.length, '个机器人')

    return {
      data: {
        addedCount: addedBots.length,
        bots: addedBots
      },
      error: null
    }
  } catch (err) {
    console.error('一键补满机器人异常:', err)
    return { data: null, error: err.message }
  }
}
