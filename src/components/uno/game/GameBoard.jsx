/**
 * GameBoard - 游戏桌面容器（整合所有游戏组件）
 * Phase 5: 加入断线重连、玩家退出处理、页面标题闪烁、游戏内通知
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { LogOut, WifiOff } from 'lucide-react'
import { toast } from '@/hooks/useToast'
import { useAuth } from '@/store/AuthContext'
import { supabase } from '@/lib/supabase'
import { useUnoGameState } from '@/hooks/uno/useUnoGameState'
import { useUnoActions } from '@/hooks/uno/useUnoActions'
import { useUnoBot } from '@/hooks/uno/useUnoBot'
import { getDisplayName } from '@/hooks/uno/useUnoRoom'
import { CARD_TYPES, ROOM_STATUS, COLOR_NAMES, GAME_MODES, SCORING_MODES } from '@/lib/uno/constants'
import { calculateRoundScore, updateScoreBoard, createEmptyScoreBoard } from '@/lib/uno/scoring'
import CenterPile from './CenterPile'
import PlayerHand from './PlayerHand'
import OpponentArea from './OpponentArea'
import TurnIndicator from './TurnIndicator'
import GameResult from './GameResult'
import GameToast, { useGameToast } from '../shared/GameToast'
import FlyingCard from './FlyingCard'
import UnoLoadingScreen from './UnoLoadingScreen'
import UnoWinAnimation from './UnoWinAnimation'
import UnoGameOverAnimation from './UnoGameOverAnimation'
import GameOpeningOrchestrator from './GameOpeningOrchestrator'
import UnoButton from './UnoButton'
import RankNotification, { useRankNotification } from './RankNotification'

/**
 * 检测是否为移动设备
 */
function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || (window.matchMedia && window.matchMedia('(max-width: 768px)').matches)
}

/**
 * 检测是否为横屏
 */
function isLandscapeOrientation() {
  return window.innerWidth > window.innerHeight
}

// 游戏区域设计基准尺寸（PC 端标准）
const DESIGN_WIDTH = 1024
const DESIGN_HEIGHT = 614

/**
 * Hook: 计算游戏区域自适应缩放
 * 
 * 返回：
 * - scale: 缩放比例（移动端横屏时 < 1，其他情况 = 1）
 * - gameAreaWidth: 游戏区域宽度（设计尺寸）
 * - gameAreaHeight: 游戏区域高度（设计尺寸）
 * - isMobile: 是否移动设备
 * - containerStyle: 外层容器样式（用于居中缩放后的游戏区域）
 */
