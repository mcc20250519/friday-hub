/**
 * 站点文案管理 API 函数
 * 提供首页及各页面文案的 CRUD 操作
 */

import { supabase } from '@/lib/supabase'
import type { SiteContent, CreateSiteContentRequest, UpdateSiteContentRequest } from '@/types/card'

// ============================================================
// 获取文案
// ============================================================

/**
 * 获取所有站点文案
 */
export async function fetchAllSiteContent(): Promise<SiteContent[]> {
  try {
    const { data, error } = await supabase
      .from('site_content')
      .select('*')
      .order('key', { ascending: true })

    if (error) {
      throw new Error(`获取文案失败: ${error.message}`)
    }

    return (data || []) as SiteContent[]
  } catch (err) {
    console.error('fetchAllSiteContent error:', err)
    throw err
  }
}

/**
 * 获取特定文案
 */
export async function fetchSiteContent(key: string): Promise<SiteContent | null> {
  try {
    const { data, error } = await supabase
      .from('site_content')
      .select('*')
      .eq('key', key)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = 没有找到
      throw new Error(`获取文案失败: ${error.message}`)
    }

    return (data as SiteContent) || null
  } catch (err) {
    console.error('fetchSiteContent error:', err)
    throw err
  }
}

/**
 * 批量获取多个文案
 */
export async function fetchSiteContentByKeys(keys: string[]): Promise<SiteContent[]> {
  try {
    const { data, error } = await supabase
      .from('site_content')
      .select('*')
      .in('key', keys)

    if (error) {
      throw new Error(`获取文案失败: ${error.message}`)
    }

    return (data || []) as SiteContent[]
  } catch (err) {
    console.error('fetchSiteContentByKeys error:', err)
    throw err
  }
}

// ============================================================
// 创建文案
// ============================================================

/**
 * 创建新文案
 */
export async function createSiteContent(
  content: CreateSiteContentRequest,
  createdBy: string
): Promise<SiteContent> {
  try {
    const newContent: Partial<SiteContent> = {
      ...content,
      id: crypto.randomUUID(),
      created_by: createdBy,
      updated_by: createdBy,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
    }

    const { data, error } = await supabase
      .from('site_content')
      .insert([newContent as any])
      .select()
      .single()

    if (error) {
      throw new Error(`创建文案失败: ${error.message}`)
    }

    return data as SiteContent
  } catch (err) {
    console.error('createSiteContent error:', err)
    throw err
  }
}

// ============================================================
// 更新文案
// ============================================================

/**
 * 更新文案
 */
export async function updateSiteContent(
  key: string,
  updates: UpdateSiteContentRequest,
  updatedBy: string
): Promise<SiteContent> {
  try {
    // 先获取现有内容以增加版本号
    const existing = await fetchSiteContent(key)
    if (!existing) {
      throw new Error(`文案不存在: ${key}`)
    }

    const updateData: Partial<SiteContent> = {
      ...updates,
      updated_by: updatedBy,
      updated_at: new Date().toISOString(),
      version: (existing.version || 1) + 1,
    }

    const { data, error } = await supabase
      .from('site_content')
      .update(updateData as any)
      .eq('key', key)
      .select()
      .single()

    if (error) {
      throw new Error(`更新文案失败: ${error.message}`)
    }

    return data as SiteContent
  } catch (err) {
    console.error('updateSiteContent error:', err)
    throw err
  }
}

/**
 * 快速更新文案值（仅更新 value 字段）
 */
export async function quickUpdateSiteContent(
  key: string,
  value: string,
  updatedBy: string
): Promise<SiteContent> {
  return updateSiteContent(key, { value }, updatedBy)
}

// ============================================================
// 删除文案
// ============================================================

/**
 * 删除文案
 */
export async function deleteSiteContent(key: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('site_content')
      .delete()
      .eq('key', key)

    if (error) {
      throw new Error(`删除文案失败: ${error.message}`)
    }
  } catch (err) {
    console.error('deleteSiteContent error:', err)
    throw err
  }
}

// ============================================================
// 文案缓存与预加载
// ============================================================

let contentCache: Map<string, SiteContent> | null = null
let cacheTimestamp: number | null = null
const CACHE_DURATION = 5 * 60 * 1000 // 5 分钟

/**
 * 清除缓存
 */
export function clearSiteContentCache(): void {
  contentCache = null
  cacheTimestamp = null
}

/**
 * 获取首页文案快速对象
 */
export async function getHomePageContent(): Promise<Record<string, string>> {
  const homeKeys = [
    'home_hero_title',
    'home_hero_subtitle',
    'home_hero_desc',
    'home_featured_label',
    'home_cta_register_title',
    'home_cta_register_desc',
    'home_footer_text',
    'home_footer_desc',
  ]

  try {
    const contents = await fetchSiteContentByKeys(homeKeys)
    const result: Record<string, string> = {}

    contents.forEach((content) => {
      result[content.key] = content.value
    })

    // 填充缺失的字段（使用默认值）
    homeKeys.forEach((key) => {
      if (!(key in result)) {
        result[key] = '' // 空字符串作为默认值
      }
    })

    return result
  } catch (err) {
    console.error('getHomePageContent error:', err)
    throw err
  }
}

/**
 * 获取缓存的文案
 */
export async function getCachedSiteContent(
  forceRefresh = false
): Promise<Map<string, SiteContent>> {
  const now = Date.now()

  if (
    !forceRefresh &&
    contentCache &&
    cacheTimestamp &&
    now - cacheTimestamp < CACHE_DURATION
  ) {
    return contentCache
  }

  try {
    const contents = await fetchAllSiteContent()
    contentCache = new Map(contents.map((c) => [c.key, c]))
    cacheTimestamp = now
    return contentCache
  } catch (err) {
    console.error('getCachedSiteContent error:', err)
    // 返回空缓存而不是抛出错误
    contentCache = new Map()
    cacheTimestamp = now
    return contentCache
  }
}

/**
 * 从缓存获取文案值
 */
export async function getCachedSiteContentValue(key: string): Promise<string | null> {
  const cache = await getCachedSiteContent()
  return cache.get(key)?.value || null
}

// ============================================================
// 导出符号以供测试使用
// ============================================================

export const siteContentExports = {
  fetchAllSiteContent,
  fetchSiteContent,
  fetchSiteContentByKeys,
  createSiteContent,
  updateSiteContent,
  quickUpdateSiteContent,
  deleteSiteContent,
  clearSiteContentCache,
  getHomePageContent,
  getCachedSiteContent,
  getCachedSiteContentValue,
}
