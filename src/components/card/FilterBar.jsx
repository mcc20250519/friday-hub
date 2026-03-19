import { useState, useCallback } from 'react'
import { Search } from 'lucide-react'

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
  tagBd: 'rgba(26,26,26,0.2)',
}

export default function FilterBar({ onFilterChange, currentFilters }) {
  const [searchInput, setSearchInput] = useState(currentFilters.search || '')
  const [typeFilter, setTypeFilter] = useState(currentFilters.type || 'all')
  const [statusFilter, setStatusFilter] = useState(currentFilters.status || 'all')
  const [categoryFilter, setCategoryFilter] = useState(currentFilters.category || '')

  // 防抖搜索
  const [searchTimeout, setSearchTimeout] = useState(null)

  const handleSearchChange = useCallback(
    (value) => {
      setSearchInput(value)

      // 清除之前的定时器
      if (searchTimeout) clearTimeout(searchTimeout)

      // 设置新的定时器（500ms 后触发搜索）
      const timeout = setTimeout(() => {
        onFilterChange({
          ...currentFilters,
          search: value,
        })
      }, 500)

      setSearchTimeout(timeout)
    },
    [searchTimeout, onFilterChange, currentFilters]
  )

  const handleTypeChange = (value) => {
    setTypeFilter(value)
    onFilterChange({
      ...currentFilters,
      type: value,
    })
  }

  const handleStatusChange = (value) => {
    setStatusFilter(value)
    onFilterChange({
      ...currentFilters,
      status: value,
    })
  }

  const handleCategoryChange = (value) => {
    setCategoryFilter(value)
    onFilterChange({
      ...currentFilters,
      category: value,
    })
  }

  const categories = ['效率工具', '工作流', '小游戏']
  const types = [
    { id: 'all', label: '全部类型' },
    { id: 'tool', label: '工具' },
    { id: 'game', label: '游戏' },
  ]
  const statuses = [
    { id: 'all', label: '全部状态' },
    { id: 'draft', label: '待上架' },
    { id: 'published', label: '已上架' },
    { id: 'hidden', label: '隐藏' },
  ]

  return (
    <div className="space-y-4">
      {/* 搜索栏 */}
      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{
          border: `3px solid ${NB.border}`,
          borderRadius: '8px',
          background: NB.card,
          boxShadow: NB.shadow,
        }}
      >
        <Search className="w-5 h-5" style={{ color: NB.sub }} />
        <input
          type="text"
          placeholder="搜索卡片名称、描述或标签..."
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="flex-1 outline-none text-sm"
          style={{ background: 'transparent', color: NB.text }}
        />
      </div>

      {/* 筛选器行 */}
      <div className="flex flex-wrap gap-3">
        {/* 类型筛选 */}
        <select
          value={typeFilter}
          onChange={(e) => handleTypeChange(e.target.value)}
          className="px-4 py-2 text-sm font-semibold outline-none cursor-pointer"
          style={{
            border: `3px solid ${NB.border}`,
            borderRadius: '6px',
            background: NB.card,
            boxShadow: NB.shadow,
            color: NB.text,
          }}
        >
          {types.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>

        {/* 状态筛选 */}
        <select
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="px-4 py-2 text-sm font-semibold outline-none cursor-pointer"
          style={{
            border: `3px solid ${NB.border}`,
            borderRadius: '6px',
            background: NB.card,
            boxShadow: NB.shadow,
            color: NB.text,
          }}
        >
          {statuses.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>

        {/* 分类筛选 */}
        <select
          value={categoryFilter}
          onChange={(e) => handleCategoryChange(e.target.value)}
          className="px-4 py-2 text-sm font-semibold outline-none cursor-pointer"
          style={{
            border: `3px solid ${NB.border}`,
            borderRadius: '6px',
            background: NB.card,
            boxShadow: NB.shadow,
            color: NB.text,
          }}
        >
          <option value="">全部分类</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* 活跃筛选标签 */}
      {(searchInput || typeFilter !== 'all' || statusFilter !== 'all' || categoryFilter) && (
        <div className="flex flex-wrap gap-2">
          {searchInput && (
            <div
              className="px-3 py-1 text-xs font-semibold"
              style={{
                border: `2px solid ${NB.border}`,
                borderRadius: '4px',
                background: NB.mint,
                color: NB.text,
              }}
            >
              搜索: {searchInput}
            </div>
          )}
          {typeFilter !== 'all' && (
            <div
              className="px-3 py-1 text-xs font-semibold"
              style={{
                border: `2px solid ${NB.border}`,
                borderRadius: '4px',
                background: NB.yellow,
                color: NB.text,
              }}
            >
              类型: {types.find((t) => t.id === typeFilter)?.label}
            </div>
          )}
          {statusFilter !== 'all' && (
            <div
              className="px-3 py-1 text-xs font-semibold"
              style={{
                border: `2px solid ${NB.border}`,
                borderRadius: '4px',
                background: NB.pink,
                color: NB.text,
              }}
            >
              状态: {statuses.find((s) => s.id === statusFilter)?.label}
            </div>
          )}
          {categoryFilter && (
            <div
              className="px-3 py-1 text-xs font-semibold"
              style={{
                border: `2px solid ${NB.border}`,
                borderRadius: '4px',
                background: '#A8D8FF',
                color: NB.text,
              }}
            >
              分类: {categoryFilter}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
