/**
 * ExitAnimation - UNO 风格退出动画（多阶段）
 *
 * 动画流程（总时长约 2.5s）：
 *   Phase 1 (0s ~ 0.5s)：游戏画面退场
 *     - 游戏画面整体向下滑出 (translateY 0 → 30px)
 *     - 同时亮度降低 (brightness 100% → 60%)
 *     - 时长 500ms, ease-in
 *
 *   Phase 2 (0.5s ~ 1.2s)：四色色块浮现
 *     - 红、黄、绿、蓝四个色块分别从屏幕四个角落滑入
 *     - 与加载动画进场方向相同，拼合成彩色背景
 *     - 覆盖在变暗的游戏画面之上
 *     - 时长 700ms, spring easing
 *
 *   Phase 3 (1.2s ~ 1.8s)："BYE" 字样出现
 *     - 屏幕中央弹出 "BYE" 大字
 *     - 白色填充，黑色粗描边，粗斜体
 *     - 带轻微旋转（-5deg）
 *     - 弹出时伴随光环扩散
 *     - 弹出动画使用 spring easing，有回弹感
 *
 *   Phase 4 (1.8s ~ 2.5s)：整体缓慢退出
 *     - "BYE" 字样、四色色块、整个画面一起缓慢向上淡出
 *     - opacity 1 → 0, translateY 0 → -20px
 *     - 时长 700ms, ease-in-out
 *     - 淡出完成的同时执行路由跳转
 *
 * 跳过逻辑：
 *   - 阶段一和阶段二不可跳过（防止路由跳转时机错误）
 *   - 阶段三开始后可点击跳过
 *   - 跳过时直接触发阶段四的淡出动画
 *
 * 加载时间兜底处理：
 *   - 若目标页面资源未加载完成，阶段四的淡出动画在 90% 处暂停等待
 *   - 显示进度条（与加载动画进度条样式一致）
 *   - 目标页面加载完成后继续完成最后 10% 淡出
 *
 * Props:
 *   leaveAction     {Function} async 离开函数（leaveRoom），组件挂载后立即并行执行
 *   onDone          {Function} 动画 + 离开操作都完成后的回调（通常是 navigate）
 *   targetPageReady {boolean}  目标页面是否已加载完成（可选，默认 true）
 *   exitText        {string}   退出时显示的文字（可选，默认 'BYE'）
 *   theme           {Object}   主题配置（可选，包含 colors 等）
 */

import { useEffect, useRef, useState, useCallback } from 'react'

// UNO 四色
const UNO_RED    = '#E5173F'
const UNO_YELLOW = '#F5B800'
const UNO_GREEN  = '#1A9641'
const UNO_BLUE   = '#0057A8'

// 动画时序配置（ms）
const TIMINGS = {
  PHASE_1_DELAY: 0,
  PHASE_1_DURATION: 500,
  PHASE_2_DELAY: 500,
  PHASE_2_DURATION: 700,
  PHASE_3_DELAY: 1200,
  PHASE_3_DURATION: 600,
  PHASE_4_DELAY: 1800,
  PHASE_4_DURATION: 700,
}

// 缓动函数
const EASING = {
  EASE_IN: 'cubic-bezier(0.4, 0, 1, 1)',
  SPRING: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  EASE_IN_OUT: 'cubic-bezier(0.4, 0, 0.2, 1)',
  SPRING_SMOOTH: 'cubic-bezier(0.22, 1, 0.36, 1)',
}

// 进度条暂停点
const PROGRESS_PAUSE_AT = 90

// 固定尺寸配置（像素值，与 UnoLoadingScreen 一致）
const FIXED_SIZES = {
  RING_SIZE: 200,
  RING_BORDER: 4,
  BYE_FONT_SIZE: 'clamp(3rem, 10vw, 6rem)',
  BYE_TEXT_STROKE: 3,
  PROGRESS_WIDTH: 280,
  PROGRESS_HEIGHT: 12,
  PROGRESS_BG_SIZE: 280,
}

