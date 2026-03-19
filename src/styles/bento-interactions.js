/**
 * Bento Box 交互增强模块
 * 轻量级无依赖 JS — Hover Spotlight + Staggered Fade-in
 * 通过 MutationObserver 兼容 React SPA 路由切换
 */

// ── 选择器配置 ────────────────────────────────────────
// 只绑定页面级卡片，游戏内部元素完全排除
const CARD_SELECTORS = [
  'a.group[href*="/tools/"]',
  'a.group[href*="/games/party"]',
  // Games 广场页面的 Card 容器
  '.max-w-6xl [class*="overflow-hidden"]',
  // Tools 工具库页面的 Card
  'section.max-w-7xl [class*="overflow-hidden"]',
  // About 页面 Card
  '.max-w-3xl [class*="overflow-hidden"]',
  // PartyGame 页面 Card
  '.max-w-4xl [class*="overflow-hidden"]',
]

// 游戏容器排除器：凡在以下容器内的元素，跳过处理
const GAME_ZONE_SELECTOR = '[data-game-zone]'

/**
 * 检测元素是否在游戏区域内部
 */
const isInsideGameZone = (el) => el.closest(GAME_ZONE_SELECTOR) !== null

/**
 * 获取当前页面所有目标卡片元素（去重 + 过滤游戏区域）
 */
const getTargetCards = () => {
  const seen = new WeakSet()
  const result = []

  CARD_SELECTORS.forEach((selector) => {
    try {
      document.querySelectorAll(selector).forEach((el) => {
        if (!seen.has(el) && !isInsideGameZone(el)) {
          seen.add(el)
          result.push(el)
        }
      })
    } catch (_) {
      // 忽略无效选择器
    }
  })

  return result
}

// ── 1. Hover Spotlight ──────────────────────────────────
/**
 * 鼠标跟随高光效果
 * 将坐标写入 CSS 变量 --mouse-x / --mouse-y
 * CSS 中 .bento-spotlight::after 用 radial-gradient 渲染光晕
 */
const bindSpotlight = () => {
  getTargetCards().forEach((card) => {
    if (card.dataset.bentoSpotlight) return  // 避免重复绑定
    card.dataset.bentoSpotlight = '1'

    // 标记 CSS class，让 ::after 伪元素生效
    card.classList.add('bento-spotlight')

    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect()
      card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`)
      card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`)
    })
  })
}

// ── 2. Staggered Fade-in ────────────────────────────────
/**
 * 元素进入视口时的级联显现动画
 * 使用 IntersectionObserver + setTimeout 实现瀑布流加载感
 */
const bindFadeIn = () => {
  if (!('IntersectionObserver' in window)) return

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries.filter((e) => e.isIntersecting)

      // 按 DOM 顺序排序，保证级联方向自上而下
      visible.sort((a, b) => {
        const pos = a.target.compareDocumentPosition(b.target)
        return pos & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
      })

      visible.forEach((entry, idx) => {
        const el = entry.target
        setTimeout(() => {
          el.classList.remove('bento-fade-init')
          el.classList.add('bento-fade-in')
        }, idx * 80)
        observer.unobserve(el)
      })
    },
    {
      rootMargin: '0px 0px -40px 0px',
      threshold: 0.08,
    }
  )

  getTargetCards().forEach((el) => {
    if (el.dataset.bentoFade) return  // 避免重复处理
    el.dataset.bentoFade = '1'
    el.classList.add('bento-fade-init')
    observer.observe(el)
  })
}

// ── 3. 初始化入口 ───────────────────────────────────────
const initBento = () => {
  bindSpotlight()
  bindFadeIn()
}

// ── 4. MutationObserver：适配 SPA 路由切换 ─────────────
/**
 * 监听 React 渲染带来的 DOM 变化
 * 防抖 200ms，避免频繁触发
 */
let _debounceTimer = null

const mutationObserver = new MutationObserver((mutations) => {
  const hasAdded = mutations.some((m) => m.addedNodes.length > 0)
  if (!hasAdded) return

  clearTimeout(_debounceTimer)
  _debounceTimer = setTimeout(initBento, 200)
})

// ── 5. 启动 ─────────────────────────────────────────────
const start = () => {
  initBento()

  const appRoot = document.getElementById('root') || document.body
  mutationObserver.observe(appRoot, {
    childList: true,
    subtree: true,
  })
}

// 等待 DOM 就绪，兼容 Vite HMR
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start)
} else {
  // 延迟一帧，确保 React 完成首次渲染
  setTimeout(start, 80)
}
