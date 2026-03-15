/**
 * GameOpeningOrchestrator - 游戏开场状态机
 *
 * 实现 PRD 中定义的开场完整流程：
 *
 *   loading       → (加载动画 onFinished 触发)
 *   transitioning → (800ms 过渡：500ms 静止)
 *   dealing       → (发牌动画：每张牌 200ms，间隔 80ms)
 *   decidingStarter → (比牌动画 / 转盘动画)
 *   announcing    → (起始玩家公告 1.2s)
 *   flippingFirstCard → (翻开第一张弃牌)
 *   ready         → (游戏正式开始)
 *
 * 状态机规则：
 *   - 每个状态只能由前一个状态的 onComplete 回调触发
 *   - openingState !== 'ready' 时全局交互锁定
 *   - 数据由 openingData（从 DB 读取）驱动，动画只播放已知结果
 *
 * Props:
 *   openingData     - 来自 gameState.opening_data（发牌/比牌信息）
 *   players         - 玩家列表
 *   myUserId        - 当前用户 ID
 *   gameMode        - 游戏模式
 *   drawPileRef     - 摸牌堆 DOM ref（发牌起点）
 *   discardPileRef  - 弃牌堆 DOM ref（翻牌终点）
 *   playerHandRef   - 我的手牌区域 DOM ref（发牌终点之一）
 *   opponentRefs    - { userId: domEl } 对手牌区域 ref
 *   onReady         - 开场完成回调
 *   onSkip          - 跳过开场回调
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { CARD_TYPES, COLOR_CLASSES, CARD_SYMBOLS, GAME_MODES } from '@/lib/uno/constants'
import { getDisplayName } from '@/hooks/uno/useUnoRoom'

// ── 单张飞行牌（CSS transform 动画） ────────────────────────────
// 使用相对于 gameAreaRef 的坐标，牌的左上角定位在 from/to 坐标点
// from/to 应该是牌的中心点坐标（相对于 gameAreaRef）
function DealingCard({ card, from, to, faceUp, delay, duration, onDone }) {
  const elRef = useRef(null)

  // 牌的尺寸
  const CARD_WIDTH = 44
  const CARD_HEIGHT = 68

  useEffect(() => {
    if (!elRef.current || !from || !to) return

    const el = elRef.current
    // 初始位置：from 坐标减去牌尺寸的一半，使牌中心对准 from 点
    el.style.left = `${from.x - CARD_WIDTH / 2}px`
    el.style.top = `${from.y - CARD_HEIGHT / 2}px`
    el.style.opacity = '0'
    el.style.transform = 'scale(0.7)'
    el.style.transition = 'none'

    el.getBoundingClientRect() // 强制回流

    const startTimer = setTimeout(() => {
      el.style.transition = `left ${duration}ms cubic-bezier(0.25,0.46,0.45,0.94), top ${duration}ms cubic-bezier(0.25,0.46,0.45,0.94), opacity 80ms ease, transform ${duration}ms ease`
      // 目标位置：to 坐标减去牌尺寸的一半，使牌中心对准 to 点
      el.style.left = `${to.x - CARD_WIDTH / 2}px`
      el.style.top = `${to.y - CARD_HEIGHT / 2}px`
      el.style.opacity = '1'
      el.style.transform = 'scale(1)'

      const doneTimer = setTimeout(() => onDone?.(), duration + 50)
      return () => clearTimeout(doneTimer)
    }, delay)

    return () => clearTimeout(startTimer)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const isWild = card && (card.type === CARD_TYPES.WILD || card.type === CARD_TYPES.WILD4)
  const colorClasses = card ? (COLOR_CLASSES[card.color] || COLOR_CLASSES.black) : COLOR_CLASSES.black

  // 计算背景样式：牌背用深色渐变，牌面用颜色类
  const bgStyle = !faceUp
    ? { background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }
    : isWild
      ? { background: 'linear-gradient(135deg, #ef4444 0%, #eab308 50%, #3b82f6 100%)' }
      : {}

  return (
    <div
      ref={elRef}
      style={{
        position: 'absolute',
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        borderRadius: 8,
        border: '2px solid white',
        boxShadow: '0 8px 20px rgba(0,0,0,0.35)',
        pointerEvents: 'none',
        zIndex: 70,
        overflow: 'hidden',
        ...bgStyle,
      }}
      className={faceUp && !isWild ? (colorClasses.bg || 'bg-gray-500') : ''}
    >
      {!faceUp ? (
        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 7, fontWeight: 900, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>UNO</span>
        </div>
      ) : card ? (
        <div style={{ position: 'absolute', inset: 3, background: 'white', borderRadius: 4, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 2 }}>
          <div style={{ fontSize: 9, fontWeight: 800, lineHeight: 1 }} className={isWild ? 'text-gray-900' : colorClasses.text}>
            {card.type === CARD_TYPES.NUMBER ? card.value : (CARD_SYMBOLS[card.type] || '?')}
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, textAlign: 'center', lineHeight: 1 }} className={isWild ? 'text-gray-900' : colorClasses.text}>
            {card.type === CARD_TYPES.NUMBER ? card.value : (CARD_SYMBOLS[card.type] || '?')}
          </div>
          <div style={{ fontSize: 9, fontWeight: 800, lineHeight: 1, textAlign: 'right', transform: 'rotate(180deg)' }} className={isWild ? 'text-gray-900' : colorClasses.text}>
            {card.type === CARD_TYPES.NUMBER ? card.value : (CARD_SYMBOLS[card.type] || '?')}
          </div>
        </div>
      ) : null}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 主组件
// ═══════════════════════════════════════════════════════════════

/**
 * @param {Object} props
 * @param {Object|null} props.openingData    - gameState.opening_data
 * @param {Array}       props.players        - 玩家列表
 * @param {string}      props.myUserId       - 当前用户 ID
 * @param {string}      props.gameMode       - 游戏模式
 * @param {Object}      props.drawPileRef    - 摸牌堆 DOM ref
 * @param {Object}      props.discardPileRef - 弃牌堆 DOM ref
 * @param {Object}      props.playerHandRef  - 我的手牌容器 DOM ref
 * @param {Object}      props.opponentRefs   - { userId: domEl }
 * @param {Object}      props.gameAreaRef    - 游戏区域容器 DOM ref（相对定位的父容器）
 * @param {Function}    props.onReady        - 开场完成回调
 * @param {boolean}     props.active         - 为 true 时组件开始运行
 * @param {Function}    props.onCardFlipping - (card|null) → 翻牌阶段实时通知父级当前翻出的牌，
 *                                            父级用于同步弃牌堆实时颜色显示；翻完后传 null
 */
