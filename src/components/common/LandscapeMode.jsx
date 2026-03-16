/**
 * LandscapeMode - 通用横屏模式模块
 *
 * 提供：
 * 1. useLandscapeMode - Hook：检测设备、锁定方向、提供状态
 * 2. LandscapePrompt - 提示组件：竖屏时显示引导
 * 3. LandscapeGameLayout - 布局容器：自动适配横屏的游戏布局
 *
 * 使用示例：
 * ```jsx
 * import { useLandscapeMode, LandscapePrompt, LandscapeGameLayout } from '@/components/common/LandscapeMode'
 *
 * function MyGame() {
 *   const { showPrompt, isLandscape, isMobile } = useLandscapeMode()
 *
 *   return (
 *     <LandscapeGameLayout showPrompt={showPrompt} isMobile={isMobile} gameName="UNO">
 *       {/* 游戏内容 *\/}
 *     </LandscapeGameLayout>
 *   )
 * }
 * ```
 */

import { useState, useEffect, useCallback } from 'react'

// ═══════════════════════════════════════════════════════════════════════════
// Hook: useLandscapeMode
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 检测是否为移动设备
 */
function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || (window.matchMedia && window.matchMedia('(max-width: 768px)').matches)
}

/**
 * 检测当前是否为横屏模式
 */
function isLandscape() {
  return window.innerWidth > window.innerHeight
}

/**
 * 横屏锁定 Hook
 *
 * @returns {{
 *   isLandscape: boolean,  // 当前是否横屏
 *   showPrompt: boolean,   // 是否显示横屏提示（竖屏时为 true）
 *   isMobile: boolean,     // 是否为移动设备
 *   lockLandscape: Function, // 手动锁定横屏
 *   unlockLandscape: Function // 手动解锁
 * }}
 */
export function useLandscapeMode() {
  const [landscape, setLandscape] = useState(isLandscape())
  const [showPrompt, setShowPrompt] = useState(false)
  const [isMobile, setIsMobile] = useState(isMobileDevice())

  // 尝试锁定屏幕方向
  const lockLandscape = useCallback(async () => {
    if (!isMobileDevice()) return false

    // Screen Orientation API (现代浏览器)
    if (screen.orientation && screen.orientation.lock) {
      try {
        await screen.orientation.lock('landscape')
        console.log('[Landscape] 屏幕方向已锁定为横屏')
        return true
      } catch (err) {
        console.log('[Landscape] 无法锁定屏幕方向:', err.message)
      }
    }

    // 旧版 API (已废弃但部分浏览器仍支持)
    if (screen.lockOrientation) {
      try {
        screen.lockOrientation('landscape')
        return true
      } catch (err) {
        console.log('[Landscape] lockOrientation 失败:', err.message)
      }
    }

    return false
  }, [])

  // 解锁屏幕方向
  const unlockLandscape = useCallback(async () => {
    if (screen.orientation && screen.orientation.unlock) {
      try {
        screen.orientation.unlock()
        console.log('[Landscape] 屏幕方向已解锁')
      } catch (err) {
        console.log('[Landscape] 解锁失败:', err.message)
      }
    }
  }, [])

  useEffect(() => {
    if (!isMobileDevice()) {
      setIsMobile(false)
      return
    }

    setIsMobile(true)

    const checkOrientation = () => {
      const currentLandscape = isLandscape()
      setLandscape(currentLandscape)
      setShowPrompt(!currentLandscape)
    }

    checkOrientation()
    lockLandscape()

    const handleOrientationChange = () => {
      checkOrientation()
    }

    if (screen.orientation) {
      screen.orientation.addEventListener('change', handleOrientationChange)
    }
    window.addEventListener('resize', handleOrientationChange)
    window.addEventListener('orientationchange', handleOrientationChange)

    return () => {
      if (screen.orientation) {
        screen.orientation.removeEventListener('change', handleOrientationChange)
      }
      window.removeEventListener('resize', handleOrientationChange)
      window.removeEventListener('orientationchange', handleOrientationChange)
      unlockLandscape()
    }
  }, [lockLandscape, unlockLandscape])

  return {
    isLandscape: landscape,
    showPrompt,
    isMobile,
    lockLandscape,
    unlockLandscape,
  }
}

// 默认导出 Hook
export default useLandscapeMode

