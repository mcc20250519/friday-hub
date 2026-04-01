import { useRef } from 'react'

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

  // 3. 检测视口尺寸：用宽高中较小值，避免横屏打开时误判
  const smallerDim = Math.min(window.innerWidth, window.innerHeight)
  const isSmallScreen = smallerDim < 768

  // 任意一个条件满足即视为移动设备
  return isMobileUA || (hasTouch && isSmallScreen)
}

/**
 * 检测是否为移动设备
 *
 * 注意：只在初始化时检测一次，不监听 resize。
 * 原因：设备是否是移动端是固定属性，不应因屏幕旋转（resize）而改变。
 * 若监听 resize，横屏时 innerWidth 可能 >=768 导致判断反转，
 * 进而造成 MobileUnoGame ↔ UnoRoomPage 之间来回切换（"刷新"问题）。
 *
 * @returns {boolean} 是否为移动设备
 */
export function useIsMobile() {
  // useRef 存储初始检测结果，整个生命周期内不变，不会触发重渲染
  const isMobileRef = useRef(checkMobileSync())
  return isMobileRef.current
}

export default useIsMobile
