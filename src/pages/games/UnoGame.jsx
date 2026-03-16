 /**
 * UnoGame - UNO 游戏路由入口页
 *
 * 负责：
 * 1. 从 URL 获取 roomCode
 * 2. 未登录时跳转注册/登录（携带 redirect）
 * 3. 已登录时自动加入房间
 * 4. 根据 room.status 分发到 Lobby / GameBoard
 * 5. 没有 roomCode 时显示创建房间入口
 */

import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '@/store/AuthContext'
import { useUnoRoom } from '@/hooks/uno/useUnoRoom'
import { ROOM_STATUS } from '@/lib/uno/constants'
import { toast } from '@/hooks/useToast'
import { supabase } from '@/lib/supabase'
import { createBotProfile } from '@/lib/uno/bot'
import { Loader2, Plus, Link, Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import RoomLobby from '@/components/uno/lobby/RoomLobby'
import GameBoard from '@/components/uno/game/GameBoard'
import UnoLoadingScreen from '@/components/uno/game/UnoLoadingScreen'
import ExitAnimation from '@/components/uno/shared/ExitAnimation'
import { useLandscapeMode, LandscapeGameLayout, LandscapeCardLayout } from '@/components/common/LandscapeMode'

export default function UnoGame() {
  const { roomCode } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()

  // ── 未登录处理 ───────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
      </div>
    )
  }

  if (!user) {
    // 跳转到登录页，携带当前路径作为 redirect
    const currentPath = roomCode
      ? `/games/uno/room/${roomCode}`
      : '/games/uno'
    const encodedRedirect = encodeURIComponent(currentPath)
    return <Navigate to={`/login?redirect=${encodedRedirect}`} replace />
  }

  // ── 已登录 ─────────────────────────────────────────────────

  return roomCode ? (
    <UnoRoomPage roomCode={roomCode} />
  ) : (
    <UnoHomePage />
  )
}

// ─────────────────────────────────────────────────────────────
// 有房间码：加入/显示房间
// ─────────────────────────────────────────────────────────────

