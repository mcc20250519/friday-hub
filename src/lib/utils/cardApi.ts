/**
 * 卡片管理 API 工具函数
 * 提供卡片（工具/游戏）的 CRUD 操作及状态管理
 */

import { supabase } from '@/lib/supabase'
import type { Card, CardStatus, CardType } from '@/types/card'

// ============================================================
// 类型定义
// ============================================================

export interface FetchCardsOptions {
  type?: 'all' | CardType
  status?: 'all' | CardStatus
  search?: string
  category?: string
  sortBy?: 'sort_order' | 'created_at' | 'updated_at'
  limit?: number
  offset?: number
}

export interface FetchCardsResult {
  data: Card[]
  total: number
  hasMore: boolean
}

// ============================================================
// 获取卡片列表
// ============================================================

/**
 * 获取卡片列表，支持筛选和搜索
 */
export async function fetchCards(
  options: FetchCardsOptions = {}
): Promise<FetchCardsResult> {
  const {
    type = 'all',
    status = 'all',
    search = '',
    category = '',
    sortBy = 'sort_order',
    limit = 50,
    offset = 0,
  } = options

  try {
    let query = supabase.from('tools').select('*', { count: 'exact' })

    // 筛选类型
    if (type !== 'all') {
      query = query.eq('type', type)
    }

    // 筛选状态
    if (status !== 'all') {
      query = query.eq('status', status)
    }

    // 筛选分类
    if (category) {
      query = query.eq('category', category)
    }

    // 搜索（名称、描述、标签）
    if (search) {
      const searchTerm = `%${search}%`
      query = query.or(
        `name.ilike.${searchTerm},description.ilike.${searchTerm},tags.cs.{"${search}"}`
      )
    }

    // 排序
    query = query.order(sortBy, { ascending: sortBy === 'sort_order' })

    // 分页
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      throw new Error(`获取卡片列表失败: ${error.message}`)
    }

    return {
      data: (data || []) as Card[],
      total: count || 0,
      hasMore: (count || 0) > offset + (data?.length || 0),
    }
  } catch (err) {
    console.error('fetchCards error:', err)
    throw err
  }
}

// ============================================================
// 创建卡片
// ============================================================

/**
 * 创建新卡片
 */
export async function createCard(
  cardData: Omit<Card, 'id' | 'created_at' | 'updated_at'>,
  createdBy: string
): Promise<Card> {
  try {
    const newCard: Partial<Card> = {
      ...cardData,
      id: crypto.randomUUID(),
      created_by: createdBy,
      updated_by: createdBy,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('tools')
      .insert([newCard as any])
      .select()
      .single()

    if (error) {
      throw new Error(`创建卡片失败: ${error.message}`)
    }

    return data as Card
  } catch (err) {
    console.error('createCard error:', err)
    throw err
  }
}

// ============================================================
// 更新卡片
// ============================================================

/**
 * 更新卡片信息
 */
export async function updateCard(
  cardId: string,
  updates: Partial<Omit<Card, 'id' | 'created_at' | 'created_by'>>,
  updatedBy: string
): Promise<Card> {
  try {
    const updateData: Partial<Card> = {
      ...updates,
      updated_by: updatedBy,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('tools')
      .update(updateData as any)
      .eq('id', cardId)
      .select()
      .single()

    if (error) {
      throw new Error(`更新卡片失败: ${error.message}`)
    }

    return data as Card
  } catch (err) {
    console.error('updateCard error:', err)
    throw err
  }
}

// ============================================================
// 更新卡片状态
// ============================================================

/**
 * 更新卡片状态（draft/published/hidden）
 */
export async function updateCardStatus(
  cardId: string,
  status: CardStatus,
  updatedBy: string
): Promise<Card> {
  try {
    // 验证状态转移规则
    const { data: card, error: fetchError } = await supabase
      .from('tools')
      .select('status')
      .eq('id', cardId)
      .single()

    if (fetchError) {
      throw new Error(`获取卡片失败: ${fetchError.message}`)
    }

    const currentStatus = card?.status as CardStatus
    if (!isValidStatusTransition(currentStatus, status)) {
      throw new Error(
        `无效的状态转移: ${currentStatus} -> ${status}`
      )
    }

    // 更新状态
    return updateCard(
      cardId,
      { status },
      updatedBy
    )
  } catch (err) {
    console.error('updateCardStatus error:', err)
    throw err
  }
}

// ============================================================
// 删除卡片
// ============================================================

/**
 * 删除卡片（永久删除，不可恢复）
 */
export async function deleteCard(cardId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('tools')
      .delete()
      .eq('id', cardId)

    if (error) {
      throw new Error(`删除卡片失败: ${error.message}`)
    }
  } catch (err) {
    console.error('deleteCard error:', err)
    throw err
  }
}

// ============================================================
// 卡片可见性检查
// ============================================================

/**
 * 检查卡片在前台是否可见
 * 条件：status='published' && is_active=true
 */
export function isCardVisible(card: Card): boolean {
  return card.status === 'published' && card.is_active === true
}

// ============================================================
// 状态转移验证
// ============================================================

/**
 * 验证状态转移是否有效
 * 允许的转移：
 * - draft -> published
 * - published <-> hidden
 * - hidden -> draft
 * - published -> draft (下架)
 */
export function isValidStatusTransition(
  from: CardStatus,
  to: CardStatus
): boolean {
  if (from === to) return false // 不允许相同状态

  const validTransitions: Record<CardStatus, CardStatus[]> = {
    draft: ['published'],           // draft 只能发布
    published: ['hidden', 'draft'],  // published 可以隐藏或下架
    hidden: ['published', 'draft'],  // hidden 可以恢复或下架
  }

  return validTransitions[from]?.includes(to) ?? false
}

// ============================================================
// 排序更新
// ============================================================

/**
 * 更新卡片排序值
 */
export async function updateCardSortOrder(
  cardId: string,
  newSortOrder: number,
  updatedBy: string
): Promise<Card> {
  return updateCard(cardId, { sort_order: newSortOrder }, updatedBy)
}

/**
 * 批量更新排序值（用于拖拽排序）
 */
export async function updateMultipleSortOrders(
  updates: Array<{ id: string; sort_order: number }>,
  updatedBy: string
): Promise<void> {
  try {
    // Supabase 不支持批量 update with different values
    // 需要逐个更新或使用 RPC 函数
    const updatePromises = updates.map((item) =>
      updateCard(item.id, { sort_order: item.sort_order }, updatedBy)
    )

    await Promise.all(updatePromises)
  } catch (err) {
    console.error('updateMultipleSortOrders error:', err)
    throw err
  }
}

// ============================================================
// 导出符号以供测试使用
// ============================================================

export const cardApiExports = {
  fetchCards,
  createCard,
  updateCard,
  updateCardStatus,
  deleteCard,
  isCardVisible,
  isValidStatusTransition,
  updateCardSortOrder,
  updateMultipleSortOrders,
}
