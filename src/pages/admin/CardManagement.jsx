import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import FilterBar from '@/components/card/FilterBar'
import CardListView from '@/components/card/CardListView'
import BulkActionBar from '@/components/card/BulkActionBar'
import CardEditModal from '@/components/card/CardEditModal'
import { Plus } from 'lucide-react'

// Neo-Brutalism 色彩系统
const NB = {
  card: '#FFFFFF',
  text: '#1A1A1A',
  sub: '#5A5350',
  border: '#1A1A1A',
  shadow: '2px 2px 0px #1A1A1A',
  mint: '#B4F8C8',
  pink: '#FFAEBC',
}

export default function CardManagement() {
  const navigate = useNavigate()
  const location = useLocation()
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedCards, setSelectedCards] = useState([])
  const [editingCardId, setEditingCardId] = useState(null)
  const [editingCardData, setEditingCardData] = useState(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  // 筛选状态
  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    status: 'all',
    category: '',
  })

  // 加载卡片数据
  const loadCards = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('tools')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false })

      // 应用筛选
      if (filters.type !== 'all') {
        query = query.eq('type', filters.type)
      }

      if (filters.status !== 'all') {
        query = query.eq('status', filters.status)
      }

      if (filters.category) {
        query = query.eq('category', filters.category)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      // 客户端搜索
      let filtered = data || []
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        filtered = filtered.filter(
          (card) =>
            card.name?.toLowerCase().includes(searchLower) ||
            card.description?.toLowerCase().includes(searchLower) ||
            (card.tags && card.tags.some((tag) => tag.toLowerCase().includes(searchLower)))
        )
      }

      // 转换数据格式
      const formattedCards = filtered.map((card) => ({
        id: card.id,
        name: card.name,
        description: card.description,
        type: card.type, // 'tool' 或 'game'
        category: card.category,
        url: card.url,
        imageUrl: card.image_url,
        status: card.status, // 'draft', 'published', 'hidden'
        tags: card.tags || [],
        order: card.order || 0,
        featured: card.featured || false,
        isPaid: card.is_paid || false,
        createdAt: card.created_at,
        updatedAt: card.updated_at,
      }))

      setCards(formattedCards)
    } catch (err) {
      console.error('加载卡片失败:', err)
      setError(err.message || '加载卡片失败')
    } finally {
      setLoading(false)
    }
  }, [filters])

  // 初始加载
  useEffect(() => {
    loadCards()
  }, [loadCards])

  // 处理编辑
  const handleEdit = (cardId) => {
    const card = cards.find((c) => c.id === cardId)
    if (card) {
      setEditingCardId(cardId)
      setEditingCardData(card)
      setIsEditModalOpen(true)
    }
  }

  // 处理保存编辑
  const handleSaveEdit = async (cardId, data) => {
    try {
      setLoading(true)

      // 转换数据格式
      const updateData = {
        name: data.name,
        description: data.description,
        type: data.type,
        category: data.category || null,
        url: data.url || null,
        image_url: data.imageUrl || null,
        sort_order: parseInt(data.order) || 0,
        tags: data.tags ? data.tags.split(',').map((t) => t.trim()) : [],
        featured: data.featured || false,
        is_paid: data.isPaid || false,
        updated_at: new Date().toISOString(),
      }

      const { error: updateError } = await supabase
        .from('tools')
        .update(updateData)
        .eq('id', cardId)

      if (updateError) throw updateError

      // 更新本地状态
      setCards((prev) =>
        prev.map((c) =>
          c.id === cardId
            ? {
                ...c,
                ...data,
                updatedAt: new Date().toISOString(),
              }
            : c
        )
      )

      setIsEditModalOpen(false)
      setEditingCardId(null)
      setEditingCardData(null)
    } catch (err) {
      console.error('保存卡片失败:', err)
      setError(err.message || '保存卡片失败')
    } finally {
      setLoading(false)
    }
  }

  // 处理删除
  const handleDelete = async (cardId) => {
    try {
      setLoading(true)

      const { error: deleteError } = await supabase
        .from('tools')
        .delete()
        .eq('id', cardId)

      if (deleteError) throw deleteError

      setCards((prev) => prev.filter((c) => c.id !== cardId))
      setSelectedCards((prev) => prev.filter((id) => id !== cardId))
    } catch (err) {
      console.error('删除卡片失败:', err)
      setError(err.message || '删除卡片失败')
    } finally {
      setLoading(false)
    }
  }

  // 处理状态变更
  const handleStatusChange = async (cardId, newStatus) => {
    try {
      setLoading(true)

      const { error: updateError } = await supabase
        .from('tools')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', cardId)

      if (updateError) throw updateError

      setCards((prev) =>
        prev.map((c) =>
          c.id === cardId
            ? {
                ...c,
                status: newStatus,
                updatedAt: new Date().toISOString(),
              }
            : c
        )
      )
    } catch (err) {
      console.error('更新卡片状态失败:', err)
      setError(err.message || '更新卡片状态失败')
    } finally {
      setLoading(false)
    }
  }

  // 处理复制
  const handleDuplicate = async (cardId) => {
    try {
      setLoading(true)

      const card = cards.find((c) => c.id === cardId)
      if (!card) return

      // 创建新卡片
      const newCard = {
        name: `${card.name} (复制)`,
        description: card.description,
        type: card.type,
        category: card.category,
        url: card.url,
        image_url: card.imageUrl,
        sort_order: (card.order || 0) + 0.1,
        tags: card.tags,
        featured: card.featured,
        is_paid: card.isPaid,
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { data, error: insertError } = await supabase
        .from('tools')
        .insert([newCard])
        .select()

      if (insertError) throw insertError

      // 添加到本地状态
      if (data && data.length > 0) {
        const newCardData = data[0]
        setCards((prev) => [
          ...prev,
          {
            id: newCardData.id,
            name: newCardData.name,
            description: newCardData.description,
            type: newCardData.type,
            category: newCardData.category,
            url: newCardData.url,
            imageUrl: newCardData.image_url,
            status: newCardData.status,
            tags: newCardData.tags || [],
            order: newCardData.order,
            featured: newCardData.featured || false,
            isPaid: newCardData.is_paid || false,
            createdAt: newCardData.created_at,
            updatedAt: newCardData.updated_at,
          },
        ])
      }
    } catch (err) {
      console.error('复制卡片失败:', err)
      setError(err.message || '复制卡片失败')
    } finally {
      setLoading(false)
    }
  }

  // 批量删除
  const handleBulkDelete = async () => {
    try {
      setLoading(true)

      const { error: deleteError } = await supabase
        .from('tools')
        .delete()
        .in('id', selectedCards)

      if (deleteError) throw deleteError

      setCards((prev) => prev.filter((c) => !selectedCards.includes(c.id)))
      setSelectedCards([])
    } catch (err) {
      console.error('批量删除失败:', err)
      setError(err.message || '批量删除失败')
    } finally {
      setLoading(false)
    }
  }

  // 批量改变状态
  const handleBulkStatusChange = async (newStatus) => {
    try {
      setLoading(true)

      const { error: updateError } = await supabase
        .from('tools')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .in('id', selectedCards)

      if (updateError) throw updateError

      setCards((prev) =>
        prev.map((c) =>
          selectedCards.includes(c.id)
            ? {
                ...c,
                status: newStatus,
                updatedAt: new Date().toISOString(),
              }
            : c
        )
      )

      setSelectedCards([])
    } catch (err) {
      console.error('批量更新状态失败:', err)
      setError(err.message || '批量更新状态失败')
    } finally {
      setLoading(false)
    }
  }

  // 批量复制
  const handleBulkDuplicate = async () => {
    try {
      setLoading(true)

       const cardsToDuplicate = cards.filter((c) => selectedCards.includes(c.id))
       const newCards = cardsToDuplicate.map((card) => ({
         name: `${card.name} (复制)`,
         description: card.description,
         type: card.type,
         category: card.category,
         url: card.url,
         image_url: card.imageUrl,
         sort_order: (card.order || 0) + 0.1,
         tags: card.tags,
         featured: card.featured,
         is_paid: card.isPaid,
         status: 'draft',
         created_at: new Date().toISOString(),
         updated_at: new Date().toISOString(),
       }))

      const { data, error: insertError } = await supabase
        .from('tools')
        .insert(newCards)
        .select()

      if (insertError) throw insertError

      // 添加到本地状态
      if (data && data.length > 0) {
        const formattedNewCards = data.map((newCard) => ({
          id: newCard.id,
          name: newCard.name,
          description: newCard.description,
          type: newCard.type,
          category: newCard.category,
          url: newCard.url,
          imageUrl: newCard.image_url,
          status: newCard.status,
          tags: newCard.tags || [],
          order: newCard.order,
          featured: newCard.featured || false,
          isPaid: newCard.is_paid || false,
          createdAt: newCard.created_at,
          updatedAt: newCard.updated_at,
        }))

        setCards((prev) => [...prev, ...formattedNewCards])
      }

      setSelectedCards([])
    } catch (err) {
      console.error('批量复制失败:', err)
      setError(err.message || '批量复制失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-6" style={{ background: '#F5F5F5' }}>
      <div className="max-w-7xl mx-auto">
        {/* 管理后台导航 */}
        <div className="mb-8 border-b border-gray-200">
          <div className="flex items-center gap-8">
            <button
              onClick={() => navigate('/admin/tools')}
              className={`px-4 py-3 font-semibold text-sm border-b-2 transition-colors ${
                location.pathname === '/admin/tools'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              工具管理
            </button>
            <button
              onClick={() => navigate('/admin/cards')}
              className={`px-4 py-3 font-semibold text-sm border-b-2 transition-colors ${
                location.pathname === '/admin/cards'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              卡片管理
            </button>
          </div>
        </div>

        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: NB.text }}>
            卡片管理
          </h1>
          <p style={{ color: NB.sub }}>
            管理你的工具、游戏和其他卡片内容
          </p>
        </div>

        {/* 错误提示 */}
        {error && (
          <div
            className="p-4 rounded mb-6"
            style={{
              background: '#FEE2E2',
              border: `2px solid #DC2626`,
              color: '#DC2626',
            }}
          >
            {error}
          </div>
        )}

        {/* 筛选栏 */}
        <div className="mb-6">
          <FilterBar
            currentFilters={filters}
            onFilterChange={setFilters}
          />
        </div>

        {/* 卡片列表 */}
        <div className="mb-6">
          <CardListView
            cards={cards}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            onStatusChange={handleStatusChange}
            loading={loading}
            error={error}
            selectedCards={selectedCards}
            onSelectionChange={setSelectedCards}
          />
        </div>

        {/* 批量操作栏 */}
        <BulkActionBar
          selectedCount={selectedCards.length}
          onBulkDelete={handleBulkDelete}
          onBulkChangeStatus={handleBulkStatusChange}
          onBulkDuplicate={handleBulkDuplicate}
          onClearSelection={() => setSelectedCards([])}
          loading={loading}
          disabled={loading}
        />
      </div>

      {/* 编辑模态框 */}
      <CardEditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setEditingCardId(null)
          setEditingCardData(null)
        }}
        cardId={editingCardId}
        initialData={editingCardData}
        onSave={handleSaveEdit}
        loading={loading}
        error={error}
      />
    </div>
  )
}
