import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import CardEditForm from './CardEditForm'

// Neo-Brutalism 色彩系统
const NB = {
  card: '#FFFFFF',
  text: '#1A1A1A',
  sub: '#5A5350',
  border: '#1A1A1A',
  shadow: '4px 4px 0px #1A1A1A',
}

export default function CardEditModal({
  isOpen,
  onClose,
  cardId,
  initialData,
  onSave,
  loading,
  error,
}) {
  const [formData, setFormData] = useState(initialData || {})

  useEffect(() => {
    if (initialData) {
      setFormData(initialData)
    }
  }, [initialData, isOpen])

  const handleSave = async (data) => {
    await onSave(cardId, data)
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 z-40 transition-opacity"
        style={{ background: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      />

      {/* 模态框 */}
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 max-w-2xl w-full mx-4 rounded-lg max-h-[90vh] overflow-y-auto"
        style={{
          background: NB.card,
          border: `3px solid ${NB.border}`,
          boxShadow: NB.shadow,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div
          className="flex items-center justify-between sticky top-0 px-6 py-4 z-10"
          style={{
            borderBottom: `2px solid ${NB.border}`,
            background: NB.card,
          }}
        >
          <h2 className="text-lg font-bold" style={{ color: NB.text }}>
            编辑卡片
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
            aria-label="关闭"
          >
            <X className="w-5 h-5" style={{ color: NB.text }} />
          </button>
        </div>

        {/* 表单内容 */}
        <div className="px-6 py-6">
          {error && (
            <div
              className="p-4 rounded mb-4"
              style={{
                background: '#FEE2E2',
                border: `2px solid #DC2626`,
                color: '#DC2626',
              }}
            >
              {error}
            </div>
          )}

          <CardEditForm
            initialData={formData}
            onSave={handleSave}
            loading={loading}
            onCancel={onClose}
          />
        </div>
      </div>
    </>
  )
}