export default function GameOpeningOrchestrator({
  openingData,
  players,
  myUserId,
  gameMode,
  drawPileRef,
  discardPileRef,
  playerHandRef,
  opponentRefs = {},
  gameAreaRef,
  onReady,
  active = false,
  onCardFlipping,
}) {
  // ── 开场状态机 ───────────────────────────────────────────────
  // 'idle'            → 等待 active=true
  // 'transitioning'   → 过渡衔接（500ms 静止）
  // 'dealing'         → 发牌动画
  // 'decidingStarter' → 决定先手（官方：比牌 / 娱乐：转盘）
  // 'announcing'      → 先手玩家公告（1.2s）
  // 'flippingFirstCard'→ 翻开第一张弃牌
  // 'ready'           → 开场完成
  const [openingState, setOpeningState] = useState('idle')

  // 发牌动画：当前正在飞行的牌列表
  const [dealingCards, setDealingCards] = useState([])

  // 比牌展示：本轮各玩家摸到的牌
  const [comparisonCards, setComparisonCards] = useState([])   // [{ playerId, card, isWinner }]
  const [showComparisonResult, setShowComparisonResult] = useState(false) // 展示高亮结果

  // 娱乐模式：转盘高亮玩家索引
  const [spinHighlightIndex, setSpinHighlightIndex] = useState(-1)
  const [spinDone, setSpinDone] = useState(false)

  // 公告：展示先手玩家
  const [showAnnounce, setShowAnnounce] = useState(false)

  // 翻牌：展示第一张弃牌动画
  const [showFlip, setShowFlip] = useState(false)
  const [flipDone, setFlipDone] = useState(false)
  // flipKey：每翻一张新牌时递增，作为 DOM key 强制重新挂载，确保动画重新触发
  // 解决 React 批处理导致 showFlip false→true 不触发重渲染的问题
  const [flipKey, setFlipKey] = useState(0)

  // 翻牌重翻：当前正在展示的牌（含功能牌重翻）
  const [currentFlipCard, setCurrentFlipCard] = useState(null)  // 当前翻出的牌
  const [isReturnFlip, setIsReturnFlip] = useState(false)        // 是否处于飞回牌堆动画
  const [invalidCardHint, setInvalidCardHint] = useState(false)  // 是否显示"功能牌不能作为起始牌"提示

  // 提示文字
  const [statusText, setStatusText] = useState('')

  const timersRef = useRef([])
  const push = useCallback((fn, ms) => {
    const id = setTimeout(fn, ms)
    timersRef.current.push(id)
    return id
  }, [])

  // 组件卸载清理
  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout)
      timersRef.current = []
    }
  }, [])

  // ── 开场动画期间：不做滚动锁定，动画相对于游戏区域定位 ────────────
  // 用户可以滚动页面，动画会跟随游戏区域移动
  // 所有动画元素通过 createPortal 挂载到 gameAreaRef，使用 absolute 定位

  // ── 监听 active 触发开场 ─────────────────────────────────────
  // ⚠️ 依赖只列 [active, openingState]，不列 openingData：
  //    openingData 来自 Realtime，每次 gameState 推送都是新对象引用
  //    若加入依赖，Realtime 更新时若 openingState 仍为 'idle'（短暂竞态）会重复触发
  //    父层 GameBoard 已通过 openingStartedRef 确保 active 只置为 true 一次
  useEffect(() => {
    if (!active || openingState !== 'idle') return
    if (!openingData) {
      // 没有 openingData（旧版游戏或数据不完整），直接跳过到 ready
      onReady?.()
      return
    }
    setOpeningState('transitioning')
  }, [active, openingState]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 阶段二：过渡衔接（500ms 静止） ───────────────────────────
  useEffect(() => {
    if (openingState !== 'transitioning') return
    push(() => setOpeningState('dealing'), 500)
  }, [openingState, push])

  // ── 阶段三 Step 1：发牌动画 ──────────────────────────────────
  useEffect(() => {
    if (openingState !== 'dealing') return
    if (!openingData) {
      setOpeningState('decidingStarter')
      return
    }

    const { playerIds, hands } = openingData
    if (!playerIds || !hands) {
      setOpeningState('decidingStarter')
      return
    }

    // 构建发牌序列：每人每次1张，循环7轮（INITIAL_HAND_SIZE）
    const HAND_SIZE = 7
    const CARD_DURATION = 200   // 每张飞行时长 ms
    const CARD_INTERVAL = 80    // 每张间隔 ms

    const sequence = []
    for (let round = 0; round < HAND_SIZE; round++) {
      for (let pi = 0; pi < playerIds.length; pi++) {
        const playerId = playerIds[pi]
        const card = hands[playerId]?.[round]
        if (!card) continue
        sequence.push({ playerId, card, round, playerIndex: pi })
      }
    }

    const totalCards = sequence.length
    const totalDuration = totalCards * CARD_INTERVAL + CARD_DURATION

    // 立即渲染所有飞行牌（每张由自己的延迟控制）
    const cards = sequence.map((item, idx) => ({
      ...item,
      id: `deal_${idx}`,
      delay: idx * CARD_INTERVAL,
    }))
    setDealingCards(cards)

    // 全部发完后进入下一阶段
    push(() => {
      setDealingCards([])
      push(() => setOpeningState('decidingStarter'), 400)  // 停顿 400ms
    }, totalDuration + 50)
  }, [openingState]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 阶段三 Step 2：决定起始玩家 ──────────────────────────────
  useEffect(() => {
    if (openingState !== 'decidingStarter') return
    if (!openingData) {
      setOpeningState('announcing')
      return
    }

    const { gameMode: odMode, comparisonRounds, playerIds, firstPlayerIndex } = openingData
    const isOfficial = odMode === GAME_MODES.STANDARD

    if (isOfficial && comparisonRounds && comparisonRounds.length > 0) {
      // 官方模式：展示比牌过程
      setStatusText('决定起始玩家...')
      let roundIdx = 0

      const showRound = () => {
        if (roundIdx >= comparisonRounds.length) {
          setOpeningState('announcing')
          return
        }
        const round = comparisonRounds[roundIdx]
        setComparisonCards([])
        setShowComparisonResult(false)

        // 依次展示每个玩家的牌（间隔 300ms）
        round.forEach((item, i) => {
          push(() => {
            setComparisonCards((prev) => [...prev, item])
          }, i * 300)
        })

        // 展示完所有牌后显示高亮结果（再等 400ms）
        push(() => {
          setShowComparisonResult(true)
        }, round.length * 300 + 400)

        // 所有牌飞回牌堆，准备下一轮
        push(() => {
          setComparisonCards([])
          setShowComparisonResult(false)
          roundIdx++
          if (roundIdx < comparisonRounds.length) {
            push(showRound, 400)  // 平局重摸：稍作停顿后继续
          } else {
            push(() => setOpeningState('announcing'), 600)
          }
        }, round.length * 300 + 400 + 600)
      }

      push(showRound, 300)
    } else {
      // 娱乐模式：转盘选人动画（约 1.5s）
      setStatusText('')
      if (!playerIds || playerIds.length === 0) {
        setOpeningState('announcing')
        return
      }

      const totalSteps = 20
      let step = 0
      let currentIdx = 0
      setSpinDone(false)

      const spin = () => {
        if (step >= totalSteps) {
          // 最终停在 firstPlayerIndex
          setSpinHighlightIndex(firstPlayerIndex)
          setSpinDone(true)
          push(() => setOpeningState('announcing'), 800)
          return
        }

        // 速度：前半段快（间隔从 80ms 渐增到 500ms）
        const progress = step / totalSteps
        const interval = Math.round(80 + progress * progress * 420)

        currentIdx = step < totalSteps - 1
          ? (currentIdx + 1) % playerIds.length
          : firstPlayerIndex

        setSpinHighlightIndex(currentIdx)
        step++
        push(spin, interval)
      }

      push(spin, 300)
    }
  }, [openingState]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 阶段三 Step 3：起始玩家公告（1.2s） ─────────────────────
  useEffect(() => {
    if (openingState !== 'announcing') return
    setStatusText('')
    setShowAnnounce(true)
    push(() => {
      setShowAnnounce(false)
      setOpeningState('flippingFirstCard')
    }, 1400)
  }, [openingState, push])

  // ── 阶段三 Step 4：翻开起始牌（含功能牌重翻循环） ────────────
  // PRD 规则：
  //   1. 翻出数字牌 → 直接落入弃牌堆，进入下一流程
  //   2. 翻出功能牌 → 展示 600ms → 显示提示"功能牌不能作为起始牌，重新翻..."
  //              → 提示淡入淡出 600ms → 飞回牌堆底部 → 间隔 300ms 后重翻下一张
  //   3. 循环直到翻出数字牌（openingData.topCard 已确保是数字牌）
  useEffect(() => {
    if (openingState !== 'flippingFirstCard') return
    if (!openingData) {
      setOpeningState('ready')
      return
    }

    const { topCard: finalTopCard, skippedTopCards = [] } = openingData

    // 构建完整翻牌序列：[...功能牌, 最终数字牌]
    const flipSequence = [...skippedTopCards, finalTopCard]

    let t = 0  // 累计时间偏移量

    flipSequence.forEach((card, idx) => {
      const isLast = idx === flipSequence.length - 1
      const isSkipped = !isLast

      // 每次翻牌前先重置状态
      const flipStartDelay = t

      push(() => {
        // 1. 翻出这张牌（先显示牌背落入）
        // 同时通知父级（用于弃牌堆实时显示当前牌的颜色）
        // flipKey 递增 → DOM key 变化 → 强制重新挂载，确保 CSS 动画重新触发
        setCurrentFlipCard(card)
        onCardFlipping?.(card)
        setFlipKey((k) => k + 1)
        setShowFlip(true)
        setFlipDone(false)
        setIsReturnFlip(false)
        setInvalidCardHint(false)
      }, flipStartDelay)
      t += 300  // 牌背落入动画时间

      push(() => {
        // 2. 翻面显示牌面
        setFlipDone(true)
      }, t)
      t += 600  // 展示牌面 600ms

      if (isSkipped) {
        // 3. 功能牌：显示提示文字
        push(() => {
          setInvalidCardHint(true)
        }, t)
        t += 600  // 提示文字展示 600ms

        // 4. 提示消失 + 飞回牌堆
        push(() => {
          setInvalidCardHint(false)
          setIsReturnFlip(true)  // 触发飞回动画
        }, t)
        t += 400  // 飞回动画时间

        // 5. 隐藏牌，通知父级清空
        push(() => {
          setShowFlip(false)
          setFlipDone(false)
          setIsReturnFlip(false)
          setCurrentFlipCard(null)
          onCardFlipping?.(null)  // 功能牌飞回后通知父级清空
        }, t)
        t += 300  // 间隔 300ms 后翻下一张

      } else {
        // 最后一张（数字牌）：正常落入弃牌堆，结束
        // 不需要通知父级清空，游戏逻辑的 topCard 会接管
        push(() => {
          setShowFlip(false)
          setFlipDone(false)
          setCurrentFlipCard(null)
          // 数字牌翻完，通知父级：动画牌已落定（null = 回归游戏逻辑 topCard）
          onCardFlipping?.(null)
          setOpeningState('ready')
        }, t)
      }
    })
  }, [openingState]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 阶段完成 → 通知父级 ──────────────────────────────────────
  useEffect(() => {
    if (openingState === 'ready') {
      onReady?.()
    }
  }, [openingState]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 工具函数 ─────────────────────────────────────────────────
  const getPlayerName = (playerId) => {
    if (playerId?.startsWith?.('bot_')) return '机器人小智'
    const p = players?.find((pl) => pl.user_id === playerId)
    return p ? getDisplayName(p.profiles) : '玩家'
  }

  // 获取游戏区域相对坐标（所有动画都相对于游戏区域定位）
  const getGameAreaRelativeRect = (el) => {
    if (!el || !gameAreaRef?.current) return null
    const elRect = el.getBoundingClientRect()
    const gameRect = gameAreaRef.current.getBoundingClientRect()
    return {
      x: elRect.left - gameRect.left,
      y: elRect.top - gameRect.top,
      width: elRect.width,
      height: elRect.height,
    }
  }

  const getDrawPileCenter = () => {
    if (!drawPileRef?.current) {
      return { x: 0, y: 0 }
    }
    const rect = getGameAreaRelativeRect(drawPileRef.current)
    if (!rect) return { x: 0, y: 0 }
    // 计算元素中心点而非硬编码偏移
    return {
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height / 2,
    }
  }

  const getPlayerCenter = (playerId) => {
    // 我的手牌
    if (playerId === myUserId && playerHandRef?.current) {
      const rect = getGameAreaRelativeRect(playerHandRef.current)
      if (!rect) return { x: 0, y: 0 }
      // 计算元素中心点而非硬编码偏移
      return {
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height / 2,
      }
    }
    // 对手（OpponentArea 容器）
    const el = opponentRefs[playerId]
    if (el) {
      const rect = getGameAreaRelativeRect(el)
      if (!rect) return { x: 0, y: 0 }
      // 计算元素中心点而非硬编码偏移
      return {
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height / 2,
      }
    }
    // 降级：返回原点
    return { x: 0, y: 0 }
  }

  // ── 计算发牌动画的起点/终点 ───────────────────────────────────
  const drawPileCenter = getDrawPileCenter()

  if (openingState === 'idle' || openingState === 'ready') return null

  const firstPlayerId = openingData
    ? openingData.playerIds?.[openingData.firstPlayerIndex]
    : null
  const firstPlayerName = firstPlayerId ? getPlayerName(firstPlayerId) : ''
  const isIFirst = firstPlayerId === myUserId
  const isOfficial = (openingData?.gameMode || gameMode) === GAME_MODES.STANDARD

  // 如果没有 gameAreaRef，动画无法正确定位，不渲染
  if (!gameAreaRef?.current) return null

  // 发牌和翻牌动画内容（相对于游戏区域定位）
  // 使用 createPortal 挂载到 gameAreaRef 容器内
  const gameAreaAnimations = (
    <>
      {/* ── 发牌飞行牌（相对于游戏区域定位） ── */}
      {dealingCards.map((item) => {
        const to = getPlayerCenter(item.playerId)
        return (
          <DealingCard
            key={item.id}
            card={item.card}
            from={drawPileCenter}
            to={to}
            faceUp={item.playerId === myUserId}  // 只有自己的牌正面朝上
            delay={item.delay}
            duration={200}
            onDone={() => {}}
          />
        )
      })}

      {/* ── 翻开起始牌（改为飞行动画：从摸牌堆飞向弃牌堆） ── */}
      {/* 使用相对于游戏区域的定位，确保动画在正确位置显示 */}
      {showFlip && currentFlipCard && (() => {
        // 安全获取 ref，避免条件渲染导致的闪烁
        if (!drawPileRef?.current || !discardPileRef?.current || !gameAreaRef?.current) return null
        const fromRect = getGameAreaRelativeRect(drawPileRef.current)
        const toRect = getGameAreaRelativeRect(discardPileRef.current)
        if (!fromRect || !toRect) return null
        const card = currentFlipCard
        const isWild = card.type === CARD_TYPES.WILD || card.type === CARD_TYPES.WILD4
        const colorClass = isWild ? '' : (COLOR_CLASSES[card.color]?.bg || 'bg-gray-500')

        // 起点：摸牌堆中心
        const fromX = fromRect.x + fromRect.width / 2 - 36  // 牌宽 72，半宽 36
        const fromY = fromRect.y + fromRect.height / 2 - 56 // 牌高 112，半高 56

        // 终点：弃牌堆中心
        const toX = toRect.x + toRect.width / 2 - 36
        const toY = toRect.y + toRect.height / 2 - 56

        // 计算飞行过程中的插值坐标和缩放
        const progress = flipDone ? 1 : 0
        const currentX = fromX + (toX - fromX) * progress
        const currentY = fromY + (toY - fromY) * progress
        const currentScale = 0.8 + (1 - 0.8) * progress

        // 飞回动画：飞回摸牌堆 + 缩小消失
        const returnStyle = isReturnFlip
          ? {
              transition: 'left 0.35s cubic-bezier(0.4,0,1,1), top 0.35s cubic-bezier(0.4,0,1,1), transform 0.35s cubic-bezier(0.4,0,1,1), opacity 0.25s ease 0.1s',
              left: fromX,
              top: fromY,
              transform: `scale(0.5)`,
              opacity: 0,
            }
          : {
              transition: flipDone
                ? 'left 0.3s cubic-bezier(0.34,1.56,0.64,1), top 0.3s cubic-bezier(0.34,1.56,0.64,1), transform 0.3s cubic-bezier(0.34,1.56,0.64,1)'
                : 'none',
              left: currentX,
              top: currentY,
              transform: `scale(${currentScale})`,
            }

        return (
          <>
            {/* 牌背层（flipDone=false 时显示） */}
            {!flipDone && (
              <div
                key={`flip-back-${flipKey}`}
                className="absolute z-[74] pointer-events-none"
                style={{
                  width: 72,
                  height: 112,
                  borderRadius: 10,
                  border: '3px solid white',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
                  overflow: 'hidden',
                  ...returnStyle,
                }}
              >
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}
                >
                  <span style={{ fontSize: 11, fontWeight: 900, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>UNO</span>
                </div>
              </div>
            )}
             {/* 牌面层（flipDone=true 时显示） — 到达终点后翻面 */}
             {flipDone && (
               <div
                 key={`flip-face-${flipKey}`}
                 className="absolute z-[74] pointer-events-none"
                style={{
                  width: 72,
                  height: 112,
                  borderRadius: 10,
                  border: '3px solid white',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
                  overflow: 'hidden',
                  ...returnStyle,
                }}
              >
                <div
                  className={`absolute inset-0 ${isWild ? 'bg-gradient-to-br from-red-500 via-yellow-400 to-blue-500' : colorClass}`}
                >
                  <div className="absolute inset-2 bg-white rounded-lg flex flex-col justify-between p-1">
                    <div className={`text-xs font-extrabold leading-none text-left ${isWild ? 'text-gray-900' : (COLOR_CLASSES[card.color]?.text || 'text-gray-900')}`}>
                      {card.type === CARD_TYPES.NUMBER ? card.value : (CARD_SYMBOLS[card.type] || '?')}
                    </div>
                    <div className={`text-2xl font-extrabold leading-none text-center ${isWild ? 'text-gray-900' : (COLOR_CLASSES[card.color]?.text || 'text-gray-900')}`}>
                      {card.type === CARD_TYPES.NUMBER ? card.value : (CARD_SYMBOLS[card.type] || '?')}
                    </div>
                    <div className={`text-xs font-extrabold leading-none text-right rotate-180 ${isWild ? 'text-gray-900' : (COLOR_CLASSES[card.color]?.text || 'text-gray-900')}`}>
                      {card.type === CARD_TYPES.NUMBER ? card.value : (CARD_SYMBOLS[card.type] || '?')}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )
      })()}

      {/* ── 阶段提示浮层（非 idle/ready 时显示轻量蒙层） ── */}
      {(openingState === 'transitioning' || openingState === 'dealing') && (
        <div
          className="absolute inset-0 z-[50] pointer-events-none"
          style={{ background: 'rgba(0,0,0,0.08)' }}
        />
      )}

      {/* ── 比牌 / 转盘（官方/娱乐）覆盖层 ── */}
      {/* 使用 absolute 定位相对于游戏区域，跟随游戏区域滚动 */}
      {(openingState === 'decidingStarter' || (openingState === 'dealing' && comparisonCards.length > 0)) && (
        <>
          {/* 比牌提示文字 */}
          {statusText && (
            <div
              className="absolute left-1/2 -translate-x-1/2 z-[72] pointer-events-none"
              style={{ top: '30%', animation: 'openingFadeIn 0.3s ease forwards' }}
            >
              <div className="bg-black/60 backdrop-blur-sm text-white font-bold text-lg px-6 py-2 rounded-full tracking-wide shadow-xl border border-white/20">
                {statusText}
              </div>
            </div>
          )}

          {/* 官方模式：中央展示比较的牌 */}
          {isOfficial && comparisonCards.length > 0 && (
            <div
              className="absolute inset-0 z-[71] flex items-center justify-center pointer-events-none"
              style={{ animation: 'openingFadeIn 0.25s ease forwards' }}
            >
              <div className="flex flex-col items-center gap-4">
                <div className="flex gap-3 items-end flex-wrap justify-center px-4">
                  {comparisonCards.map((item, i) => {
                    const name = getPlayerName(item.playerId)
                    const isWinner = showComparisonResult && item.isWinner
                    const isLoser = showComparisonResult && !item.isWinner
                    return (
                      <div
                        key={item.playerId + i}
                        className="flex flex-col items-center gap-1.5"
                        style={{ animation: 'openingCardIn 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards', opacity: 0 }}
                      >
                        {/* 玩家名 */}
                        <div
                          className={`text-xs font-bold px-2 py-0.5 rounded-full transition-all ${
                            isWinner
                              ? 'bg-yellow-400 text-yellow-900 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                              : isLoser
                                ? 'bg-gray-600/70 text-gray-300'
                                : 'bg-white/70 text-gray-800'
                          }`}
                        >
                          {name}
                        </div>
                        {/* 牌面 */}
                        <div
                          className={`relative w-12 h-[74px] rounded-lg border-[3px] transition-all duration-300 ${
                            isWinner
                              ? 'border-yellow-400 shadow-[0_0_20px_rgba(251,191,36,0.8)] scale-110'
                              : isLoser
                                ? 'border-white/30 opacity-50'
                                : 'border-white shadow-lg'
                          } ${
                            item.card.type === CARD_TYPES.WILD || item.card.type === CARD_TYPES.WILD4
                              ? 'bg-gradient-to-br from-red-500 via-yellow-400 to-blue-500'
                              : (COLOR_CLASSES[item.card.color]?.bg || 'bg-gray-500')
                          }`}
                        >
                          <div className="absolute inset-1 bg-white rounded flex flex-col justify-between p-0.5">
                            <div
                              className={`text-left font-extrabold leading-none text-xs ${
                                (item.card.type === CARD_TYPES.WILD || item.card.type === CARD_TYPES.WILD4)
                                  ? 'text-gray-900'
                                  : (COLOR_CLASSES[item.card.color]?.text || 'text-gray-900')
                              }`}
                            >
                              {item.card.type === CARD_TYPES.NUMBER ? item.card.value : (CARD_SYMBOLS[item.card.type] || '?')}
                            </div>
                            <div
                              className={`text-center font-extrabold leading-none text-xl ${
                                (item.card.type === CARD_TYPES.WILD || item.card.type === CARD_TYPES.WILD4)
                                  ? 'text-gray-900'
                                  : (COLOR_CLASSES[item.card.color]?.text || 'text-gray-900')
                              }`}
                            >
                              {item.card.type === CARD_TYPES.NUMBER ? item.card.value : (CARD_SYMBOLS[item.card.type] || '?')}
                            </div>
                            <div
                              className={`text-right font-extrabold leading-none text-xs rotate-180 ${
                                (item.card.type === CARD_TYPES.WILD || item.card.type === CARD_TYPES.WILD4)
                                  ? 'text-gray-900'
                                  : (COLOR_CLASSES[item.card.color]?.text || 'text-gray-900')
                              }`}
                            >
                              {item.card.type === CARD_TYPES.NUMBER ? item.card.value : (CARD_SYMBOLS[item.card.type] || '?')}
                            </div>
                          </div>
                          {/* 获胜标记 */}
                          {isWinner && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-yellow-400 font-black text-base leading-none">
                              ★
                            </div>
                          )}
                        </div>
                        {/* 数字 */}
                        <div className={`text-sm font-black ${isWinner ? 'text-yellow-300' : isLoser ? 'text-gray-400' : 'text-white'}`}>
                          {item.card.value}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* 平局提示 */}
                {showComparisonResult && comparisonCards.filter((c) => c.isWinner).length > 1 && (
                  <div className="text-yellow-300 font-bold text-base animate-pulse">
                    🎲 平局！重新摸牌...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 娱乐模式：转盘高亮 */}
          {!isOfficial && !spinDone && (
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[71] pointer-events-none"
              style={{ animation: 'openingFadeIn 0.3s ease forwards' }}
            >
              <div className="bg-black/50 backdrop-blur-sm rounded-2xl px-8 py-4 border border-white/20 shadow-2xl flex flex-col items-center gap-3">
                <div className="text-white font-bold text-sm tracking-wide">🎲 随机选择先手玩家...</div>
                <div className="flex gap-2 flex-wrap justify-center max-w-xs">
                  {openingData?.playerIds?.map((pid, idx) => {
                    const name = getPlayerName(pid)
                    const isHighlighted = spinHighlightIndex === idx
                    return (
                      <div
                        key={pid}
                        className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all duration-75 ${
                          isHighlighted
                            ? 'bg-yellow-400 text-yellow-900 scale-110 shadow-[0_0_12px_rgba(251,191,36,0.7)]'
                            : 'bg-white/20 text-white/70'
                        }`}
                      >
                        {name}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── 先手公告（固定尺寸，不随页面缩放） ── */}
      {showAnnounce && (
        <div
          className="absolute inset-0 z-[73] flex items-center justify-center pointer-events-none"
          style={{ animation: 'openingAnnounceOverlay 1.4s ease forwards' }}
        >
          <div
            className="flex flex-col items-center gap-3"
            style={{ animation: 'openingCardIn 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards', opacity: 0 }}
          >
            <div
              className="rounded-2xl shadow-2xl border-4 border-white/70 flex flex-col items-center gap-1.5"
              style={{
                padding: '24px 32px',
                background: isIFirst
                  ? 'linear-gradient(135deg, #7c3aed, #4f46e5, #2563eb)'
                  : 'linear-gradient(135deg, #059669, #0891b2, #1d4ed8)',
                boxShadow: isIFirst
                  ? '0 0 60px rgba(124,58,237,0.5), 0 0 120px rgba(79,70,229,0.3)'
                  : '0 0 60px rgba(5,150,105,0.4), 0 0 120px rgba(8,145,178,0.25)',
              }}
            >
              <span
                className="font-black text-white tracking-widest"
                style={{ fontSize: '42px', lineHeight: 1, textShadow: '0 4px 16px rgba(0,0,0,0.4)' }}
              >
                先出牌！
              </span>
              <span
                className="text-white/90 font-bold tracking-wide"
                style={{ fontSize: '18px' }}
              >
                {isIFirst ? '🎯 轮到你先出牌！' : `🎯 ${firstPlayerName} 先出牌`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── 功能牌不合法提示文字 ── */}
      {invalidCardHint && (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-[75] pointer-events-none"
          style={{ top: '30%', animation: 'openingInvalidCardHint 0.6s ease forwards' }}
        >
          <div className="bg-orange-500/90 backdrop-blur-sm text-white font-bold text-sm px-5 py-2 rounded-full tracking-wide shadow-xl border border-orange-300/50 flex items-center gap-2">
            <span>⚠️</span>
            <span>功能牌不能作为起始牌，重新翻...</span>
          </div>
        </div>
      )}

      {/* ── CSS 关键帧 ── */}
      <style>{`
        @keyframes openingFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes openingCardIn {
          0%   { transform: scale(0.4) translateY(20px); opacity: 0; }
          60%  { transform: scale(1.08) translateY(-4px); opacity: 1; }
          80%  { transform: scale(0.97) translateY(2px); }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes openingAnnounceOverlay {
          0%   { opacity: 0; }
          10%  { opacity: 1; }
          80%  { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes openingFlipFaceDown {
          0%   { transform: translateY(-30px) scale(0.6); opacity: 0; }
          60%  { transform: translateY(4px) scale(1.06); opacity: 1; }
          80%  { transform: translateY(-2px) scale(0.98); }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes openingInvalidCardHint {
          0%   { opacity: 0; transform: translateX(-50%) translateY(-6px); }
          15%  { opacity: 1; transform: translateX(-50%) translateY(0); }
          75%  { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-4px); }
        }
      `}</style>
    </>
  )

  return (
    <>
      {/* 使用 Portal 将动画挂载到 gameAreaRef 容器内 */}
      {createPortal(gameAreaAnimations, gameAreaRef.current)}
    </>
  )
}
