import { useState, useEffect } from 'react'

/**
 * 同步检测是否为移动设备（用于初始状态）
 */
function checkMobileSync() {
  if (typeof window === 'undefined') return false
  
  // 1. 检测 User Agent
  const userAgent = navigator.userAgent || navigator.vendor || window.opera
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
  const isMobileUA = mobileRegex.test(userAgent)

  // 2. 检测触摸事件支持
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0

  // 3. 检测视口宽度（小于 768px 视为移动设备）
  const isSmallScreen = window.innerWidth < 768

  // 任意一个条件满足即视为移动设备
  return isMobileUA || (hasTouch && isSmallScreen)
}

/**
 * 检测是否为移动设备
 * 
 * @returns {boolean} 是否为移动设备
 */
export function useIsMobile() {
  // 初始状态立即同步检测，避免双重渲染
  const [isMobile, setIsMobile] = useState(() => checkMobileSync())

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(checkMobileSync())
    }

    // 监听窗口大小变化（初始化已在 useState 中完成）
    window.addEventListener('resize', checkMobile)

    return () => {
      window.removeEventListener('resize', checkMobile)
    }
  }, [])

  return isMobile
}

export default useIsMobile
