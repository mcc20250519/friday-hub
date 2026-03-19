/**
 * MobileGameBoard - 移动端游戏主界面（横屏优化版）
 *
 * 布局策略：
 *   - 顶部：薄栏（房间码 + 按钮）
 *   - 中部：游戏桌（粉色椭圆背景 + 对手环形分布 + 中央双牌堆 + 状态徽章）
 *   - 底部：手牌区（横向滚动 + 弹起选中）
 *
 * 复用 PC 端所有逻辑（hooks/rules/actions），仅 UI 层适配横屏移动端
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/store/AuthContext'
import { useUnoGameState } from '@/hooks/uno/useUnoGameState'
import { useUnoActions } from '@/hooks/uno/useUnoActions'
import { useUnoBot } from '@/hooks/uno/useUnoBot'
import { CARD_TYPES, ROOM_STATUS, COLOR_NAMES, GAME_MODES, SCORING_MODES } from '@/lib/uno/constants'
import { canPlayCard } from '@/lib/uno/rules'
import { getDisplayName } from '@/hooks/uno/useUnoRoom'
import { calculateRoundScore, updateScoreBoard } from '@/lib/uno/scoring'
import { toast } from '@/hooks/useToast'
import { supabase } from '@/lib/supabase'
import ColorPicker from '../game/ColorPicker'
import MobileFlyingCard from './MobileFlyingCard'

// ─── 颜色配置 ──────────────────────────────────────────────────────────────
const COLOR_CONFIG = {
  red:    { bg: 'bg-red-500',    border: 'border-red-600',    text: 'text-red-500',    dot: '#ef4444' },
  yellow: { bg: 'bg-yellow-400', border: 'border-yellow-500', text: 'text-yellow-500', dot: '#fbbf24' },
  green:  { bg: 'bg-green-500',  border: 'border-green-600',  text: 'text-green-500',  dot: '#10b981' },
  blue:   { bg: 'bg-blue-500',   border: 'border-blue-600',   text: 'text-blue-500',   dot: '#3b82f6' },
  black:  { bg: 'bg-gray-900',   border: 'border-gray-700',   text: 'text-gray-200',   dot: '#374151' },
}

const AVATAR_COLORS = [
  '#a78bfa', '#60a5fa', '#34d399', '#f472b6',
  '#fb923c', '#facc15', '#22d3ee', '#f87171',
]

function getAvatarColor(userId) {
  if (!userId) return AVATAR_COLORS[0]
  const h = userId.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

// ─── 单张手牌 ──────────────────────────────────────────────────────────────
function HandCard({ card, isSelected, isPlayable, disabled, onSelect, cardRef }) {
  const colorCfg = COLOR_CONFIG[card.color] || COLOR_CONFIG.black
  const isWild = card.type === CARD_TYPES.WILD || card.type === CARD_TYPES.WILD4
  const display =
    card.type === 'number'  ? String(card.value)
    : card.type === 'skip'  ? '🚫'
    : card.type === 'reverse' ? '🔄'
    : card.type === 'draw2' ? '+2'
    : card.type === 'wild'  ? '🌈'
    : card.type === 'wild4' ? '+4'
    : '?'

  const handleClick = () => {
    if (disabled) return
    onSelect(card)
  }

  return (
    <div
      ref={cardRef}
      onClick={handleClick}
      className={`
        relative flex-shrink-0 rounded-xl border-4 shadow-lg flex flex-col select-none
        transition-all duration-200
        ${isWild ? 'bg-gradient-to-br from-red-500 via-yellow-400 to-blue-500' : colorCfg.bg}
        ${isSelected ? 'scale-110 -translate-y-4 z-10 ring-4 ring-purple-400 shadow-purple-300/60' : ''}
        ${isPlayable && !disabled ? 'cursor-pointer ring-2 ring-white/80 active:scale-105' : ''}
        ${!isPlayable && !isSelected ? 'opacity-40 cursor-not-allowed' : ''}
        border-white/90
      `}
      style={{ width: 52, height: 74 }}
    >
      {/* 内层白卡 */}
      <div className="absolute inset-[3px] bg-white rounded-lg flex flex-col justify-between p-1">
        <span className={`text-[9px] font-black leading-none ${isWild ? 'text-gray-800' : colorCfg.text}`}>
          {display}
        </span>
        <span className={`text-[18px] font-black text-center leading-none ${isWild ? 'text-gray-800' : colorCfg.text}`}>
          {display}
        </span>
        <span className={`text-[9px] font-black leading-none self-end rotate-180 ${isWild ? 'text-gray-800' : colorCfg.text}`}>
          {display}
        </span>
      </div>
    </div>
  )
}