function UnoRoomPage({ roomCode }) {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [joinAttempted, setJoinAttempted] = useState(false)
  const [addingBot, setAddingBot] = useState(false)
  // 进入房间 / 游戏开始 的加载动画是否已播完（onFinished 回调后才为 true）
  const [roomLoadingAnimDone, setRoomLoadingAnimDone] = useState(false)
  // 游戏正在启动（WAITING→PLAYING 过渡动画）
  const [gameStarting, setGameStarting] = useState(false)
  // 上一次的 room.status，用于检测状态变化
  const prevRoomStatusRef = useRef(null)
  // 游戏局数计数器，用于强制 GameBoard 重新挂载
  const [gameRound, setGameRound] = useState(0)
  // 加载覆盖层是否显示（与 roomLoadingAnimDone 分离，避免淡出被打断）
  // true = 需要显示加载覆盖层（组件挂载）
  // false = 加载动画已完全结束，可以 unmount
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(true)
  // 外层加载覆盖层是否已完全淡出（onFinished 回调后才为 true）
  // GameBoard 监听此值，淡出后才真正激活 GameOpeningOrchestrator
  const [loadingScreenFaded, setLoadingScreenFaded] = useState(false)
  // 正在离开：防止 Realtime 推送 room.status 变化后内容区消失导致白屏
  // 一旦触发 LeaveAnimation 就锁定，导航完成后随组件卸载自动清除
  const [isLeaving, setIsLeaving] = useState(false)
  // 离开完成：leaveRoom + 动画都结束，触发 navigate
  // 用 useEffect 而不是直接在回调里 navigate，避免在组件渲染期间调用 navigate
  const [leaveDone, setLeaveDone] = useState(false)

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

  // ── 手机端横屏锁定：只在游戏阶段启用 ─────────────────────────────────────
  // 大厅阶段 (WAITING) 不启用横屏，游戏阶段 (PLAYING/FINISHED) 才启用
  const isGamePhase = room && (room.status === ROOM_STATUS.PLAYING || room.status === ROOM_STATUS.FINISHED)
  const { isLandscape, showPrompt: showLandscapePrompt, isMobile, enterFullscreen } = useLandscapeMode({ enabled: !!isGamePhase })

  // 监听 leaveDone → 跳转到大厅（不依赖 room 是否存在）
  useEffect(() => {
    if (leaveDone) {
      navigate('/games')
    }
  }, [leaveDone, navigate])

  // handleLeaveRoom：LeaveAnimation 调用的实际离开函数（必须在 useUnoRoom 之后定义）
  const handleLeaveRoom = async () => {
    try {
      await leaveRoom()
    } catch (err) {
      console.error('[UnoGame] leaveRoom 失败:', err)
      // 即使失败也继续跳转
    }
  }

  // 大厅离开：触发 isLeaving，LeaveAnimation 在 UnoRoomPage 层播放，完成后 navigate
  const handleLobbyLeave = () => {
    setIsLeaving(true)
  }

  // ── 自动加入房间 ─────────────────────────────────────────────

  useEffect(() => {
    if (!user || !roomCode || joinAttempted) return

    const autoJoin = async () => {
      setJoinAttempted(true)
      try {
        await joinRoom(roomCode)
      } catch (err) {
        toast.error('加入失败', err.message || '无法加入房间')
        // 2 秒后跳转游戏大厅
        setTimeout(() => navigate('/games'), 2000)
      }
    }

    autoJoin()
  }, [user, roomCode, joinAttempted])

  // ── 监听 room.status 变化：WAITING→PLAYING 时触发游戏开始动画 ─
  useEffect(() => {
    if (!room) return
    const prev = prevRoomStatusRef.current
    const curr = room.status
    prevRoomStatusRef.current = curr
    // 初始化：仅记录，不触发
    if (prev === null || prev === undefined) {
      // 断线重连场景：房间初始状态已是 PLAYING/FINISHED，跳过加载动画直接显示游戏
      if (curr === ROOM_STATUS.PLAYING || curr === ROOM_STATUS.FINISHED) {
        setRoomLoadingAnimDone(true)
        setLoadingScreenFaded(true)
        setShowLoadingOverlay(false)
      }
      return
    }
    // WAITING → PLAYING：触发游戏开始过渡动画
    if (prev === ROOM_STATUS.WAITING && (curr === ROOM_STATUS.PLAYING || curr === ROOM_STATUS.FINISHED)) {
      setRoomLoadingAnimDone(false)
      setGameStarting(true)
      setShowLoadingOverlay(true)   // 重新挂载覆盖层
      setLoadingScreenFaded(false)  // 重置：新一轮加载覆盖层尚未淡出
      setGameRound(r => r + 1)      // 新游戏局数，强制 GameBoard 重新挂载
    }
    // PLAYING/FINISHED → WAITING：游戏结束返回房间，重置状态
    if ((prev === ROOM_STATUS.PLAYING || prev === ROOM_STATUS.FINISHED) && curr === ROOM_STATUS.WAITING) {
      setRoomLoadingAnimDone(false)
      setGameStarting(false)
      setShowLoadingOverlay(true)
      setLoadingScreenFaded(false)
    }
  }, [room?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 添加机器人玩家 ───────────────────────────────────────────

  const handleAddBot = async () => {
    if (!room || !isHost) return
    if (players.length >= room.max_players) {
      toast.warning('房间已满', '无法再添加机器人')
      return
    }

    setAddingBot(true)
    try {
      // 找到可用座位
      const occupiedSeats = players.map((p) => p.seat_index)
      let nextSeat = 0
      while (occupiedSeats.includes(nextSeat)) nextSeat++

      // Bot 使用特殊的 user_id（以 bot_ 开头）
      const botId = `bot_${Date.now()}_${nextSeat}`
      const botProfile = createBotProfile(nextSeat)

      // 先在 profiles 表插入 Bot 用户（如果有外键约束则需要）
      // 实际上 bot_ 开头的 ID 不是真实的 auth.uid()，
      // 所以我们需要直接用 service role 或者跳过 RLS
      // 简化方案：把机器人存储在房间的本地状态，不入库
      // 使用 supabase 的 insert 尝试，如果失败则用本地模式

      // 注意：由于 RLS 要求 user_id 是真实用户，Bot 需要绕过
      // 我们先尝试插入，利用 anon key 插入可能会 RLS 失败
      // 因此改用：在 uno_players 表中以房主身份插入 Bot 记录
      // 需要在 RLS 策略中允许房主插入其他玩家

      // 简化方案：直接用 upsert，user_id 使用真实格式的 uuid
      // 这里我们生成一个客户端 uuid 给 Bot
      const botUuid = crypto.randomUUID()

      const { error: insertError } = await supabase
        .from('uno_players')
        .insert({
          room_id: room.id,
          user_id: botUuid,
          seat_index: nextSeat,
          is_ready: true,
          // 注：profiles 表中没有这个 bot 用户，但我们在显示时通过 isBot 标记处理
        })

      if (insertError) {
        throw new Error('添加机器人失败：' + insertError.message)
      }

      // 将 Bot 信息存到 localStorage，供前端识别
      const botMap = JSON.parse(localStorage.getItem('uno_bots') || '{}')
      botMap[botUuid] = botProfile
      localStorage.setItem('uno_bots', JSON.stringify(botMap))

      toast.success('机器人已加入', `${botProfile.nickname} 已加入房间`)

      // 立即刷新玩家列表（不完全依赖 Realtime）
      await refreshPlayers()
    } catch (err) {
      toast.error('添加失败', err.message)
    } finally {
      setAddingBot(false)
    }
  }

  // ── 一键添加所有机器人（补全除人类玩家外的所有位置）─────────────

  const handleAddAllBots = async () => {
    if (!room || !isHost) return
    if (players.length >= room.max_players) {
      toast.warning('房间已满', '无法再添加机器人')
      return
    }

    setAddingBot(true)
    try {
      const occupiedSeats = players.map((p) => p.seat_index)
      const botsToAdd = room.max_players - players.length
      const botProfiles = []
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
        botProfiles.push(botProfile.nickname)
      }

      // 保存所有 Bot 信息到 localStorage
      localStorage.setItem('uno_bots', JSON.stringify(botMap))

      toast.success('机器人已加满', `已添加 ${botsToAdd} 个机器人`)

      // 立即刷新玩家列表
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

  // 机器人 user_id 列表
  const botPlayerIds = Object.keys(botMap).filter((id) =>
    players.some((p) => p.user_id === id)
  )

  // 数据就绪信号
  const isRoomReady = !loading && !!room

  // ── 渲染分层策略 ──────────────────────────────────────────────
  // showLoadingOverlay：UnoLoadingScreen 覆盖层是否挂载
  //   - 初始 true，只在 onFinished（动画淡出完成）后才设为 false
  //   - 这样 unmount 时动画已经不可见，不会有打断感
  //
  // showContent：游戏内容区是否渲染
  //   - 进入房间首次：动画淡出完成后才渲染（roomLoadingAnimDone）
  //   - WAITING→PLAYING 过渡：GameBoard 提前在下层渲染，
  //     UnoLoadingScreen 在上层覆盖，淡出完成后移除覆盖层
  //     这样游戏数据在动画播放期间就能并行加载，消除黑屏间隙
  const showContent = roomLoadingAnimDone

  // ── 加入失败错误界面 ─────────────────────────────────────────
  if (error && !room) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md w-full">
          <div className="text-6xl mb-4">😵</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">加入失败</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button
            onClick={() => navigate('/games')}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            返回游戏大厅
          </Button>
        </Card>
      </div>
    )
  }

  // ── 统一 return：UnoLoadingScreen 与内容层共存，避免重挂载 ───
  return (
    <LandscapeGameLayout
      showPrompt={showLandscapePrompt}
      isMobile={isMobile}
      gameName="UNO"
      accentColor="purple"
      enterFullscreen={enterFullscreen}
    >
      {/* 进入房间 / 游戏开始 加载动画：挂载后不提前 unmount，等动画自己淡出完成 */}
      {showLoadingOverlay && (
        <UnoLoadingScreen
          loadingText={
            gameStarting
              ? '游戏启动中...'
              : `正在进入房间 ${roomCode}...`
          }
          // gameStarting 模式：数据已就绪（GameBoard 已提前挂载）立即冲刺
          // 正常进入模式：等 isRoomReady 后冲刺
          isComplete={gameStarting ? true : isRoomReady}
          onFinished={() => {
            // onFinished 时，UnoLoadingScreen 内部已完成 300ms 淡出，完全不可见
            setRoomLoadingAnimDone(true)
            setGameStarting(false)
            setShowLoadingOverlay(false)
            // ✅ 关键：标记加载覆盖层已淡出 → GameBoard 开始淡入 + 激活 Orchestrator
            setLoadingScreenFaded(true)
          }}
        />
      )}

      {/* ── 内容区 ────────────────────────────────────────────── */}

      {/* 等待室：动画完全结束后才渲染，isLeaving 时卸载（LeaveAnimation 接管画面）*/}
      {showContent && room?.status === ROOM_STATUS.WAITING && !isLeaving && (
        <RoomLobby
          room={room}
          players={enrichedPlayers}
          isHost={isHost}
          myPlayer={myPlayer}
          startGame={startGame}
          leaveRoom={handleLobbyLeave}
          handleAddBot={handleAddBot}
          handleAddAllBots={handleAddAllBots}
          addingBot={addingBot}
        />
      )}

      {/* 离开动画：提升到 UnoRoomPage 层，独立于 GameBoard
          leaveRoom 后 room 变 null、GameBoard 消失也不影响动画播放
          动画 + leaveRoom 都完成后 setLeaveDone(true) → useEffect → navigate */}
      {isLeaving && (
        <ExitAnimation
          leaveAction={handleLeaveRoom}
          onDone={() => setLeaveDone(true)}
        />
      )}

      {/* 游戏桌面：
          - 正常首次进入（非 gameStarting）：动画结束后才渲染（showContent）
          - gameStarting 过渡期：提前挂载在覆盖层下方，游戏数据并行加载，
            等动画淡出完成、覆盖层 unmount 后无缝衔接，消除黑屏间隙
          - isLeaving 时不渲染：LeaveAnimation 已接管屏幕，GameBoard 可以安全卸载 */}
      {(showContent || gameStarting) && room && !isLeaving &&
        (room.status === ROOM_STATUS.PLAYING || room.status === ROOM_STATUS.FINISHED) && (
        <GameBoard
          key={gameRound}
          onLeaveStart={() => setIsLeaving(true)}
          room={room}
          players={enrichedPlayers}
          isHost={isHost}
          leaveRoom={leaveRoom}
          botPlayerIds={botPlayerIds}
          updateScoreBoardInDB={updateScoreBoardInDB}
          skipLoadingAnim={true}
          outerLoadingDone={!showLoadingOverlay}
          // ✅ 告知 GameBoard：加载覆盖层已淡出，可以开始发牌/翻牌动画了
          loadingScreenFaded={loadingScreenFaded}
        />
      )}
    </LandscapeGameLayout>
  )
}

// ─────────────────────────────────────────────────────────────
// 没有房间码：创建房间 / 输入房间码加入
// ─────────────────────────────────────────────────────────────

function UnoHomePage() {
  const navigate = useNavigate()
  const { createRoom, loading, error } = useUnoRoom(null)
  const [joinCode, setJoinCode] = useState('')
  const [creating, setCreating] = useState(false)
  const [showPlayerSelect, setShowPlayerSelect] = useState(false)
  const [selectedPlayers, setSelectedPlayers] = useState(2)

  // ── 创建房间阶段不启用横屏 ─────────────────────────────────────────────
  const { showPrompt: showLandscapePrompt, isLandscape, isMobile, enterFullscreen } = useLandscapeMode({ enabled: false })

  const handleCreateRoom = async () => {
    setCreating(true)
    try {
      const code = await createRoom(selectedPlayers)
      navigate(`/games/uno/room/${code}`, { replace: true })
    } catch (err) {
      toast.error('创建失败', err.message || '无法创建房间')
    } finally {
      setCreating(false)
    }
  }

  // 人数选择界面
  if (showPlayerSelect) {
    return (
      <LandscapeCardLayout
        showPrompt={showLandscapePrompt}
        isMobile={isMobile}
        isLandscape={isLandscape}
        gameName="UNO"
        accentColor="purple"
        enterFullscreen={enterFullscreen}
      >
        <div className="w-full max-w-md space-y-6">
          {/* 标题 */}
          <div className="text-center">
            <div className="text-7xl mb-4">🃏</div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">UNO</h1>
            <p className="text-gray-600 mb-2">选择游戏人数</p>
            <p className="text-sm text-gray-500">支持 2-10 人游玩 · 7人及以上使用双副牌</p>
          </div>

          {/* 人数选择卡片 */}
          <Card className="p-8">
            {/* 数字选择按钮 */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-4">
                选择人数（2-10）
              </label>
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: 9 }, (_, i) => i + 2).map((num) => (
                  <button
                    key={num}
                    onClick={() => setSelectedPlayers(num)}
                    className={`py-2.5 px-1 rounded-lg font-bold text-base transition-all border-2 ${
                      selectedPlayers === num
                        ? 'bg-purple-600 text-white border-purple-600 scale-110 shadow-lg'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* 当前选择显示 */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 mb-6 text-center border border-purple-200">
              <p className="text-sm text-gray-600 mb-1">当前选择</p>
              <p className="text-3xl font-bold text-purple-600">{selectedPlayers} 人</p>
              <p className="text-xs text-gray-500 mt-2">
                {selectedPlayers === 2 && '💪 1v1 巅峰对决'}
                {selectedPlayers === 3 && '⚔️ 三人混战'}
                {selectedPlayers === 4 && '🎮 经典四人模式'}
                {selectedPlayers === 5 && '🎯 五人混战'}
                {selectedPlayers === 6 && '🌟 六人大乱斗'}
                {selectedPlayers === 7 && '🔥 七人豪华局 · 双副牌'}
                {selectedPlayers === 8 && '👑 八人终极混战 · 双副牌'}
                {selectedPlayers === 9 && '🚀 九人史诗乱斗 · 双副牌'}
                {selectedPlayers === 10 && '🌋 十人极限派对 · 双副牌'}
              </p>
            </div>

            {/* 操作按钮 */}
            <div className="space-y-2">
              <Button
                onClick={handleCreateRoom}
                disabled={creating}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white h-12 font-semibold"
              >
                {creating ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    创建中...
                  </>
                ) : (
                  <>
                    <Plus className="h-5 w-5 mr-2" />
                    创建 {selectedPlayers} 人房间
                  </>
                )}
              </Button>

              <Button
                onClick={() => setShowPlayerSelect(false)}
                variant="outline"
                className="w-full"
              >
                返回
              </Button>
            </div>
          </Card>

          {/* 提示信息 */}
          <div className="text-center text-xs text-gray-500 px-4">
            💡 选择人数后点击"创建房间"，邀请朋友或添加机器人开始游戏
          </div>
        </div>
      </LandscapeCardLayout>
    )
  }

  const handleJoinRoom = () => {
    const code = joinCode.trim().toUpperCase()
    if (!code || code.length !== 6) {
      toast.warning('邀请码格式错误', '请输入 6 位邀请码')
      return
    }
    navigate(`/games/uno/room/${code}`)
  }

  return (
    <LandscapeCardLayout
      showPrompt={showLandscapePrompt}
      isMobile={isMobile}
      isLandscape={isLandscape}
      gameName="UNO"
      accentColor="purple"
      enterFullscreen={enterFullscreen}
    >
      <div className="w-full max-w-md space-y-6">
        {/* 标题 */}
        <div className="text-center">
          <div className="text-7xl mb-4">🃏</div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">UNO</h1>
          <p className="text-gray-500">邀请朋友一起玩 UNO！</p>
        </div>

        {/* 创建房间 */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Plus className="h-5 w-5 text-purple-600" />
            创建新房间
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            创建房间后，将邀请链接发给朋友，支持 2-10 人游玩
          </p>
          <Button
            onClick={() => setShowPlayerSelect(true)}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white h-12 font-semibold"
          >
            <Plus className="h-5 w-5 mr-2" />
            创建房间
          </Button>
        </Card>

        {/* 加入房间 */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Link className="h-5 w-5 text-blue-600" />
            加入已有房间
          </h2>
          <div className="flex gap-2">
            <Input
              placeholder="输入 6 位邀请码"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
              maxLength={6}
              className="font-mono text-lg tracking-wider text-center"
            />
            <Button
              onClick={handleJoinRoom}
              disabled={joinCode.length < 6}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6"
            >
              加入
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
            邀请码为 6 位大写字母或数字
          </p>
        </Card>

        {/* 返回按钮 */}
        <div className="text-center">
          <button
            onClick={() => navigate('/games')}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            ← 返回游戏大厅
          </button>
        </div>
      </div>
    </LandscapeCardLayout>
  )
}
