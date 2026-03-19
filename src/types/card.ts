/**
 * 卡片管理系统的类型定义
 */

export type CardStatus = 'draft' | 'published' | 'hidden'
export type CardType = 'tool' | 'game'
export type ContentType = 'text' | 'html'

/**
 * 卡片接口（工具和游戏统一）
 */
export interface Card {
  id: string
  type: CardType
  name: string
  description: string
  category?: string // 分类（工具用）
  tags: string[]
  icon: string
  status: CardStatus
  is_active: boolean
  sort_order: number

  // 工具特定字段
  download_url?: string
  content?: string

  // 游戏特定字段
  room_config?: Record<string, any>
  max_players?: number

  // 元数据
  created_at: string
  updated_at: string
  created_by: string
  updated_by: string
}

/**
 * 创建卡片的请求数据
 */
export type CreateCardRequest = Omit<
  Card,
  'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'
>

/**
 * 更新卡片的请求数据
 */
export type UpdateCardRequest = Partial<
  Omit<Card, 'id' | 'created_at' | 'created_by' | 'updated_by'>
>

/**
 * 站点文案内容
 */
export interface SiteContent {
  id: string
  key: string
  value: string
  content_type: ContentType
  description?: string
  created_at: string
  updated_at: string
  created_by: string
  updated_by: string
  version: number
}

/**
 * 创建站点文案的请求数据
 */
export type CreateSiteContentRequest = Omit<
  SiteContent,
  'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by' | 'version'
>

/**
 * 更新站点文案的请求数据
 */
export type UpdateSiteContentRequest = Partial<
  Omit<SiteContent, 'id' | 'created_at' | 'created_by' | 'updated_by' | 'version' | 'key'>
>

/**
 * 卡片列表视图（预览显示）
 */
export interface CardListItem extends Card {
  isVisible: boolean // 前台是否可见
}

/**
 * 批量操作请求
 */
export interface BulkActionRequest {
  action: 'publish' | 'unpublish' | 'hide' | 'show' | 'delete'
  cardIds: string[]
  updatedBy?: string
}

/**
 * 批量操作结果
 */
export interface BulkActionResult {
  success: boolean
  updated: number
  failed: number
  errors?: string[]
}
