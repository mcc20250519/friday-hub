/**
 * DrawAndGuessGame - 你说我猜游戏路由入口页
 *
 * 负责：
 * 1. 从 URL 获取 roomCode
 * 2. 未登录时跳转注册/登录（携带 redirect）
 * 3. 已登录时显示游戏内容
 * 4. 根据 room.status 分发到 Lobby / Game
 */

import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '@/store/AuthContext'
import { useDrawAndGuessGame } from '@/hooks/draw-guess/useDrawAndGuessGame'
import { toast } from '@/hooks/useToast'
import { Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  DrawAndGuessLobby, 
  DrawAndGuessGame as GameComponent 
} from '@/components/draw-guess'

export default function DrawAndGuessGamePage() {
  const { roomCode } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()

  // 未登录处理
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-10 w-10 animate-spin text-orange-600" />
      </div>
    )
  }

  if (!user) {
    // 跳转到登录页，携带当前路径作为 redirect
    const currentPath = roomCode
      ? `/games/draw-and-guess/room/${roomCode}`
      : '/games/draw-and-guess'
    const encodedRedirect = encodeURIComponent(currentPath)
    return <Navigate to={`/login?redirect=${encodedRedirect}`} replace />
  }

  // 已登录 - 总是使用同一个 gameHook 实例
  return <DrawAndGuessGameContainer roomCode={roomCode} userId={user.id} />
}

// ─────────────────────────────────────────────────────────────
// 游戏容器 - 统一管理 gameHook 状态
// ─────────────────────────────────────────────────────────────

function DrawAndGuessGameContainer({ roomCode, userId }) {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [joinAttempted, setJoinAttempted] = useState(false)
  const [joinError, setJoinError] = useState(null)

  // 使用游戏 Hook - 只创建一次实例
  const gameHook = useDrawAndGuessGame(userId)

  // 当有 roomCode 时自动加入房间
  useEffect(() => {
    if (!roomCode) {
      // 没有 roomCode 时重置加入状态
      setJoinAttempted(false)
      setJoinError(null)
      return
    }

    // 如果已经有房间数据且房间码匹配，不需要重新加入
    if (gameHook.room && gameHook.room.room_code === roomCode) {
      return
    }

    // 如果已经尝试过加入，不再重复
    if (joinAttempted) return

    const autoJoin = async () => {
      setJoinAttempted(true)
      // 使用 profile 中的昵称，或者邮箱前缀，或者“匿名玩家”
      const displayName = profile?.nickname || '匿名玩家'
      const result = await gameHook.joinRoom(roomCode, displayName)
      if (result.error) {
        // 如果是“已经在房间里”的错误，忽略它
        if (!result.error.includes('已经在房间') && !result.error.includes('已加入')) {
          setJoinError(result.error)
          toast.error('加入失败', result.error)
        }
      }
    }

    autoJoin()
  }, [roomCode, joinAttempted, gameHook.room, profile?.nickname, userId])

  // 处理创建房间
  const handleCreateRoom = async (config) => {
    const result = await gameHook.createRoom(config)

    if (result.error) {
      toast.error('创建失败', result.error)
    } else if (result.data?.room_code) {
      // 创建成功后导航到房间 URL
      navigate(`/games/draw-and-guess/room/${result.data.room_code}`, { replace: true })
    } else {
      toast.error('创建失败', '房间数据异常')
      console.error('createRoom result:', result)
    }
  }

  // 处理加入房间
  const handleJoinRoom = async (data) => {
    const result = await gameHook.joinRoom(data.roomCode, data.displayName)

    if (result.error) {
      toast.error('加入失败', result.error)
    } else {
      navigate(`/games/draw-and-guess/room/${data.roomCode}`, { replace: true })
    }
  }

  // 默认昵称优先使用 profile.nickname，否则使用邮箱前缀或“匿名玩家”
  const defaultNickname = profile?.nickname || '匿名玩家'

  // 如果有 roomCode，显示房间内容
  if (roomCode) {
    // 加入失败界面
    if (joinError && !gameHook.room) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="p-8 text-center max-w-md w-full">
            <div className="text-6xl mb-4">😰</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">哎呀，进不去房间</h2>
            <p className="text-gray-600 mb-6">{joinError}</p>
            <Button
              onClick={() => navigate('/games/draw-and-guess')}
              className="bg-gradient-to-r from-orange-500 to-pink-500 text-white"
            >
              返回大厅
            </Button>
          </Card>
        </div>
      )
    }

    // 加载中
    if (gameHook.isLoading && !gameHook.room) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-yellow-50 to-pink-50">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-orange-600 mx-auto mb-4" />
            <p className="text-gray-600">正在加入房间...</p>
          </div>
        </div>
      )
    }

    // 游戏主界面
    return <GameComponent gameHook={gameHook} />
  }

  // 没有 roomCode，显示大厅
  return (
    <DrawAndGuessLobby
      onCreateRoom={handleCreateRoom}
      onJoinRoom={handleJoinRoom}
      isLoading={gameHook.isLoading}
      defaultNickname={defaultNickname}
    />
  )
}
