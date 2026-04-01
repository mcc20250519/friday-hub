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

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useAuth } from '@/store/AuthContext'
import { useUnoGameState } from '@/hooks/uno/useUnoGameState'
import { useUnoActions } from '@/hooks/uno/useUnoActions'
import { useUnoBot } from '@/hooks/uno/useUnoBot'
import { CARD_TYPES, ROOM_STATUS, COLOR_NAMES, GAME_MODES, SCORING_MODES } from '@/lib/uno/constants'
import { canPlayCard } from '@/lib/uno/rules'
import { getDisplayName } from '@/hooks/uno/useUnoRoom'
import { calculateRoundScore, updateScoreBoard, getRankings } from '@/lib/uno/scoring'
import { toast } from '@/hooks/useToast'
import { supabase } from '@/lib/supabase'
import ColorPicker from '../game/ColorPicker'
import MobileFlyingCard from './MobileFlyingCard'

// ─── 竖屏自动旋转 Hook ────────────────────────────────────────────────────
/**
 * 检测当前屏幕是否为竖屏，并返回需要应用到游戏容器上的旋转样式。
 * 竖屏时将游戏区顺时针旋转 90°，宽高互换，使游戏始终以横屏姿态呈现。
 */
function usePortraitRotate() {
  const isPortrait = () =>
    typeof window !== 'undefined' && window.innerHeight > window.innerWidth

  const [portrait, setPortrait] = useState(isPortrait())

  useEffect(() => {
    const handler = () => setPortrait(isPortrait())
    window.addEventListener('resize', handler)
    window.addEventListener('orientationchange', handler)
    return () => {
      window.removeEventListener('resize', handler)
      window.removeEventListener('orientationchange', handler)
    }
  }, [])

  if (!portrait) {
    // 横屏：正常铺满
    return { wrapperStyle: {}, innerStyle: {} }
  }

  // 竖屏：旋转 90°，宽高互换
  // wrapper 占据整个视口，inner 旋转后填满
  return {
    wrapperStyle: {
      position: 'fixed',
      inset: 0,
      overflow: 'hidden',
    },
    innerStyle: {
      position: 'absolute',
      // 旋转后 left/top 需要偏移到新的原点
      top: '50%',
      left: '50%',
      width: '100vh',   // 旋转后宽=视口高
      height: '100vw',  // 旋转后高=视口宽
      transform: 'translate(-50%, -50%) rotate(90deg)',
      transformOrigin: 'center center',
    },
  }
}

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

// ─── 扇形布局算法 ─────────────────────────────────────────────────────────
/**
 * 类扑克手牌布局：
 * - 牌在中央密集堆叠，两侧轻微向外散开（固定总宽度上限）
 * - 用超大半径（极平弧线）+ 小角度，模拟真实握牌姿态
 * - 容器高度固定，不随牌数膨胀
 */
function calcFanLayout(count, containerWidth, cardWidth, cardHeight) {
  if (count === 0) return []
  if (count === 1) {
    return [{ x: containerWidth / 2 - cardWidth / 2, y: 4, rotate: 0, zIndex: 1 }]
  }

  // 最大展开角度：牌少时稍散，牌多时收紧（模拟握多牌时手掌自然弧度）
  const totalAngle = Math.min(4 + count * 3, 44)
  // 超大半径 → 弧线极平，牌几乎在一条直线上，只有轻微弧度
  const radius = 520
  const centerX = containerWidth / 2
  // 圆心大幅下移，使牌底部对齐、顶部轻微扇开
  const centerY = cardHeight * 0.2 + radius

  const startAngle = -totalAngle / 2
  const angleStep = count === 1 ? 0 : totalAngle / (count - 1)

  // 牌间最大物理间距（超出时压缩到容器内）
  const MAX_SPREAD = containerWidth * 0.88

  const rawPositions = Array.from({ length: count }, (_, i) => {
    const angleDeg = startAngle + i * angleStep
    const rad = (angleDeg * Math.PI) / 180
    const x = centerX + radius * Math.sin(rad) - cardWidth / 2
    const y = centerY - radius * Math.cos(rad) - cardHeight / 2
    return { x, y, rotate: angleDeg, zIndex: i + 1 }
  })

  // 如果自然展开宽度超出限制，整体等比压缩 x 坐标（保留旋转角度，只压缩间距）
  const xs = rawPositions.map(p => p.x)
  const spread = Math.max(...xs) - Math.min(...xs) + cardWidth
  if (spread > MAX_SPREAD) {
    const scale = (MAX_SPREAD - cardWidth) / (spread - cardWidth)
    const midX = (Math.max(...xs) + Math.min(...xs)) / 2
    return rawPositions.map(p => ({
      ...p,
      x: centerX - cardWidth / 2 + (p.x - midX) * scale,
    }))
  }

  return rawPositions
}

