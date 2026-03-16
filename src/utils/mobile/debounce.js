/**
 * 防抖函数 - 防止函数在短时间内被多次调用
 * 
 * @param {Function} func - 要防抖的函数
 * @param {number} wait - 等待时间（毫秒）
 * @param {Object} options - 配置选项
 * @param {boolean} options.leading - 是否在延迟开始前调用
 * @param {boolean} options.trailing - 是否在延迟结束后调用
 * @returns {Function} 防抖后的函数
 */
export function debounce(func, wait = 300, options = {}) {
  const { leading = false, trailing = true } = options
  let timeout = null
  let lastCallTime = 0

  return function debounced(...args) {
    const context = this
    const now = Date.now()

    // 清除之前的定时器
    if (timeout) {
      clearTimeout(timeout)
    }

    // Leading edge: 如果启用且是首次调用
    if (leading && now - lastCallTime > wait) {
      func.apply(context, args)
      lastCallTime = now
    }

    // Trailing edge: 延迟执行
    if (trailing) {
      timeout = setTimeout(() => {
        func.apply(context, args)
        lastCallTime = Date.now()
        timeout = null
      }, wait)
    }
  }
}

/**
 * 节流函数 - 确保函数在指定时间内最多执行一次
 * 
 * @param {Function} func - 要节流的函数
 * @param {number} wait - 等待时间（毫秒）
 * @returns {Function} 节流后的函数
 */
export function throttle(func, wait = 300) {
  let timeout = null
  let lastRun = 0

  return function throttled(...args) {
    const context = this
    const now = Date.now()

    if (!lastRun || now - lastRun >= wait) {
      func.apply(context, args)
      lastRun = now
    } else {
      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(() => {
        func.apply(context, args)
        lastRun = Date.now()
      }, wait - (now - lastRun))
    }
  }
}

export default { debounce, throttle }
