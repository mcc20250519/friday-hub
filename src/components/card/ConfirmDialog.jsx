import { X } from 'lucide-react'

// Neo-Brutalism 色彩系统
const NB = {
  card: '#FFFFFF',
  text: '#1A1A1A',
  sub: '#5A5350',
  border: '#1A1A1A',
  shadow: '4px 4px 0px #1A1A1A',
}

export default function ConfirmDialog({
  title = '确认操作',
  message = '确定要执行此操作吗？',
  onConfirm,
  onCancel,
  isDangerous = false,
  confirmText = '确认',
  cancelText = '取消',
}) {
  return (
    <>
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 z-40 transition-opacity"
        style={{ background: 'rgba(0,0,0,0.5)' }}
        onClick={onCancel}
      />

      {/* 对话框 */}
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 max-w-md w-full mx-4 rounded-lg"
        style={{
          background: NB.card,
          border: `3px solid ${NB.border}`,
          boxShadow: NB.shadow,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{
            borderBottom: `2px solid ${NB.border}`,
          }}
        >
          <h2 className="text-lg font-bold" style={{ color: NB.text }}>
            {title}
          </h2>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-gray-100 rounded"
            aria-label="关闭"
          >
            <X className="w-5 h-5" style={{ color: NB.text }} />
          </button>
        </div>

        {/* 内容 */}
        <div className="px-6 py-4">
          <p style={{ color: NB.sub, lineHeight: '1.6' }}>
            {message}
          </p>
        </div>

        {/* 操作按钮 */}
        <div
          className="px-6 py-4 flex gap-3 justify-end"
          style={{
            borderTop: `2px solid ${NB.border}`,
          }}
        >
          {/* 取消按钮 */}
          <button
            onClick={onCancel}
            className="px-4 py-2 font-semibold rounded text-sm transition-all"
            style={{
              border: `2px solid ${NB.border}`,
              background: NB.card,
              color: NB.text,
              cursor: 'pointer',
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'translate(2px, 2px)'
              e.currentTarget.style.boxShadow = 'none'
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'translate(0, 0)'
              e.currentTarget.style.boxShadow = `2px 2px 0px ${NB.border}`
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translate(0, 0)'
              e.currentTarget.style.boxShadow = `2px 2px 0px ${NB.border}`
            }}
          >
            {cancelText}
          </button>

          {/* 确认按钮 */}
          <button
            onClick={onConfirm}
            className="px-4 py-2 font-semibold rounded text-sm transition-all"
            style={{
              border: `2px solid ${NB.border}`,
              background: isDangerous ? '#FF6B6B' : '#6B6BFF',
              color: '#FFFFFF',
              cursor: 'pointer',
              boxShadow: `2px 2px 0px ${NB.border}`,
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'translate(2px, 2px)'
              e.currentTarget.style.boxShadow = 'none'
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'translate(0, 0)'
              e.currentTarget.style.boxShadow = `2px 2px 0px ${NB.border}`
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translate(0, 0)'
              e.currentTarget.style.boxShadow = `2px 2px 0px ${NB.border}`
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </>
  )
}
