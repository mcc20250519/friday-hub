/**
 * OpponentArea - 对手区域
 *
 * 定位方式：
 *   所有对手卡片均使用 position:absolute + left/top（百分比）
 *   + transform: translate(-50%, -50%)，以卡片中心点对齐目标坐标。
 *   容器设置 overflow:hidden，防止任何内容溢出。
 *
 * 坐标规格（x=左右%, y=上下%，均为中心点）：
 *
 *  1人（2人局）：x=50%, y=10%
 *
 *  2人（3人局）：
 *    A: x=10%, y=32%；B: x=90%, y=32%
 *
 *  3人（4人局）：
 *    A: x=10%, y=38%；B: x=50%, y=10%；C: x=90%, y=38%
 *
 *  4人（5人局）：
 *    A: x=10%, y=38%；B: x=32%, y=10%；C: x=68%, y=10%；D: x=90%, y=38%
 *
 *  5人（6人局）：
 *    A: x=10%, y=38%；B: x=25%, y=10%；C: x=50%, y=10%；D: x=75%, y=10%；E: x=90%, y=38%
 *
 *  6人+（7人局及以上）：半椭圆均匀分布
 *    圆心 (50%, 45%)，radiusX=40%，radiusY=30%
 *    角度从 180°（最左）均匀步进到 0°（最右）
 *    x/y clamp 在 [10%, 90%] 和 [10%, 85%] 范围内
 */

import { getDisplayName } from '@/hooks/uno/useUnoRoom'
import ReportButton from './ReportButton'

// UNO 官方四色牌背
const BACK_COLORS = [
  'bg-red-500',
  'bg-amber-400',
  'bg-lime-600',
  'bg-blue-500',
  'bg-red-500',
  'bg-amber-400',
  'bg-lime-600',
  'bg-blue-500',
]

// 玩家头像渐变色（10 种）
const SEAT_COLORS = [
  'from-red-500 to-red-600',
  'from-yellow-500 to-yellow-600',
  'from-green-500 to-green-600',
  'from-blue-500 to-blue-600',
  'from-purple-500 to-purple-600',
  'from-pink-500 to-pink-600',
  'from-indigo-500 to-indigo-600',
  'from-cyan-500 to-cyan-600',
  'from-orange-500 to-orange-600',
  'from-teal-500 to-teal-600',
]

/** clamp 辅助 */
function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val))
}

/**
 * 计算对手节点的百分比坐标（x%, y%）
 *
 * @param {number} count  - 对手数量（1~9）
 * @returns {{ x: string, y: string }[]}  如 [{ x: '50%', y: '10%' }, ...]
 */
/**
 * 安全边距说明：
 *   卡片以中心点定位（translate -50%,-50%），卡片宽约 80-110px。
 *   容器宽约 1000px → 半宽约 5-6% → 左右最小安全中心 ≈ 12%/88%
 *   容器高约 680px，卡片高约 90-110px → 半高约 7-8% → 顶部最小安全中心 ≈ 12%
 *
 *   优化后的规则（更宽松的布局）：
 *     左/右侧列：x = 12% / 88%
 *     顶部行：   y = 12%
 *     中侧行：   y = 35%
 */
function getOpponentPositions(count) {
  // ── 1人（2人局）：正上方 ──────────────────────────────────────
  if (count === 1) {
    return [{ x: '50%', y: '12%' }]
  }

  // ── 2人（3人局）：左右对称，稍微靠下避免与顶部重叠 ──────────────────────────────────────
  if (count === 2) {
    return [
      { x: '25%', y: '28%' },
      { x: '75%', y: '28%' },
    ]
  }

  // ── 3人（4人局）：弧形分布（上方无重叠，保持原位）──────────────────────────────────────
  if (count === 3) {
    return [
      { x: '22%', y: '30%' },
      { x: '50%', y: '12%' },
      { x: '78%', y: '30%' },
    ]
  }

  // ── 4人（5人局）：更均匀的弧形（上方无重叠，保持原位）──────────────────────────────────────
  if (count === 4) {
    return [
      { x: '18%', y: '32%' },
      { x: '38%', y: '12%' },
      { x: '62%', y: '12%' },
      { x: '82%', y: '32%' },
    ]
  }

  // ── 5人（6人局）：顶部3人 + 两侧2人，两侧下移避免与顶部玩家重叠 ──────────────────────
  if (count === 5) {
    return [
      { x: '15%', y: '40%' },
      { x: '35%', y: '12%' },
      { x: '50%', y: '12%' },
      { x: '65%', y: '12%' },
      { x: '85%', y: '40%' },
    ]
  }

  // ── 6人+：半椭圆均匀分布，两端玩家下移避免重叠 ─────────────────────────────────────
  // 圆心 (50%, 45%)，水平半径 38%，垂直半径 25%
  // 两端玩家额外下移 5-8%
  // clamp 范围：x 在 [12%, 88%]，y 在 [10%, 70%]
  return Array.from({ length: count }, (_, i) => {
    const angleDeg = 180 - i * 180 / (count - 1)   // 180° → 0°
    const angleRad = angleDeg * Math.PI / 180
    const xPct = clamp(50 + 38 * Math.cos(angleRad), 12, 88)
    // 基础 y 坐标（椭圆上半部分）
    let yPct = 45 - 25 * Math.sin(angleRad)
    // 两端玩家（角度接近 180° 或 0°）额外下移
    const distFromEnd = Math.min(Math.abs(angleDeg - 180), Math.abs(angleDeg))
    if (distFromEnd < 30) {
      // 距离两端越近，下移越多（最多 8%）
      const extraDown = (1 - distFromEnd / 30) * 8
      yPct += extraDown
    }
    yPct = clamp(yPct, 12, 65)
    return { x: `${xPct.toFixed(1)}%`, y: `${yPct.toFixed(1)}%` }
  })
}

