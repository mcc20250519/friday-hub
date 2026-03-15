/**
 * UnoGameOverAnimation - 游戏结束动画（排名模式 / 普通模式通用）
 *
 * 流程：
 *   0ms       → 遮罩变暗
 *   300ms     → "GAME OVER" / "ROUND END" 文字弹出（带轻微倾斜）
 *   700ms     → 排名卡片从下方依次飞入（每张间隔 120ms）
 *   fly完后   → 按钮从下方弹入：「再来一局（绿）」 + 「返回大厅（红）」
 *
 * 跳过逻辑：
 *   按钮出现前点击 → 立即跳过标题+卡片飞入，直接展示全部
 *   按钮出现后不可跳过
 *
 * Props:
 *   rankings      {Array<{id, name, rank, score, isMe}>} 排名列表
 *   onViewScores  {function}  查看积分板按钮
 *   onPlayAgain   {function}  再来一局按钮（仅房主）
 *   onReturnToLobby {function} 返回大厅（可选，未传则跳转 /games）
 *   isHost        {boolean}
 *   mode          {'official'|'casual'}
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const RANK_COLORS = {
  1: { bg: 'linear-gradient(135deg, #FFD700, #FFA500)', text: '#3D1E00', badge: '🥇' },
  2: { bg: 'linear-gradient(135deg, #C0C0C0, #A8A8A8)', text: '#1a1a1a', badge: '🥈' },
  3: { bg: 'linear-gradient(135deg, #CD7F32, #A0522D)', text: '#fff',    badge: '🥉' },
}

function getRankStyle(rank) {
  return RANK_COLORS[rank] || {
    bg: 'linear-gradient(135deg, #1e293b, #334155)',
    text: '#e2e8f0',
    badge: `#${rank}`,
  }
}

export default function UnoGameOverAnimation({
  rankings,
  onViewScores,
  onPlayAgain,
  onReturnToLobby,
  isHost,
  mode,
}) {
  const navigate    = useNavigate()
  const timersRef   = useRef([])
  const [showTitle,    setShowTitle]    = useState(false)
  const [visibleCards, setVisibleCards] = useState([])
  const [showButtons,  setShowButtons]  = useState(false)
  // 跳过后直接展示所有卡片
  const [skipped, setSkipped] = useState(false)

  const clearAllTimers = () => {
    timersRef.current.forEach(t => clearTimeout(t))
    timersRef.current = []
  }

  const push = (fn, ms) => {
    const id = setTimeout(fn, ms)
    timersRef.current.push(id)
    return id
  }

  // ── 跳过：立即展示所有内容 ──────────────────────────────────
  const handleSkip = useCallback(() => {
    if (showButtons || skipped) return
    setSkipped(true)
    clearAllTimers()
    setShowTitle(true)
    setVisibleCards((rankings || []).map((_, i) => i))
    push(() => setShowButtons(true), 300)
  }, [showButtons, skipped, rankings])

  // ── 正常时序 ─────────────────────────────────────────────────
  useEffect(() => {
    push(() => setShowTitle(true), 300)

    const n = rankings?.length || 0
    for (let i = 0; i < n; i++) {
      const delay = 700 + i * 120
      push(() => setVisibleCards(prev => [...prev, i]), delay)
    }

    const totalDelay = 700 + Math.max(0, n - 1) * 120 + 420
    push(() => setShowButtons(true), totalDelay)

    return clearAllTimers
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 返回大厅 ─────────────────────────────────────────────────
  const handleReturnToLobby = () => {
    if (onReturnToLobby) {
      onReturnToLobby()
    } else {
      navigate('/games')
    }
  }

  // ── 标题文字 ─────────────────────────────────────────────────
  const titleText = mode === 'official' ? 'ROUND END' : 'GAME OVER'

  return (
    <div
      className="fixed inset-0 z-[95] flex flex-col items-center justify-start overflow-y-auto"
      style={{
        background: 'rgba(5, 5, 15, 0.88)',
        backdropFilter: 'blur(8px)',
        animation: 'gameOverBgFade 0.4s ease-out forwards',
        paddingTop: '5vh',
        paddingBottom: 32,
        cursor: showButtons ? 'default' : 'pointer',
      }}
      onClick={handleSkip}
    >
      {/* ── GAME OVER / ROUND END 标题 ── */}
      <div
        style={{
          fontSize: 'clamp(2.5rem, 10vw, 5.5rem)',
          fontWeight: 900,
          fontStyle: 'italic',
          color: 'white',
          WebkitTextStroke: '3px #E5173F',
          letterSpacing: '0.04em',
          textShadow: '0 0 30px rgba(229,23,63,0.8), 0 4px 20px rgba(0,0,0,0.8)',
          opacity: showTitle ? 1 : 0,
          transform: showTitle ? 'scale(1) rotate(-2deg)' : 'scale(0.4) rotate(-8deg)',
          transition: 'all 0.55s cubic-bezier(0.34,1.56,0.64,1)',
          marginBottom: 8,
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        {titleText}
      </div>

      {/* 副标题 */}
      <div style={{
        color: 'rgba(255,255,255,0.45)',
        fontSize: 13,
        letterSpacing: '0.15em',
        marginBottom: 32,
        opacity: showTitle ? 1 : 0,
        transition: 'opacity 0.4s ease-out 0.3s',
        userSelect: 'none',
        pointerEvents: 'none',
      }}>
        {mode === 'official' ? '官方规则' : '娱乐规则'} · 本局结算
      </div>

      {/* ── 排名卡片列表 ── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          width: '100%',
          maxWidth: 440,
          paddingInline: 16,
          pointerEvents: 'none',
        }}
        onClick={e => e.stopPropagation()}
      >
        {(rankings || []).map((player, i) => {
          const style   = getRankStyle(player.rank)
          const visible = visibleCards.includes(i)
          const isTop3  = player.rank <= 3

          return (
            <div
              key={player.id || i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                borderRadius: 14,
                background: style.bg,
                boxShadow: isTop3
                  ? '0 4px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15)'
                  : '0 2px 12px rgba(0,0,0,0.4)',
                border: player.isMe
                  ? '2px solid rgba(255,255,255,0.6)'
                  : '1px solid rgba(255,255,255,0.08)',
                transform: visible ? 'translateY(0)' : 'translateY(60px)',
                opacity: visible ? 1 : 0,
                transition: 'transform 0.45s cubic-bezier(0.34,1.4,0.64,1), opacity 0.35s ease-out',
              }}
            >
              {/* 奖牌/名次 */}
              <div style={{
                minWidth: 40,
                textAlign: 'center',
                fontSize: isTop3 ? 28 : 20,
                lineHeight: 1,
              }}>
                {isTop3 ? style.badge : `${player.rank}`}
              </div>

              {/* 玩家名 */}
              <div style={{ flex: 1 }}>
                <div style={{
                  color: isTop3 ? style.text : '#e2e8f0',
                  fontWeight: 700,
                  fontSize: 15,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  {player.name}
                  {player.isMe && (
                    <span style={{
                      fontSize: 10,
                      padding: '1px 6px',
                      background: 'rgba(255,255,255,0.25)',
                      borderRadius: 999,
                      fontWeight: 600,
                    }}>
                      我
                    </span>
                  )}
                </div>
              </div>

              {/* 得分（非官方模式显示） */}
              {mode !== 'official' && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    color: isTop3 ? style.text : '#94a3b8',
                    fontSize: 11,
                    fontWeight: 500,
                  }}>
                    本局
                  </div>
                  <div style={{
                    color: isTop3 ? style.text : 'white',
                    fontWeight: 800,
                    fontSize: 18,
                  }}>
                    {player.score >= 0 ? `+${player.score}` : player.score}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── 操作按钮 ── */}
      {showButtons && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            marginTop: 28,
            justifyContent: 'center',
            animation: 'btnFadeUp 0.4s ease-out forwards',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* 积分板（半透明，小按钮） */}
          <button
            onClick={onViewScores}
            style={{
              padding: '10px 18px',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.1)',
              border: '2px solid rgba(255,255,255,0.25)',
              color: 'white',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              backdropFilter: 'blur(4px)',
              transition: 'background 0.2s',
              letterSpacing: '0.02em',
            }}
            onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.2)'}
            onMouseLeave={e => e.target.style.background = 'rgba(255,255,255,0.1)'}
          >
            📊 积分板
          </button>

          {/* 返回大厅（红色） */}
          <button
            onClick={handleReturnToLobby}
            style={{
              padding: '12px 22px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, #E5173F, #c0102f)',
              border: '2px solid black',
              color: 'white',
              fontWeight: 800,
              fontSize: 15,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(229,23,63,0.55)',
              transition: 'transform 0.15s, box-shadow 0.15s',
              letterSpacing: '0.02em',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(229,23,63,0.75)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)';    e.currentTarget.style.boxShadow = '0 4px 14px rgba(229,23,63,0.55)' }}
          >
            🚪 返回大厅
          </button>

          {/* 再来一局（绿色，仅房主） */}
          {isHost && (
            <button
              onClick={onPlayAgain}
              style={{
                padding: '12px 22px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, #1A9641, #15763A)',
                border: '2px solid black',
                color: 'white',
                fontWeight: 800,
                fontSize: 15,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(26,150,65,0.55)',
                transition: 'transform 0.15s, box-shadow 0.15s',
                letterSpacing: '0.02em',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(26,150,65,0.75)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)';    e.currentTarget.style.boxShadow = '0 4px 14px rgba(26,150,65,0.55)' }}
            >
              🔄 再来一局
            </button>
          )}
        </div>
      )}

      {/* 点击跳过提示 */}
      {!showButtons && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          color: 'rgba(255,255,255,0.35)',
          fontSize: 11,
          letterSpacing: '0.05em',
          pointerEvents: 'none',
          userSelect: 'none',
        }}>
          点击跳过
        </div>
      )}

      <style>{`
        @keyframes gameOverBgFade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes btnFadeUp {
          from { transform: translateY(24px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  )
}
