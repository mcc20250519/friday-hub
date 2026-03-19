import { useState } from 'react'

// Neo-Brutalism 色彩系统
const NB = {
  card: '#FFFFFF',
  text: '#1A1A1A',
  sub: '#5A5350',
  border: '#1A1A1A',
  shadow: '2px 2px 0px #1A1A1A',
  mint: '#B4F8C8',
  pink: '#FFAEBC',
  yellow: '#FFE566',
}

// 状态转移规则
const STATUS_TRANSITIONS = {
  draft: ['published', 'hidden'],
  published: ['hidden', 'draft'],
  hidden: ['published', 'draft'],
}

// 状态标签与颜色
const STATUS_CONFIG = {
  draft: { label: '待上架', bg: NB.yellow, transition: true },
  published: { label: '已上架', bg: NB.mint, transition: true },
  hidden: { label: '隐藏', bg: NB.pink, transition: true },
}

export default function StatusToggleButtons({
  currentStatus = 'draft',
  onStatusChange,
  loading = false,
  disabled = false,
}) {
  const [isTransitioning, setIsTransitioning] = useState(false)

  const handleStatusChange = async (newStatus) => {
    if (isTransitioning || loading || disabled) return

    // 验证转移有效性
    const allowedTransitions = STATUS_TRANSITIONS[currentStatus] || []
    if (!allowedTransitions.includes(newStatus)) {
      console.warn(`无效的状态转移: ${currentStatus} -> ${newStatus}`)
      return
    }

    setIsTransitioning(true)
    try {
      await onStatusChange(newStatus)
    } finally {
      setIsTransitioning(false)
    }
  }

  const possibleTransitions = STATUS_TRANSITIONS[currentStatus] || []

  return (
    <div className="flex gap-2 flex-wrap">
      {/* 当前状态显示 */}
      <div
        className="px-3 py-2 rounded font-semibold text-sm"
        style={{
          border: `2px solid ${NB.border}`,
          background: STATUS_CONFIG[currentStatus]?.bg || NB.card,
          color: NB.text,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        状态: {STATUS_CONFIG[currentStatus]?.label || '未知'}
      </div>

      {/* 状态转移按钮 */}
      {possibleTransitions.map((status) => (
        <button
          key={status}
          onClick={() => handleStatusChange(status)}
          disabled={isTransitioning || loading || disabled}
          className="px-3 py-2 rounded font-semibold text-sm transition-all cursor-pointer"
          style={{
            border: `2px solid ${NB.border}`,
            background: STATUS_CONFIG[status]?.bg || NB.card,
            color: NB.text,
            boxShadow: NB.shadow,
            opacity: isTransitioning || loading || disabled ? 0.6 : 1,
          }}
          onMouseDown={(e) => {
            if (!isTransitioning && !loading && !disabled) {
              e.currentTarget.style.transform = 'translate(2px, 2px)'
              e.currentTarget.style.boxShadow = 'none'
            }
          }}
          onMouseUp={(e) => {
            if (!isTransitioning && !loading && !disabled) {
              e.currentTarget.style.transform = 'translate(0, 0)'
              e.currentTarget.style.boxShadow = NB.shadow
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translate(0, 0)'
            e.currentTarget.style.boxShadow = NB.shadow
          }}
        >
          {isTransitioning && loading ? '处理中...' : `切换至${STATUS_CONFIG[status]?.label}`}
        </button>
      ))}

      {/* 如果没有可用转移 */}
      {possibleTransitions.length === 0 && (
        <p className="text-xs" style={{ color: NB.sub }}>
          此状态没有可用转移
        </p>
      )}
    </div>
  )
}
