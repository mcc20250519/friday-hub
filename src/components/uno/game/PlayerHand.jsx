/**
 * PlayerHand - 当前玩家手牌区域（扇形展示）
 */

import { useState, useRef } from 'react'
import ColorPicker from './ColorPicker'
import { canPlayCard, getPlayableCards } from '@/lib/uno/rules'
import { CARD_TYPES, COLOR_CLASSES, CARD_SYMBOLS, GAME_MODES } from '@/lib/uno/constants'


/**
 * 单张手牌（内联渲染，支持悬停上浮+扇形旋转）
 */
function HandCard({
  card,
  index,
  total,
  isPlayable,
  isSelected,
  isMyTurn,
  isFlying,  // 是否正在飞行中（透明隐藏但保持占位）
  onClick,
}) {
  const [hovered, setHovered] = useState(false)
  const btnRef = useRef(null)

  // ── 扇形参数计算 ─────────────────────────────────────────────
  const maxSpread = Math.min(total * 5, 50)
  const step = total > 1 ? maxSpread / (total - 1) : 0
  const rotate = -maxSpread / 2 + index * step
  const offset = -Math.abs(rotate) * 0.5

  const isWild = card.type === CARD_TYPES.WILD || card.type === CARD_TYPES.WILD4
  const colorClasses = COLOR_CLASSES[card.color] || COLOR_CLASSES.black
  const displayContent =
    card.type === CARD_TYPES.NUMBER ? card.value : CARD_SYMBOLS[card.type] || '?'

  const hoverStyle = hovered || isSelected
    ? { transform: `rotate(0deg) translateY(-24px) scale(1.08)`, zIndex: 100 }
    : { transform: `rotate(${rotate}deg) translateY(${offset}px)`, zIndex: index }

  const handleClick = () => {
    // 把当前牌的屏幕坐标和旋转角传给父级
    const rect = btnRef.current?.getBoundingClientRect()
    onClick(rect, rotate)
  }

  return (
    <button
      ref={btnRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleClick}
      disabled={isMyTurn && !isPlayable}
      className={`
        relative flex-shrink-0
        transition-all duration-200 ease-out
        focus:outline-none
        ${isMyTurn && isPlayable
          ? 'cursor-pointer'
          : isMyTurn
            ? 'cursor-not-allowed'
            : 'cursor-default'
        }
      `}
      style={{
        ...hoverStyle,
        marginLeft: index > 0 ? '-18px' : '0',
        transformOrigin: 'bottom center',
        // 飞行中的牌：透明但保持占位
        opacity: isFlying ? 0 : 1,
        pointerEvents: isFlying ? 'none' : 'auto',
        visibility: isFlying ? 'hidden' : 'visible',
      }}
    >
      {/* 只在我的回合时才显示交互提示 */}
      {isMyTurn && (
        <>
          {/* 可出牌高亮环 */}
          {isPlayable && (
            <div
              className={`absolute inset-0 rounded-xl ring-2 ${colorClasses.ring} ring-offset-1 pointer-events-none`}
              style={{ zIndex: 1 }}
            />
          )}

          {/* 选中高亮环 */}
          {isSelected && (
            <div
              className="absolute inset-0 rounded-xl ring-4 ring-purple-400 ring-offset-2 pointer-events-none"
              style={{ zIndex: 2 }}
            />
          )}

          {/* 不可出时半透明遮罩 */}
          {!isPlayable && (
            <div className="absolute inset-0 rounded-xl bg-black/30 pointer-events-none" style={{ zIndex: 2 }} />
          )}
        </>
      )}

      {/* 牌面 */}
      <div
        className={`
          w-14 h-22 rounded-xl border-4 shadow-lg relative overflow-hidden
          ${isWild
            ? 'border-white bg-gradient-to-br from-red-500 via-yellow-500 via-green-500 to-blue-500'
            : `${colorClasses.bg} border-white`
          }
        `}
        style={{ width: '56px', height: '88px' }}
      >
        {/* 白色内卡 */}
        <div className="absolute inset-[5px] bg-white rounded-lg flex flex-col justify-between p-1">
          {/* 左上角 */}
          <div
            className={`text-left font-extrabold text-xs leading-none ${
              isWild ? 'text-gray-900' : colorClasses.text
            }`}
          >
            {displayContent}
          </div>
          {/* 中央 */}
          <div
            className={`text-center font-extrabold text-2xl leading-none ${
              isWild ? 'text-gray-900' : colorClasses.text
            }`}
          >
            {displayContent}
          </div>
          {/* 右下角镜像 */}
          <div
            className={`text-right font-extrabold text-xs leading-none rotate-180 ${
              isWild ? 'text-gray-900' : colorClasses.text
            }`}
          >
            {displayContent}
          </div>
        </div>
      </div>
    </button>
  )
}

