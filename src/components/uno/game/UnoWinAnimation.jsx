/**
 * UnoWinAnimation - UNO 玩家获胜动画
 *
 * 三个档次：
 *   rank === 1    → 第一名：全屏白闪光 + "[玩家名] WIN!" + 双份纸屑爆炸 + 金色光圈
 *   rank 2~3      → 次位："第X名 🥈/🥉 [玩家名]" + 单份纸屑
 *   rank === last → 末位："[玩家名] 最后一名 💀" + 灰色描边 + 抖动动画
 *
 * Props:
 *   winnerName  {string}   获胜玩家名字
 *   rank        {number}   名次（1 = 第一）
 *   totalPlayers{number}   总玩家数（判断末位）
 *   onComplete  {function} 动画播放结束回调（~2.5s）
 */

import { useEffect, useRef, useState } from 'react'
import confetti from 'canvas-confetti'

const RANK1_COLORS  = ['#FFD700', '#FFA500', '#FF4500', '#FF69B4', '#00BFFF']
const RANK23_COLORS = ['#00CFFF', '#4ADE80', '#818CF8', '#F9FAFB']

export default function UnoWinAnimation({ winnerName, rank, totalPlayers, onComplete }) {
  const canvasRef  = useRef(null)
  const isLast     = rank >= totalPlayers
  const isFirst    = rank === 1

  // 全屏白闪光控制（第一名专用）
  const [flashVisible, setFlashVisible] = useState(isFirst)

  useEffect(() => {
    const canvas = canvasRef.current
    const myConfetti = canvas
      ? confetti.create(canvas, { resize: true, useWorker: true })
      : null

    // ── 第一名：全屏白闪光 0~0.4s ──
    if (isFirst) {
      // 闪光 200ms 后消退
      const tFlash = setTimeout(() => setFlashVisible(false), 200)

      // 纸屑爆炸（0.7s 后，与文字弹出同步）
      const tConfetti1 = setTimeout(() => {
        myConfetti?.({
          particleCount: 160,
          spread: 100,
          origin: { x: 0.25, y: 0.55 },
          colors: RANK1_COLORS,
          gravity: 0.9,
          ticks: 300,
          scalar: 1.1,
        })
        myConfetti?.({
          particleCount: 160,
          spread: 100,
          origin: { x: 0.75, y: 0.55 },
          colors: RANK1_COLORS,
          gravity: 0.9,
          ticks: 300,
          scalar: 1.1,
        })
      }, 700)

      // 1.3s 后再补一波纸屑
      const tConfetti2 = setTimeout(() => {
        myConfetti?.({
          particleCount: 60,
          spread: 60,
          origin: { x: 0.5, y: 0.4 },
          colors: RANK1_COLORS,
          startVelocity: 45,
          ticks: 250,
        })
      }, 1300)

      const tDone = setTimeout(() => onComplete?.(), 2500)

      return () => {
        clearTimeout(tFlash)
        clearTimeout(tConfetti1)
        clearTimeout(tConfetti2)
        clearTimeout(tDone)
        myConfetti?.reset()
      }
    }

    // ── 第2~3名：单侧纸屑（1s 后回调）──
    if (!isLast && myConfetti) {
      const tConfetti = setTimeout(() => {
        myConfetti({
          particleCount: 80,
          spread: 80,
          origin: { x: 0.5, y: 0.5 },
          colors: RANK23_COLORS,
          gravity: 0.95,
          ticks: 250,
        })
      }, 350)
      const tDone = setTimeout(() => onComplete?.(), 1200)
      return () => {
        clearTimeout(tConfetti)
        clearTimeout(tDone)
        myConfetti?.reset()
      }
    }

    // ── 末位：1.5s 后回调 ──
    const tDone = setTimeout(() => onComplete?.(), 1500)
    return () => {
      clearTimeout(tDone)
      myConfetti?.reset()
    }
  }, [])

  // ── 视觉样式决定 ──────────────────────────────────────────
  const medals = ['🥇', '🥈', '🥉']

  const overlayColor = isFirst
    ? 'radial-gradient(ellipse at center, rgba(255,215,0,0.22) 0%, rgba(0,0,0,0.7) 70%)'
    : isLast
    ? 'radial-gradient(ellipse at center, rgba(120,0,0,0.35) 0%, rgba(0,0,0,0.8) 70%)'
    : 'radial-gradient(ellipse at center, rgba(0,100,200,0.20) 0%, rgba(0,0,0,0.7) 70%)'

  // 主文字
  const mainText = isFirst
    ? `${winnerName} WIN!`
    : isLast
    ? `${winnerName} 最后一名 💀`
    : `${medals[rank - 1] || `第${rank}名`} ${winnerName}`

  // 副文字
  const subText = isFirst
    ? '🥇 第一名 恭喜！'
    : isLast
    ? '游戏结束 😅'
    : `第 ${rank} 名 · 继续加油！`

  // 主文字颜色
  const mainColor = isFirst ? '#FFD700' : isLast ? '#94a3b8' : 'white'
  const strokeColor = isFirst ? '#8B4513' : 'black'

  // 末位抖动 or 一般动画（延迟等 overlay 淡入后再弹出文字，视觉更自然）
  const textAnim = isLast
    ? 'winTextShake 0.5s ease-in-out 0.55s, winTextBounce 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.4s forwards'
    : 'winTextBounce 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.45s forwards'

  return (
    <div
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center pointer-events-none"
      style={{
        background: overlayColor,
        animation: 'winOverlayFadeIn 0.9s ease-out forwards',
      }}
    >
      {/* ── 全屏白闪光（仅第一名，0~0.2s） ── */}
      {isFirst && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'white',
            pointerEvents: 'none',
            opacity: flashVisible ? 0.85 : 0,
            transition: flashVisible ? 'none' : 'opacity 0.25s ease-out',
            zIndex: 10,
          }}
        />
      )}

      {/* 纸屑 canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: 'none' }}
      />

      {/* 第一名：金色光晕 */}
      {isFirst && (
        <div style={{
          position: 'absolute',
          width: 320, height: 320,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,215,0,0.4) 0%, transparent 70%)',
          animation: 'winGlow 1.2s ease-out infinite alternate',
        }} />
      )}

      {/* 主文字 */}
      <div
        style={{
          fontSize: isFirst
            ? 'clamp(2.4rem, 11vw, 6rem)'
            : 'clamp(1.8rem, 9vw, 4.5rem)',
          fontWeight: 900,
          fontStyle: 'italic',
          color: mainColor,
          WebkitTextStroke: `3px ${strokeColor}`,
          textShadow: isFirst
            ? '0 0 40px rgba(255,215,0,0.9), 0 4px 16px rgba(0,0,0,0.6)'
            : '0 4px 16px rgba(0,0,0,0.7)',
          letterSpacing: '-0.01em',
          lineHeight: 1.15,
          animation: textAnim,
          opacity: 0,
          position: 'relative',
          zIndex: 2,
          textAlign: 'center',
          padding: '0 16px',
        }}
      >
        {mainText}
      </div>

      {/* 副文字 */}
      <div
        style={{
          marginTop: 16,
          fontSize: 'clamp(0.9rem, 4.5vw, 1.6rem)',
          color: 'rgba(255,255,255,0.88)',
          fontWeight: 700,
          textShadow: '0 2px 8px rgba(0,0,0,0.8)',
          animation: 'winTextBounce 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.7s forwards',
          opacity: 0,
          position: 'relative',
          zIndex: 2,
        }}
      >
        {subText}
      </div>

      {/* 第一名专属：皇冠 */}
      {isFirst && (
        <div
          style={{
            fontSize: 'clamp(2.5rem, 10vw, 5rem)',
            marginTop: 12,
            animation: 'winTextBounce 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.9s forwards',
            opacity: 0,
            position: 'relative',
            zIndex: 2,
          }}
        >
          👑
        </div>
      )}

      <style>{`
        @keyframes winOverlayFadeIn {
          from { opacity: 0; backdrop-filter: blur(0px); }
          to   { opacity: 1; backdrop-filter: blur(2px); }
        }
        @keyframes winTextBounce {
          0%   { transform: scale(0.3) translateY(30px); opacity: 0; }
          60%  { transform: scale(1.12) translateY(-4px); opacity: 1; }
          80%  { transform: scale(0.96) translateY(2px); }
          100% { transform: scale(1)   translateY(0);    opacity: 1; }
        }
        @keyframes winTextShake {
          0%, 100% { transform: translateX(0); }
          20%      { transform: translateX(-8px); }
          40%      { transform: translateX(8px); }
          60%      { transform: translateX(-6px); }
          80%      { transform: translateX(6px); }
        }
        @keyframes winGlow {
          from { transform: scale(0.9); opacity: 0.6; }
          to   { transform: scale(1.2); opacity: 1;   }
        }
      `}</style>
    </div>
  )
}
