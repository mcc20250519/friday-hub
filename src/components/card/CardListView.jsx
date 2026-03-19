import { useState, useCallback } from 'react'
import { Trash2, Edit2, Eye, EyeOff, Copy, ArrowUp, ArrowDown } from 'lucide-react'
import ConfirmDialog from './ConfirmDialog'

// Neo-Brutalism 色彩系统
const NB = {
  card: '#FFFFFF',
  text: '#1A1A1A',
  sub: '#5A5350',
  border: '#1A1A1A',
  shadow: '2px 2px 0px #1A1A1A',
  mint: '#B4F8C8',
  pink: '#FFAEBC',
  yellow: '#FFE566',
}

export default function CardListView({
  cards,
  onEdit,
  onDelete,
  onDuplicate,
  onStatusChange,
  onReorder,
  loading,
  error,
  selectedCards,
  onSelectionChange,
}) {
  const [confirmAction, setConfirmAction] = useState(null)
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', order: 'desc' })

  // 排序功能
  const sortedCards = useCallback(() => {
    let sorted = [...(cards || [])]
    if (sortConfig.key) {
      sorted.sort((a, b) => {
        let aVal = a[sortConfig.key]
        let bVal = b[sortConfig.key]

        // 处理日期
        if (sortConfig.key.includes('At')) {
          aVal = new Date(aVal)
          bVal = new Date(bVal)
        }

        // 字符串比较
        if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase()
          bVal = bVal.toLowerCase()
        }

        if (aVal < bVal) return sortConfig.order === 'asc' ? -1 : 1
        if (aVal > bVal) return sortConfig.order === 'asc' ? 1 : -1
        return 0
      })
    }
    return sorted
  }, [cards, sortConfig])

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      order: prev.key === key && prev.order === 'asc' ? 'desc' : 'asc',
    }))
  }

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      onSelectionChange(cards.map((c) => c.id))
    } else {
      onSelectionChange([])
    }
  }

  const handleSelectCard = (cardId, e) => {
    e.stopPropagation()
    if (selectedCards.includes(cardId)) {
      onSelectionChange(selectedCards.filter((id) => id !== cardId))
    } else {
      onSelectionChange([...selectedCards, cardId])
    }
  }

  const handleDelete = (cardId) => {
    setConfirmAction({
      type: 'delete',
      cardId,
      message: '确定要删除这个卡片吗？此操作无法撤销。',
    })
  }

  const handleConfirm = () => {
    if (confirmAction?.type === 'delete') {
      onDelete(confirmAction.cardId)
    }
    setConfirmAction(null)
  }

  // 获取状态标签
  const getStatusLabel = (status) => {
    const statusMap = {
      draft: { label: '待上架', bg: '#FFE566', color: '#1A1A1A' },
      published: { label: '已上架', bg: '#B4F8C8', color: '#1A1A1A' },
      hidden: { label: '隐藏', bg: '#FFB4B4', color: '#1A1A1A' },
    }
    return statusMap[status] || statusMap.draft
  }

  if (error) {
    return (
      <div
        className="p-6 text-center rounded"
        style={{
          border: `3px solid ${NB.border}`,
          background: NB.card,
          boxShadow: NB.shadow,
        }}
      >
        <p style={{ color: '#DC2626' }}>错误: {error}</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <p style={{ color: NB.sub }}>加载中...</p>
      </div>
    )
  }

  if (!cards || cards.length === 0) {
    return (
      <div
        className="p-8 text-center rounded"
        style={{
          border: `3px dashed ${NB.border}`,
          background: 'rgba(26,26,26,0.02)',
        }}
      >
        <p style={{ color: NB.sub }}>暂无卡片</p>
      </div>
    )
  }

  const tableData = sortedCards()
  const allSelected = cards.length > 0 && selectedCards.length === cards.length

  return (
    <>
      {/* 表格容器 */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr
              style={{
                borderBottom: `3px solid ${NB.border}`,
                background: '#F5F5F5',
              }}
            >
              <th className="p-4 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={handleSelectAll}
                  className="cursor-pointer"
                />
              </th>

              {/* 名称列 */}
              <th
                className="p-4 text-left font-semibold cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-2">
                  <span>名称</span>
                  {sortConfig.key === 'name' && (
                    <span>{sortConfig.order === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>

              {/* 类型列 */}
              <th
                className="p-4 text-left font-semibold cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('type')}
              >
                <div className="flex items-center gap-2">
                  <span>类型</span>
                  {sortConfig.key === 'type' && (
                    <span>{sortConfig.order === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>

              {/* 状态列 */}
              <th
                className="p-4 text-left font-semibold cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center gap-2">
                  <span>状态</span>
                  {sortConfig.key === 'status' && (
                    <span>{sortConfig.order === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>

              {/* 创建时间列 */}
              <th
                className="p-4 text-left font-semibold cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('createdAt')}
              >
                <div className="flex items-center gap-2">
                  <span>创建时间</span>
                  {sortConfig.key === 'createdAt' && (
                    <span>{sortConfig.order === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>

              {/* 操作列 */}
              <th className="p-4 text-left font-semibold">操作</th>
            </tr>
          </thead>

          <tbody>
            {tableData.map((card, idx) => (
              <tr
                key={card.id}
                onClick={(e) => handleSelectCard(card.id, e)}
                className="cursor-pointer hover:bg-gray-50"
                style={{
                  borderBottom: `1px solid ${NB.border}`,
                  background: selectedCards.includes(card.id) ? '#F0F0F0' : 'transparent',
                }}
              >
                {/* 复选框 */}
                <td className="p-4">
                  <input
                    type="checkbox"
                    checked={selectedCards.includes(card.id)}
                    onChange={(e) => handleSelectCard(card.id, e)}
                    className="cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  />
                </td>

                {/* 名称 */}
                <td
                  className="p-4 font-semibold"
                  style={{ color: NB.text }}
                >
                  {card.name}
                </td>

                {/* 类型 */}
                <td className="p-4" style={{ color: NB.sub }}>
                  <span className="px-2 py-1 text-xs font-semibold"
                    style={{
                      border: `1px solid ${NB.border}`,
                      borderRadius: '4px',
                      background: card.type === 'tool' ? NB.mint : NB.pink,
                    }}
                  >
                    {card.type === 'tool' ? '工具' : '游戏'}
                  </span>
                </td>

                {/* 状态 */}
                <td className="p-4">
                  <span
                    className="px-2 py-1 text-xs font-semibold"
                    style={{
                      border: `1px solid ${NB.border}`,
                      borderRadius: '4px',
                      background: getStatusLabel(card.status).bg,
                      color: getStatusLabel(card.status).color,
                    }}
                  >
                    {getStatusLabel(card.status).label}
                  </span>
                </td>

                {/* 创建时间 */}
                <td className="p-4 text-sm" style={{ color: NB.sub }}>
                  {new Date(card.createdAt).toLocaleDateString('zh-CN')}
                </td>

                {/* 操作按钮 */}
                <td className="p-4">
                  <div className="flex gap-2">
                    {/* 编辑 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onEdit(card.id)
                      }}
                      className="p-2 rounded hover:bg-gray-100"
                      title="编辑"
                      style={{ color: NB.text }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {/* 切换可见性 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onStatusChange(card.id, card.status === 'hidden' ? 'published' : 'hidden')
                      }}
                      className="p-2 rounded hover:bg-gray-100"
                      title={card.status === 'hidden' ? '显示' : '隐藏'}
                      style={{ color: card.status === 'hidden' ? '#999' : NB.text }}
                    >
                      {card.status === 'hidden' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>

                    {/* 复制 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDuplicate(card.id)
                      }}
                      className="p-2 rounded hover:bg-gray-100"
                      title="复制"
                      style={{ color: NB.text }}
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    {/* 删除 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(card.id)
                      }}
                      className="p-2 rounded hover:bg-red-100"
                      title="删除"
                      style={{ color: '#DC2626' }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 统计信息 */}
      <div className="mt-4 text-sm" style={{ color: NB.sub }}>
        共 {cards.length} 个卡片
        {selectedCards.length > 0 && ` | 已选 ${selectedCards.length} 个`}
      </div>

      {/* 确认对话框 */}
      {confirmAction && (
        <ConfirmDialog
          title="确认删除"
          message={confirmAction.message}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmAction(null)}
          isDangerous={true}
        />
      )}
    </>
  )
}
