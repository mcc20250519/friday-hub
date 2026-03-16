/**
 * useLandscapeMode - 手机端横屏锁定 Hook
 *
 * 功能：
 * 1. 检测是否为移动设备
 * 2. 在移动设备上尝试锁定屏幕方向为横屏
 * 3. 如果浏览器不支持锁定，则显示横屏提示
 * 4. 组件卸载时自动解锁
 *
 * 使用场景：UNO 游戏从创建房间到游戏结束的全程横屏体验
 */

import { useState, useEffect, useCallback } from 'react'

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
 * @returns {{ isLandscape: boolean, showPrompt: boolean, isMobile: boolean }}
 */
export default function useLandscapeMode() {
  const [landscape, setLandscape] = useState(isLandscape())
  const [showPrompt, setShowPrompt] = useState(false)
  const [isMobile, setIsMobile] = useState(isMobileDevice())
  const lockRef = useState(null)[0] // 存储屏幕锁定 Promise

  // 尝试锁定屏幕方向
  const lockLandscape = useCallback(async () => {
    // 非移动设备不需要锁定
    if (!isMobileDevice()) return

    // Screen Orientation API (现代浏览器)
    if (screen.orientation && screen.orientation.lock) {
      try {
        await screen.orientation.lock('landscape')
        console.log('[Landscape] 屏幕方向已锁定为横屏')
        return true
      } catch (err) {
        // 某些浏览器要求全屏才能锁定，或用户拒绝了锁定
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
    // 非移动设备不启用横屏提示
    if (!isMobileDevice()) {
      setIsMobile(false)
      return
    }

    setIsMobile(true)

    // 初始检测
    const checkOrientation = () => {
      const currentLandscape = isLandscape()
      setLandscape(currentLandscape)
      // 竖屏时显示提示
      setShowPrompt(!currentLandscape)
    }

    // 首次检查
    checkOrientation()

    // 尝试锁定横屏
    lockLandscape()

    // 监听屏幕方向变化
    const handleOrientationChange = () => {
      checkOrientation()
    }

    // Screen Orientation API
    if (screen.orientation) {
      screen.orientation.addEventListener('change', handleOrientationChange)
    }

    // 兼容 resize 事件
    window.addEventListener('resize', handleOrientationChange)

    // 兼容旧版 orientationchange 事件
    window.addEventListener('orientationchange', handleOrientationChange)

    return () => {
      // 清理监听器
      if (screen.orientation) {
        screen.orientation.removeEventListener('change', handleOrientationChange)
      }
      window.removeEventListener('resize', handleOrientationChange)
      window.removeEventListener('orientationchange', handleOrientationChange)

      // 组件卸载时解锁屏幕方向
      unlockLandscape()
    }
  }, [lockLandscape, unlockLandscape])

  return {
    isLandscape: landscape,
    showPrompt,
    isMobile,
  }
}

/**
 * 横屏提示组件
 * 在用户竖屏时显示，提示用户旋转设备
 */
export function LandscapePrompt({ show }) {
  if (!show) return null

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-purple-600 to-pink-600 flex flex-col items-center justify-center text-white">
      {/* 手机图标 */}
      <div className="relative mb-6">
        {/* 竖屏手机 */}
        <div
          className="w-16 h-28 border-4 border-white/60 rounded-xl flex items-center justify-center animate-pulse"
          style={{ animation: 'rotatePhoneHint 2s ease-in-out infinite' }}
        >
          <div className="w-8 h-1 bg-white/60 rounded-full" />
        </div>
        {/* 旋转箭头 */}
        <div
          className="absolute -right-6 top-1/2 -translate-y-1/2 text-4xl"
          style={{ animation: 'arrowRotate 1.5s ease-in-out infinite' }}
        >
          ↻
        </div>
        {/* 横屏手机 */}
        <div
          className="w-28 h-16 border-4 border-white/60 rounded-xl flex items-center justify-center mt-6 opacity-80"
        >
          <div className="w-16 h-1 bg-white/60 rounded-full" />
        </div>
      </div>

      {/* 提示文字 */}
      <div className="text-center px-8">
        <h2 className="text-2xl font-bold mb-2">请旋转设备</h2>
        <p className="text-white/80 text-sm">
          UNO 游戏需要横屏体验，请将手机横过来 🎮
        </p>
      </div>

      {/* 动画样式 */}
      <style>{`
        @keyframes rotatePhoneHint {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(15deg); }
          75% { transform: rotate(-15deg); }
        }
        @keyframes arrowRotate {
          0%, 100% { transform: translateY(-50%) rotate(0deg); opacity: 0.6; }
          50% { transform: translateY(-50%) rotate(180deg); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
