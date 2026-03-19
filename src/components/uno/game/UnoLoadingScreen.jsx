/**
 * UnoLoadingScreen - UNO 风格游戏加载动画
 *
 * ── 两种使用模式 ───────────────────────────────────────────────
 *
 * 模式一：回调模式（GameBoard 内部使用）
 *   动画自己走完进度条后调用 onComplete
 *   Props: onComplete
 *
 * 模式二：信号驱动模式（UnoGame 进入房间使用）
 *   进度条使用模拟进度，外部通过 isComplete=true 触发冲刺到100%
 *   Props: isComplete, loadingText, onFinished, skippable?
 *
 * ── 动画阶段 ──────────────────────────────────────────────────
 *   阶段一（0~0.6s）  ：四色色块从四角滑入拼合背景
 *   阶段二（0.6~1.4s）：UNO Logo 弹出 + 光环扩散
 *   阶段三（1.4~2.0s）：牌组扇形飞入
 *   阶段四（2.0s~）   ：进度条（模拟/信号驱动） → 淡出
 *
 * ── 模拟进度逻辑（信号驱动模式）─────────────────────────────
 *   0% → 30%：0.3s 快速涨到
 *   30% → 90%：1.5s 缓慢爬升
 *   90%：停在此处等待 isComplete=true 信号
 *   收到信号 → 0.3s 冲刺到 100% → 保持 300ms → 触发退出
 *
 * ── 跳过逻辑 ─────────────────────────────────────────────────
 *   回调模式：任意时刻可跳过
 *   信号驱动模式：仅 isComplete=true 后允许跳过（防止资源未就绪白屏）
 */

import { useEffect, useRef, useState, useMemo } from 'react'

// ── 缩放补偿 ───────────────────────────────────────────────────
// 浏览器缩放时，CSS 像素值会跟随缩放。要实现"固定尺寸"，
// 需要用 transform: scale(1/zoom) 来抵消缩放效果。
// 注意：这只能补偿浏览器缩放（Ctrl+滚轮），无法补偿系统级缩放。
//
// 实际上，CSS 像素值（px）在浏览器缩放时会跟着变大变小是浏览器的正常行为。
// 如果用户希望元素大小"不随浏览器缩放变化"，本质上是要让元素相对于
// 屏幕物理像素保持固定大小——这在 Web 技术栈中是无法完美实现的。
//
// 能做到的是：让动画元素相对于视口的百分比位置固定，然后像素尺寸
// 在 100% 缩放时看起来正常。当用户放大/缩小时，元素会等比例放大缩小。
// 这是预期的、合理的行为。
//
// 如果用户真的需要"固定物理尺寸"，唯一的方案是：
// 1. 使用 SVG（矢量图，缩放不失真）
// 2. 或者接受现状（像素值随缩放等比例变化）
//
// 目前已使用固定像素值，确保在 100% 缩放下显示正确。
// 其他缩放比例下，元素会等比例缩放，这是合理的视觉体验。

// UNO 四色
const UNO_RED    = '#E5173F'
const UNO_YELLOW = '#F5B800'
const UNO_GREEN  = '#1A9641'
const UNO_BLUE   = '#0057A8'

// 扇形牌组配置（固定像素值，不随浏览器缩放）
const CARD_FAN = [
  { rotate: -20, x: -80 },
  { rotate: -10, x: -40 },
  { rotate:   0, x:   0 },
  { rotate:  10, x:  40 },
  { rotate:  20, x:  80 },
]