// ─── 弃牌堆/摸牌堆卡牌 ───────────────────────────────────────────────────
function PileCard({ card, faceDown = false, onClick, label, badge }) {
  const colorCfg = card ? (COLOR_CONFIG[card.color] || COLOR_CONFIG.black) : COLOR_CONFIG.black
  const isWild = card && (card.type === CARD_TYPES.WILD || card.type === CARD_TYPES.WILD4)
  const display = !card || faceDown ? 'UNO'
    : card.type === 'number'  ? String(card.value)
    : card.type === 'skip'    ? '🚫'
    : card.type === 'reverse' ? '🔄'
    : card.type === 'draw2'   ? '+2'
    : card.type === 'wild'    ? '🌈'
    : card.type === 'wild4'   ? '+4'
    : '?'

  return (
    <div className="flex flex-col items-center gap-1" onClick={onClick}>
      <div
        className={`
          relative rounded-xl border-4 shadow-xl flex flex-col cursor-pointer
          active:scale-95 transition-all duration-150
          ${faceDown ? 'bg-gray-800' : isWild ? 'bg-gradient-to-br from-red-500 via-yellow-400 to-blue-500' : colorCfg.bg}
          border-white/90
        `}
        style={{ width: 64, height: 90 }}
      >
        {faceDown ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white/30 text-sm font-black">UNO</span>
          </div>
        ) : (
          <div className="absolute inset-[3px] bg-white rounded-lg flex flex-col justify-between p-1">
            <span className={`text-[9px] font-black leading-none ${isWild ? 'text-gray-800' : colorCfg.text}`}>{display}</span>
            <span className={`text-[22px] font-black text-center leading-none ${isWild ? 'text-gray-800' : colorCfg.text}`}>{display}</span>
            <span className={`text-[9px] font-black leading-none self-end rotate-180 ${isWild ? 'text-gray-800' : colorCfg.text}`}>{display}</span>
          </div>
        )}
        {badge != null && (
          <div className="absolute -top-2 -right-2 bg-gray-800 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white shadow">
            {badge}
          </div>
        )}
      </div>
      {label && <span className="text-[9px] text-gray-500 font-semibold">{label}</span>}
    </div>
  )
}

// ─── 对手卡片（环形分布） ────────────────────────────────────────────────
function OpponentBubble({ opponent, isCurrent, style }) {
  const [showMenu, setShowMenu] = useState(false)
  const name = getDisplayName(opponent)
  const cardCount = opponent.card_count || 0
  const isUno = cardCount === 1
  const avatarColor = getAvatarColor(opponent.user_id)

  // 生成迷你扇形牌
  const maxFan = Math.min(cardCount, 5)
  const fanColors = ['#ef4444', '#3b82f6', '#10b981', '#fbbf24', '#9ca3af']

  const handleReport = () => {
    toast.info('已报告', `已举报玩家 ${name} 的不当行为`)
    setShowMenu(false)
  }

  return (
    <div
      className={`
        absolute flex items-center gap-2 rounded-2xl px-2.5 py-1.5 shadow-lg
        transition-all duration-300 group
        ${isCurrent
          ? 'bg-gradient-to-r from-violet-100 to-purple-100 border-2 border-violet-400 shadow-violet-300/40 scale-105'
          : 'bg-white/90 border border-gray-200'
        }
      `}
      style={{ ...style, minWidth: 100, backdropFilter: 'blur(8px)' }}
    >
      {/* 头像 */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0 shadow-sm cursor-pointer hover:ring-2 hover:ring-purple-400 transition-all"
        style={{ background: avatarColor }}
        onClick={() => setShowMenu(!showMenu)}
      >
        {opponent.isBot ? '机' : name[0]?.toUpperCase() || '?'}
      </div>

      {/* 信息 */}
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-bold text-gray-800 truncate max-w-[60px]">{name}</div>
        <div className={`text-[9px] font-semibold mt-0.5 ${isUno ? 'text-red-600 animate-pulse' : 'text-gray-500'}`}>
          {cardCount} 张{isUno ? ' ⚠️' : ''}
        </div>
      </div>

      {/* 迷你扇形 */}
      {maxFan > 0 && (
        <div className="flex items-end" style={{ marginLeft: 2 }}>
          {Array.from({ length: maxFan }).map((_, i) => (
            <div
              key={i}
              className="rounded-sm border border-white shadow-sm"
              style={{
                width: 8, height: 12,
                background: fanColors[i % fanColors.length],
                marginLeft: i === 0 ? 0 : -4,
                transform: `rotate(${(i - Math.floor(maxFan / 2)) * 6}deg)`,
                marginBottom: Math.abs((i - Math.floor(maxFan / 2)) * 6) * 0.1,
                zIndex: i,
              }}
            />
          ))}
        </div>
      )}

      {/* 菜单按钮（三点） */}
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex-shrink-0 text-gray-500 hover:text-gray-700 text-lg leading-none"
      >
        ⋮
      </button>

      {/* 弹出菜单 */}
      {showMenu && !opponent.isBot && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-max">
          <button
            onClick={handleReport}
            className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
          >
            🚩 举报玩家
          </button>
        </div>
      )}
    </div>
  )
}