/**
 * @param {Object}   props
 * @param {Array}    props.opponents      - 对手数据
 * @param {number}   props.direction      - 游戏方向
 * @param {Object}   props.unoCalled      - 所有玩家的 UNO 状态对象
 * @param {Function} props.onCardAreaRef  - (userId, el) => void，暴露每个对手牌区域 DOM
 * @param {string|null} props.firstPlayerId - 先手玩家 ID（展示 1.5s 高亮边框，null 表示不展示）
 * @param {boolean}  props.unoWindowOpen  - PRD: UNO 窗口是否开启
 * @param {string|null} props.unoWindowOwner - PRD: 当前窗口归属的玩家 ID
 * @param {Array}    props.reportedThisWindow - PRD: 本窗口已被举报的玩家 ID 列表
 * @param {Function} props.onReportPlayer - PRD: 举报玩家回调
 */
export default function OpponentArea({
  opponents,
  direction,
  unoCalled = {},
  onCardAreaRef,
  firstPlayerId = null,
  // PRD: 举报系统
  unoWindowOpen = false,
  unoWindowOwner = null,
  reportedThisWindow = [],
  onReportPlayer,
}) {
  if (!opponents || opponents.length === 0) return null

  const count = opponents.length
  const positions = getOpponentPositions(count)

  // 卡片尺寸分级：根据对手人数逐步收缩
  const isTight   = count >= 8
  const isCompact = count >= 5
  const isLarge   = count <= 2

  const displayLimit = isTight ? 4  : isCompact ? 6  : 12
  const cardW        = isTight ? 18 : isCompact ? 24 : isLarge ? 36 : 30
  const cardH        = isTight ? 28 : isCompact ? 36 : isLarge ? 56 : 46
  const fanSpacing   = isTight ? 6  : isCompact ? 9  : isLarge ? 14 : 12

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {opponents.map((opponent, index) => {
        const displayName = getDisplayName(opponent.profile, opponent.profile?.email)
        const initial     = displayName.charAt(0).toUpperCase()
        const avatarUrl   = opponent.profile?.avatar_url
        const bgColor     = SEAT_COLORS[opponent.seatIndex % SEAT_COLORS.length]

        const pos = positions[index] || { x: '50%', y: '10%' }

        // 扇形牌背参数
        const cardCount  = Math.min(opponent.handCount, displayLimit)
        const maxSpread  = Math.min(cardCount * 6, 36)
        const step       = cardCount > 1 ? maxSpread / (cardCount - 1) : 0

        const isFirstPlayer = firstPlayerId && opponent.userId === firstPlayerId

        return (
          <div
            key={opponent.userId}
            className={`flex flex-col items-center rounded-xl transition-all pointer-events-auto
              ${isTight ? 'px-1.5 pt-1 pb-1.5 gap-0.5' : isCompact ? 'px-2 pt-1.5 pb-2 gap-1' : 'px-3 pt-2 pb-2.5 gap-1.5'}
              ${opponent.isCurrentTurn
                // 高亮：加粗边框 + 强阴影 + 亮背景，不使用 scale（避免溢出容器）
                ? 'bg-yellow-50 border-2 border-yellow-400 shadow-[0_0_12px_3px_rgba(251,191,36,0.5)]'
                : isFirstPlayer
                  // 先手高亮：紫色边框 + 光晕
                  ? 'bg-purple-50 border-2 border-purple-400 shadow-[0_0_14px_4px_rgba(147,51,234,0.45)]'
                  : 'bg-white/90 border border-gray-200 backdrop-blur-sm shadow-md'
              }`}
            style={{
              position: 'absolute',
              left: pos.x,
              top: pos.y,
              // 以卡片自身中心点对齐坐标，无论卡片宽高如何都不会溢出
              transform: 'translate(-50%, -50%)',
              transformOrigin: 'center center',
            }}
          >
            {/* 玩家信息行 */}
            <div className={`flex items-center ${isTight ? 'gap-0.5' : isCompact ? 'gap-1' : 'gap-2'}`}>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className={`${isTight ? 'w-5 h-5' : isCompact ? 'w-6 h-6' : 'w-8 h-8'} rounded-full object-cover flex-shrink-0`}
                />
              ) : (
                <div
                  className={`${isTight ? 'w-5 h-5' : isCompact ? 'w-6 h-6' : 'w-8 h-8'} rounded-full bg-gradient-to-br ${bgColor} flex items-center justify-center text-white font-bold ${isTight ? 'text-[8px]' : isCompact ? 'text-[10px]' : 'text-xs'} flex-shrink-0`}
                >
                  {initial}
                </div>
              )}
              <div className="min-w-0">
                <div className={`font-semibold text-gray-800 truncate leading-tight ${isTight ? 'text-[9px] max-w-[40px]' : isCompact ? 'text-[10px] max-w-[52px]' : 'text-sm max-w-[72px]'}`}>
                  {displayName}
                </div>
                <div className={`text-gray-400 leading-tight ${isTight ? 'text-[8px]' : isCompact ? 'text-[9px]' : 'text-xs'}`}>
                  {opponent.handCount} 张
                </div>
              </div>
            </div>

            {/* 扇形牌背 */}
            {opponent.handCount > 0 && (
              <div
                ref={(el) => onCardAreaRef?.(opponent.userId, el)}
                className="relative flex justify-center items-end"
                style={{
                  height: `${cardH + 10}px`,
                  width: `${Math.max(cardCount * fanSpacing + cardW, cardW + 8)}px`,
                }}
              >
                {Array.from({ length: cardCount }).map((_, i) => {
                  const rotate     = cardCount > 1 ? -maxSpread / 2 + i * step : 0
                  const vertOffset = -Math.abs(rotate) * 0.25
                  const xOffset    = cardCount > 1
                    ? (i - (cardCount - 1) / 2) * fanSpacing
                    : 0
                  return (
                    <div
                      key={i}
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: '50%',
                        transform: `translateX(calc(-50% + ${xOffset}px)) rotate(${rotate}deg) translateY(${vertOffset}px)`,
                        transformOrigin: 'bottom center',
                        zIndex: i,
                        width: `${cardW}px`,
                        height: `${cardH}px`,
                      }}
                      className={`rounded-sm border-2 border-white shadow-md ${BACK_COLORS[i % BACK_COLORS.length]} flex items-center justify-center flex-shrink-0`}
                    >
                      <span className={`${isTight ? 'text-[4px]' : isCompact ? 'text-[5px]' : 'text-[7px]'} font-black opacity-50 select-none text-white`}>
                        UNO
                      </span>
                    </div>
                  )
                })}
                {/* 超出显示数量的省略 */}
                {opponent.handCount > displayLimit && (
                  <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 text-gray-400 whitespace-nowrap font-medium ${isTight ? 'text-[7px]' : isCompact ? 'text-[8px]' : 'text-[10px]'}`}>
                    +{opponent.handCount - displayLimit}
                  </div>
                )}
              </div>
            )}

            {/* 先手标记（游戏开始时 1.5s 显示） */}
            {isFirstPlayer && (
              <div
                className={`font-black text-purple-600 animate-pulse tracking-widest ${isTight ? 'text-[8px]' : isCompact ? 'text-[9px]' : 'text-[11px]'}`}
                style={{ textShadow: '0 0 6px rgba(147,51,234,0.7)' }}
              >
                🎯 先手
              </div>
            )}

            {/* UNO 嗊叫闪烁标记 */}
            {unoCalled[opponent.userId] === true && (
              <div
                className={`font-black text-red-600 animate-pulse tracking-widest ${isTight ? 'text-[8px]' : isCompact ? 'text-[9px]' : 'text-[11px]'}`}
                style={{ textShadow: '0 0 6px rgba(239,68,68,0.8)' }}
              >
                🎺 UNO!
              </div>
            )}

            {/* 当前出牌指示 */}
            {opponent.isCurrentTurn && unoCalled[opponent.userId] !== true && (
              <div className={`font-semibold text-yellow-600 animate-pulse ${isTight ? 'text-[8px]' : isCompact ? 'text-[9px]' : 'text-[11px]'}`}>
                ⚡ 出牌中
              </div>
            )}

            {/* PRD: 举报按钮 */}
            <ReportButton
              targetPlayerId={opponent.userId}
              targetPlayerName={displayName}
              targetHandCount={opponent.handCount}
              targetHasCalledUno={unoCalled[opponent.userId] === true}
              unoWindowOpen={unoWindowOpen}
              unoWindowOwner={unoWindowOwner}
              hasReported={reportedThisWindow.includes(opponent.userId)}
              onReport={onReportPlayer}
              disabled={opponent.isFinished}
            />
          </div>
        )
      })}
    </div>
  )
}