// ─── 扇形单张手牌 ──────────────────────────────────────────────────────────
function FanHandCard({ card, isSelected, isPlayable, disabled, onSelect, cardRef, pos }) {
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

  // 牌尺寸：比之前小一号，节省空间
  const CARD_W = 40
  const CARD_H = 58

  return (
    <div
      ref={cardRef}
      onClick={() => !disabled && onSelect(card)}
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        zIndex: isSelected ? 50 : pos.zIndex,
        transform: `rotate(${pos.rotate}deg) ${isSelected ? 'translateY(-12px) scale(1.08)' : ''}`,
        transformOrigin: 'bottom center',
        transition: 'transform 0.15s ease',
        touchAction: 'manipulation',
        width: CARD_W,
        height: CARD_H,
      }}
    >
      <div
        className={`
          relative w-full h-full rounded-lg border-[3px] shadow-md select-none
          ${isWild ? 'bg-gradient-to-br from-red-500 via-yellow-400 to-blue-500' : colorCfg.bg}
          ${isSelected ? 'ring-[3px] ring-purple-400 ring-offset-1 shadow-purple-300/60' : ''}
          ${isPlayable && !disabled ? 'cursor-pointer' : ''}
          ${!isPlayable && !isSelected ? 'opacity-40 cursor-not-allowed' : ''}
          border-white/90
        `}
      >
        {/* 内层白卡 */}
        <div className="absolute inset-[2px] bg-white rounded-md flex flex-col justify-between px-0.5 py-0.5">
          <span className={`text-[8px] font-black leading-none ${isWild ? 'text-gray-800' : colorCfg.text}`}>
            {display}
          </span>
          <span className={`text-[14px] font-black text-center leading-none ${isWild ? 'text-gray-800' : colorCfg.text}`}>
            {display}
          </span>
          <span className={`text-[8px] font-black leading-none self-end rotate-180 ${isWild ? 'text-gray-800' : colorCfg.text}`}>
            {display}
          </span>
        </div>
        {/* 可出牌光晕 */}
        {isPlayable && !disabled && !isSelected && (
          <div className="absolute inset-0 rounded-lg pointer-events-none animate-pulse"
            style={{ boxShadow: '0 0 6px 2px rgba(255,255,255,0.8)' }}
          />
        )}
      </div>
    </div>
  )
}