function useGameAreaSize() {
  const [scale, setScale] = useState(1)
  const isMobile = isMobileDevice()

  useEffect(() => {
    if (!isMobile) {
      setScale(1)
      return
    }

    const calculateScale = () => {
      const vh = window.innerHeight
      const vw = window.innerWidth
      const isLandscape = vw > vh

      if (isLandscape) {
        // 横屏模式：计算等比缩放
        // 可用区域：视口高度 - 顶部栏(60px) - 内边距(32px)
        const headerHeight = 60
        const padding = 32
        const availableHeight = vh - headerHeight - padding
        const availableWidth = vw - padding

        // 计算宽高缩放比，取较小值确保内容完整显示
        const scaleX = availableWidth / DESIGN_WIDTH
        const scaleY = availableHeight / DESIGN_HEIGHT
        const newScale = Math.min(scaleX, scaleY, 1) // 不放大，最多原始尺寸

        setScale(newScale)
      } else {
        // 竖屏模式：不缩放
        setScale(1)
      }
    }

    calculateScale()
    window.addEventListener('resize', calculateScale)
    window.addEventListener('orientationchange', calculateScale)

    return () => {
      window.removeEventListener('resize', calculateScale)
      window.removeEventListener('orientationchange', calculateScale)
    }
  }, [isMobile])

  return {
    scale,
    gameAreaWidth: DESIGN_WIDTH,
    gameAreaHeight: DESIGN_HEIGHT,
    isMobile,
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 动画引擎集成示例（可选）
// 
// 如需使用统一的动画引擎，可取消注释以下代码：
// 
// import useAnimationEngine, { ANIMATION_SCENES } from '@/hooks/uno/useAnimationEngine'
// 
// 在组件内：
// const { 
//   playAnimation,      // 播放动画
//   skipAnimation,      // 跳过动画
//   isLocked: engineLocked,  // 引擎管理的交互锁
//   currentScene,       // 当前场景
//   AnimationRenderer,  // 动画渲染组件
// } = useAnimationEngine({
//   exitText: 'BYE',    // 可自定义退出文字
//   rankColors: {       // 可自定义名次颜色
//     first: '#FFD700',
//     second: '#C0C0C0',
//     third: '#CD7F32',
//   },
// })
// 
// 使用方式：
// - 退出房间：playAnimation(ANIMATION_SCENES.ROOM_EXIT, { leaveAction, onDone })
// - 名次通知：playAnimation(ANIMATION_SCENES.RANK_NOTIFY, { notifications })
// 
// 渲染动画：
// <AnimationRenderer />
// 
// 交互锁整合：
// const effectiveLocked = interactionLocked || engineLocked
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @param {Object} props
 * @param {Object} props.room - 房间数据
 * @param {Array} props.players - 玩家列表
 * @param {boolean} props.isHost - 是否是房主
 * @param {Function} props.leaveRoom - 离开房间函数
 */
export default function GameBoard({ room, players, isHost, leaveRoom, botPlayerIds: botPlayerIdsProp = [], updateScoreBoardInDB, skipLoadingAnim = false, outerLoadingDone = false, onOpeningReady, loadingScreenFaded = true, onLeaveStart, onLeaveDone }) {
  const navigate = useNavigate()
  const { user } = useAuth()

  // ── 游戏区域自适应缩放（移动端横屏）───────────────────────────
  const { scale, gameAreaWidth, gameAreaHeight, isMobile } = useGameAreaSize()

  // 游戏模式：优先取 room.game_mode（数据库权威），缺失时从 localStorage 兜底
  // 防止刷新/加载竞态导致模式回退为 standard
  const resolvedGameMode = room.game_mode
    || localStorage.getItem(`uno_game_mode_${room.id}`)
    || undefined

  // 计分模式：优先取 room.scoring_mode，缺失时从 localStorage 兜底
  const resolvedScoringMode = room.scoring_mode
    || localStorage.getItem(`uno_scoring_mode_${room.id}`)
    || SCORING_MODES.BASIC

  // 当前计分板（来自 room.score_board，Realtime 同步）
  const scoreBoard = room.score_board || null

  const {
    gameState,
    myHand,
    opponents,
    topCard,
    currentColor,
    isMyTurn,
    direction,
    pendingDrawCount,
    winnerId,
    myUnoCalled,
    unoCalled,
    gameMode,      // 当前游戏模式
    rankList,      // 排名列表（娱乐版）
    myIsFinished,  // 我是否已出完牌（娱乐版）
    playerIds,
    firstPlayerId,    // 先手玩家 ID（游戏开始时展示提示）
    needsColorPick,   // Wild 起始牌待选色（值为需选色的玩家 ID）
    openingData,      // 开场动画数据（发牌/比牌信息）
    // PRD: UNO 窗口状态
    unoWindowOpen,
    unoWindowOwner,
    reportedThisWindow,
    myUnoWindowOpen,
    loading: stateLoading,
    error: stateError,
    initializeGameState,
    fetchGameState,
    setGameState,
    subscribeToGameState,  // 断线重连时重新订阅
  } = useUnoGameState(room.id, players, resolvedGameMode)

  const {
    playCard,
    drawCard,
    callUno,
    applyPenalty,
    reportPlayer,
    loading: actionsLoading,
    error: actionsError,
  } = useUnoActions(room.id, gameState, playerIds, gameMode)

  const gameToast = useGameToast()
  const rankNotification = useRankNotification()
  const [initializing, setInitializing] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  // ── 积分板弹窗状态 ────────────────────────────────────────────
  const [showScoreBoard, setShowScoreBoard] = useState(false)

  // ── 本局得分结果（游戏结束后计算，传给 GameResult） ──────────
  const [roundResults, setRoundResults] = useState(null)
  const [newScoreBoard, setNewScoreBoard] = useState(null)
  const scoringDoneRef = useRef(false)  // 防止重复计分

  // ── 动画状态机 ──────────────────────────────────────────────
  // 'idle'     → 无动画
  // 'loading'  → 加载动画（初始化阶段）
  // 'win'      → 获胜瞬间动画（短暂，~2.4s）
  // 'gameover' → GAME OVER 排名飞入动画
  // 'result'   → 结算弹窗（GameResult）
  const [animPhase, setAnimPhase] = useState('loading')
  const animWinnerRef = useRef(null)   // 记录触发 win 动画时的 winnerId，避免重复
  const winAnimRankRef = useRef(null)  // win 动画的名次信息（我的名次）
  // 飞牌动画期间若 winnerId 到达，先挂起，等动画结束后再延迟 600ms 触发获胜动画
  const pendingWinRef = useRef(false)
  const winDelayTimerRef = useRef(null)
  // ⚡ loadingAnimDone 始终初始化为 false，确保开场动画绝不会在加载动画结束前启动
  //
  // 触发路径（互斥二选一）：
  //   skipLoadingAnim=false（GameBoard 自带加载动画）
  //     → UnoLoadingScreen onComplete → handleLoadingComplete() → setLoadingAnimDone(true)
  //   skipLoadingAnim=true（UnoGame 外层加载动画）
  //     → outerLoadingDone 从 false 变 true（onFinished 回调触发）
  //     → useEffect [skipLoadingAnim, outerLoadingDone] → setLoadingAnimDone(true)
  //
  // ⚠️ 注意：不可用 skipLoadingAnim && outerLoadingDone 作为初始值
  //   因为 GameBoard 在 gameStarting 过渡期提前挂载时，outerLoadingDone 有可能
  //   短暂为 true（React 批量更新的时序竞态），导致开场动画提前启动叠加。
  //   强制从 false 开始，只通过事件触发，杜绝竞态。
  const [loadingAnimDone, setLoadingAnimDone] = useState(false)

  // ── UNO 喊叫全局动画状态 ──────────────────────────────────────
  const [unoFlash, setUnoFlash] = useState(null)  // { name, isMe } | null
  const unoFlashTimerRef = useRef(null)
  const prevUnoCalledRef = useRef({})

  // ── UNO 动画全局交互锁 ────────────────────────────────────────
  // 任意玩家喊 UNO 时锁定（true），动画完全结束后解锁（false）
  // 锁定期间：所有玩家的出牌/摸牌/手牌点击全部禁用，并显示半透明遮罩
  const [interactionLocked, setInteractionLocked] = useState(false)

  // ── 开场状态机：开场动画完成前全局锁定交互 ──────────────────
  // false = 开场进行中（禁止出牌/摸牌），true = 开场完成（可交互）
  const [openingReady, setOpeningReady] = useState(false)
  // openingActive: Orchestrator 的触发信号（用 state 而非 ref，保证触发重渲染）
  // 加载完成后设为 true，Orchestrator 监听到后开始运行
  const [openingActive, setOpeningActive] = useState(false)
  // 记录是否已经触发过开场动画（防止 Realtime 重推 gameState 时重复触发）
  const openingStartedRef = useRef(false)

  // ── 游戏区域容器 ref（发牌/翻牌动画的相对定位父容器） ───────────
  const gameAreaRef = useRef(null)

  // ── 我的手牌容器 ref（发牌动画终点） ──────────────────────────
  const playerHandRef = useRef(null)

  // ── 先手提示动画状态（由 Orchestrator 接管，此处保留 Banner 状态供 OpponentArea 用） ──
  const [showFirstPlayerBanner, setShowFirstPlayerBanner] = useState(false)
  const firstPlayerBannerTimerRef = useRef(null)
  // 记录已展示过的 firstPlayerId，防止同一局重复触发
  const shownFirstPlayerIdRef = useRef(null)

  // ── Wild 起始牌选色状态 ───────────────────────────────────────
  // 当 needsColorPick === user.id 时，弹出颜色选择器让起始玩家选色
  const [showStartColorPicker, setShowStartColorPicker] = useState(false)

  // ── 飞行动画状态 ─────────────────────────────────────────────
  const [flyingCard, setFlyingCard] = useState(null) // { card, from, to, onDone }
  // 延迟显示的顶牌：飞行动画期间保持旧顶牌，动画结束后切换
  const [displayTopCard, setDisplayTopCard] = useState(null)
  const [displayColor, setDisplayColor] = useState(null)
  // 开场翻牌动画期间：实时显示当前正在翻的牌（覆盖 displayTopCard）
  // null = 不覆盖（显示游戏逻辑的 topCard）
  const [flippingTopCard, setFlippingTopCard] = useState(null)
  const discardPileRef = useRef(null) // 弃牌堆 DOM ref
  const drawPileRef = useRef(null)    // 摸牌堆 DOM ref（发牌动画起点）
  const opponentCardAreaRefs = useRef({}) // 对手牌区域 DOM ref（key=userId, val=el）
  // 正在出牌的 ID（乐观更新期间隐藏手牌，防止闪回）
  const [pendingPlayCardId, setPendingPlayCardId] = useState(null)

  // 供 OpponentArea 调用的 ref 回调
  const handleOpponentCardAreaRef = useCallback((userId, el) => {
    opponentCardAreaRefs.current[userId] = el
  }, [])

  // 始终同步 gameStateRef
  const gameStateRef = useRef(null)
  gameStateRef.current = gameState

  // ── PRD: 已举报的玩家记录（本地状态，用于UI）───────────────
  const [localReportedPlayers, setLocalReportedPlayers] = useState([])

  // ── PRD: 本地 UNO 窗口状态（基于时间戳，完全本地判定）─────────
  // 核心思路：
  // 1. 出牌时：如果打出后手牌剩1张，记录本地时间戳
  // 2. 点击 UNO 时：检查时间戳是否存在 + 手牌是否为1
  // 3. 窗口关闭条件：手牌变化（出完/摸牌）或 成功喊UNO
  const prevMyHandLengthRef = useRef(undefined)  // 上一次手牌数量
  const unoWindowTimestampRef = useRef(null)  // 用 ref 存储时间戳（立即读取）
  const [localUnoWindow, setLocalUnoWindow] = useState(false)  // 用 state 触发 UI 更新

  // ── 排名通知：记录已展示的排名玩家，避免重复通知 ──────────────
  const shownRankPlayersRef = useRef(new Set())

  // 监听手牌变化：检测是否刚打出倒数第二张牌（手牌从 N→1）
  useEffect(() => {
    const currLength = myHand.length
    const prevLength = prevMyHandLengthRef?.current

    // 更新 prev ref（首次渲染时初始化）
    if (prevMyHandLengthRef.current === undefined) {
      prevMyHandLengthRef.current = currLength
      return
    }

    // 手牌从 N 张变为 1 张（N >= 2）→ 刚打出倒数第二张牌，记录时间戳
    if (prevLength >= 2 && currLength === 1) {
      const timestamp = Date.now()
      unoWindowTimestampRef.current = timestamp  // 立即写入 ref
      setLocalUnoWindow(true)  // 触发 UI 更新
    }

    // 手牌从 1 张变为 0 张 → 已出完，清除窗口
    if (prevLength === 1 && currLength === 0) {
      unoWindowTimestampRef.current = null
      setLocalUnoWindow(false)
    }

    // 手牌增加（摸牌/惩罚）且原本是1张 → 清除窗口
    if (currLength > prevLength && prevLength === 1) {
      unoWindowTimestampRef.current = null
      setLocalUnoWindow(false)
    }

    prevMyHandLengthRef.current = currLength
  }, [myHand.length])

  // 本地 UNO 窗口是否开启（供 UI 和 handleCallUno 使用）
  const localUnoWindowOpen = localUnoWindow

  // ── 排名通知：监听 rankList 变化，当玩家出完牌时显示名次通知 ────────
  // 只在排名模式（SCORING_MODES.RANKING）下触发
  useEffect(() => {
    // 只在排名模式的娱乐版游戏中显示
    if (resolvedScoringMode !== SCORING_MODES.RANKING) return
    if (gameMode !== GAME_MODES.ENTERTAINMENT) return
    if (!rankList || rankList.length === 0) return
    if (!openingReady) return  // 开场动画完成前不通知

    // 检查新增的排名玩家
    const newRankPlayers = rankList.filter(
      (playerId) => !shownRankPlayersRef.current.has(playerId)
    )

    if (newRankPlayers.length === 0) return

    // 批量添加排名通知
    const notifications = newRankPlayers.map((playerId) => {
      const rank = rankList.indexOf(playerId) + 1
      const playerRecord = players.find((p) => p.user_id === playerId)
      const playerName = playerRecord
        ? getDisplayName(playerRecord.profiles)
        : (playerId.startsWith?.('bot_') ? '机器人小智' : '玩家')

      // 计算分数：score(rank, N) = (N - rank + 1) + (rank === 1 ? 1 : 0)
      const n = playerIds.length
      const scoreEarned = (n - rank + 1) + (rank === 1 ? 1 : 0)

      // 标记为已展示
      shownRankPlayersRef.current.add(playerId)

      return { playerId, playerName, rank, scoreEarned }
    })

    // 按名次排序（确保第1名先显示）
    notifications.sort((a, b) => a.rank - b.rank)

    // 批量显示通知
    rankNotification.showRankBatch(notifications)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rankList, resolvedScoringMode, gameMode, openingReady, playerIds.length])

  // 游戏结束时清空排名通知状态
  useEffect(() => {
    if (winnerId) {
      // 清空已展示记录，为下一局做准备
      shownRankPlayersRef.current = new Set()
    }
  }, [winnerId])

  // 同步 displayTopCard：无飞牌动画时跟随服务器状态
  // 注意：如果 displayTopCard 已经被乐观更新（等于 topCard 时不需要再更新）
  useEffect(() => {
    // 只有在没有飞牌动画时才同步服务器状态
    // 乐观更新后，topCard 会追上 displayTopCard，此时同步是安全的
    if (!flyingCard) {
      setDisplayTopCard(topCard)
      setDisplayColor(currentColor)
    }
  }, [topCard, currentColor, flyingCard])

  // 上一个状态快照（用于检测变化）
  const prevStateRef = useRef(null)
  const titleTimerRef = useRef(null)
  const originalTitle = useRef(document.title)

  // ── 使用父组件传入的 Bot 列表或自动识别 ───────────────────
  const botPlayerIds = botPlayerIdsProp.length > 0
    ? botPlayerIdsProp
    : players
        .filter((p) => p.user_id && p.user_id.startsWith('bot_'))
        .map((p) => p.user_id)

// ── 启用 Bot AI ─────────────────────────────────────────────
useUnoBot({
  roomId: room.id,
  gameState,
  playerIds,
  botPlayerIds,
  isHost,
  winnerId,
  gameMode,  // 传入游戏模式给 Bot 决策
  openingReady,  // 开场动画完成前禁止机器人出牌
})

  // ── 断线重连监听 ─────────────────────────────────────────────

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true)
      toast.success('网络已恢复', '游戏状态正在同步...')

      // 断线重连后：主动从数据库拉取最新状态 + 重新订阅 Realtime
      try {
        await fetchGameState()
        // 重新订阅 Realtime，确保后续推送能正常接收
        subscribeToGameState()
        toast.success('同步完成', '游戏状态已更新')
      } catch (err) {
        console.error('[断线重连] 同步失败:', err)
        toast.error('同步失败', '请尝试刷新页面')
      }
    }
    const handleOffline = () => {
      setIsOnline(false)
      toast.warning('网络已断开', '请检查网络连接')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [fetchGameState, subscribeToGameState])

  // ── 页面标题闪烁（轮到自己时）───────────────────────────────

  useEffect(() => {
    if (isMyTurn && !winnerId) {
      let blink = false
      titleTimerRef.current = setInterval(() => {
        document.title = blink ? '⚡ 该你了！' : originalTitle.current
        blink = !blink
      }, 800)
    } else {
      if (titleTimerRef.current) {
        clearInterval(titleTimerRef.current)
        titleTimerRef.current = null
      }
      document.title = originalTitle.current
    }

    return () => {
      if (titleTimerRef.current) clearInterval(titleTimerRef.current)
    }
  }, [isMyTurn, winnerId])

  // 组件卸载时恢复标题
  useEffect(() => {
    return () => {
      document.title = originalTitle.current
      if (titleTimerRef.current) clearInterval(titleTimerRef.current)
    }
  }, [])

  // ── 游戏状态变化时触发通知和动画 ───────────────────────────────────

  useEffect(() => {
    if (!gameState || !prevStateRef.current) {
      prevStateRef.current = gameState
      return
    }

    const prev = prevStateRef.current
    const curr = gameState

    // 方向改变
    if (prev.direction !== curr.direction) {
      gameToast.showReverse()
    }

    // 待摸牌数增加
    if (curr.pending_draw_count > prev.pending_draw_count) {
      const delta = curr.pending_draw_count - prev.pending_draw_count
      const currentPId = playerIds[curr.current_player_index]
      if (currentPId === user?.id) {
        gameToast.showDraw(curr.pending_draw_count, '你')
      } else {
        const p = players.find((pl) => pl.user_id === currentPId)
        const name = p ? getDisplayName(p.profiles) : '对手'
        gameToast.showDraw(curr.pending_draw_count, name)
      }
    }

    // 顶牌变化：颜色改变（Wild 选色）
    if (
      curr.top_card?.type === CARD_TYPES.WILD ||
      curr.top_card?.type === CARD_TYPES.WILD4
    ) {
      if (curr.current_color !== prev.current_color && curr.current_color) {
        const who = players.find(
          (p) =>
            p.user_id !==
            playerIds[curr.current_player_index]
        )
        gameToast.showWild(
          COLOR_NAMES[curr.current_color] || curr.current_color
        )
      }
    }

      // 其他玩家出牌时触发动画（顶牌变化且不是我出的牌）
      // 开场动画期间不触发飞牌动画，避免在翻牌之前显示
    if (
      openingReady &&
      prev.top_card &&
      curr.top_card &&
      (prev.top_card.id !== curr.top_card.id || prev.top_card.color !== curr.top_card.color)
    ) {
      const prevPlayerId = playerIds[prev.current_player_index]
      // 如果顶牌变化是其他玩家出的（不是我），播放动画
      if (prevPlayerId !== user?.id && !flyingCard) {
        if (discardPileRef.current) {
          // 先冻结顶牌显示（保持旧顶牌）
          setDisplayTopCard(prev.top_card)
          setDisplayColor(prev.current_color)

          const toRect = discardPileRef.current.getBoundingClientRect()

          // 尝试从出牌玩家的牌区域 DOM 获取精确起点
          const fromEl = opponentCardAreaRefs.current[prevPlayerId]
          let fromCoord
          if (fromEl) {
            const fromRect = fromEl.getBoundingClientRect()
            fromCoord = {
              x: fromRect.left + fromRect.width / 2 - 28,
              y: fromRect.top + fromRect.height / 2 - 44,
              w: 56,
              h: 88,
              rotate: Math.random() * 20 - 10,
            }
          } else {
            // 降级：从屏幕上方中心飞出
            fromCoord = {
              x: window.innerWidth / 2 - 28,
              y: window.innerHeight / 3 - 44,
              w: 56,
              h: 88,
              rotate: Math.random() * 20 - 10,
            }
          }

          setFlyingCard({
            card: curr.top_card,
            from: fromCoord,
            to: {
              x: toRect.left,
              y: toRect.top,
              w: toRect.width,
              h: toRect.height,
            },
            // 动画结束后更新顶牌显示，并检查是否有挂起的获胜动画
            onDone: () => {
              setDisplayTopCard(curr.top_card)
              setDisplayColor(curr.current_color)
              setFlyingCard(null)
              // 飞牌期间若 winnerId 到达（pendingWinRef=true），此刻立即触发获胜动画
              if (pendingWinRef.current) {
                pendingWinRef.current = false
                triggerWinAnim()
              }
            },
          })
        }
      }
    }

    prevStateRef.current = curr
  }, [gameState, user?.id, playerIds, flyingCard])

  // ── 监听 unoCalled 变化 → 触发 UNO 喊叫全局动画 ─────────────

  useEffect(() => {
    if (!gameState?.uno_called) return
    const curr = gameState.uno_called
    const prev = prevUnoCalledRef.current

    // 找出新变为 true 的玩家
    for (const [uid, status] of Object.entries(curr)) {
      if (status === true && prev[uid] !== true) {
        const isMe = uid === user?.id
        let name = isMe ? '你' : null
        if (!isMe) {
          const playerRecord = players.find((p) => p.user_id === uid)
          name = playerRecord ? getDisplayName(playerRecord.profiles) : '对手'
        }
        if (unoFlashTimerRef.current) clearTimeout(unoFlashTimerRef.current)
        // 喊 UNO 瞬间：立即加锁，所有玩家交互禁用
        setInteractionLocked(true)
        setUnoFlash({ name, isMe })
        unoFlashTimerRef.current = setTimeout(() => {
          setUnoFlash(null)
          unoFlashTimerRef.current = null
          // UNO 动画完全结束（onAnimationComplete）→ 解锁交互
          setInteractionLocked(false)
        }, 2000) // 展示 2 秒，结束后解锁
        break
      }
    }

    prevUnoCalledRef.current = { ...curr }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState?.uno_called])

  // 组件卸载时清除 UNO 动画定时器，并确保解锁
  useEffect(() => () => {
    if (unoFlashTimerRef.current) clearTimeout(unoFlashTimerRef.current)
    setInteractionLocked(false)
  }, [])

  // ── 玩家退出处理（仅 2 人游戏时自动判负）────────────────────

  useEffect(() => {
    if (!gameState || winnerId) return

    const activePlayers = players.filter((p) => p.user_id)
    if (activePlayers.length < 2 && playerIds.length >= 2) {
      // 只剩一个玩家，剩余玩家自动获胜
      const remainingPlayer = activePlayers[0]
      if (remainingPlayer && isHost) {
        supabase
          .from('uno_game_state')
          .update({
            winner_id: remainingPlayer.user_id,
            updated_at: new Date().toISOString(),
          })
          .eq('room_id', room.id)
          .then(() => {
            supabase
              .from('uno_rooms')
              .update({ status: ROOM_STATUS.FINISHED })
              .eq('id', room.id)
          })
      }
    }
  }, [players.length, gameState, winnerId, isHost])

  // ── 游戏结束时由 isHost 计算本局积分并写入 DB ───────────────

  useEffect(() => {
    // 只在 isHost、有 winnerId、还没计过分时执行
    if (!winnerId || !isHost || !gameState || scoringDoneRef.current) return
    // 只有 updateScoreBoardInDB 可用时才执行（父组件传入）
    if (!updateScoreBoardInDB) return

    scoringDoneRef.current = true

    // 构造本局排名列表
    // 官方模式：rankList = [winnerId]
    // 娱乐模式：rankList 已在 gameState 中
    const finalRankList = gameMode === GAME_MODES.ENTERTAINMENT
      ? (rankList.length > 0 ? rankList : [winnerId])
      : [winnerId]

    const allPlayerIds = playerIds

    // 计算本局得分
    const results = calculateRoundScore(
      gameMode,
      resolvedScoringMode,
      finalRankList,
      allPlayerIds
    )
    setRoundResults(results)

    // 更新累计积分板
    const updatedBoard = updateScoreBoard(scoreBoard, {
      roomId: room.id,
      gameMode,
      scoringMode: resolvedScoringMode,
      roundResults: results,
      players,
      getDisplayName: (profiles) => getDisplayName(profiles),
    })
    setNewScoreBoard(updatedBoard)

    // 写入数据库（仅 isHost）
    updateScoreBoardInDB(updatedBoard).catch((err) => {
      console.error('[UNO] 写入计分板失败:', err)
    })
  }, [winnerId, isHost, gameState])

  // ── 初始化游戏状态（仅房主执行一次）────────────────────────

  useEffect(() => {
    // 等待状态加载完成后再决定是否需要初始化
    // 如果 stateLoading 为 true，说明正在从数据库拉取状态，不应初始化
    if (stateLoading) return
    if (!isHost || gameState || initializing) return

    const init = async () => {
      setInitializing(true)
      try {
        await initializeGameState()
        toast.success('游戏已开始', '祝你好运！')
      } catch (err) {
        console.error('初始化游戏失败:', err)
        toast.error('初始化失败', err.message || '无法开始游戏')
      } finally {
        setInitializing(false)
      }
    }

    init()
  }, [isHost, gameState, initializeGameState, initializing, stateLoading])

  // ── PRD: 新版 UNO 按钮处理（基于本地窗口状态）───────────────
  // 点击 UNO 按钮：本地判定是否有效
  // 注意：不再检查 myHand.length，因为出牌后 myHand 可能还没更新
  // 完全依赖 localUnoWindowOpen 状态（在出牌瞬间立即开启）
  const handleCallUno = useCallback(async () => {
    if (!user?.id) return { success: false, reason: 'no_user' }

    const currentUnoCalled = gameState?.uno_called || {}

    // 情况1：本地窗口开启 → 有效喊 UNO
    // 窗口是在打出倒数第二张牌的瞬间开启的，所以只要窗口开着就是合法的
    if (localUnoWindowOpen) {
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
        .eq('room_id', room.id)

      if (error) {
        console.warn('[UNO] callUno 写入失败:', error.message)
        return { success: false, reason: 'db_error' }
      }

      // 成功喊UNO后关闭窗口
      unoWindowTimestampRef.current = null
      setLocalUnoWindow(false)

      return { success: true }
    }

    // 情况2：窗口未开启 → 根据当前手牌数判断
    const currentHandLength = myHand.length
    if (currentHandLength >= 2) {
      // 误触惩罚
      await applyPenalty(user.id, 2, '误触UNO按钮')
      return { success: false, reason: 'penalty' }
    }

    if (currentHandLength === 1) {
      // 窗口已关闭，可能已经喊过或过期了
      return { success: false, reason: 'window_expired' }
    }

    // 手牌 == 0 或其他情况
    return { success: false, reason: 'invalid' }
  }, [user?.id, myHand.length, gameState?.uno_called, localUnoWindowOpen, room.id, applyPenalty])

  // PRD: 误触惩罚回调（摸 2 张牌）
  const handleUnoPenalty = useCallback(async (cardCount) => {
    if (!user?.id) return
    await applyPenalty(user.id, cardCount, '误触UNO')
  }, [applyPenalty, user?.id])

  // PRD: 举报玩家
  const handleReportPlayer = useCallback(async (targetPlayerId) => {
    const result = await reportPlayer(targetPlayerId)
    if (result?.success) {
      // 记录本地已举报
      setLocalReportedPlayers(prev => [...prev, targetPlayerId])
    }
    return result
  }, [reportPlayer])

  // 组件卸载时清除获胜动画延迟定时器
  useEffect(() => () => {
    if (winDelayTimerRef.current) clearTimeout(winDelayTimerRef.current)
  }, [])

  // 组件卸载时清除先手提示定时器
  useEffect(() => () => {
    if (firstPlayerBannerTimerRef.current) clearTimeout(firstPlayerBannerTimerRef.current)
  }, [])

  // ── 监听 firstPlayerId → 展示先手提示横幅（OpponentArea 高亮用） ──
  // Orchestrator 负责全屏公告动画，这里只控制 OpponentArea 的紫色高亮边框显示 1.5s
  // 必须等到开场动画完成（openingReady=true）后才触发，避免在开场动画播放期间就出现高亮
  useEffect(() => {
    if (!firstPlayerId) return
    if (animPhase === 'loading') return
    if (!openingReady) return  // 开场动画未完成，不展示高亮
    if (shownFirstPlayerIdRef.current === firstPlayerId) return

    shownFirstPlayerIdRef.current = firstPlayerId

    if (firstPlayerBannerTimerRef.current) clearTimeout(firstPlayerBannerTimerRef.current)
    setShowFirstPlayerBanner(true)
    firstPlayerBannerTimerRef.current = setTimeout(() => {
      setShowFirstPlayerBanner(false)
      firstPlayerBannerTimerRef.current = null
    }, 3500)  // 比开场动画稍长，确保公告展示完后高亮还在
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstPlayerId, animPhase, openingReady])

  // ── 监听 needsColorPick → 弹出 Wild 起始牌选色 ───────────────
  // needsColorPick 为当前用户 ID 时，表示轮到我选起始颜色
  useEffect(() => {
    if (needsColorPick && needsColorPick === user?.id) {
      setShowStartColorPicker(true)
    } else {
      setShowStartColorPicker(false)
    }
  }, [needsColorPick, user?.id])

  // Wild 起始牌选色回调：玩家选完颜色后写入 DB
  const handleStartColorSelect = useCallback(async (color) => {
    setShowStartColorPicker(false)
    if (!gameState || !color) return
    try {
      await supabase
        .from('uno_game_state')
        .update({
          current_color: color,
          needs_color_pick: null,
          updated_at: new Date().toISOString(),
        })
        .eq('room_id', room.id)
    } catch (err) {
      console.error('[UNO] Wild 起始牌选色失败:', err)
    }
  }, [gameState, room.id])

  // ── 出牌时触发飞行动画，动画结束后再执行真正的出牌逻辑 ──────

  const handlePlayWithAnimation = useCallback(
    (card, chosenColor, fromRect, fromRotate) => {
      // PRD: 在出牌瞬间开启 UNO 窗口（零延迟）
      // 如果这张牌打出后手牌剩 1 张，立即开启 UNO 窗口
      const handLengthAfterPlay = myHand.length - 1
      if (handLengthAfterPlay === 1) {
        const timestamp = Date.now()
        unoWindowTimestampRef.current = timestamp
        setLocalUnoWindow(true)
      }

      // 记录正在出牌的 ID（防止闪回）
      setPendingPlayCardId(card.id)

      // 获取弃牌堆的屏幕坐标
      const toEl = discardPileRef.current
      if (!toEl || !fromRect) {
        // 降级：无法获取坐标时直接出牌
        return playCard(card, chosenColor)
      }

      const toRect = toEl.getBoundingClientRect()

      // 使用 requestAnimationFrame 批量更新状态，避免多次同步渲染卡顿
      requestAnimationFrame(() => {
        setFlyingCard({
          card,
          chosenColor,
          from: {
            x: fromRect.left,
            y: fromRect.top,
            w: fromRect.width,
            h: fromRect.height,
            rotate: fromRotate ?? 0,
          },
          to: {
            x: toRect.left,
            y: toRect.top,
            w: toRect.width,
            h: toRect.height,
          },
          // 动画结束时：立即更新弃牌堆显示（乐观更新），同时发送服务器请求
          onDone: () => {
            // 1. 乐观更新：立即在弃牌堆显示这张牌
            setDisplayTopCard(card)
            // 如果是万能牌，使用选中的颜色
            if (chosenColor && (card.type === 'wild' || card.type === 'wild4')) {
              setDisplayColor(chosenColor)
            } else {
              setDisplayColor(card.color || 'black')
            }

            // 2. 清除飞行卡片
            setFlyingCard(null)

            // 3. 发送服务器请求（不阻塞 UI）
            playCard(card, chosenColor)
              .then(() => {
                // 出牌成功后，主动 fetch 一次最新状态
                // 防止 Realtime 延迟导致 winner_id 没有及时同步到本地
                return fetchGameState()
              })
              .then((latestState) => {
                if (latestState?.winner_id) {
                  setGameState(latestState)
                }
              })
              .catch((err) => {
                console.error('[UNO] 出牌失败:', err)
                // 出牌失败时，恢复原来的顶牌显示
                setDisplayTopCard(topCard)
                setDisplayColor(currentColor)
              })
              .finally(() => {
                // 无论成功失败，清除 pending 状态
                setPendingPlayCardId(null)
              })

            // 4. 检查是否获胜
            const latestWinnerId = gameStateRef.current?.winner_id
            if (pendingWinRef.current || latestWinnerId) {
              pendingWinRef.current = false
              let checkCount = 0
              const checkWinner = () => {
                if (gameStateRef.current?.winner_id || winnerId) {
                  triggerWinAnim()
                } else if (checkCount < 8) {
                  checkCount++
                  setTimeout(checkWinner, 50)
                }
              }
              checkWinner()
            }
          },
        })
      })
    },
    [playCard, myHand.length, topCard, currentColor]
  )

  // ── 离开游戏：通知外层（UnoRoomPage 接管 LeaveAnimation 和 navigate）──
  // GameBoard 不再直接控制 LeaveAnimation，只负责触发外层流程

  const handleLeave = () => {
    if (!confirm('确定要离开游戏吗？离开后游戏可能无法继续。')) return
    // 通知 UnoRoomPage：设 isLeaving=true → 挂载 LeaveAnimation → 执行 leaveRoom → navigate
    onLeaveStart?.()
  }

  // ── 返回房间（游戏结束后重置房间状态回 waiting）──────────────
  const returningRef = useRef(false)  // 防止重复触发

  const handleReturnToRoom = async () => {
    // 防止重复执行
    if (returningRef.current) {
      console.log('[GameBoard] 返回房间已在进行中，跳过重复调用')
      return
    }
    returningRef.current = true

    try {
      console.log('[GameBoard] 返回房间：开始清理游戏数据...', { roomId: room.id })

      // 1. 先删除游戏状态（避免新游戏开始时读到旧数据）
      const { data: deleteData, error: stateError } = await supabase
        .from('uno_game_state')
        .delete()
        .eq('room_id', room.id)
        .select()

      if (stateError) {
        console.error('[GameBoard] 删除游戏状态失败:', stateError)
        throw stateError
      }
      console.log('[GameBoard] 游戏状态已删除，删除的记录:', deleteData)

      // 2. 重置房间状态为 waiting（保留计分板供多局累计）
      const { data: roomData, error: roomError } = await supabase
        .from('uno_rooms')
        .update({ status: 'waiting' })
        .eq('id', room.id)
        .select()

      if (roomError) {
        console.error('[GameBoard] 重置房间状态失败:', roomError)
        throw roomError
      }
      console.log('[GameBoard] 房间状态已重置为 waiting:', roomData)

      // 3. 不需要 navigate，room.status 变化会触发 Realtime 推送
      // GameBoard 会自动卸载（因为条件 room.status === PLAYING/FINISHED 不再满足）
      // RoomLobby 会自动显示
    } catch (err) {
      console.error('[GameBoard] 返回房间失败:', err)
      toast.error('返回失败', err.message)
      returningRef.current = false  // 失败时重置，允许重试
    }
  }

  // ── 错误提示（用 ref 避免重复触发） ─────────────────────────

  const prevStateErrorRef = useRef(null)
  const prevActionsErrorRef = useRef(null)

  useEffect(() => {
    if (stateError && stateError !== prevStateErrorRef.current) {
      prevStateErrorRef.current = stateError
      toast.error('状态同步失败', stateError)
    }
  }, [stateError])

  useEffect(() => {
    if (actionsError && actionsError !== prevActionsErrorRef.current) {
      prevActionsErrorRef.current = actionsError
      toast.error('操作失败', actionsError)
    }
  }, [actionsError])

  // ── 触发获胜动画（统一入口）───────────────────────────────────
  // 供 useEffect([winnerId]) 和飞牌 onDone 回调共同调用
  // 注意：直接从 gameStateRef.current 读取 winner_id，而不依赖闭包中的 winnerId。
  // 原因：setGameState 后 React 重渲染是异步的，在 RAF/setTimeout 回调中
  //        闭包捕获的 winnerId 仍是旧值 null，而 gameStateRef 是同步更新的 ref，
  //        可以立即拿到最新值。
  const triggerWinAnim = useCallback(() => {
    // 优先从 ref 取最新 winner_id，其次用 state（Realtime 已推送的场景）
    const currentWinnerId = gameStateRef.current?.winner_id || winnerId
    if (!currentWinnerId) return
    if (animWinnerRef.current === currentWinnerId) return  // 已触发过，防重复
    animWinnerRef.current = currentWinnerId

    // 计算「我」的名次（记录到 ref，供 GameResult 使用）
    let myRank = 1
    const rankListCurrent = gameStateRef.current?.rank_list || rankList
    if (gameMode === GAME_MODES.ENTERTAINMENT && rankListCurrent.length > 0) {
      const idx = rankListCurrent.indexOf(user?.id)
      myRank = idx >= 0 ? idx + 1 : rankListCurrent.length + 1
    } else {
      myRank = currentWinnerId === user?.id ? 1 : 2
    }
    winAnimRankRef.current = myRank

    setAnimPhase('win')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winnerId, gameMode, rankList, user?.id])

  // ── 监听 winnerId → 触发 win 动画状态机 ─────────────────────
  // 若飞牌动画正在进行，先挂起（pendingWinRef=true），等飞牌 onDone 后立即触发
  useEffect(() => {
    if (!winnerId || animWinnerRef.current === winnerId) return
    if (animPhase === 'loading') return  // 加载未完成先等待

    if (flyingCard) {
      // 飞牌动画进行中：挂起，等 onDone 里检测
      pendingWinRef.current = true
    } else {
      // 无飞牌：立即触发获胜动画（overlay 自带淡入过渡，视觉上不突兀）
      triggerWinAnim()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winnerId, animPhase])

  // ── 加载动画结束回调 ─────────────────────────────────────────
  const handleLoadingComplete = useCallback(() => {
    setLoadingAnimDone(true)
  }, [])

  // ── 监听外部加载动画完成（skipLoadingAnim=true 时）─────────────
  // UnoGame 中的 UnoLoadingScreen 完全淡出后，outerLoadingDone 变为 true
  // ⏱️ 时长硬约束：outerLoadingDone 变 true 后额外等待 400ms 再解锁
  //   UnoLoadingScreen.triggerDone 在淡出 300ms 后才调 onFinished，
  //   onFinished 里 setShowLoadingOverlay(false) → outerLoadingDone=true，
  //   这 400ms 确保淡出已完全结束 + 视觉缓冲，杜绝两段动画叠加。
  useEffect(() => {
    if (!skipLoadingAnim) return       // 内部自带动画模式，不需要此逻辑
    if (!outerLoadingDone) return      // 外部动画还未结束，继续等
    // ⏱️ 硬等 400ms，确保加载动画已完全淡出不可见
    const timer = setTimeout(() => {
      setLoadingAnimDone(true)
    }, 400)
    return () => clearTimeout(timer)
  }, [skipLoadingAnim, outerLoadingDone])

  // ── 关键：动画已播完 + 数据就绪 → 推进到 idle/win ──────────
  useEffect(() => {
    if (animPhase !== 'loading') return
    if (!loadingAnimDone) return
    if (stateLoading || initializing || !gameState) return
    setAnimPhase(winnerId ? 'win' : 'idle')
    // 如果游戏已结束（有 winnerId）则跳过开场直接标记为 ready
    if (winnerId) {
      setOpeningReady(true)
      openingStartedRef.current = true
    }
  }, [animPhase, loadingAnimDone, stateLoading, initializing, gameState, winnerId])

   // ── 开场动画：加载完成且 animPhase=idle 后触发一次 ───────────
   // 只触发一次（通过 openingStartedRef 去重），避免 Realtime 重推时重启动画
   useEffect(() => {
     if (animPhase !== 'idle') return
     if (openingStartedRef.current) return
     if (!gameState) {
       openingStartedRef.current = true
       setOpeningReady(true)
       onOpeningReady?.()
       return
     }

     // 断线重连场景：如果 opening_data 为空，或者 discard_pile 已有多张牌（游戏已进行中），
     // 则跳过开场动画，直接进入游戏
     const discardPileCount = gameState.discard_pile?.length || 0
     const hasOpeningData = !!gameState.opening_data

     if (discardPileCount > 1 || !hasOpeningData) {
       openingStartedRef.current = true
       setOpeningReady(true)
       onOpeningReady?.()
       // 同步 displayTopCard
       if (gameState.top_card) {
         setDisplayTopCard(gameState.top_card)
         setDisplayColor(gameState.top_card.color || 'black')
       }
       return
     }

     openingStartedRef.current = true
     // 激活 Orchestrator（用 state 保证触发重渲染）
     setOpeningActive(true)
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [animPhase, gameState, openingData])


  // ── win 动画结束 → 进入 gameover（有排名信息）或 result ─────
  // 排名模式下需要等待所有排名通知显示完毕后再显示游戏结束画面
  const handleWinAnimComplete = () => {
    const hasFullRankList = gameMode === GAME_MODES.ENTERTAINMENT && rankList.length > 1
    if (hasFullRankList) {
      // 排名模式：计算延迟时间
      // 每条通知需要 2100ms，多人时每人间隔 300ms
      // 额外增加 500ms 缓冲让玩家看清最后一条通知
      if (resolvedScoringMode === SCORING_MODES.RANKING && rankList.length > 0) {
        const notifCount = rankList.length
        const delay = notifCount * 300 + 2100 + 500 // 最后一条通知时长 + 缓冲
        setTimeout(() => {
          setAnimPhase('gameover')
        }, delay)
      } else {
        // 非排名模式直接显示
        setAnimPhase('gameover')
      }
    } else {
      setAnimPhase('result')
    }
  }

  // ── GAME OVER 动画：查看积分板 ──────────────────────────────
  const handleGameOverViewScores = () => {
    setAnimPhase('result')
    setShowScoreBoard(true)
  }

  // ── GAME OVER 动画：再来一局 ────────────────────────────────
  const handleGameOverPlayAgain = () => {
    handleReturnToRoom()
  }

  // ── 构造 GAME OVER 排名数据 ──────────────────────────────────
  const gameOverRankings = (() => {
    const list = (gameMode === GAME_MODES.ENTERTAINMENT && rankList.length > 0)
      ? rankList
      : (winnerId ? [winnerId] : [])
    return list.map((uid, i) => {
      const p = players.find(pl => pl.user_id === uid)
      const name = p ? getDisplayName(p.profiles) : '玩家'
      const rr = roundResults?.find?.(r => r.playerId === uid)
      return {
        id: uid,
        name,
        rank: i + 1,
        scoreEarned: rr?.scoreEarned ?? 0,
        isMe: uid === user?.id,
      }
    })
  })()

  // 数据就绪条件
  const dataReady = !stateLoading && !initializing && !!gameState

  // 游戏已结束（winnerId 存在）：禁止所有玩家交互
  // 包括 600ms 缓冲期间（还未触发获胜动画时），避免显示"轮到你出牌"
  const gameEnded = !!winnerId

  // 加载动画展示条件：
  // - skipLoadingAnim=false（普通模式）：数据未就绪 或 动画未播完 → 显示 UnoLoadingScreen
  // - skipLoadingAnim=true（外部已播过动画）：不播动画，直接等数据
  const showLoadingAnim = !skipLoadingAnim && (!dataReady || !loadingAnimDone)

  // 游戏内容可见条件：
  // - 普通模式：动画播完 + 数据就绪
  // - skipLoadingAnim 模式：数据就绪即可
  const showGame = skipLoadingAnim ? dataReady : (!showLoadingAnim)

  // 开场动画期间：游戏主界面添加遮罩层，避免喧宾夺主
  // 动画元素通过 createPortal 渲染到 gameAreaRef，需要独立的层叠上下文

  // ── 统一 return：UnoLoadingScreen 始终挂载在同一父节点，避免重挂载 ────

  return (
    <>
      {/* ✅ 淡入动画样式定义（全局位置，确保类应用时规则已加载） */}
    <style>{`
      @keyframes gameBoardFadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .game-board-fadein {
        animation: gameBoardFadeIn 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards;
      }
      /* 开场遮罩快速淡入 */
      @keyframes openingMaskFadeIn {
        from { opacity: 0; }
        to   { opacity: 1; }
      }
      /* 开场遮罩丝滑淡出 */
      @keyframes openingMaskFadeOut {
        from { opacity: 1; }
        to   { opacity: 0; }
      }
    `}</style>
    
    <div 
      className={`${isMobile ? 'h-full' : 'min-h-screen'} bg-gradient-to-br from-purple-100 via-pink-100 to-orange-100 p-4${skipLoadingAnim && loadingScreenFaded ? ' game-board-fadein' : ''}`}
      style={isMobile ? { overflow: 'hidden' } : undefined}
    >
      {/* 离开动画已提升到 UnoRoomPage 层 */}

      {/* 普通加载动画：条件显隐，不重新挂载 */}
      {showLoadingAnim && <UnoLoadingScreen onComplete={handleLoadingComplete} />}

      {/* 游戏内容：数据就绪后渲染，避免 gameState 为 null 时崩溃 */}
      {/* ✅ 丝滑过渡：skipLoadingAnim 外层覆盖层模式下，loadingScreenFaded=true 后触发淡入 */}
      {showGame && (<>

      {/* 游戏内通知 */}
      <GameToast
        notifications={gameToast.notifications}
        onDismiss={gameToast.dismiss}
      />

      {/* 排名通知（排名模式专用） */}
      <RankNotification
        notifications={rankNotification.notifications}
        onDismiss={rankNotification.dismiss}
      />

      {/* 顶部栏 */}
      <div className="max-w-6xl mx-auto mb-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-600">
            房间：<span className="font-bold">{room.room_code}</span>
          </div>
          {/* 网络状态指示 */}
          {!isOnline && (
            <div className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full">
              <WifiOff className="h-3 w-3" />
              <span>离线中</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* 积分板按钮（有历史积分时显示） */}
          {(scoreBoard || newScoreBoard) && (
            <Button
              onClick={() => setShowScoreBoard(true)}
              variant="outline"
              size="sm"
              className="border-yellow-300 text-yellow-700 hover:bg-yellow-50 gap-1"
            >
              🏆 积分板
            </Button>
          )}

          <Button
            onClick={handleLeave}
            variant="outline"
            size="sm"
            className="border-red-200 text-red-600 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4 mr-1" />
            离开
          </Button>
        </div>
      </div>

      {/* 游戏桌面 - 粉色背景容器 */}
      {/* 开场动画期间（openingActive=true 且 openingReady=false）主界面透明，避免发牌/比牌动画被遮挡或界面抢眼 */}
      {/* 注意：opacity 不能设在外层容器上，否则会影响通过 createPortal 渲染的动画元素 */}
      {/* 改为：背景容器始终可见，内部元素通过 opacity 控制 */}
      {/* 移动端横屏：使用 transform scale 等比缩放整个游戏区域 */}
      <div
        className="w-full mx-auto bg-gradient-to-br from-pink-100 to-pink-50 rounded-3xl shadow-lg overflow-hidden relative"
        style={isMobile && scale < 1 ? {
          // 移动端横屏：居中显示缩放后的游戏区域
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: `calc(100vh - 60px - 32px)`, // 视口高度 - 顶部栏 - 内边距
          maxHeight: `${gameAreaHeight}px`,
        } : undefined}
      >
        {/*
          游戏区域：固定尺寸（设计尺寸），通过 transform scale 缩放。
          - OpponentArea 绝对定位，覆盖上 2/3 区域，内部以中心点做环形排列
          - CenterPile 绝对定位在正中心
          - PlayerHand 绝对定位在底部
          - 发牌/翻牌动画在 inset-0 absolute 层中播放，相对于此游戏区域定位
          - 动画元素通过 createPortal 渲染到此容器内，zIndex 确保它们显示在游戏元素上层
        */}
        <div
          className="relative w-full"
          style={{
            width: `${gameAreaWidth}px`,
            height: `${gameAreaHeight}px`,
            transform: isMobile && scale < 1 ? `scale(${scale})` : undefined,
            transformOrigin: 'center center',
            flexShrink: 0,
          }}
          ref={gameAreaRef}
        >
          {/* ── 遮罩层：游戏内容渲染时立即显示，防止游戏画面一闪而过 ── */}
          {/* 条件：showGame=true 且 openingReady=false 且 winnerId 不存在 */}
          {/* 这样遮罩会和游戏内容同时渲染，但在内容上面，确保玩家看不到闪烁 */}
          {showGame && !openingReady && !winnerId && (
            <div
              className="absolute inset-0 z-[49] pointer-events-none"
              style={{
                background: 'linear-gradient(to bottom, rgba(253,242,248,0.99) 0%, rgba(252,231,243,0.99) 50%, rgba(244,224,221,0.98) 100%)',
              }}
            />
          )}

          {/* ① 对手区域（绝对定位，撑满整个游戏区域，内部以中心做环形） */}
          {/* 注意：必须始终渲染，否则发牌动画找不到目标位置 */}
          <div className="absolute inset-0 pointer-events-none">
            <OpponentArea
              opponents={opponents}
              direction={direction}
              unoCalled={unoCalled}
              onCardAreaRef={handleOpponentCardAreaRef}
              firstPlayerId={showFirstPlayerBanner ? firstPlayerId : null}
              // PRD: 举报系统 props
              unoWindowOpen={unoWindowOpen}
              unoWindowOwner={unoWindowOwner}
              reportedThisWindow={[...reportedThisWindow, ...localReportedPlayers]}
              onReportPlayer={handleReportPlayer}
            />
          </div>

          {/* ② 中央牌堆 + 回合指示（绝对定位在正中心偏上） */}
          {/* 注意：必须始终渲染以提供 drawPileRef 和 discardPileRef，否则动画找不到位置 */}
          <div
            className="absolute left-1/2 z-10 flex flex-col items-center gap-2 pointer-events-auto"
            style={{ top: '50%', transform: 'translate(-50%, -58%)' }}
          >
            <TurnIndicator
              direction={direction}
              playerIds={playerIds}
              currentPlayerIndex={gameState.current_player_index}
              players={players}
              myUserId={user?.id}
            />
            <CenterPile
              // 开场动画期间不显示顶牌，翻牌动画由 Orchestrator 处理
              topCard={(openingReady || winnerId) ? (displayTopCard ?? topCard) : null}
              currentColor={(openingReady || winnerId) ? (displayColor ?? currentColor) : null}
              drawPileCount={gameState.draw_pile?.length || 0}
              isMyTurn={isMyTurn && !gameEnded}
              canDraw={isMyTurn && !gameEnded && !interactionLocked && openingReady}
              onDraw={drawCard}
              discardPileRef={discardPileRef}
              drawPileRef={drawPileRef}
            />
          </div>

          {/* ③ 当前玩家手牌（绝对定位在底部） */}
          {/* 注意：必须始终渲染以提供 playerHandRef，否则发牌动画找不到位置 */}
          <div className="absolute bottom-3 left-0 right-0 px-4 pointer-events-auto" ref={playerHandRef}>
            <PlayerHand
              hand={myHand}
              topCard={topCard}
              currentColor={currentColor}
              isMyTurn={isMyTurn && !gameEnded}
              pendingDrawCount={pendingDrawCount}
              onPlayCard={handlePlayWithAnimation}
              onDrawCard={drawCard}
              onCallUno={handleCallUno}
              actionsLoading={actionsLoading || !!flyingCard}
              flyingCardId={flyingCard?.card?.id || pendingPlayCardId}
              myUnoCalled={myUnoCalled}
              // PRD: 新增 UNO 窗口状态（使用本地状态）
              unoWindowOpen={localUnoWindowOpen}
              gameMode={gameMode}
              myIsFinished={myIsFinished}
              interactionLocked={interactionLocked || !openingReady}
            />
          </div>

          {/* PRD: 常态化 UNO 按钮（固定在右下角） */}
          <div className="absolute bottom-3 right-4 z-20 pointer-events-auto">
            <UnoButton
              handCount={myHand.length}
              isMyTurn={isMyTurn}
              hasCalledUno={myUnoCalled}
              unoWindowOpen={localUnoWindowOpen}
              interactionLocked={interactionLocked || !openingReady || gameEnded}
              onCallUno={handleCallUno}
              onPenalty={handleUnoPenalty}
            />
          </div>
        </div>
      </div>

      {/* ── 获胜瞬间动画 ── */}
      {/* 注意：win 动画展示的是获胜者（winnerId），获胜者永远是第一名，rank 固定为 1 */}
      {/* winAnimRankRef 记录的是「我」的名次，仅用于 GameResult 中的个人结算展示 */}
      {animPhase === 'win' && (() => {
        // 优先用 ref 中的 winner_id（避免 React 重渲染延迟导致空白）
        const currentWinnerId = gameStateRef.current?.winner_id || winnerId || animWinnerRef.current
        if (!currentWinnerId) return null
        const winPlayer = players.find(p => p.user_id === currentWinnerId)
        const winName = winPlayer
          ? getDisplayName(winPlayer.profiles)
          : (currentWinnerId.startsWith?.('bot_') ? '机器人小智' : '玩家')
        const totalP = playerIds.length || players.length
        return (
          <UnoWinAnimation
            winnerName={winName}
            rank={1}
            totalPlayers={totalP}
            onComplete={handleWinAnimComplete}
          />
        )
      })()}

      {/* ── GAME OVER 排名飞入动画 ── */}
      {animPhase === 'gameover' && (
        <UnoGameOverAnimation
          rankings={gameOverRankings}
          onViewScores={handleGameOverViewScores}
          onPlayAgain={handleGameOverPlayAgain}
          onReturnToLobby={handleLeave}
          isHost={isHost}
          mode={resolvedGameMode === GAME_MODES.OFFICIAL ? 'official' : 'casual'}
        />
      )}

      {/* ── 游戏结算弹窗（win 动画结束 / gameover 后查看积分） ── */}
      {(animPhase === 'result' || (winnerId && animPhase === 'idle' && animWinnerRef.current === winnerId)) && (
        <GameResult
          winnerId={winnerId}
          players={players}
          myUserId={user?.id}
          roomCode={room.room_code}
          onReturnToRoom={handleReturnToRoom}
          gameMode={gameMode}
          rankList={rankList}
          roundResults={roundResults}
          scoreBoard={newScoreBoard || scoreBoard}
          scoringMode={resolvedScoringMode}
        />
      )}

      {/* 独立积分板弹窗（游戏中查看） */}
      {showScoreBoard && (
        <GameResult
          winnerId={null}
          players={players}
          myUserId={user?.id}
          roomCode={room.room_code}
          onReturnToRoom={null}
          gameMode={gameMode}
          rankList={rankList}
          roundResults={null}
          scoreBoard={newScoreBoard || scoreBoard}
          scoringMode={resolvedScoringMode}
          viewMode="scoreboard"
          onClose={() => setShowScoreBoard(false)}
        />
      )}

        {/* ── 游戏开场状态机动画（加载完成后触发） ── */}
        <GameOpeningOrchestrator
          openingData={openingData}
          players={players}
          myUserId={user?.id}
          gameMode={gameMode}
          drawPileRef={drawPileRef}
          discardPileRef={discardPileRef}
          playerHandRef={playerHandRef}
          opponentRefs={opponentCardAreaRefs.current}
          gameAreaRef={gameAreaRef}
          // 🔧 修复：只有当加载覆盖层已淡出（loadingScreenFaded=true）后，才激活 Orchestrator
          // 这样翻牌动画不会在加载覆盖层前面显示，避免 flippingTopCard 被"冻结"
          active={openingActive && !openingReady && loadingScreenFaded}
          onReady={() => {
            // 开场动画完成：
            // 1. 清空翻牌覆盖状态（回归游戏逻辑的 topCard）
            setFlippingTopCard(null)
            // 2. 强制同步 displayTopCard，防止 Realtime topCard 还没到来时的短暂空白
            //    openingData.topCard 是已知正确的起始牌（与 DB 中 top_card 字段一致）
            if (openingData?.topCard) {
              setDisplayTopCard(openingData.topCard)
              setDisplayColor(openingData.topCard.color || 'black')
            }
            // 3. 标记开场完成，解锁交互
            setOpeningReady(true)
            onOpeningReady?.()
          }}
          onCardFlipping={(card) => {
            // 翻牌动画期间实时更新弃牌堆显示的牌颜色
            setFlippingTopCard(card)
          }}
        />

      {/* 出牌飞行动画（覆盖整个视口） */}
      {flyingCard && (
        <FlyingCard
          card={flyingCard.card}
          from={flyingCard.from}
          to={flyingCard.to}
          onDone={flyingCard.onDone}
        />
      )}

      {/* UNO 喊叫全屏动画 */}
      {unoFlash && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          style={{ animation: 'unoOverlay 2s ease forwards', willChange: 'opacity' }}
        >
          {/* 背景光晕 */}
          <div
            className="absolute inset-0"
            style={{
              background: unoFlash.isMe
                ? 'radial-gradient(ellipse at center, rgba(239,68,68,0.35) 0%, transparent 70%)'
                : 'radial-gradient(ellipse at center, rgba(251,146,60,0.30) 0%, transparent 70%)',
              animation: 'unoPulse 0.5s ease-out forwards',
              willChange: 'opacity, transform',
            }}
          />
          {/* UNO 文字卡片 */}
          <div
            className="relative flex flex-col items-center gap-2"
            style={{
              animation: 'unoBounceIn 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards',
              willChange: 'transform, opacity',
            }}
          >
            <div
              className="px-10 py-5 rounded-3xl shadow-2xl border-4 border-white/80 flex flex-col items-center gap-1"
              style={{
                background: unoFlash.isMe
                  ? 'linear-gradient(135deg, #ef4444, #f97316, #eab308)'
                  : 'linear-gradient(135deg, #f97316, #ef4444)',
                boxShadow: '0 0 60px rgba(239,68,68,0.6), 0 0 120px rgba(251,146,60,0.3)',
              }}
            >
              <span
                className="font-black text-white tracking-widest"
                style={{ fontSize: '5rem', lineHeight: 1, textShadow: '0 4px 16px rgba(0,0,0,0.4)' }}
              >
                UNO!
              </span>
              <span className="text-white/90 font-bold text-xl tracking-wide">
                {unoFlash.isMe ? '🎺 你喊出了 UNO！' : `🎺 ${unoFlash.name} 喊了 UNO！`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 先手提示横幅：已由 GameOpeningOrchestrator 接管，此处移除重复的横幅渲染 */}

      {/* ── Wild 起始牌选色弹窗 ── */}
      {showStartColorPicker && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-4 border-4 border-purple-300">
            <div className="text-xl font-black text-gray-800">🌈 起始牌是 Wild！</div>
            <div className="text-sm text-gray-500">你是先手玩家，请选择起始颜色</div>
            <div className="flex gap-3 mt-2">
              {[
                { color: 'red',    label: '红', bg: 'bg-red-500 hover:bg-red-600' },
                { color: 'yellow', label: '黄', bg: 'bg-yellow-400 hover:bg-yellow-500' },
                { color: 'green',  label: '绿', bg: 'bg-green-500 hover:bg-green-600' },
                { color: 'blue',   label: '蓝', bg: 'bg-blue-500 hover:bg-blue-600' },
              ].map(({ color, label, bg }) => (
                <button
                  key={color}
                  onClick={() => handleStartColorSelect(color)}
                  className={`w-16 h-16 rounded-xl ${bg} text-white font-black text-xl shadow-lg transition-transform hover:scale-110 active:scale-95 border-4 border-white/60`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* UNO 动画关键帧（内联 style） */}
      <style>{`
        @keyframes unoBounceIn {
          0%   { transform: scale(0.2) rotate(-10deg); opacity: 0; }
          55%  { transform: scale(1.18) rotate(4deg);  opacity: 1; }
          75%  { transform: scale(0.94) rotate(-1deg); }
          100% { transform: scale(1)    rotate(0deg);  opacity: 1; }
        }
        @keyframes unoPulse {
          0%   { opacity: 0;   transform: scale(0.8); }
          40%  { opacity: 1;   transform: scale(1.08); }
          100% { opacity: 0.5; transform: scale(1); }
        }
        /* 整个 overlay：0-10% 淡入，10%-80% 保持完全可见，80%-100% 淡出 */
        @keyframes unoOverlay {
          0%   { opacity: 0; }
          10%  { opacity: 1; }
          80%  { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
      </>)}
    </div>
    </>
  )
}
