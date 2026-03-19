import { useState, useEffect } from 'react'

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

export default function CardEditForm({
  initialData = {},
  onSave,
  loading = false,
  onCancel,
}) {
  const [formData, setFormData] = useState(initialData)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    setFormData(initialData)
  }, [initialData])

  const validateForm = () => {
    const newErrors = {}

    // 必填字段检查
    if (!formData.name || !formData.name.trim()) {
      newErrors.name = '名称不能为空'
    }

    if (!formData.description || !formData.description.trim()) {
      newErrors.description = '描述不能为空'
    }

    if (!formData.type) {
      newErrors.type = '请选择类型'
    }

    // 长度检查
    if (formData.name && formData.name.length > 50) {
      newErrors.name = '名称不能超过 50 个字符'
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = '描述不能超过 500 个字符'
    }

    // 数字字段检查
    if (formData.order !== undefined && (isNaN(formData.order) || formData.order < 0)) {
      newErrors.order = '排序值必须是非负整数'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    onSave(formData)
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
    // 清除该字段的错误
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* 名称输入 */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: NB.text }}>
          名称 <span style={{ color: '#DC2626' }}>*</span>
        </label>
        <input
          type="text"
          name="name"
          value={formData.name || ''}
          onChange={handleChange}
          placeholder="输入卡片名称"
          className="w-full px-4 py-2 rounded outline-none"
          style={{
            border: `2px solid ${errors.name ? '#DC2626' : NB.border}`,
            background: NB.card,
            color: NB.text,
          }}
        />
        {errors.name && (
          <p className="mt-1 text-xs" style={{ color: '#DC2626' }}>
            {errors.name}
          </p>
        )}
        <p className="mt-1 text-xs" style={{ color: NB.sub }}>
          {(formData.name || '').length}/50
        </p>
      </div>

      {/* 描述输入 */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: NB.text }}>
          描述 <span style={{ color: '#DC2626' }}>*</span>
        </label>
        <textarea
          name="description"
          value={formData.description || ''}
          onChange={handleChange}
          placeholder="输入卡片描述"
          className="w-full px-4 py-2 rounded outline-none resize-none"
          style={{
            border: `2px solid ${errors.description ? '#DC2626' : NB.border}`,
            background: NB.card,
            color: NB.text,
            minHeight: '100px',
          }}
        />
        {errors.description && (
          <p className="mt-1 text-xs" style={{ color: '#DC2626' }}>
            {errors.description}
          </p>
        )}
        <p className="mt-1 text-xs" style={{ color: NB.sub }}>
          {(formData.description || '').length}/500
        </p>
      </div>

      {/* 类型选择 */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: NB.text }}>
          类型 <span style={{ color: '#DC2626' }}>*</span>
        </label>
        <select
          name="type"
          value={formData.type || ''}
          onChange={handleChange}
          className="w-full px-4 py-2 rounded outline-none cursor-pointer"
          style={{
            border: `2px solid ${errors.type ? '#DC2626' : NB.border}`,
            background: NB.card,
            color: NB.text,
          }}
        >
          <option value="">请选择类型</option>
          <option value="tool">工具</option>
          <option value="game">游戏</option>
        </select>
        {errors.type && (
          <p className="mt-1 text-xs" style={{ color: '#DC2626' }}>
            {errors.type}
          </p>
        )}
      </div>

      {/* 分类选择 */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: NB.text }}>
          分类
        </label>
        <select
          name="category"
          value={formData.category || ''}
          onChange={handleChange}
          className="w-full px-4 py-2 rounded outline-none cursor-pointer"
          style={{
            border: `2px solid ${NB.border}`,
            background: NB.card,
            color: NB.text,
          }}
        >
          <option value="">未分类</option>
          <option value="效率工具">效率工具</option>
          <option value="工作流">工作流</option>
          <option value="小游戏">小游戏</option>
        </select>
      </div>

      {/* 链接输入 */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: NB.text }}>
          链接 (URL)
        </label>
        <input
          type="url"
          name="url"
          value={formData.url || ''}
          onChange={handleChange}
          placeholder="https://example.com"
          className="w-full px-4 py-2 rounded outline-none"
          style={{
            border: `2px solid ${NB.border}`,
            background: NB.card,
            color: NB.text,
          }}
        />
      </div>

      {/* 图片 URL */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: NB.text }}>
          缩略图 URL
        </label>
        <input
          type="url"
          name="imageUrl"
          value={formData.imageUrl || ''}
          onChange={handleChange}
          placeholder="https://example.com/image.png"
          className="w-full px-4 py-2 rounded outline-none"
          style={{
            border: `2px solid ${NB.border}`,
            background: NB.card,
            color: NB.text,
          }}
        />
      </div>

      {/* 排序值 */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: NB.text }}>
          排序值 (越小越前)
        </label>
        <input
          type="number"
          name="order"
          value={formData.order || 0}
          onChange={handleChange}
          min="0"
          className="w-full px-4 py-2 rounded outline-none"
          style={{
            border: `2px solid ${errors.order ? '#DC2626' : NB.border}`,
            background: NB.card,
            color: NB.text,
          }}
        />
        {errors.order && (
          <p className="mt-1 text-xs" style={{ color: '#DC2626' }}>
            {errors.order}
          </p>
        )}
      </div>

      {/* 标签输入 */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: NB.text }}>
          标签 (用逗号分隔)
        </label>
        <input
          type="text"
          name="tags"
          value={formData.tags || ''}
          onChange={handleChange}
          placeholder="标签1, 标签2, 标签3"
          className="w-full px-4 py-2 rounded outline-none"
          style={{
            border: `2px solid ${NB.border}`,
            background: NB.card,
            color: NB.text,
          }}
        />
      </div>

      {/* 复选框字段 */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            name="featured"
            checked={formData.featured || false}
            onChange={handleChange}
          />
          <span style={{ color: NB.text }}>标记为推荐</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            name="isPaid"
            checked={formData.isPaid || false}
            onChange={handleChange}
          />
          <span style={{ color: NB.text }}>付费应用</span>
        </label>
      </div>

      {/* 按钮组 */}
      <div className="flex gap-3 justify-end pt-6" style={{ borderTop: `2px solid ${NB.border}` }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 font-semibold rounded text-sm transition-all cursor-pointer"
          style={{
            border: `2px solid ${NB.border}`,
            background: NB.card,
            color: NB.text,
            opacity: loading ? 0.5 : 1,
          }}
        >
          取消
        </button>

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 font-semibold rounded text-sm transition-all cursor-pointer"
          style={{
            border: `2px solid ${NB.border}`,
            background: NB.mint,
            color: NB.text,
            opacity: loading ? 0.5 : 1,
            boxShadow: NB.shadow,
          }}
        >
          {loading ? '保存中...' : '保存'}
        </button>
      </div>
    </form>
  )
}