// ─── 计算对手位置 ─────────────────────────────────────────────────────────
// 位置以百分比表示，单位：vw/vh
// 策略：顶部弧线展开（5 个：左侧 2、顶部 1、右侧 2）
function calcOpponentPositions(count) {
  // 返回对象: { left: %, top: %, transform: ... }
  const TABLE_LEFT = 8    // 桌面左边距（%）
  const TABLE_TOP = 10    // 桌面顶边距（%）
  const TABLE_RIGHT = 92  // 桌面右边距（%）
  const TABLE_BOTTOM = 60 // 桌面底边距（%）

  // 弧度分布（从左到右）
  const arcPositions = {
    1: [{ x: 50, y: TABLE_TOP }],
    2: [{ x: 25, y: TABLE_TOP + 2 }, { x: 75, y: TABLE_TOP + 2 }],
    3: [{ x: 18, y: TABLE_TOP + 6 }, { x: 50, y: TABLE_TOP }, { x: 82, y: TABLE_TOP + 6 }],
    4: [
      { x: 12, y: TABLE_TOP + 12 },
      { x: 36, y: TABLE_TOP + 2 },
      { x: 64, y: TABLE_TOP + 2 },
      { x: 88, y: TABLE_TOP + 12 },
    ],
    5: [
      { x: 7,  y: TABLE_TOP + 18 },
      { x: 26, y: TABLE_TOP + 6 },
      { x: 50, y: TABLE_TOP },
      { x: 74, y: TABLE_TOP + 6 },
      { x: 93, y: TABLE_TOP + 18 },
    ],
    6: [
      { x: 5,  y: TABLE_TOP + 22 },
      { x: 20, y: TABLE_TOP + 10 },
      { x: 38, y: TABLE_TOP + 2 },
      { x: 62, y: TABLE_TOP + 2 },
      { x: 80, y: TABLE_TOP + 10 },
      { x: 95, y: TABLE_TOP + 22 },
    ],
    7: [
      { x: 4,  y: TABLE_TOP + 28 },
      { x: 16, y: TABLE_TOP + 14 },
      { x: 31, y: TABLE_TOP + 4 },
      { x: 50, y: TABLE_TOP },
      { x: 69, y: TABLE_TOP + 4 },
      { x: 84, y: TABLE_TOP + 14 },
      { x: 96, y: TABLE_TOP + 28 },
    ],
  }

  const n = Math.min(count, 7)
  return arcPositions[n] || arcPositions[7]
}

// ─── 主组件 ────────────────────────────────────────────────────────────────
/**
 * @param {Object} props
 * @param {Object} props.room - 房间信息
 * @param {Array} props.players - 玩家列表
 * @param {Object} props.myPlayer - 当前玩家信息
 * @param {boolean} props.isHost - 是否为房主（用于游戏结束时更新积分）
 * @param {Array} props.botPlayerIds - 机器人玩家 ID 列表
 * @param {Function} props.updateScoreBoardInDB - 更新积分板的回调函数
 * @param {Function} props.onLeave - 离开房间回调
 * @param {boolean} props.disabled - 是否禁用交互
 */