// ═══════════════════════════════════════════════════════════════════════════
// 组件: LandscapePrompt - 横屏提示
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 横屏提示组件
 * 在用户竖屏时全屏覆盖显示，引导用户旋转设备
 *
 * @param {Object} props
 * @param {boolean} props.show - 是否显示
 * @param {string} props.gameName - 游戏名称（用于提示文案）
 * @param {string} props.accentColor - 主题色（purple/blue/green/orange）
 */
export function LandscapePrompt({ show, gameName = '游戏', accentColor = 'purple' }) {
  if (!show) return null

  const colorClasses = {
    purple: 'from-purple-600 to-pink-600',
    blue: 'from-blue-600 to-cyan-600',
    green: 'from-green-600 to-emerald-600',
    orange: 'from-orange-600 to-amber-600',
  }

  const gradientClass = colorClasses[accentColor] || colorClasses.purple

  return (
    <div
      className={`fixed inset-0 z-[100] bg-gradient-to-br ${gradientClass} flex flex-col items-center justify-center text-white overflow-hidden`}
    >
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-white/5 rounded-full blur-3xl" />
      </div>

      {/* 旋转动画容器 */}
      <div className="relative flex flex-col items-center justify-center flex-1 w-full px-8 py-6">
        {/* 设备旋转示意图 */}
        <div className="relative flex items-center justify-center gap-8 mb-8">
          {/* 竖屏手机（左边，半透明） */}
          <div
            className="relative opacity-40"
            style={{ animation: 'phoneShake 3s ease-in-out infinite' }}
          >
            <div className="w-14 h-24 border-3 border-white/60 rounded-lg flex items-center justify-center bg-white/10">
              <div className="w-6 h-0.5 bg-white/60 rounded-full" />
            </div>
          </div>

          {/* 旋转箭头 */}
          <div
            className="text-5xl font-light opacity-80"
            style={{ animation: 'arrowBounce 1.5s ease-in-out infinite' }}
          >
            →
          </div>

          {/* 横屏手机（右边，高亮） */}
          <div
            className="relative"
            style={{ animation: 'phoneGlow 2s ease-in-out infinite' }}
          >
            <div className="w-24 h-14 border-3 border-white rounded-lg flex items-center justify-center bg-white/20 shadow-lg shadow-white/20">
              <div className="w-12 h-0.5 bg-white rounded-full" />
            </div>
            {/* 对勾标记 */}
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>

        {/* 提示文字 */}
        <div className="text-center space-y-3">
          <h2 className="text-2xl font-bold tracking-wide">请旋转设备</h2>
          <p className="text-white/80 text-base max-w-xs">
            {gameName} 需要横屏体验，获得更好的游戏视野 🎮
          </p>
        </div>

        {/* 底部提示 */}
        <div className="absolute bottom-6 text-white/50 text-xs">
          旋转设备后自动继续
        </div>
      </div>

      {/* 动画样式 */}
      <style>{`
        @keyframes phoneShake {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          25% { transform: translateX(-3px) rotate(-5deg); }
          75% { transform: translateX(3px) rotate(5deg); }
        }
        @keyframes arrowBounce {
          0%, 100% { transform: translateX(0); opacity: 0.6; }
          50% { transform: translateX(8px); opacity: 1; }
        }
        @keyframes phoneGlow {
          0%, 100% { transform: scale(1); box-shadow: 0 0 20px rgba(255,255,255,0.2); }
          50% { transform: scale(1.05); box-shadow: 0 0 30px rgba(255,255,255,0.4); }
        }
      `}</style>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 组件: LandscapeGameLayout - 横屏游戏布局容器
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 横屏游戏布局容器
 *
 * 功能：
 * 1. 自动在横屏时占满整个视口（100vw × 100vh）
 * 2. 禁止页面滚动
 * 3. 使用 CSS 变量传递视口尺寸供子组件使用
 *
 * @param {Object} props
 * @param {boolean} props.showPrompt - 是否显示横屏提示
 * @param {boolean} props.isMobile - 是否为移动设备
 * @param {string} props.gameName - 游戏名称
 * @param {string} props.accentColor - 主题色
 * @param {React.ReactNode} props.children - 游戏内容
 * @param {string} props.className - 额外的类名
 */
export function LandscapeGameLayout({
  showPrompt,
  isMobile,
  gameName = '游戏',
  accentColor = 'purple',
  children,
  className = '',
}) {
  return (
    <>
      {/* 横屏提示覆盖层 */}
      <LandscapePrompt show={showPrompt} gameName={gameName} accentColor={accentColor} />

      {/* 游戏容器 - 移动端横屏时固定视口 */}
      <div
        className={`
          ${isMobile ? 'landscape-game-root' : ''}
          ${className}
        `}
        style={isMobile ? {
          position: 'fixed',
          inset: 0,
          width: '100vw',
          height: '100vh',
          overflow: 'hidden',
          overscrollBehavior: 'none',
        } : undefined}
      >
        {children}
      </div>

      {/* 移动端横屏样式：锁定全局滚动，设置视口 CSS 变量 */}
      {isMobile && (
        <style>{`
          html, body {
            overflow: hidden !important;
            position: fixed !important;
            width: 100%;
            height: 100%;
            overscroll-behavior: none;
          }
          .landscape-game-root {
            /* 确保内容填满整个视口 */
            display: flex;
            flex-direction: column;
          }
          .landscape-game-root > * {
            flex-shrink: 0;
          }
          /* 让使用 min-h-screen 的组件也能正确适配 */
          .landscape-game-root .min-h-screen {
            min-height: 100vh !important;
            height: 100vh !important;
          }
        `}</style>
      )}
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 组件: LandscapeCardLayout - 横屏卡片布局（用于创建房间等简单页面）
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 横屏卡片布局
 * 用于创建房间、等待室等卡片式页面
 *
 * 特点：
 * - 横屏时卡片居中显示，自适应大小
 * - 竖屏时正常显示
 *
 * @param {Object} props
 * @param {boolean} props.showPrompt - 是否显示横屏提示
 * @param {boolean} props.isMobile - 是否为移动设备
 * @param {boolean} props.isLandscape - 是否为横屏
 * @param {string} props.gameName - 游戏名称
 * @param {React.ReactNode} props.children - 卡片内容
 */
export function LandscapeCardLayout({
  showPrompt,
  isMobile,
  isLandscape,
  gameName = '游戏',
  accentColor = 'purple',
  children,
}) {
  return (
    <>
      <LandscapePrompt show={showPrompt} gameName={gameName} accentColor={accentColor} />

      <div
        className={`
          min-h-screen
          ${isMobile && isLandscape ? 'h-screen' : ''}
          bg-gradient-to-br from-purple-100 via-pink-50 to-orange-50
          flex items-center justify-center
          p-4
        `}
        style={isMobile && isLandscape ? {
          position: 'fixed',
          inset: 0,
          overflow: 'auto',
          overscrollBehavior: 'none',
        } : undefined}
      >
        {/* 横屏时卡片区域约束宽度 */}
        <div className={`
          w-full
          ${isMobile && isLandscape ? 'max-w-4xl' : 'max-w-md'}
          mx-auto
        `}>
          {children}
        </div>
      </div>

      {/* 移动端横屏锁定 body */}
      {isMobile && isLandscape && (
        <style>{`
          html, body {
            overflow: hidden !important;
            overscroll-behavior: none;
          }
        `}</style>
      )}
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 工具函数：让游戏区域自适应横屏视口
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 计算横屏游戏区域尺寸
 * @param {number} viewportWidth - 视口宽度
 * @param {number} viewportHeight - 视口高度
 * @param {number} headerHeight - 顶部栏高度（默认 60px）
 * @returns {{ gameAreaWidth: number, gameAreaHeight: number, scale: number }}
 */
export function calculateLandscapeGameSize(viewportWidth, viewportHeight, headerHeight = 60) {
  // 可用高度 = 视口高度 - 顶部栏 - 内边距
  const availableHeight = viewportHeight - headerHeight - 32
  const availableWidth = viewportWidth - 32

  // 游戏区域理想宽高比（UNO 桌面约为 5:3）
  const idealRatio = 5 / 3

  let gameAreaWidth, gameAreaHeight

  if (availableWidth / availableHeight > idealRatio) {
    // 高度受限
    gameAreaHeight = availableHeight
    gameAreaWidth = gameAreaHeight * idealRatio
  } else {
    // 宽度受限
    gameAreaWidth = availableWidth
    gameAreaHeight = gameAreaWidth / idealRatio
  }

  return {
    gameAreaWidth,
    gameAreaHeight,
    scale: Math.min(gameAreaWidth / 1024, gameAreaHeight / 614), // 基准尺寸 1024×614
  }
}