export default function ExitAnimation({ 
  leaveAction, 
  onDone, 
  targetPageReady = true,
  exitText = 'BYE',
  theme = null,
}) {
  // Phase state: 0=初始, 1=游戏退场, 2=四色滑入, 3=BYE弹出, 4=整体淡出, 5=完成
  const [phase, setPhase] = useState(0)
  const [exiting, setExiting] = useState(false)

  // 进度条状态（用于加载兜底）
  const [progress, setProgress] = useState(0)
  const progressRef = useRef(0)
  const progressPhaseRef = useRef('running') // 'running' | 'waiting' | 'sprinting'

  // 完成状态追踪
  const doneRef = useRef(false)
  const animDoneRef = useRef(false)
  const leaveDoneRef = useRef(false)

  // 定时器管理
  const timersRef = useRef([])
  const progressIntervalRef = useRef(null)

  const push = (fn, ms) => {
    const id = setTimeout(fn, ms)
    timersRef.current.push(id)
    return id
  }

  const clearAllTimers = () => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
  }

  // 尝试触发完成回调
  const tryDone = useCallback(() => {
    if (doneRef.current) return
    if (animDoneRef.current && leaveDoneRef.current) {
      doneRef.current = true
      onDone?.()
    }
  }, [onDone])

  // ── 阶段推进定时器 ─────────────────────────────────────────────
  useEffect(() => {
    // Phase 1: 游戏画面退场
    push(() => setPhase(1), TIMINGS.PHASE_1_DELAY)
    // Phase 2: 四色块滑入
    push(() => setPhase(2), TIMINGS.PHASE_2_DELAY)
    // Phase 3: BYE 弹出
    push(() => setPhase(3), TIMINGS.PHASE_3_DELAY)
    // Phase 4: 整体淡出
    push(() => setPhase(4), TIMINGS.PHASE_4_DELAY)

    return clearAllTimers
  }, [])

  // ── Phase 4 开始时启动进度条（加载兜底逻辑）──────────────────
  useEffect(() => {
    if (phase !== 4) return

    // 进度条推进逻辑
    progressIntervalRef.current = setInterval(() => {
      const currentPhase = progressPhaseRef.current

      if (currentPhase === 'running') {
        // 正常推进到 90%
        const next = Math.min(progressRef.current + 3, PROGRESS_PAUSE_AT)
        progressRef.current = next
        setProgress(next)

        if (next >= PROGRESS_PAUSE_AT && !targetPageReady) {
          progressPhaseRef.current = 'waiting'
        } else if (next >= PROGRESS_PAUSE_AT && targetPageReady) {
          // 目标页面已就绪，直接冲刺
          progressPhaseRef.current = 'sprinting'
        }
      } else if (currentPhase === 'sprinting') {
        // 冲刺到 100%
        const next = Math.min(progressRef.current + 5, 100)
        progressRef.current = next
        setProgress(next)

        if (next >= 100) {
          clearInterval(progressIntervalRef.current)
          progressIntervalRef.current = null
          animDoneRef.current = true
          setExiting(true)
          setTimeout(() => tryDone(), 100)
        }
      }
      // 'waiting' 状态下什么都不做，等待 targetPageReady 变化
    }, 30)

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
    }
  }, [phase, targetPageReady, tryDone])

  // ── 监听 targetPageReady 变化 → 从等待切换到冲刺 ─────────────
  useEffect(() => {
    if (!targetPageReady) return
    if (phase < 4) return
    if (progressPhaseRef.current === 'waiting' || progressPhaseRef.current === 'running') {
      progressPhaseRef.current = 'sprinting'
    }
  }, [targetPageReady, phase])

  // ── 并行执行 leaveAction ──────────────────────────────────────
  useEffect(() => {
    Promise.resolve()
      .then(() => leaveAction?.())
      .catch(() => {/* 忽略错误，依然跳转 */})
      .finally(() => {
        leaveDoneRef.current = true
        tryDone()
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 点击跳过 ─────────────────────────────────────────────────
  const handleSkip = useCallback(() => {
    // Phase 1/2 不可跳过
    if (phase < 3) return
    // 已经在 Phase 4 或已退出
    if (phase >= 4 || exiting) return

    // 跳过到 Phase 4
    clearAllTimers()
    setPhase(4)
    progressPhaseRef.current = 'sprinting'
  }, [phase, exiting])

  // ── 是否可跳过 ───────────────────────────────────────────────
  const canSkip = phase >= 3 && phase < 4 && !exiting

  // ── 是否显示进度条（在等待状态时）────────────────────────────
  const showProgressBar = phase >= 4 && progressPhaseRef.current === 'waiting' && !targetPageReady

  return (
    <div
      className="fixed inset-0 overflow-hidden select-none"
      style={{ zIndex: 300, cursor: canSkip ? 'pointer' : 'default' }}
      onClick={handleSkip}
    >
      {/* ── Phase 1: 游戏画面退场遮罩 ── */}
      {/* 注意：游戏画面退场是通过降低整体亮度实现的，这里是一个暗色遮罩层 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: '#111',
          opacity: phase >= 1 ? 1 : 0,
          transition: `opacity ${TIMINGS.PHASE_1_DURATION}ms ${EASING.EASE_IN}`,
          zIndex: 1,
        }}
      />

      {/* ── Phase 2: 四色色块滑入 ── */}
      {/* 左上：红 */}
      <div style={{
        position: 'absolute', width: '55%', height: '55%', top: 0, left: 0,
        background: UNO_RED, borderRadius: '0 0 100% 0',
        transform: phase >= 2 ? 'translate(0,0)' : 'translate(-100%,-100%)',
        transition: `transform ${TIMINGS.PHASE_2_DURATION}ms ${EASING.SPRING_SMOOTH}`,
        zIndex: 10,
      }} />
      {/* 右上：黄 */}
      <div style={{
        position: 'absolute', width: '55%', height: '55%', top: 0, right: 0,
        background: UNO_YELLOW, borderRadius: '0 0 0 100%',
        transform: phase >= 2 ? 'translate(0,0)' : 'translate(100%,-100%)',
        transition: `transform ${TIMINGS.PHASE_2_DURATION}ms ${EASING.SPRING_SMOOTH}`,
        zIndex: 10,
      }} />
      {/* 左下：绿 */}
      <div style={{
        position: 'absolute', width: '55%', height: '55%', bottom: 0, left: 0,
        background: UNO_GREEN, borderRadius: '0 100% 0 0',
        transform: phase >= 2 ? 'translate(0,0)' : 'translate(-100%,100%)',
        transition: `transform ${TIMINGS.PHASE_2_DURATION}ms ${EASING.SPRING_SMOOTH}`,
        zIndex: 10,
      }} />
      {/* 右下：蓝 */}
      <div style={{
        position: 'absolute', width: '55%', height: '55%', bottom: 0, right: 0,
        background: UNO_BLUE, borderRadius: '100% 0 0 0',
        transform: phase >= 2 ? 'translate(0,0)' : 'translate(100%,100%)',
        transition: `transform ${TIMINGS.PHASE_2_DURATION}ms ${EASING.SPRING_SMOOTH}`,
        zIndex: 10,
      }} />

      {/* ── Phase 3: BYE 弹出 + 光环 ── */}
      {phase >= 3 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 20,
            opacity: exiting ? 0 : 1,
            transform: exiting ? 'translateY(-20px)' : 'translateY(0)',
            transition: exiting ? `all ${TIMINGS.PHASE_4_DURATION}ms ${EASING.EASE_IN_OUT}` : 'none',
          }}
        >
          {/* 光环（固定尺寸） */}
          <div style={{
            position: 'absolute',
            width: FIXED_SIZES.RING_SIZE,
            height: FIXED_SIZES.RING_SIZE,
            borderRadius: '50%',
            border: `${FIXED_SIZES.RING_BORDER}px solid ${UNO_YELLOW}`,
            opacity: 0,
            animation: 'byeRing 0.8s ease-out forwards',
          }} />
          {/* 退出文字 */}
          <div style={{
            fontSize: FIXED_SIZES.BYE_FONT_SIZE,
            fontWeight: 900,
            fontStyle: 'italic',
            color: 'white',
            WebkitTextStroke: `${FIXED_SIZES.BYE_TEXT_STROKE}px black`,
            textShadow: '0 4px 16px rgba(0,0,0,0.4)',
            animation: 'byeBounceIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
            transformOrigin: 'center',
            userSelect: 'none',
          }}>
            {exitText}
          </div>
        </div>
      )}

      {/* ── Phase 4: 整体淡出容器 ── */}
      {phase >= 4 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 30,
            opacity: exiting ? 0 : 1,
            transform: exiting ? 'translateY(-20px)' : 'translateY(0)',
            transition: exiting ? `all ${TIMINGS.PHASE_4_DURATION}ms ${EASING.EASE_IN_OUT}` : 'none',
          }}
        >
          {/* 四色块也在这个容器内，会一起淡出 */}
        </div>
      )}

      {/* ── 进度条（加载兜底时显示）── */}
      {showProgressBar && (
        <div
          style={{
            position: 'absolute',
            bottom: '18%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: FIXED_SIZES.PROGRESS_WIDTH,
            zIndex: 40,
          }}
        >
          {/* 进度条轨道 */}
          <div style={{
            height: FIXED_SIZES.PROGRESS_HEIGHT,
            background: 'rgba(255,255,255,0.2)',
            borderRadius: 999,
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.1)',
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
          {/* 文案 */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: 8,
          }}>
            <p style={{
              color: 'rgba(255,255,255,0.55)',
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.08em',
              margin: 0,
            }}>
              正在离开...
            </p>
          </div>
        </div>
      )}

      {/* ── 点击跳过提示 ── */}
      {canSkip && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          color: 'rgba(255,255,255,0.35)',
          fontSize: 11,
          letterSpacing: '0.05em',
          pointerEvents: 'none',
          userSelect: 'none',
          zIndex: 50,
        }}>
          点击跳过
        </div>
      )}

      {/* ── CSS 关键帧 ── */}
      <style>{`
        @keyframes byeBounceIn {
          0%   { transform: scale(0.3) rotate(-12deg); opacity: 0; }
          60%  { transform: scale(1.2) rotate(-3deg);  opacity: 1; }
          100% { transform: scale(1)   rotate(-5deg);  opacity: 1; }
        }
        @keyframes byeRing {
          0%   { transform: scale(0.5); opacity: 0.8; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
