/**
 * MobileUnoGame - 移动端 UNO 游戏主容器
 * 
 * 负责：
 * 1. 复用 PC 端的游戏逻辑（useUnoRoom、useUnoGameState 等）
 * 2. 使用移动端优化的 UI 组件（MobileGameBoard、MobileHandCards 等）
 * 3. 处理移动端特有的限制（8 人限制、横屏提示等）
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROOM_STATUS } from '@/lib/uno/constants'
import { toast } from '@/hooks/useToast'
import { useUnoRoom } from '@/hooks/uno/useUnoRoom'
import { usePlayerLimitCheck } from '@/hooks/mobile/usePlayerLimitCheck'
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

  const {
    room,
    players,
    myPlayer,
    isHost,
    joinRoom,
    leaveRoom,
    startGame,
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

  // 加载中
  if (loading || !room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  // 错误状态
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100 p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">加载失败</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => navigate('/games')}>
            返回游戏大厅
          </Button>
        </div>
      </div>
    )
  }

  // 玩家数量警告（超过 8 人）
  const PlayerLimitWarning = showWarning && isOverLimit && (
    <div className="fixed top-0 left-0 right-0 bg-yellow-100 border-b-2 border-yellow-400 p-4 z-50">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-yellow-700 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-yellow-900">玩家数量过多</h3>
          <p className="text-sm text-yellow-800 mt-1">
            当前房间有 {currentPlayers} 位玩家,移动端最多支持 {maxPlayers} 人游戏。
            建议部分玩家离开或使用电脑端进行游戏。
          </p>
        </div>
        <button
          onClick={dismissWarning}
          className="text-yellow-700 hover:text-yellow-900 font-bold"
        >
          ×
        </button>
      </div>
    </div>
  )

  // 根据房间状态渲染不同界面
  return (
    <>
      {PlayerLimitWarning}
      
      {room.status === ROOM_STATUS.WAITING && (
        <div className="min-h-screen bg-gradient-to-br from-purple-100 to-pink-100">
          {/* 移动端大厅 */}
          <RoomLobby
            room={room}
            players={players}
            myPlayer={myPlayer}
            isHost={isHost}
            onStartGame={handleStart}
            onLeaveRoom={handleLeave}
            onAddBot={null} // 移动端暂不支持添加机器人
          />
          
          {/* 移动端玩家限制提示 */}
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
          players={players}
          myPlayer={myPlayer}
          onLeave={handleLeave}
        />
      )}
    </>
  )
}