// ─── 扇形手牌容器 ─────────────────────────────────────────────────────────
function FanHandCards({ cards, selectedCard, topCard, currentColor, isMyTurn, disabled, onSelect, cardRefs }) {
  const containerRef = useRef(null)
  const [containerWidth, setContainerWidth] = useState(360)

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(entries => {
      setContainerWidth(entries[0].contentRect.width || 360)
    })
    ro.observe(containerRef.current)
    setContainerWidth(containerRef.current.offsetWidth || 360)
    return () => ro.disconnect()
  }, [])

  const CARD_W = 40
  const CARD_H = 58
  // 容器高度：牌高 + 选中上移量，手牌区整体用负 margin-top 上移覆盖游戏桌面
  const CONTAINER_H = CARD_H + 12

  const layout = useMemo(
    () => calcFanLayout(cards.length, containerWidth, CARD_W, CARD_H),
    [cards.length, containerWidth]
  )

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{ height: CONTAINER_H }}
    >
      {cards.map((card, i) => {
        if (!card) return null
        const pos = layout[i]
        if (!pos) return null
        const isPlayable = topCard ? canPlayCard(card, topCard, currentColor) : false
        return (
          <FanHandCard
            key={card.id}
            card={card}
            isSelected={selectedCard?.id === card.id}
            isPlayable={isPlayable}
            disabled={!isMyTurn || disabled}
            onSelect={onSelect}
            cardRef={el => { if (cardRefs) cardRefs.current[card.id] = el }}
            pos={layout[i]}
          />
        )
      })}
    </div>
  )
}