export default function MobileGameBoard({
  room,
  players,
  myPlayer,
  isHost,
  botPlayerIds = [],
  updateScoreBoardInDB,
  onLeave,
  disabled = false,
}) {
  const { user } = useAuth()

  // ── 游戏逻辑 Hooks（复用 PC 端完整逻辑）──────────────────────────────
  const {
    gameState,
    myHand,
    opponents: opponentsFromHook,
    topCard,
    currentColor,
    isMyTurn: isMyTurnFromHook,
    direction: directionFromHook,
    pendingDrawCount,
    playerIds,
    openingData,
    loading: stateLoading,
    initializeGameState,
  } = useUnoGameState(room?.id, players, room?.game_mode)

  const { playCard, drawCard, callUno, loading: actionLoading } = useUnoActions(
    room?.id,
    gameState,
    playerIds,
    room?.game_mode
  )

  // ── 添加开场状态追踪 ────────────────────────────────────────────────
  // 移动端没有开场动画，所以直接设置为完成状态
  const [openingComplete] = useState(true)
  const openingStartedRef = useRef(false)

  // ── 本地 UI 状态 ────────────────────────────────────────────────────────
  const [selectedCard, setSelectedCard] = useState(null)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [flyingCard, setFlyingCard] = useState(null) // { card, fromRect, toRect }
  const [unoFlash, setUnoFlash] = useState(false)    // UNO 喊叫全屏闪烁

  // refs 用于飞牌动画
  const discardPileRef = useRef(null)
  const cardRefs = useRef({})
  const scoringDoneRef = useRef(false)  // 防止重复计分

  // 游戏模式和计分模式（从 room 中获取，或从 localStorage 兜底）
  const resolvedGameMode = room?.game_mode || localStorage.getItem(`uno_game_mode_${room?.id}`) || GAME_MODES.STANDARD
  const resolvedScoringMode = room?.scoring_mode || localStorage.getItem(`uno_scoring_mode_${room?.id}`) || SCORING_MODES.BASIC
  const currentScoreBoard = room?.score_board || null

  // ── 初始化游戏状态（房主） ──────────────────────────────────────────────
  useEffect(() => {
    if (!gameState && room?.status === ROOM_STATUS.PLAYING && isHost) {
      initializeGameState()
    }
  }, [gameState, room?.status, isHost, initializeGameState])

  // ── 游戏结束时由 isHost 计算本局积分并写入 DB ───────────────
  useEffect(() => {
    // 只在 isHost、有 winnerId、还没计过分时执行
    if (!gameState?.winner_id || !isHost || scoringDoneRef.current) return
    // 只有 updateScoreBoardInDB 可用时才执行
    if (!updateScoreBoardInDB) return

    scoringDoneRef.current = true

    try {
      // 构造本局排名列表
      const finalRankList =
        resolvedGameMode === GAME_MODES.ENTERTAINMENT && gameState.rank_list?.length > 0
          ? gameState.rank_list
          : [gameState.winner_id]

      // 计算本局得分
      const results = calculateRoundScore(
        resolvedGameMode,
        resolvedScoringMode,
        finalRankList,
        playerIds
      )

      // 更新累计积分板
      const updatedBoard = updateScoreBoard(currentScoreBoard, {
        roomId: room.id,
        gameMode: resolvedGameMode,
        scoringMode: resolvedScoringMode,
        roundResults: results,
        players,
        getDisplayName: (profiles) => getDisplayName(profiles),
      })

      // 写入数据库
      updateScoreBoardInDB(updatedBoard).catch((err) => {
        console.error('[UNO Mobile] 写入计分板失败:', err)
      })

      toast.success('游戏结束！积分已更新')
    } catch (err) {
      console.error('[UNO Mobile] 计分出错:', err)
    }
  }, [gameState?.winner_id, isHost, playerIds])

  // ── 启用 Bot AI（复用 PC 端逻辑）────────────────────────────────────────
  const resolvedBotPlayerIds = botPlayerIds.length > 0
    ? botPlayerIds
    : players
        .filter((p) => p.user_id && p.user_id.startsWith('bot_'))
        .map((p) => p.user_id)

  useUnoBot({
    roomId: room?.id,
    gameState,
    playerIds,
    botPlayerIds: resolvedBotPlayerIds,
    isHost,
    winnerId: gameState?.winner_id,
    gameMode: resolvedGameMode,
    openingReady: openingComplete,
  })

  // ── 加载状态 ────────────────────────────────────────────────────────────
  if (stateLoading || !gameState) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-600 font-medium">正在洗牌，马上开局...</p>
        </div>
      </div>
    )
  }

  // ── 派生状态（使用 hook 返回的值）───────────────────────────────────────
  const isMyTurn = isMyTurnFromHook
  const direction = directionFromHook

  // 娱乐模式：我是否已出完牌
  const rankList = gameState?.rank_list || []
  const myIsFinished = rankList.includes(user?.id)

  // 对手信息（来自 hook）
  const opponents = opponentsFromHook?.map(opp => ({
    ...players.find(p => p.user_id === opp.userId),
    card_count: opp.handCount,
  })) || []

  // 当前回合信息
  const currentPlayerIndex = gameState?.current_player_index ?? 0
  const currentPlayerId = playerIds[currentPlayerIndex] || null
 
  // ── 交互处理 ─────────────────────────────────────────────────────────────

  const handleSelectCard = (card) => {
    if (!isMyTurn || disabled) return
    if (selectedCard?.id === card.id) {
      // 再次点击已选中 → 尝试出牌
      handlePlayCard()
      return
    }
    const playable = canPlayCard(card, topCard, currentColor)
    if (!playable) {
      toast.warning('不能出牌', '这张牌不符合规则')
      return
    }
    setSelectedCard(card)
  }

  const handlePlayCard = async (chosenColor = null) => {
    const card = selectedCard
    if (!card) return

    if ((card.type === CARD_TYPES.WILD || card.type === CARD_TYPES.WILD4) && !chosenColor) {
      setShowColorPicker(true)
      return
    }

    // 飞牌动画
    const cardEl = cardRefs.current[card.id]
    const discardEl = discardPileRef.current
    if (cardEl && discardEl) {
      const fromRect = cardEl.getBoundingClientRect()
      const toRect = discardEl.getBoundingClientRect()
      setFlyingCard({ card, fromRect, toRect })
    }

    try {
      await playCard(card, chosenColor)
      setSelectedCard(null)
      setShowColorPicker(false)
    } catch (err) {
      toast.error('出牌失败', err.message)
      setSelectedCard(null)
    }

    // 清除飞牌
    setTimeout(() => setFlyingCard(null), 600)
  }

  const handleDrawCard = async () => {
    if (!isMyTurn || disabled) return
    try {
      await drawCard()
      setSelectedCard(null)
    } catch (err) {
      toast.error('抽牌失败', err.message)
    }
  }

  const handleCallUno = async () => {
    // ⚠️ 防御性检查：如果玩家已出完牌（在 rankList 中），直接返回
    if (myIsFinished) {
      toast.info('已出完牌', '你已出完所有牌，无需喊 UNO')
      return
    }
    try {
      await callUno()
      setUnoFlash(true)
      setTimeout(() => setUnoFlash(false), 1500)
    } catch (err) {
      toast.error('喊 UNO 失败', err.message)
    }
  }

  // ── 计算对手位置 ─────────────────────────────────────────────────────────
  const positions = calcOpponentPositions(opponents.length)

  // ── 颜色指示点 ───────────────────────────────────────────────────────────
  const currentColorDot = COLOR_CONFIG[currentColor]?.dot || '#9ca3af'

  // ── 方向指示 ─────────────────────────────────────────────────────────────
  const directionText = direction === -1 ? '↺ 逆时针' : '↻ 顺时针'

  // ── 是否有 pending 补牌 ──────────────────────────────────────────────────
  const hasPendingDraw = pendingDrawCount > 0

  // ── 游戏是否已结束 ─────────────────────────────────────────────────────────
  const gameEnded = !!gameState.winner_id
  const winnerId = gameState.winner_id
  const winner = winnerId ? players.find(p => p.user_id === winnerId) : null
  const isWinner = winnerId === user.id

  // ════════════════════════════════════════════════════════════════════════════
  // 游戏结束画面
  if (gameEnded) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-fuchsia-50 via-pink-50 to-rose-50">
        {isWinner ? (
          <div className="text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-4xl font-black text-purple-700 mb-2">太棒了！</h1>
            <p className="text-gray-600 mb-8">你是本局的 UNO 大师！</p>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-6xl mb-4">🏆</div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              {winner ? getDisplayName(winner.profiles) : '玩家'} 获胜了！
            </h1>
            <p className="text-gray-500">再接再厉，下次一定赢！</p>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-3 mt-8">
          <button
            onClick={onLeave}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-6 rounded-lg transition-colors"
          >
            返回大厅
          </button>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div data-game-zone="uno" className="fixed inset-0 flex flex-col bg-gradient-to-br from-fuchsia-50 via-pink-50 to-rose-50 overflow-hidden">

      {/* ── 顶部栏 ────────────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 flex items-center justify-between px-3 h-11 bg-white/95 shadow-sm z-30 border-b border-gray-100">
        {/* 左：房间码 */}
        <div className="flex items-center gap-3">
          <div>
            <div className="text-[9px] text-gray-400 font-semibold leading-none">房间号</div>
            <div className="text-base font-black text-purple-700 tracking-wide leading-none mt-0.5">
              {room?.code || '------'}
            </div>
          </div>
          {/* 方向 */}
          <div className="bg-gray-100 rounded-full px-2.5 py-1 text-[10px] text-gray-500 font-semibold">
            {directionText}
          </div>
        </div>

        {/* 中：当前颜色 + 回合指示 */}
        <div className="flex items-center gap-2">
          {/* 颜色指示 */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-full px-2.5 py-1">
            <div
              className="w-3 h-3 rounded-full shadow-sm border border-white"
              style={{ background: currentColorDot }}
            />
            <span className="text-[10px] font-semibold text-gray-700">
              {COLOR_NAMES[currentColor] || '变色'}
            </span>
          </div>
          {/* 回合 */}
          <div className={`
            rounded-full px-2.5 py-1 text-[10px] font-bold
            ${isMyTurn
              ? 'bg-amber-100 text-amber-700 border border-amber-300'
              : 'bg-gray-100 text-gray-500'
            }
          `}>
            {isMyTurn ? '⚡ 到你了！' : '⏳ 观战中...'}
          </div>
        </div>

        {/* 右：按钮 */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onLeave}
            className="text-[11px] text-red-500 border border-red-200 bg-red-50 rounded-full px-2.5 py-1 font-semibold active:scale-95 transition-transform"
          >
            ← 离开
          </button>
        </div>
      </header>

      {/* ── 游戏桌面区（主体，弹性扩展）─────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden min-h-0" id="game-table">

        {/* 桌面背景椭圆（粉色桌布） */}
        <div
          className="absolute rounded-[32px] shadow-inner"
          style={{
            inset: '8px 10px 4px 10px',
            background: 'linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%)',
            boxShadow: 'inset 0 2px 16px rgba(0,0,0,0.08), 0 4px 20px rgba(0,0,0,0.08)',
          }}
        />

        {/* ── 对手环形区 ────────────────────────────────────────────────── */}
        {opponents.map((opp, i) => {
          const pos = positions[i]
          if (!pos) return null
          return (
            <OpponentBubble
              key={opp.user_id}
              opponent={opp}
              isCurrent={opp.user_id === currentPlayerId}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: 'translate(-50%, 0)',
              }}
            />
          )
        })}

        {/* ── 中央游戏内容 ──────────────────────────────────────────────── */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3"
          style={{ zIndex: 10 }}
        >
          {/* pending 补牌提示 */}
          {hasPendingDraw && (
            <div className="bg-red-100 border border-red-300 text-red-700 text-[11px] font-bold px-3 py-1.5 rounded-full shadow">
              ⚠️ 哎呀，你需要摸 {gameState.pendingDrawCount} 张牌
            </div>
          )}

          {/* 双牌堆 */}
          <div className="flex items-center gap-4">
            {/* 摸牌堆 */}
            <PileCard
              card={null}
              faceDown
              onClick={handleDrawCard}
              label="摸牌堆"
              badge={gameState.draw_pile?.length > 99 ? '99+' : gameState.draw_pile?.length}
            />

            {/* 箭头分隔 */}
            <div className="text-gray-300 text-lg font-light select-none">→</div>

            {/* 弃牌堆 */}
            <div ref={discardPileRef}>
              <PileCard
                card={topCard}
                faceDown={false}
                label="弃牌堆"
              />
            </div>
          </div>
        </div>

        {/* ── UNO 按钮（浮动在右下）──────────────────────────────────────── */}
        {myHand.length === 1 && !myIsFinished && (
          <button
            onClick={handleCallUno}
            disabled={actionLoading}
            className={`
              absolute bottom-3 right-3 w-14 h-14 rounded-full
              bg-gradient-to-br from-red-500 to-red-700
              text-white text-[13px] font-black shadow-xl border-3 border-white z-20
              active:scale-90 transition-all animate-pulse shadow-red-400/60
            `}
            style={{ border: '3px solid white' }}
          >
            UNO
          </button>
        )}
      </div>

      {/* ── 手牌区（底部固定）─────────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-white/95 border-t border-gray-100 shadow-lg z-20">
        {/* 手牌元信息行 */}
        <div className="flex items-center justify-between px-3 pt-2 pb-1">
          <span className="text-[10px] text-gray-400 font-semibold">
            🎴 我的手牌（{myHand.length}）
          </span>
          {isMyTurn && (
            <div className="flex items-center gap-2">
              {selectedCard && (
                <button
                  onClick={() => handlePlayCard()}
                  disabled={actionLoading}
                  className="text-[11px] bg-purple-600 text-white rounded-full px-3 py-1 font-bold active:scale-95 transition-transform shadow-md disabled:opacity-50"
                >
                  ✨ 出牌
                </button>
              )}
              <button
                onClick={handleDrawCard}
                disabled={actionLoading || myHand.some(c => canPlayCard(c, topCard, currentColor))}
                className="text-[11px] bg-gray-100 text-gray-700 rounded-full px-3 py-1 font-semibold active:scale-95 transition-transform disabled:opacity-40"
              >
                👇 摸牌
              </button>
            </div>
          )}
          {!isMyTurn && (
            <span className="text-[10px] text-gray-400">等待回合...</span>
          )}
        </div>

        {/* 手牌横向滚动（改进布局）*/}
        <div
          className="flex flex-wrap gap-1 px-3 pb-2 overflow-x-auto justify-start items-center"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(0,0,0,0.12) transparent',
            minHeight: '100px',
          }}
        >
          {myHand.length === 0 ? (
            <div className="w-full h-16 flex items-center justify-center text-gray-400 text-xs">
              暂无手牌
            </div>
          ) : (
            myHand.map((card, index) => {
              // 安全检查：确保 card 和 topCard 都存在
              if (!card || !topCard) return null
              const isPlayable = canPlayCard(card, topCard, currentColor)
              return (
                <div
                  key={card.id}
                  className="flex-shrink-0"
                  style={{
                    // 实现交叠效果（如PC端）
                    marginLeft: index > 0 ? '-12px' : '0',
                  }}
                >
                  <HandCard
                    card={card}
                    isSelected={selectedCard?.id === card.id}
                    isPlayable={isPlayable}
                    disabled={!isMyTurn || disabled}
                    onSelect={handleSelectCard}
                    cardRef={el => { cardRefs.current[card.id] = el }}
                  />
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ── 飞牌动画 ─────────────────────────────────────────────────────── */}
      {flyingCard && (
        <MobileFlyingCard
          card={flyingCard.card}
          fromRect={flyingCard.fromRect}
          toRect={flyingCard.toRect}
          onComplete={() => setFlyingCard(null)}
        />
      )}

      {/* ── 颜色选择弹窗 ───────────────────────────────────────────────── */}
      <ColorPicker
        visible={showColorPicker}
        onSelect={(color) => {
          handlePlayCard(color)
          setShowColorPicker(false)
        }}
      />

      {/* ── UNO 喊叫全屏闪烁 ──────────────────────────────────────────── */}
      {unoFlash && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100]"
          onClick={() => setUnoFlash(false)}
        >
          <div
            className="bg-gradient-to-br from-red-500 to-red-700 px-12 py-8 rounded-3xl shadow-2xl"
            style={{ animation: 'uno-bounce 0.4s cubic-bezier(.68,-.55,.265,1.55)' }}
          >
            <div className="text-white text-5xl font-black tracking-wider" style={{ textShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
              UNO!
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes uno-bounce {
          0% { transform: scale(0.3) rotate(-8deg); opacity: 0; }
          60% { transform: scale(1.1) rotate(3deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
