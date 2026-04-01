/**
 * MobileUnoGame - 移动端 UNO 游戏主容器
 *
 * 负责：
 * 1. 复用 PC 端的游戏逻辑（useUnoRoom、useUnoGameState 等）
 * 2. 使用移动端优化的 UI 组件（MobileGameBoard 等）
 * 3. 处理移动端特有的限制（8 人限制等）
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROOM_STATUS } from '@/lib/uno/constants'
import { toast } from '@/hooks/useToast'
import { useUnoRoom } from '@/hooks/uno/useUnoRoom'
import { usePlayerLimitCheck } from '@/hooks/mobile/usePlayerLimitCheck'
import { createBotProfile } from '@/lib/uno/bot'
import { supabase } from '@/lib/supabase'
import MobileGameBoard from './MobileGameBoard'
import RoomLobby from '../lobby/RoomLobby'
import { Button } from '@/components/ui/button'
import { AlertCircle, Users } from 'lucide-react'


/**
 * @param {Object} props
 * @param {string} props.roomCode - 房间码
 */
export default function MobileUnoGame({ roomCode }) {
  const navigate = useNavigate()
  const [joinAttempted, setJoinAttempted] = useState(false)
  const [addingBot, setAddingBot] = useState(false)

  const {
    room,
    players,
    myPlayer,
    isHost,
    joinRoom,
    leaveRoom,
    startGame,
    refreshPlayers,
    updateScoreBoardInDB,
    loading,
    error,
  } = useUnoRoom(roomCode)

  // 移动端玩家限制检查
  const {
    isOverLimit,
    maxPlayers,
    currentPlayers,
    showWarning,
    dismissWarning,
  } = usePlayerLimitCheck(room, players)

  // 自动加入房间
  useEffect(() => {
    if (!roomCode || joinAttempted) return

    const autoJoin = async () => {
      setJoinAttempted(true)
      try {
        await joinRoom(roomCode)
      } catch (err) {
        toast.error('加入失败', err.message || '无法加入房间')
        setTimeout(() => navigate('/games'), 2000)
      }
    }

    autoJoin()
  }, [roomCode, joinAttempted, joinRoom, navigate])

  // 离开房间
  const handleLeave = async () => {
    try {
      await leaveRoom()
      navigate('/games')
    } catch (err) {
      console.error('[MobileUnoGame] 离开房间失败:', err)
      navigate('/games') // 即使失败也跳转
    }
  }

  // 开始游戏（房主）
  const handleStart = async () => {
    if (isOverLimit) {
      toast.error('玩家过多', `移动端最多支持 ${maxPlayers} 人游戏`)
      return
    }

    try {
      await startGame()
    } catch (err) {
      toast.error('开始游戏失败', err.message)
    }
  }

  // ── 添加单个机器人 ─────────────────────────────────────────────

  const handleAddBot = async () => {
    if (!room || !isHost) return
    if (players.length >= room.max_players) {
      toast.warning('房间已满', '无法再添加机器人')
      return
    }

    // 移动端限制：最多 8 人
    if (players.length >= maxPlayers) {
      toast.warning('达到移动端限制', `移动端最多支持 ${maxPlayers} 人游戏`)
      return
    }

    setAddingBot(true)
    try {
      // 找到可用座位
      const occupiedSeats = players.map((p) => p.seat_index)
      let nextSeat = 0
      while (occupiedSeats.includes(nextSeat)) nextSeat++

      // 生成机器人 UUID 和 profile
      const botUuid = crypto.randomUUID()
      const botProfile = createBotProfile(nextSeat)

      // 插入到数据库
      const { error: insertError } = await supabase
        .from('uno_players')
        .insert({
          room_id: room.id,
          user_id: botUuid,
          seat_index: nextSeat,
          is_ready: true,
        })

      if (insertError) {
        throw new Error('添加机器人失败：' + insertError.message)
      }

      // 保存到 localStorage，供前端识别
      const botMap = JSON.parse(localStorage.getItem('uno_bots') || '{}')
      botMap[botUuid] = botProfile
      localStorage.setItem('uno_bots', JSON.stringify(botMap))

      toast.success('机器人已加入', `${botProfile.nickname} 已加入房间`)

      // 刷新玩家列表
      await refreshPlayers()
    } catch (err) {
      toast.error('添加失败', err.message)
    } finally {
      setAddingBot(false)
    }
  }

  // ── 一键添加所有机器人（不超过移动端 8 人限制）───────────────

  const handleAddAllBots = async () => {
    if (!room || !isHost) return
    if (players.length >= room.max_players) {
      toast.warning('房间已满', '无法再添加机器人')
      return
    }

    setAddingBot(true)
    try {
      const occupiedSeats = players.map((p) => p.seat_index)
      // 移动端限制：最多添加到 8 人
      const targetPlayerCount = Math.min(room.max_players, maxPlayers)
      const botsToAdd = targetPlayerCount - players.length

      if (botsToAdd <= 0) {
        toast.info('已达上限', `移动端最多支持 ${maxPlayers} 人游戏`)
        return
      }

      const botMap = JSON.parse(localStorage.getItem('uno_bots') || '{}')

      // 批量创建机器人
      for (let i = 0; i < botsToAdd; i++) {
        let nextSeat = 0
        while (occupiedSeats.includes(nextSeat)) nextSeat++
        occupiedSeats.push(nextSeat)

        const botUuid = crypto.randomUUID()
        const botProfile = createBotProfile(nextSeat)

        const { error: insertError } = await supabase
          .from('uno_players')
          .insert({
            room_id: room.id,
            user_id: botUuid,
            seat_index: nextSeat,
            is_ready: true,
          })

        if (insertError) {
          throw new Error(`添加机器人 ${i + 1} 失败：${insertError.message}`)
        }

        botMap[botUuid] = botProfile
      }

      // 保存所有 Bot 信息到 localStorage
      localStorage.setItem('uno_bots', JSON.stringify(botMap))

      toast.success('机器人已加满', `已添加 ${botsToAdd} 个机器人`)

      // 刷新玩家列表
      await refreshPlayers()
    } catch (err) {
      toast.error('添加失败', err.message)
    } finally {
      setAddingBot(false)
    }
  }

  // ── 从 localStorage 识别 Bot 玩家并补充 profile ──────────────

  const botMap = JSON.parse(localStorage.getItem('uno_bots') || '{}')
  const enrichedPlayers = players.map((p) => {
    if (botMap[p.user_id]) {
      return {
        ...p,
        profiles: botMap[p.user_id],
        isBot: true,
      }
    }
    return p
  })

  // ── 机器人玩家 ID 列表 ────────────────────────────────────────
  const botPlayerIds = Object.keys(botMap).filter((id) =>
    players.some((p) => p.user_id === id)
  )

  // ── 加载中 ───────────────────────────────────────────────────

  if (loading || !room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在推开房间大门...</p>
        </div>
      </div>
    )
  }

  // ── 错误状态 ─────────────────────────────────────────────────

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100 p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">哎呀，进不去房间</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => navigate('/games')}>
            返回游戏大厅
          </Button>
        </div>
      </div>
    )
  }

  // ── 玩家数量警告（超过 8 人）──────────────────────────────────

  const PlayerLimitWarning = showWarning && isOverLimit && (
    <div className="fixed top-0 left-0 right-0 bg-yellow-100 border-b-2 border-yellow-400 p-4 z-50">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-yellow-700 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-yellow-900">玩家数量过多</h3>
          <p className="text-sm text-yellow-800 mt-1">
            当前房间有 {currentPlayers} 位玩家，移动端最多支持 {maxPlayers} 人游戏。
            建议部分玩家离开或使用电脑端进行游戏。
          </p>
        </div>
        <button
          onClick={dismissWarning}
          className="text-yellow-700 hover:text-yellow-900 font-bold text-lg"
        >
          ×
        </button>
      </div>
    </div>
  )

  // ── 根据房间状态渲染不同界面 ──────────────────────────────────

  return (
    <>
      {PlayerLimitWarning}

      {room.status === ROOM_STATUS.WAITING && (
        <div className="min-h-screen bg-gradient-to-br from-purple-100 to-pink-100">
          {/* 使用共享大厅组件，传入机器人功能 */}
          <RoomLobby
            room={room}
            players={enrichedPlayers}
            myPlayer={myPlayer}
            isHost={isHost}
            startGame={handleStart}
            leaveRoom={handleLeave}
            handleAddBot={handleAddBot}
            handleAddAllBots={handleAddAllBots}
            addingBot={addingBot}
          />

          {/* 移动端玩家数量超限提示 */}
          {isOverLimit && (
            <div className="fixed bottom-20 left-4 right-4 bg-red-100 border-2 border-red-400 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-red-700" />
                <span className="font-semibold text-red-900">玩家数量超限</span>
              </div>
              <p className="text-sm text-red-800">
                移动端最多支持 {maxPlayers} 人游戏，当前 {currentPlayers} 人。
                请部分玩家离开后再开始游戏。
              </p>
            </div>
          )}
        </div>
      )}

      {(room.status === ROOM_STATUS.PLAYING || room.status === ROOM_STATUS.FINISHED) && (
        <MobileGameBoard
          room={room}
          players={enrichedPlayers}
          myPlayer={myPlayer}
          isHost={isHost}
          botPlayerIds={botPlayerIds}
          updateScoreBoardInDB={updateScoreBoardInDB}
          onLeave={handleLeave}
        />
      )}
    </>
  )
}
