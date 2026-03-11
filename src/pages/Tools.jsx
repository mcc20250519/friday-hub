import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Search, ArrowRight, Download, Workflow, Globe, Gamepad2, Loader2 } from 'lucide-react'

// 分类配置
const categories = [
  { id: 'all', name: '全部', emoji: '📦' },
  { id: '效率工具', name: '效率工具', emoji: '⚡' },
  { id: '工作流', name: '工作流', emoji: '🔄' },
  { id: '小游戏', name: '小游戏', emoji: '🎮' },
]

// 获取类型图标
const getTypeIcon = (type) => {
  switch (type) {
    case 'download':
      return <Download className="h-4 w-4" />
    case 'workflow':
      return <Workflow className="h-4 w-4" />
    case 'game':
      return <Gamepad2 className="h-4 w-4" />
    case 'online':
      return <Globe className="h-4 w-4" />
    default:
      return <Download className="h-4 w-4" />
  }
}

// 获取类型文字
const getTypeText = (type) => {
  switch (type) {
    case 'download':
      return '下载'
    case 'workflow':
      return '工作流'
    case 'game':
      return '游戏'
    case 'online':
      return '在线'
    default:
      return '下载'
  }
}

// 获取分类emoji
const getCategoryEmoji = (category) => {
  const cat = categories.find(c => c.id === category)
  return cat?.emoji || '📦'
}

// 骨架屏组件
function ToolCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gray-200 rounded-lg animate-pulse" />
          <div className="flex-1 space-y-3">
            <div className="h-5 bg-gray-200 rounded w-2/3 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-4/5 animate-pulse" />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <div className="h-6 bg-gray-200 rounded-full w-16 animate-pulse" />
          <div className="h-6 bg-gray-200 rounded-full w-20 animate-pulse" />
        </div>
      </CardContent>
    </Card>
  )
}

export default function Tools() {
  // 状态
  const [tools, setTools] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // 筛选状态
  const [activeCategory, setActiveCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // 获取工具数据
  useEffect(() => {
    fetchTools()
  }, [])

  const fetchTools = async () => {
    try {
      setLoading(true)
      setError('')

      const { data, error: supabaseError } = await supabase
        .from('tools')
        .select('*')
        .order('sort_order', { ascending: true })

      if (supabaseError) {
        throw supabaseError
      }

      setTools(data || [])
    } catch (err) {
      console.error('获取工具列表失败:', err)
      setError('获取工具列表失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  // 过滤工具
  const filteredTools = tools.filter((tool) => {
    // 分类过滤
    if (activeCategory !== 'all' && tool.category !== activeCategory) {
      return false
    }

    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchName = tool.name?.toLowerCase().includes(query)
      const matchDesc = tool.description?.toLowerCase().includes(query)
      const matchTags = tool.tags?.some(tag => tag.toLowerCase().includes(query))
      
      if (!matchName && !matchDesc && !matchTags) {
        return false
      }
    }

    return true
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部 Banner */}
      <section className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-purple-700 to-blue-700 py-16 md:py-24">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full mix-blend-multiply filter blur-3xl" />
          <div className="absolute bottom-10 right-10 w-72 h-72 bg-white rounded-full mix-blend-multiply filter blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
            AI工具库
          </h1>
          <p className="text-lg md:text-xl text-purple-100 max-w-2xl mx-auto">
            精选效率工具，全部亲测可用
          </p>
        </div>
      </section>

      {/* 筛选区域 */}
      <section className="sticky top-16 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* 分类 Tab */}
            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    activeCategory === cat.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span className="mr-1">{cat.emoji}</span>
                  {cat.name}
                </button>
              ))}
            </div>

            {/* 搜索框 */}
            <div className="relative flex-1 max-w-md md:ml-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="搜索工具名称或描述..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 工具列表区域 */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 错误提示 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-center">
            <p className="text-red-600">{error}</p>
            <Button
              onClick={fetchTools}
              variant="outline"
              className="mt-2"
            >
              重新加载
            </Button>
          </div>
        )}

        {/* 加载状态 - 骨架屏 */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <ToolCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <>
            {/* 结果统计 */}
            <div className="mb-6 flex items-center justify-between">
              <p className="text-gray-600">
                共 <span className="font-semibold text-gray-900">{filteredTools.length}</span> 个工具
              </p>
            </div>

            {/* 工具卡片网格 */}
            {filteredTools.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTools.map((tool) => (
                  <Link
                    key={tool.id}
                    to={`/tools/${tool.id}`}
                    className="group"
                  >
                    <Card className="h-full overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border-gray-200">
                      <CardContent className="p-6">
                        {/* 头部：图标和名称 */}
                        <div className="flex items-start gap-4 mb-4">
                          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">
                            {getCategoryEmoji(tool.category)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-purple-600 transition-colors truncate">
                              {tool.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                                {getTypeIcon(tool.type)}
                                {getTypeText(tool.type)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 描述 */}
                        <p className="text-gray-600 text-sm line-clamp-2 mb-4">
                          {tool.description}
                        </p>

                        {/* 标签 */}
                        {tool.tags && tool.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {tool.tags.slice(0, 3).map((tag, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                            {tool.tags.length > 3 && (
                              <span className="px-2 py-1 bg-gray-50 text-gray-500 text-xs rounded-full">
                                +{tool.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}

                        {/* 操作按钮 */}
                        <div className="flex items-center text-purple-600 text-sm font-medium group-hover:text-purple-700">
                          查看详情
                          <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              /* 空状态 */
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  没有找到相关工具
                </h3>
                <p className="text-gray-500 mb-4">
                  尝试调整搜索关键词或切换分类
                </p>
                <Button
                  onClick={() => {
                    setActiveCategory('all')
                    setSearchQuery('')
                  }}
                  variant="outline"
                >
                  清除筛选条件
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
