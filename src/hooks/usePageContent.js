/**
 * usePageContent - 页面文案管理
 *
 * 存储方案：localStorage（无需数据库，无网络请求，无闪烁）
 * - 首次渲染直接读 localStorage，拿到就用，没有就用默认值
 * - 管理后台保存 → 写入 localStorage → 通知所有订阅页面立即更新
 * - 刷新页面：第一帧就是正确值，不会闪烁
 */

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'site_content_v1'

// ─────────────────────────────────────────────────────────────
// localStorage 读写
// ─────────────────────────────────────────────────────────────

function readStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeStorage(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.warn('[usePageContent] localStorage 写入失败:', e)
  }
}

// ─────────────────────────────────────────────────────────────
// 全局内存状态（同一页面内多个组件共享，避免重复读 localStorage）
// ─────────────────────────────────────────────────────────────

let memoryStore = readStorage() // 模块加载时立即读取，后续复用
const listeners = new Set()     // 订阅更新的 setState 函数集合

function notifyAll() {
  const current = { ...memoryStore }
  listeners.forEach((fn) => fn(current))
}

// ─────────────────────────────────────────────────────────────
// 主 Hook
// ─────────────────────────────────────────────────────────────

/**
 * @param {string} _pageName  - 页面名称（保留参数，兼容旧调用，不再区分页面）
 * @param {string[]} keys     - 该页面用到的文案 key（组件外部定义为常量）
 * @param {Object} defaults   - 兜底默认值（数据库/localStorage 都没有时显示）
 */
export function usePageContent(_pageName, keys, defaults) {
  // 第一帧直接用内存（已在模块加载时从 localStorage 初始化），不会闪
  const [store, setStore] = useState(memoryStore)

  useEffect(() => {
    listeners.add(setStore)
    return () => { listeners.delete(setStore) }
  }, [])

  // 按需合并：defaults 提供兜底，localStorage 覆盖
  const content = { ...defaults }
  keys.forEach((k) => {
    if (store[k] !== undefined) content[k] = store[k]
  })

  return { content }
}

// ─────────────────────────────────────────────────────────────
// 公开 API（管理后台调用）
// ─────────────────────────────────────────────────────────────

/**
 * 保存单个文案 key（管理后台调用）
 */
export function savePageContent(key, value) {
  memoryStore = { ...memoryStore, [key]: value }
  writeStorage(memoryStore)
  notifyAll()
}

/**
 * 批量保存（可选）
 */
export function savePageContentBatch(updates) {
  memoryStore = { ...memoryStore, ...updates }
  writeStorage(memoryStore)
  notifyAll()
}

/**
 * 读取所有已保存的内容
 */
export function getAllPageContent() {
  return { ...memoryStore }
}

/**
 * 清除所有内容（恢复默认）
 */
export function clearAllPageContent() {
  memoryStore = {}
  writeStorage({})
  notifyAll()
}

// ─────────────────────────────────────────────────────────────
// 兼容旧代码的空函数（避免 import 报错）
// ─────────────────────────────────────────────────────────────
export function clearAllPageContentCache() { clearAllPageContent() }
export function clearPageContentCache() {}
export function optimisticUpdatePageContent(_p, updates) {
  savePageContentBatch(updates)
}
export function getPageContentCacheStats() {
  return { keys: Object.keys(memoryStore).length }
}
