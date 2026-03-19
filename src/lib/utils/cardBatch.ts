/**
 * 卡片批量操作 API 函数
 * 支持批量发布、下架、隐藏、恢复、删除等操作
 */

import { supabase } from '@/lib/supabase'
import type { Card, BulkActionRequest, BulkActionResult } from '@/types/card'
import { updateCardStatus, deleteCard } from '@/lib/utils/cardApi'

// ============================================================
// 批量状态更新
// ============================================================

/**
 * 批量发布卡片（draft -> published）
 */
export async function bulkPublish(
  cardIds: string[],
  updatedBy: string
): Promise<BulkActionResult> {
  return batchUpdateStatus(cardIds, 'published', updatedBy)
}

/**
 * 批量下架卡片（published/hidden -> draft）
 */
export async function bulkUnpublish(
  cardIds: string[],
  updatedBy: string
): Promise<BulkActionResult> {
  return batchUpdateStatus(cardIds, 'draft', updatedBy)
}

/**
 * 批量隐藏卡片（published -> hidden）
 */
export async function bulkHide(
  cardIds: string[],
  updatedBy: string
): Promise<BulkActionResult> {
  return batchUpdateStatus(cardIds, 'hidden', updatedBy)
}

/**
 * 批量恢复卡片显示（hidden -> published）
 */
export async function bulkShow(
  cardIds: string[],
  updatedBy: string
): Promise<BulkActionResult> {
  return batchUpdateStatus(cardIds, 'published', updatedBy)
}

/**
 * 批量更新卡片状态
 */
export async function batchUpdateStatus(
  cardIds: string[],
  newStatus: 'draft' | 'published' | 'hidden',
  updatedBy: string
): Promise<BulkActionResult> {
  const result: BulkActionResult = {
    success: true,
    updated: 0,
    failed: 0,
    errors: [],
  }

  if (!cardIds.length) {
    result.success = false
    result.errors = ['没有选中任何卡片']
    return result
  }

  try {
    // 为了实现原子性，我们先验证所有转移是否有效
    const { data: cards, error: fetchError } = await supabase
      .from('tools')
      .select('id, status')
      .in('id', cardIds)

    if (fetchError) {
      throw new Error(`获取卡片失败: ${fetchError.message}`)
    }

    if (!cards || cards.length === 0) {
      result.success = false
      result.errors = ['未找到指定的卡片']
      return result
    }

    // 逐个更新（暂无 Supabase RPC 支持原子批量更新）
    const updatePromises = cards.map((card: any) =>
      updateCardStatus(card.id, newStatus, updatedBy).catch((err) => {
        result.errors?.push(`卡片 ${card.id}: ${err.message}`)
        result.failed++
        throw err
      })
    )

    try {
      await Promise.all(updatePromises)
      result.updated = cards.length - result.failed
    } catch {
      // 如果有任何失败，entire operation fails
      if (result.failed > 0) {
        result.success = false
      }
    }

    return result
  } catch (err) {
    console.error('batchUpdateStatus error:', err)
    result.success = false
    result.errors = [`批量操作失败: ${err instanceof Error ? err.message : String(err)}`]
    return result
  }
}

// ============================================================
// 批量删除
// ============================================================

/**
 * 批量删除卡片（永久删除）
 */
export async function bulkDelete(
  cardIds: string[]
): Promise<BulkActionResult> {
  const result: BulkActionResult = {
    success: true,
    updated: 0,
    failed: 0,
    errors: [],
  }

  if (!cardIds.length) {
    result.success = false
    result.errors = ['没有选中任何卡片']
    return result
  }

  try {
    // 逐个删除
    const deletePromises = cardIds.map((id) =>
      deleteCard(id).catch((err) => {
        result.errors?.push(`卡片 ${id}: ${err.message}`)
        result.failed++
        throw err
      })
    )

    try {
      await Promise.all(deletePromises)
      result.updated = cardIds.length - result.failed
    } catch {
      // 如果有任何失败，entire operation fails
      if (result.failed > 0) {
        result.success = false
      }
    }

    return result
  } catch (err) {
    console.error('bulkDelete error:', err)
    result.success = false
    result.errors = [`批量删除失败: ${err instanceof Error ? err.message : String(err)}`]
    return result
  }
}

// ============================================================
// 通用批量操作分发
// ============================================================

/**
 * 统一批量操作接口
 */
export async function executeBulkAction(
  request: BulkActionRequest
): Promise<BulkActionResult> {
  const { action, cardIds, updatedBy = 'batch-operation' } = request

  switch (action) {
    case 'publish':
      return bulkPublish(cardIds, updatedBy)

    case 'unpublish':
      return bulkUnpublish(cardIds, updatedBy)

    case 'hide':
      return bulkHide(cardIds, updatedBy)

    case 'show':
      return bulkShow(cardIds, updatedBy)

    case 'delete':
      return bulkDelete(cardIds)

    default:
      return {
        success: false,
        updated: 0,
        failed: 0,
        errors: [`未知的操作: ${action}`],
      }
  }
}

// ============================================================
// 导出符号以供测试使用
// ============================================================

export const cardBatchExports = {
  bulkPublish,
  bulkUnpublish,
  bulkHide,
  bulkShow,
  batchUpdateStatus,
  bulkDelete,
  executeBulkAction,
}
