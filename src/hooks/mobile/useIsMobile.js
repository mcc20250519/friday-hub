import { useState, useEffect } from 'react'

/**
 * 检测是否为移动设备
 * 
 * @returns {boolean} 是否为移动设备
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      // 1. 检测 User Agent
      const userAgent = navigator.userAgent || navigator.vendor || window.opera
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
      const isMobileUA = mobileRegex.test(userAgent)

      // 2. 检测触摸事件支持
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0

      // 3. 检测视口宽度（小于 768px 视为移动设备）
      const isSmallScreen = window.innerWidth < 768

      // 任意一个条件满足即视为移动设备
      setIsMobile(isMobileUA || (hasTouch && isSmallScreen))
    }

    // 初始检测
    checkMobile()

    // 监听窗口大小变化
    window.addEventListener('resize', checkMobile)

    return () => {
      window.removeEventListener('resize', checkMobile)
    }
  }, [])

  return isMobile
}

export default useIsMobile