// ─── 单张手牌（保留，兼容旧逻辑） ─────────────────────────────────────────
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
  // 返回房间：删除游戏状态 + 重置房间为 waiting
  const returningRef = useRef(false)
  const handleReturnToRoom = useCallback(async () => {
    if (returningRef.current) return
    returningRef.current = true
    try {
      // 1. 删除游戏状态
      const { error: stateError } = await supabase
        .from('uno_game_state')
        .delete()
        .eq('room_id', room.id)
      if (stateError) throw stateError

      // 2. 重置房间为 waiting（保留计分板）
      const { error: roomError } = await supabase
        .from('uno_rooms')
        .update({ status: 'waiting' })
        .eq('id', room.id)
      if (roomError) throw roomError
      // Realtime 会自动推送 room.status 变化，不需要手动跳转
    } catch (err) {
      console.error('[MobileGameBoard] 返回房间失败:', err)
      toast.error('返回失败', err.message)
      returningRef.current = false
    }
  }, [room?.id])
  const { user } = useAuth()

  // ── 竖屏自动旋转样式 ─────────────────────────────────────────────────────
  const { wrapperStyle, innerStyle } = usePortraitRotate()

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
    setGameState,
  } = useUnoGameState(room?.id, players, room?.game_mode)

  // 乐观更新回调：出牌/摸牌成功后立即更新本地 gameState，不等 Realtime 推送
  const handleOptimisticUpdate = useCallback((nextState) => {
    setGameState(prev => ({
      ...prev,
      current_player_index: nextState.currentPlayerIndex,
      direction: nextState.direction,
      current_color: nextState.currentColor,
      top_card: nextState.topCard,
      draw_pile: nextState.drawPile,
      discard_pile: nextState.discardPile,
      hands: nextState.hands,
      pending_draw_count: nextState.pendingDrawCount,
      winner_id: nextState.winnerId || null,
      uno_called: nextState.unoCalled || {},
      rank_list: nextState.rankList || [],
      uno_window_open: nextState.unoWindowOpen ?? false,
      uno_window_owner: nextState.unoWindowOwner ?? null,
      reported_this_window: nextState.reportedThisWindow || [],
    }))
  }, [setGameState])

  const { playCard, drawCard, callUno, loading: actionLoading } = useUnoActions(
    room?.id,
    gameState,
    playerIds,
    room?.game_mode,
    undefined,
    handleOptimisticUpdate
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
  // 游戏结束画面（增强版：含排名 + 积分板）
  if (gameEnded) {
    // 构建排名列表
    const rankList = gameState?.rank_list || []
    // 娱乐模式有完整排名，标准模式只有第一名
    const orderedPlayers = rankList.length > 0
      ? rankList.map((uid, idx) => ({
          player: players.find(p => p.user_id === uid),
          rank: idx + 1,
        })).filter(r => r.player)
      : [{ player: winner, rank: 1 }]
    
    // 积分板（如果有）
    const scoreBoard = room?.score_board || null

    const medalEmoji = ['🥇', '🥈', '🥉']

    return (
      <div className="fixed inset-0 flex flex-col bg-gradient-to-br from-fuchsia-100 via-pink-50 to-rose-100 overflow-hidden">
        {/* 顶部光效 */}
        <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-purple-200/40 to-transparent pointer-events-none" />

        {/* 主内容区（滚动） */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col items-center px-4 pt-8 pb-4">

            {/* 胜利/失败标题 */}
            {isWinner ? (
              <div className="text-center mb-6">
                <div className="text-7xl mb-3" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))' }}>
                  🎉
                </div>
                <h1 className="text-3xl font-black text-purple-700 mb-1">你赢了！</h1>
                <p className="text-purple-500 text-sm font-semibold">本局 UNO 大师就是你！</p>
              </div>
            ) : (
              <div className="text-center mb-6">
                <div className="text-7xl mb-3" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))' }}>
                  🏆
                </div>
                <h1 className="text-3xl font-black text-gray-800 mb-1">
                  {winner ? getDisplayName(winner.profiles || winner) : '玩家'} 获胜！
                </h1>
                <p className="text-gray-500 text-sm">再接再厉，下次一定赢！</p>
              </div>
            )}

            {/* 排名列表 */}
            {orderedPlayers.length > 0 && (
              <div className="w-full max-w-sm bg-white/90 rounded-2xl shadow-lg overflow-hidden mb-4">
                <div className="bg-purple-600 px-4 py-2.5">
                  <h3 className="text-white font-black text-sm text-center">🏅 本局排名</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {orderedPlayers.map(({ player, rank }) => {
                    const name = getDisplayName(player?.profiles || player)
                    const isMe = player?.user_id === user?.id
                    const avatarColor = getAvatarColor(player?.user_id)
                    return (
                      <div
                        key={player?.user_id}
                        className={`flex items-center gap-3 px-4 py-3 ${isMe ? 'bg-purple-50' : ''}`}
                      >
                        {/* 名次 */}
                        <div className="w-8 text-center text-lg flex-shrink-0">
                          {rank <= 3 ? medalEmoji[rank - 1] : <span className="text-gray-400 font-bold text-sm">#{rank}</span>}
                        </div>
                        {/* 头像 */}
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-black flex-shrink-0 shadow-sm"
                          style={{ background: avatarColor }}
                        >
                          {player?.isBot ? '机' : name[0]?.toUpperCase() || '?'}
                        </div>
                        {/* 名字 */}
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-bold truncate ${isMe ? 'text-purple-700' : 'text-gray-800'}`}>
                            {name}{isMe ? ' (我)' : ''}
                          </div>
                          {rank === 1 && (
                            <div className="text-xs text-amber-600 font-semibold">🌟 本局冠军</div>
                          )}
                        </div>
                        {/* 剩余牌数（仅标准模式最后可能有） */}
                        {gameState?.hands?.[player?.user_id] && (
                          <div className="text-xs text-gray-400 font-semibold flex-shrink-0">
                            剩 {gameState.hands[player.user_id].length} 张
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 积分板（如果有历史积分） */}
            {(() => {
              const rankings = getRankings(scoreBoard)
              if (rankings.length === 0) return null
              return (
                <div className="w-full max-w-sm bg-white/90 rounded-2xl shadow-lg overflow-hidden mb-4">
                  <div className="bg-amber-500 px-4 py-2.5">
                    <h3 className="text-white font-black text-sm text-center">⭐ 累计积分</h3>
                    {scoreBoard?.totalRoundsPlayed > 0 && (
                      <p className="text-amber-100 text-xs text-center mt-0.5">共 {scoreBoard.totalRoundsPlayed} 局</p>
                    )}
                  </div>
                  <div className="divide-y divide-gray-100">
                    {rankings.map((r) => {
                      const isMe = r.playerId === user?.id
                      const avatarColor = getAvatarColor(r.playerId)
                      const displayName = r.playerName || '玩家'
                      return (
                        <div
                          key={r.playerId}
                          className={`flex items-center gap-3 px-4 py-2.5 ${isMe ? 'bg-amber-50' : ''}`}
                        >
                          <div className="w-6 text-center text-sm text-gray-400 font-bold flex-shrink-0">
                            #{r.rank}
                          </div>
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                            style={{ background: avatarColor }}
                          >
                            {displayName[0]?.toUpperCase() || '?'}
                          </div>
                          <div className="flex-1 text-sm font-semibold text-gray-800 truncate">
                            {displayName}{isMe ? ' (我)' : ''}
                          </div>
                          <div className={`text-sm font-black flex-shrink-0 ${isMe ? 'text-amber-600' : 'text-gray-600'}`}>
                            {r.totalScore ?? 0} 分
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}
          </div>
        </div>

        {/* 底部按钮（固定） */}
        <div className="flex-shrink-0 bg-white/90 border-t border-gray-100 px-4 py-4 flex gap-3 shadow-lg">
          <button
            onClick={onLeave}
            className="flex-1 py-3.5 rounded-xl border-2 border-gray-200 text-gray-600 font-black text-sm active:scale-95 transition-transform bg-white"
          >
            🚪 退出
          </button>
          <button
            onClick={handleReturnToRoom}
            className="flex-1 py-3.5 rounded-xl bg-purple-600 text-white font-black text-sm active:scale-95 transition-transform shadow-md"
          >
            🔄 再来一局
          </button>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  return (
    // 竖屏时：wrapper 占满视口，inner 旋转 90° 呈横屏；横屏时两者均无额外样式
    <div style={wrapperStyle}>
    <div data-game-zone="uno" className="fixed inset-0 flex flex-col bg-gradient-to-br from-fuchsia-50 via-pink-50 to-rose-50 overflow-hidden" style={innerStyle}>

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

      {/* ── 手牌区（底部固定，扇形展示）──────────────────────────────── */}
      {/* 负 margin-top 让手牌区整体上移，牌图形浮在游戏桌面之上；z-index 确保覆盖桌面内容 */}
      <div className="flex-shrink-0 bg-white/95 border-t border-gray-100 z-20 relative" style={{ overflow: 'visible', marginTop: -28, boxShadow: '0 -2px 12px rgba(0,0,0,0.08)' }}>
        {/* 操作行：手牌数 + 出牌/摸牌按钮（紧凑版）*/}
        <div className="flex items-center justify-between px-3 pt-1 pb-0">
          <span className="text-[9px] text-gray-400 font-semibold">
            🎴 {myHand.length} 张
          </span>
          {isMyTurn ? (
            <div className="flex items-center gap-1.5">
              {selectedCard && (
                <button
                  onClick={() => handlePlayCard()}
                  disabled={actionLoading}
                  className="text-[10px] bg-purple-600 text-white rounded-full px-2.5 py-0.5 font-bold active:scale-95 transition-transform shadow-md disabled:opacity-50"
                >
                  ✨ 出牌
                </button>
              )}
              <button
                onClick={handleDrawCard}
                disabled={actionLoading || myHand.some(c => canPlayCard(c, topCard, currentColor))}
                className="text-[10px] bg-gray-100 text-gray-700 rounded-full px-2.5 py-0.5 font-semibold active:scale-95 transition-transform disabled:opacity-40"
              >
                👇 摸牌
              </button>
            </div>
          ) : (
            <span className="text-[9px] text-gray-400">⏳ 等待...</span>
          )}
        </div>

        {/* 扇形手牌 */}
        {myHand.length === 0 ? (
          <div className="h-14 flex items-center justify-center text-gray-400 text-xs">
            暂无手牌
          </div>
        ) : (
          <div className="px-2 pb-1">
            <FanHandCards
              cards={myHand}
              selectedCard={selectedCard}
              topCard={topCard}
              currentColor={currentColor}
              isMyTurn={isMyTurn}
              disabled={disabled}
              onSelect={handleSelectCard}
              cardRefs={cardRefs}
            />
          </div>
        )}
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
    </div>
  )
}
