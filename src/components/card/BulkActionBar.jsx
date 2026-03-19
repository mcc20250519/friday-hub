import { useState } from 'react'
import { Trash2, Eye, EyeOff, Copy } from 'lucide-react'
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

export default function BulkActionBar({
  selectedCount = 0,
  onBulkDelete,
  onBulkChangeStatus,
  onBulkDuplicate,
  onClearSelection,
  loading = false,
  disabled = false,
}) {
  const [confirmAction, setConfirmAction] = useState(null)

  if (selectedCount === 0) return null

  const handleBulkDelete = () => {
    setConfirmAction({
      type: 'delete',
      message: `确定要删除 ${selectedCount} 个卡片吗？此操作无法撤销。`,
    })
  }

  const handleBulkStatusChange = (status) => {
    setConfirmAction({
      type: 'status',
      status,
      message: `确定要将 ${selectedCount} 个卡片状态改为"${
        status === 'published' ? '已上架' : status === 'hidden' ? '隐藏' : '待上架'
      }"吗？`,
    })
  }

  const handleConfirm = () => {
    if (confirmAction?.type === 'delete') {
      onBulkDelete()
    } else if (confirmAction?.type === 'status') {
      onBulkChangeStatus(confirmAction.status)
    }
    setConfirmAction(null)
  }

  return (
    <>
      <div
        className="p-4 rounded flex items-center justify-between sticky bottom-0 z-30"
        style={{
          border: `3px solid ${NB.border}`,
          background: NB.yellow,
          boxShadow: NB.shadow,
        }}
      >
        {/* 左侧信息 */}
        <div>
          <p className="font-semibold" style={{ color: NB.text }}>
            已选择 {selectedCount} 个卡片
          </p>
          <p className="text-xs" style={{ color: NB.sub }}>
            选择要批量执行的操作
          </p>
        </div>

        {/* 右侧操作按钮 */}
        <div className="flex gap-2 flex-wrap justify-end">
          {/* 批量发布 */}
          <button
            onClick={() => handleBulkStatusChange('published')}
            disabled={loading || disabled}
            className="p-2 rounded hover:bg-green-100 transition-all"
            title="发布选中的卡片"
            style={{
              border: `2px solid ${NB.border}`,
              background: NB.mint,
              color: NB.text,
              cursor: 'pointer',
              opacity: loading || disabled ? 0.5 : 1,
            }}
            onMouseDown={(e) => {
              if (!(loading || disabled)) {
                e.currentTarget.style.transform = 'translate(1px, 1px)'
                e.currentTarget.style.boxShadow = 'none'
              }
            }}
            onMouseUp={(e) => {
              if (!(loading || disabled)) {
                e.currentTarget.style.transform = 'translate(0, 0)'
                e.currentTarget.style.boxShadow = `1px 1px 0px ${NB.border}`
              }
            }}
          >
            <Eye className="w-4 h-4" />
          </button>

          {/* 批量隐藏 */}
          <button
            onClick={() => handleBulkStatusChange('hidden')}
            disabled={loading || disabled}
            className="p-2 rounded hover:bg-red-100 transition-all"
            title="隐藏选中的卡片"
            style={{
              border: `2px solid ${NB.border}`,
              background: NB.pink,
              color: NB.text,
              cursor: 'pointer',
              opacity: loading || disabled ? 0.5 : 1,
            }}
            onMouseDown={(e) => {
              if (!(loading || disabled)) {
                e.currentTarget.style.transform = 'translate(1px, 1px)'
                e.currentTarget.style.boxShadow = 'none'
              }
            }}
            onMouseUp={(e) => {
              if (!(loading || disabled)) {
                e.currentTarget.style.transform = 'translate(0, 0)'
                e.currentTarget.style.boxShadow = `1px 1px 0px ${NB.border}`
              }
            }}
          >
            <EyeOff className="w-4 h-4" />
          </button>

          {/* 批量复制 */}
          <button
            onClick={() => {
              onBulkDuplicate()
              onClearSelection()
            }}
            disabled={loading || disabled}
            className="p-2 rounded hover:bg-blue-100 transition-all"
            title="复制选中的卡片"
            style={{
              border: `2px solid ${NB.border}`,
              background: '#A8D8FF',
              color: NB.text,
              cursor: 'pointer',
              opacity: loading || disabled ? 0.5 : 1,
            }}
            onMouseDown={(e) => {
              if (!(loading || disabled)) {
                e.currentTarget.style.transform = 'translate(1px, 1px)'
                e.currentTarget.style.boxShadow = 'none'
              }
            }}
            onMouseUp={(e) => {
              if (!(loading || disabled)) {
                e.currentTarget.style.transform = 'translate(0, 0)'
                e.currentTarget.style.boxShadow = `1px 1px 0px ${NB.border}`
              }
            }}
          >
            <Copy className="w-4 h-4" />
          </button>

          {/* 批量删除 */}
          <button
            onClick={handleBulkDelete}
            disabled={loading || disabled}
            className="p-2 rounded hover:bg-red-200 transition-all"
            title="删除选中的卡片"
            style={{
              border: `2px solid ${NB.border}`,
              background: '#FF6B6B',
              color: '#FFFFFF',
              cursor: 'pointer',
              opacity: loading || disabled ? 0.5 : 1,
            }}
            onMouseDown={(e) => {
              if (!(loading || disabled)) {
                e.currentTarget.style.transform = 'translate(1px, 1px)'
                e.currentTarget.style.boxShadow = 'none'
              }
            }}
            onMouseUp={(e) => {
              if (!(loading || disabled)) {
                e.currentTarget.style.transform = 'translate(0, 0)'
                e.currentTarget.style.boxShadow = `1px 1px 0px ${NB.border}`
              }
            }}
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* 取消选择 */}
          <button
            onClick={onClearSelection}
            disabled={loading || disabled}
            className="px-3 py-2 rounded font-semibold text-sm transition-all"
            style={{
              border: `2px solid ${NB.border}`,
              background: NB.card,
              color: NB.text,
              cursor: 'pointer',
              opacity: loading || disabled ? 0.5 : 1,
            }}
            onMouseDown={(e) => {
              if (!(loading || disabled)) {
                e.currentTarget.style.transform = 'translate(1px, 1px)'
                e.currentTarget.style.boxShadow = 'none'
              }
            }}
            onMouseUp={(e) => {
              if (!(loading || disabled)) {
                e.currentTarget.style.transform = 'translate(0, 0)'
                e.currentTarget.style.boxShadow = `1px 1px 0px ${NB.border}`
              }
            }}
          >
            取消选择
          </button>
        </div>
      </div>

      {/* 确认对话框 */}
      {confirmAction && (
        <ConfirmDialog
          title={confirmAction.type === 'delete' ? '批量删除' : '批量更改状态'}
          message={confirmAction.message}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmAction(null)}
          isDangerous={confirmAction.type === 'delete'}
          confirmText={confirmAction.type === 'delete' ? '删除' : '确认'}
        />
      )}
    </>
  )
}