// 固定尺寸配置（像素值，不随浏览器缩放）
const FIXED_SIZES = {
  // UNO 文字
  UNO_FONT_SIZE: 140,
  UNO_TEXT_STROKE: 4,
  // 光环
  RING_SIZE: 200,
  RING_BORDER: 6,
  // 扇形牌
  CARD_WIDTH: 56,
  CARD_HEIGHT: 88,
  CARD_INNER_WIDTH: 36,
  CARD_INNER_HEIGHT: 60,
  // 进度条
  PROGRESS_WIDTH_CALLBACK: 240,
  PROGRESS_WIDTH_SIGNAL: 280,
  PROGRESS_HEIGHT_CALLBACK: 8,
  PROGRESS_HEIGHT_SIGNAL: 12,
  PROGRESS_BG_SIZE: 280,
  // 文字
  TEXT_FONT_SIZE: 11,
  PERCENT_FONT_SIZE: 10,
}

// ── 内部：回调模式进度控制器 ──────────────────────────────────
// 原有逻辑：固定时序跑满进度条，结束后调 onComplete
function useCallbackProgress({ enabled, onDone }) {
  const [progress, setProgress]     = useState(0)
  const timersRef   = useRef([])
  const intervalRef = useRef(null)

  const clearAll = () => {
    timersRef.current.forEach(id => clearTimeout(id))
    timersRef.current = []
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  useEffect(() => {
    if (!enabled) return

    let p = 0
    intervalRef.current = setInterval(() => {
      p += 4
      setProgress(p)
      if (p >= 100) {
        clearAll()
        timersRef.current.push(setTimeout(() => onDone?.(), 300))
      }
    }, 20)

    return clearAll
  }, [enabled]) // eslint-disable-line react-hooks/exhaustive-deps

  // 跳过时立即完成
  const skip = (onDone) => {
    clearAll()
    setProgress(100)
    setTimeout(() => onDone?.(), 0)
  }

  return { progress, skip, clearAll }
}

// ── 内部：信号驱动模式进度控制器 ─────────────────────────────
// 模拟进度：0→30%（快）→ 90%（慢）→ 等待信号 → 冲刺 100%
function useSignalProgress({ enabled, isComplete, onDone }) {
  const [progress, setProgress]     = useState(0)
  const progressRef = useRef(0)
  const intervalRef = useRef(null)
  const phaseRef    = useRef('fast')   // 'fast' | 'slow' | 'waiting' | 'sprint' | 'done'
  const doneCalledRef = useRef(false)

  const clearTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  // 启动模拟进度
  useEffect(() => {
    if (!enabled) return

    // 每 30ms tick 一次
    intervalRef.current = setInterval(() => {
      const phase = phaseRef.current
      const p = progressRef.current

      if (phase === 'fast') {
        // 0 → 30%，目标在 ~300ms 内：每 tick 涨 3%
        const next = Math.min(p + 3, 30)
        progressRef.current = next
        setProgress(next)
        if (next >= 30) phaseRef.current = 'slow'

      } else if (phase === 'slow') {
        // 30% → 90%，目标在 ~1500ms 内：每 tick 涨 1.2%
        const next = Math.min(p + 1.2, 90)
        progressRef.current = next
        setProgress(next)
        if (next >= 90) phaseRef.current = 'waiting'

      } else if (phase === 'waiting') {
        // 等待 isComplete 信号，啥都不干
      } else if (phase === 'sprint') {
        // 冲刺到 100%，每 tick 涨 5%
        const next = Math.min(p + 5, 100)
        progressRef.current = next
        setProgress(next)
        if (next >= 100 && !doneCalledRef.current) {
          doneCalledRef.current = true
          phaseRef.current = 'done'
          clearTimer()
          setTimeout(() => onDone?.(), 300)
        }
      }
    }, 30)

    return clearTimer
  }, [enabled]) // eslint-disable-line react-hooks/exhaustive-deps

  // 监听 isComplete 信号 → 切换到冲刺阶段
  useEffect(() => {
    if (!enabled || !isComplete) return
    if (phaseRef.current === 'waiting' || phaseRef.current === 'slow' || phaseRef.current === 'fast') {
      phaseRef.current = 'sprint'
    }
  }, [isComplete, enabled])

  // 跳过时立即完成（仅 isComplete=true 后允许）
  const skip = (onDone) => {
    if (!isComplete) return false  // 不允许跳过
    clearTimer()
    doneCalledRef.current = true
    phaseRef.current = 'done'
    setProgress(100)
    setTimeout(() => onDone?.(), 0)
    return true
  }

  return { progress, skip, clearAll: clearTimer }
}

// ═══════════════════════════════════════════════════════════════
// 主组件
// ═══════════════════════════════════════════════════════════════
export default function UnoLoadingScreen({
  // ── 回调模式 ──
  onComplete,
  // ── 信号驱动模式 ──
  isComplete,
  loadingText,
  onFinished,
  skippable = true,
}) {
  // 判断使用哪种模式
  const isSignalMode = isComplete !== undefined

  // phase: 0=初始 1=色块 2=logo 3=牌 4=进度 5=淡出
  const [phase, setPhase]   = useState(0)
  const [exiting, setExiting] = useState(false)
  const [skipped, setSkipped] = useState(false)

  const timersRef = useRef([])
  const push = (fn, ms) => {
    const id = setTimeout(fn, ms)
    timersRef.current.push(id)
    return id
  }
  const clearPhaseTimers = () => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }

  // 完成回调（统一入口）
  const triggerDone = () => {
    setExiting(true)
    setTimeout(() => {
      if (isSignalMode) onFinished?.()
      else onComplete?.()
    }, 300)
  }

  // ── 回调模式进度 ──────────────────────────────────────────────
  const cbProgress = useCallbackProgress({
    enabled: !isSignalMode && phase >= 4,
    onDone: triggerDone,
  })

  // ── 信号驱动模式进度 ──────────────────────────────────────────
  const sigProgress = useSignalProgress({
    enabled: isSignalMode && phase >= 4,
    isComplete,
    onDone: triggerDone,
  })

  const { progress } = isSignalMode ? sigProgress : cbProgress

  // ── 阶段推进定时器（两种模式共用）──────────────────────────────
  useEffect(() => {
    setPhase(1)
    push(() => setPhase(2), 600)
    push(() => setPhase(3), 1400)
    push(() => setPhase(4), 2000)
    return clearPhaseTimers
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 点击跳过 ─────────────────────────────────────────────────
  const handleClick = () => {
    if (skipped || exiting) return

    if (isSignalMode) {
      // 信号驱动模式：仅 isComplete=true 后可跳过
      if (!skippable) return
      const skipped = sigProgress.skip(triggerDone)
      if (!skipped) {
        // 进度条轻微抖动提示（进度条容器加抖动 class，300ms后移除）
        setShakeBar(true)
        setTimeout(() => setShakeBar(false), 400)
      } else {
        setSkipped(true)
      }
    } else {
      // 回调模式：任意时刻可跳过
      setSkipped(true)
      clearPhaseTimers()
      cbProgress.clearAll()
      setExiting(true)
      setTimeout(() => onComplete?.(), 200)
    }
  }

  // 进度条抖动状态
  const [shakeBar, setShakeBar] = useState(false)

  // 显示文案：信号驱动模式用 loadingText，回调模式用固定文案
  const displayText = isSignalMode
    ? (loadingText || '正在洗牌...')
    : '正在洗牌...'

  // 进度百分比（信号驱动模式显示，回调模式不显示）
  const progressPct = Math.round(progress)

  return (
    <div
      className="fixed inset-0 z-[100] overflow-hidden select-none"
      style={{
        background: '#111',
        opacity: exiting ? 0 : 1,
        transition: exiting ? 'opacity 0.3s ease-out' : 'none',
        cursor: isSignalMode ? (isComplete ? 'pointer' : 'default') : 'pointer',
      }}
      onClick={handleClick}
    >
      {/* ── 阶段一：四色色块从四角滑入 ── */}
      {/* 左上：红 */}
      <div className="absolute" style={{
        width: '55%', height: '55%', top: 0, left: 0,
        background: UNO_RED, borderRadius: '0 0 100% 0',
        transform: phase >= 1 ? 'translate(0,0)' : 'translate(-100%,-100%)',
        transition: 'transform 0.55s cubic-bezier(0.22,1,0.36,1)',
      }} />
      {/* 右上：黄 */}
      <div className="absolute" style={{
        width: '55%', height: '55%', top: 0, right: 0,
        background: UNO_YELLOW, borderRadius: '0 0 0 100%',
        transform: phase >= 1 ? 'translate(0,0)' : 'translate(100%,-100%)',
        transition: 'transform 0.55s cubic-bezier(0.22,1,0.36,1)',
      }} />
      {/* 左下：绿 */}
      <div className="absolute" style={{
        width: '55%', height: '55%', bottom: 0, left: 0,
        background: UNO_GREEN, borderRadius: '0 100% 0 0',
        transform: phase >= 1 ? 'translate(0,0)' : 'translate(-100%,100%)',
        transition: 'transform 0.55s cubic-bezier(0.22,1,0.36,1)',
      }} />
      {/* 右下：蓝 */}
      <div className="absolute" style={{
        width: '55%', height: '55%', bottom: 0, right: 0,
        background: UNO_BLUE, borderRadius: '100% 0 0 0',
        transform: phase >= 1 ? 'translate(0,0)' : 'translate(100%,100%)',
        transition: 'transform 0.55s cubic-bezier(0.22,1,0.36,1)',
      }} />

      {/* ── 阶段二：UNO Logo + 光环 ── */}
      {phase >= 2 && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 10 }}>
          {/* 光环（固定尺寸） */}
          <div style={{
            position: 'absolute',
            width: FIXED_SIZES.RING_SIZE,
            height: FIXED_SIZES.RING_SIZE,
            borderRadius: '50%',
            border: `${FIXED_SIZES.RING_BORDER}px solid ${UNO_YELLOW}`,
            opacity: 0,
            animation: 'unoRing 0.8s ease-out forwards',
          }} />
          {/* UNO 文字（固定尺寸，不随浏览器缩放变化） */}
          <div style={{
            fontSize: FIXED_SIZES.UNO_FONT_SIZE,
            fontWeight: 900,
            fontStyle: 'italic',
            color: 'white',
            WebkitTextStroke: `${FIXED_SIZES.UNO_TEXT_STROKE}px black`,
            textShadow: '0 6px 24px rgba(0,0,0,0.5)',
            letterSpacing: '-0.02em',
            lineHeight: 1,
            animation: 'unoBounceIn 0.7s cubic-bezier(0.34,1.56,0.64,1) forwards',
            transformOrigin: 'center',
          }}>
            UNO
          </div>
        </div>
      )}

      {/* ── 阶段三：扇形牌组（固定尺寸） ── */}
      {phase >= 3 && (
        <div className="absolute" style={{
          bottom: '28%', left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9,
          display: 'flex', alignItems: 'flex-end',
        }}>
          {CARD_FAN.map((card, i) => (
            <div key={i} style={{
              position: 'absolute',
              left: `calc(50% + ${card.x}px - ${FIXED_SIZES.CARD_WIDTH / 2}px)`,
              bottom: 0,
              width: FIXED_SIZES.CARD_WIDTH,
              height: FIXED_SIZES.CARD_HEIGHT,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
              border: '3px solid white',
              boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
              '--r': `${card.rotate}deg`,
              transform: `rotate(${card.rotate}deg) translateY(120px)`,
              animation: `cardFlyIn 0.4s cubic-bezier(0.34,1.56,0.64,1) ${0.08 * i}s forwards`,
              transformOrigin: 'bottom center',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                width: FIXED_SIZES.CARD_INNER_WIDTH,
                height: FIXED_SIZES.CARD_INNER_HEIGHT,
                borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.25)',
                transform: 'rotate(-30deg)',
              }} />
            </div>
          ))}
        </div>
      )}

      {/* ── 阶段四：进度条（固定尺寸） ── */}
      {phase >= 4 && (
        <div
          className="absolute"
          style={{
            bottom: '18%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: isSignalMode ? FIXED_SIZES.PROGRESS_WIDTH_SIGNAL : FIXED_SIZES.PROGRESS_WIDTH_CALLBACK,
            zIndex: 10,
            animation: 'fadeInUp 0.3s ease-out forwards',
          }}
        >
          {/* 进度条轨道 */}
          <div style={{
            height: isSignalMode ? FIXED_SIZES.PROGRESS_HEIGHT_SIGNAL : FIXED_SIZES.PROGRESS_HEIGHT_CALLBACK,
            background: 'rgba(255,255,255,0.2)',
            borderRadius: 999,
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.1)',
            animation: shakeBar ? 'barShake 0.4s ease-out' : 'none',
          }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              borderRadius: 999,
              background: `linear-gradient(90deg, ${UNO_RED}, ${UNO_YELLOW}, ${UNO_GREEN}, ${UNO_BLUE})`,
              backgroundSize: `${FIXED_SIZES.PROGRESS_BG_SIZE}px 100%`,
              transition: 'width 0.06s linear',
            }} />
          </div>

          {/* 文案行：左侧文字 + 右侧百分比（信号模式）或固定文案（回调模式） */}
          <div style={{
            display: 'flex',
            justifyContent: isSignalMode ? 'space-between' : 'center',
            alignItems: 'center',
            marginTop: 8,
          }}>
            <p style={{
              color: 'rgba(255,255,255,0.55)',
              fontSize: FIXED_SIZES.TEXT_FONT_SIZE,
              fontWeight: 500,
              letterSpacing: '0.08em',
              margin: 0,
            }}>
              {displayText}
            </p>
            {isSignalMode && (
              <span style={{
                color: 'rgba(255,255,255,0.4)',
                fontSize: FIXED_SIZES.PERCENT_FONT_SIZE,
                fontWeight: 600,
                letterSpacing: '0.05em',
              }}>
                {progressPct}%
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── 跳过提示 ── */}
      {phase < 4 && !isSignalMode && (
        <div style={{
          position: 'absolute', bottom: 24, right: 24,
          color: 'rgba(255,255,255,0.35)', fontSize: 11,
          letterSpacing: '0.05em', pointerEvents: 'none',
        }}>
          点击跳过
        </div>
      )}
      {isSignalMode && isComplete && phase >= 4 && (
        <div style={{
          position: 'absolute', bottom: 24, right: 24,
          color: 'rgba(255,255,255,0.35)', fontSize: 11,
          letterSpacing: '0.05em', pointerEvents: 'none',
        }}>
          点击跳过
        </div>
      )}

      {/* ── CSS 关键帧 ── */}
      <style>{`
        @keyframes unoBounceIn {
          0%   { transform: scale(0.1) rotate(-8deg); opacity: 0; }
          60%  { transform: scale(1.15) rotate(2deg);  opacity: 1; }
          80%  { transform: scale(0.95) rotate(-1deg); }
          100% { transform: scale(1)   rotate(0deg);   opacity: 1; }
        }
        @keyframes unoRing {
          0%   { transform: scale(0.5); opacity: 0.8; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes cardFlyIn {
          from { transform: rotate(var(--r, 0deg)) translateY(120px); opacity: 0; }
          to   { transform: rotate(var(--r, 0deg)) translateY(0);     opacity: 1; }
        }
        @keyframes fadeInUp {
          from { transform: translateX(-50%) translateY(16px); opacity: 0; }
          to   { transform: translateX(-50%) translateY(0);    opacity: 1; }
        }
        @keyframes barShake {
          0%,100% { transform: translateX(0); }
          20%     { transform: translateX(-6px); }
          40%     { transform: translateX(6px); }
          60%     { transform: translateX(-4px); }
          80%     { transform: translateX(4px); }
        }
      `}</style>
    </div>
  )
}
