import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/store/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  ArrowLeft, 
  Heart, 
  Download, 
  Workflow, 
  Gamepad2, 
  Globe, 
  Calendar, 
  Package, 
  HardDrive,
  Loader2,
  ExternalLink,
  AlertCircle
} from 'lucide-react'

// 获取分类emoji
const getCategoryEmoji = (category) => {
  switch (category) {
    case '效率工具':
      return '⚡'
    case '工作流':
      return '🔄'
    case '小游戏':
      return '🎮'
    default:
      return '📦'
  }
}

// 获取类型图标和文字
const getTypeInfo = (type) => {
  switch (type) {
    case 'download':
      return { icon: <Download className="h-5 w-5" />, text: '下载工具', action: '下载' }
    case 'workflow':
      return { icon: <Workflow className="h-5 w-5" />, text: '工作流', action: '下载' }
    case 'game':
      return { icon: <Gamepad2 className="h-5 w-5" />, text: '在线游戏', action: '开始游戏' }
    case 'online':
      return { icon: <Globe className="h-5 w-5" />, text: '在线工具', action: '开始使用' }
    default:
      return { icon: <Download className="h-5 w-5" />, text: '下载', action: '下载' }
  }
}

// 骨架屏组件
function ToolDetailSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* 顶部骨架 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="h-6 w-24 bg-gray-200 rounded animate-pulse mb-6" />
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 bg-gray-200 rounded-2xl animate-pulse" />
            <div className="flex-1 space-y-3">
              <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
              <div className="flex gap-2">
                <div className="h-6 bg-gray-200 rounded-full w-16 animate-pulse" />
                <div className="h-6 bg-gray-200 rounded-full w-20 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 内容骨架 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
          </div>
          <div className="space-y-4">
            <div className="h-40 bg-gray-200 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ToolDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  // 状态
  const [tool, setTool] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isFavorited, setIsFavorited] = useState(false)
  const [favoriteLoading, setFavoriteLoading] = useState(false)
  const [relatedTools, setRelatedTools] = useState([])

  // 获取工具详情
  useEffect(() => {
    fetchToolDetail()
  }, [id])

  const fetchToolDetail = async () => {
    try {
      setLoading(true)
      setError('')

      // 获取工具详情
      const { data, error: supabaseError } = await supabase
        .from('tools')
        .select('*')
        .eq('id', id)
        .single()

      if (supabaseError) {
        if (supabaseError.code === 'PGRST116') {
          setError('工具不存在')
        } else {
          throw supabaseError
        }
      } else {
        setTool(data)
        // 获取相关工具
        fetchRelatedTools(data.category, data.id)
        // 检查是否已收藏
        if (user) {
          checkFavorite(data.id)
        }
      }
    } catch (err) {
      console.error('获取工具详情失败:', err)
      setError('获取工具详情失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  // 获取相关工具
  const fetchRelatedTools = async (category, currentId) => {
    try {
      const { data } = await supabase
        .from('tools')
        .select('id, name, category, description, tags')
        .eq('category', category)
        .neq('id', currentId)
        .limit(3)

      setRelatedTools(data || [])
    } catch (err) {
      console.error('获取相关工具失败:', err)
    }
  }

  // 检查是否已收藏
  const checkFavorite = async (toolId) => {
    if (!user) return

    try {
      const { data } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', user.id)
        .eq('tool_id', toolId)
        .single()

      setIsFavorited(!!data)
    } catch (err) {
      setIsFavorited(false)
    }
  }

  // 切换收藏状态
  const toggleFavorite = async () => {
    if (!user) {
      // 未登录，跳转登录页
      navigate(`/login?redirect=/tools/${id}`)
      return
    }

    setFavoriteLoading(true)

    try {
      if (isFavorited) {
        // 取消收藏
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('tool_id', id)
        setIsFavorited(false)
      } else {
        // 添加收藏
        await supabase
          .from('favorites')
          .insert({ user_id: user.id, tool_id: id })
        setIsFavorited(true)
      }
    } catch (err) {
      console.error('收藏操作失败:', err)
    } finally {
      setFavoriteLoading(false)
    }
  }

  // 处理下载/使用
  const handleAction = async () => {
    if (!tool) return

    // 游戏类型跳转到游戏页面
    if (tool.type === 'game') {
      navigate('/games/party')
      return
    }

    // 记录下载（如果已登录）
    if (user) {
      try {
        await supabase
          .from('download_records')
          .insert({
            user_id: user.id,
            tool_id: id,
            tool_name: tool.name
          })
      } catch (err) {
        console.error('记录下载失败:', err)
      }
    }

    // 如果有下载链接，触发下载
    if (tool.download_url) {
      window.open(tool.download_url, '_blank')
    } else {
      alert('下载链接暂未配置')
    }
  }

  // 格式化日期
  const formatDate = (dateString) => {
    if (!dateString) return '未知'
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // 加载中
  if (loading) {
    return <ToolDetailSkeleton />
  }

  // 错误/404
  if (error || !tool) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {error || '工具不存在'}
          </h2>
          <p className="text-gray-600 mb-6">该工具可能已被删除或链接有误</p>
          <Button onClick={() => navigate('/tools')} className="bg-purple-600 hover:bg-purple-700">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回工具库
          </Button>
        </div>
      </div>
    )
  }

  const typeInfo = getTypeInfo(tool.type)

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* 顶部信息区 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 返回按钮 */}
          <Button
            variant="ghost"
            onClick={() => navigate('/tools')}
            className="mb-6 -ml-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回工具库
          </Button>

          {/* 工具基本信息 */}
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* 图标 */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl flex items-center justify-center text-4xl sm:text-5xl flex-shrink-0">
              {getCategoryEmoji(tool.category)}
            </div>

            {/* 信息 */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                    {tool.name}
                  </h1>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      <Package className="h-4 w-4" />
                      版本 {tool.version || '1.0.0'}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      更新于 {formatDate(tool.updated_at)}
                    </span>
                  </div>
                </div>

                {/* 收藏按钮 */}
                <Button
                  variant="outline"
                  onClick={toggleFavorite}
                  disabled={favoriteLoading}
                  className={`${
                    isFavorited 
                      ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {favoriteLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Heart className={`h-5 w-5 ${isFavorited ? 'fill-current' : ''}`} />
                  )}
                  <span className="ml-2">{isFavorited ? '已收藏' : '收藏'}</span>
                </Button>
              </div>

              {/* 标签 */}
              {tool.tags && tool.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {tool.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-purple-50 text-purple-700 text-sm rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 内容区 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧主内容 */}
          <div className="lg:col-span-2 space-y-8">
            {/* 工具介绍 */}
            <Card>
              <CardHeader>
                <CardTitle>工具介绍</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {tool.description || '暂无详细介绍'}
                </p>
              </CardContent>
            </Card>

            {/* 截图展示（如果有） */}
            {tool.icon_url && (
              <Card>
                <CardHeader>
                  <CardTitle>界面预览</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <img
                      src={tool.icon_url}
                      alt={`${tool.name} 预览`}
                      className="rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(tool.icon_url, '_blank')}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 使用说明 */}
            <Card>
              <CardHeader>
                <CardTitle>使用说明</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal list-inside space-y-3 text-gray-700">
                  <li>点击右侧的"{typeInfo.action}"按钮获取工具</li>
                  <li>根据工具类型进行安装或直接使用</li>
                  <li>如有问题，欢迎在个人中心反馈</li>
                </ol>
              </CardContent>
            </Card>
          </div>

          {/* 右侧操作区 */}
          <div className="space-y-6">
            {/* 下载/使用卡片 */}
            <Card className="sticky top-24">
              <CardContent className="p-6">
                {/* 主按钮 */}
                <Button
                  onClick={handleAction}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-lg h-12"
                >
                  {typeInfo.icon}
                  <span className="ml-2">{typeInfo.action}</span>
                </Button>

                {/* 文件信息 */}
                <div className="mt-6 space-y-3 text-sm">
                  {tool.file_size && (
                    <div className="flex items-center justify-between text-gray-600">
                      <span className="flex items-center gap-2">
                        <HardDrive className="h-4 w-4" />
                        文件大小
                      </span>
                      <span className="font-medium">{tool.file_size}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-gray-600">
                    <span className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      版本
                    </span>
                    <span className="font-medium">{tool.version || '1.0.0'}</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-600">
                    <span className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      更新日期
                    </span>
                    <span className="font-medium">{formatDate(tool.updated_at)}</span>
                  </div>
                </div>

                {/* 使用须知 */}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">使用须知</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• 所有工具均经过站长亲测</li>
                    <li>• 下载工具请按照说明安装</li>
                    <li>• 工作流需要n8n环境支持</li>
                    <li>• 游戏需要多人同时在线</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* 相关工具推荐 */}
      {relatedTools.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-t border-gray-200 pt-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">相关工具推荐</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedTools.map((relatedTool) => (
                <Link
                  key={relatedTool.id}
                  to={`/tools/${relatedTool.id}`}
                  className="group"
                >
                  <Card className="h-full hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">
                          {getCategoryEmoji(relatedTool.category)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors truncate">
                            {relatedTool.name}
                          </h3>
                          <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                            {relatedTool.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