/**
 * @param {Object} props
 * @param {Array} props.hand - 手牌数组
 * @param {Object} props.topCard - 当前顶牌
 * @param {string} props.currentColor - 当前有效颜色
 * @param {boolean} props.isMyTurn - 是否轮到我
 * @param {number} props.pendingDrawCount - 待摸牌数
 * @param {Function} props.onPlayCard - 出牌回调
 * @param {Function} props.onDrawCard - 摸牌回调
 * @param {Function} props.onCallUno - 喊 UNO 回调
 * @param {boolean} props.actionsLoading - 操作加载中
 * @param {boolean} props.unoWindowOpen - UNO 窗口是否开启（PRD 新增）
 * @param {string} props.gameMode - 游戏模式（standard / entertainment）
 * @param {boolean} props.myIsFinished - 娱乐模式：我是否已出完牌
 * @param {boolean} props.interactionLocked - 全局交互锁（UNO 动画播放期间为 true）
 */
export default function PlayerHand({
  hand = [],
  topCard,
  currentColor,
  isMyTurn,
  pendingDrawCount = 0,
  onPlayCard,
  onDrawCard,
  onCallUno,
  actionsLoading,
  flyingCardId,
  myUnoCalled = false,
  // PRD: 移除旧的 UNO 倒计时 props，新增 UNO 窗口状态
  // showUnoPrompt = false,
  // unoCountdown = 2,
  // unoMissed = false,
  unoWindowOpen = false,
  gameMode = GAME_MODES.STANDARD,
  myIsFinished = false,
  interactionLocked = false,
}) {
  const [selectedCard, setSelectedCard] = useState(null)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const pendingPlayRef = useRef(null) // 暂存 Wild 牌的坐标，等选色后使用

  // 不再过滤手牌，而是保留所有牌用于渲染
  // 飞行中的牌会在 HandCard 中被隐藏，保持占位防止闪回
  const displayHand = hand

  const isEntertainment = gameMode === GAME_MODES.ENTERTAINMENT

  // 可出牌列表（根据游戏模式传入 pendingDrawCount，娱乐模式支持叠加）
  // 官方模式：pendingDrawCount > 0 时无法出牌（必须摸牌）
  // 娱乐模式：pendingDrawCount > 0 时只能出 +2/+4 叠加
  // interactionLocked 时，所有牌均不可出（静默禁用）
  // PRD: 移除旧的 missed 惩罚逻辑，现在由 applyPenalty 处理
  const playableCards = isMyTurn && !actionsLoading && !interactionLocked
    ? getPlayableCards(displayHand, topCard, currentColor, pendingDrawCount, gameMode)
    : []

  const isCardPlayable = (card) => {
    // UNO 动画锁定期间：所有牌不可出（静默禁用）
    if (interactionLocked) return false
    // 官方模式：有待摸牌时所有牌不可出（必须摸）
    if (!isEntertainment && pendingDrawCount > 0) return false
    // 双重检查：必须是我的回合且牌在可出列表中
    if (!isMyTurn) return false
    return playableCards.some((c) => c.id === card.id)
  }

  // 主动摸牌条件：
  //   官方模式：只有无牌可出时才能摸牌（有牌必须出）
  //   娱乐模式：有牌/无牌都可以主动选择摸牌（无叠加链时）
  //   interactionLocked 期间不可摸牌
  const canVoluntaryDraw = isMyTurn && !actionsLoading && !interactionLocked && pendingDrawCount === 0 && (
    isEntertainment
      ? true                          // 娱乐：始终可以主动摸牌
      : playableCards.length === 0    // 官方：只有无牌可出才能摸牌
  )

  // rect: HandCard 传来的 getBoundingClientRect()；rotate: 当前扇形旋转角
  const handleCardClick = (card, rect, rotate) => {
    // UNO 动画锁定期间静默拦截，不显示任何提示
    if (interactionLocked) return
    if (!isMyTurn || !isCardPlayable(card)) return
    // 娱乐模式下 pendingDrawCount > 0 时可以叠加出牌（+2/+4），不阻止
    if (actionsLoading) return
    if (!isEntertainment && pendingDrawCount > 0) return

    const isWild = card.type === CARD_TYPES.WILD || card.type === CARD_TYPES.WILD4
    if (isWild) {
      // Wild 牌需要先选色，暂存坐标信息
      pendingPlayRef.current = { rect, rotate }
      setSelectedCard(card)
      setShowColorPicker(true)
    } else {
      onPlayCard(card, null, rect, rotate)
    }
  }

  const handleColorSelect = async (color) => {
    setShowColorPicker(false)
    if (selectedCard) {
      const { rect, rotate } = pendingPlayRef.current || {}
      pendingPlayRef.current = null
      await onPlayCard(selectedCard, color, rect, rotate)
      setSelectedCard(null)
    }
  }

  return (
    <div className="w-full">
      {/* 回合指示 */}
      {isMyTurn && (
        <div className="text-center mb-2">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-yellow-100 text-yellow-700 rounded-full text-sm font-semibold animate-pulse">
            ⚡ 轮到你出牌了！
          </span>
        </div>
      )}

      {/* 手牌容器：relative 容器，用于内部绝对定位 */}
      <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl pt-4 pb-4 px-4 shadow-inner">
        {/* UNO 动画锁定期间：半透明遮罩 + not-allowed 光标（静默禁用所有交互） */}
        {interactionLocked && (
          <div
            className="absolute inset-0 rounded-2xl z-30 pointer-events-auto"
            style={{
              background: 'rgba(0, 0, 0, 0.18)',
              cursor: 'not-allowed',
              backdropFilter: 'blur(1px)',
              WebkitBackdropFilter: 'blur(1px)',
            }}
          />
        )}

        {/* PRD: 移除旧的 UNO 倒计时按钮，现在由 UnoButton 组件处理 */}

        {/* 信息栏 */}
        <div className="flex items-center justify-between mb-3 min-h-[28px]">
          <span className="text-xs text-gray-500 font-medium">
            🎴 我的手牌（{displayHand.length}）
          </span>

          <div className="flex items-center gap-2">
            {/* +2/+4 强制摸牌提示 */}
            {isMyTurn && pendingDrawCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold border border-red-200">
                ⚠️ 哎呀，你需要摸 {pendingDrawCount} 张牌
              </span>
            )}

            {/* 官方规则：有牌可出时，提示必须出牌，不能摸牌 */}
            {!isEntertainment && isMyTurn && pendingDrawCount === 0 && playableCards.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-semibold border border-yellow-200">
                📌 有牌就得打出去哦
              </span>
            )}

            {/* 强制摸牌按钮：+2/+4 惩罚
                娱乐模式：手中有可叠加牌时不显示（提示出牌，而非强制摸）
                官方模式：始终显示（必须摸牌）
            */}
            {isMyTurn && pendingDrawCount > 0 && (
              !isEntertainment || playableCards.length === 0
            ) && (
              <button
                onClick={onDrawCard}
                disabled={actionsLoading}
                className="text-xs px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-full font-semibold transition-colors disabled:opacity-50"
              >
                👇 摸 {pendingDrawCount} 张牌
              </button>
            )}

            {/* 主动摸牌按钮：
                官方模式：无牌可出时才显示，文案"摸一张"（蓝色）
                娱乐模式：始终显示
                  - 有牌可出 → 摸牌是主动选择 → "🎲 摸一张（可选）"（紫色）
                  - 无牌可出 → 只能摸牌没得选 → "摸一张"（蓝色）
            */}
            {canVoluntaryDraw && (
              <button
                onClick={onDrawCard}
                disabled={actionsLoading}
                className={`text-xs px-3 py-1 text-white rounded-full font-semibold transition-colors disabled:opacity-50
                  ${isEntertainment && playableCards.length > 0
                    ? 'bg-purple-500 hover:bg-purple-600'   // 娱乐有牌可出：可选摸牌，紫色
                    : 'bg-blue-500 hover:bg-blue-600'       // 无牌可出 或 官方模式：蓝色
                  }`}
              >
                {isEntertainment && playableCards.length > 0 ? '🎲 摸一张（可选）' : '👇 摸一张'}
              </button>
            )}

            {/* 已喊 UNO 的状态标记 */}
            {displayHand.length === 1 && myUnoCalled && (
              <span className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-600 font-semibold border border-green-200">
                ✅ UNO!
              </span>
            )}
          </div>
        </div>

        {/* 扇形手牌区 */}
        {displayHand.length === 0 ? (
          <div className="text-gray-400 text-sm text-center py-8">暂无手牌</div>
        ) : (
          <div
            className="relative flex justify-center items-end"
            style={{
              height: '120px',
              // 宽度随牌数动态扩展，但设置最小值
              minWidth: `${Math.min(displayHand.length, 14) * 38 + 60}px`,
              overflow: 'visible',
            }}
          >
             {displayHand.map((card, index) => (
               <HandCard
                 key={card.id}
                 card={card}
                 index={index}
                 total={displayHand.length}
                 isPlayable={isCardPlayable(card)}
                 isSelected={selectedCard?.id === card.id}
                 isMyTurn={isMyTurn}
                 isFlying={flyingCardId === card.id}
                 onClick={(rect, rotate) => handleCardClick(card, rect, rotate)}
               />
            ))}
          </div>
        )}
      </div>

      {/* Wild 牌选色弹窗 */}
      <ColorPicker visible={showColorPicker} onSelect={handleColorSelect} />
    </div>
  )
}
