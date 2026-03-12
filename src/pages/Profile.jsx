import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/store/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Heart, 
  Download, 
  Settings, 
  LogOut, 
  Edit2, 
  Save, 
  X, 
  ExternalLink,
  Package,
  Clock,
  Trash2
} from 'lucide-react'

/**
 * 生成头像背景色（基于邮箱首字母）
 * @param {string} email 
 * @returns {string} - 背景色类名
 */
function getAvatarColor(email) {
  if (!email) return 'bg-gray-400'
  const colors = [
    'bg-red-500',
    'bg-orange-500', 
    'bg-amber-500',
    'bg-green-500',
    'bg-emerald-500',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-sky-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-violet-500',
    'bg-purple-500',
    'bg-fuchsia-500',
    'bg-pink-500',
    'bg-rose-500',
  ]
  const charCode = email.charCodeAt(0)
  return colors[charCode % colors.length]
}

/**
 * 格式化日期
 * @param {string} dateString 
 * @returns {string}
 */
function formatDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return `${date.getFullYear()}年${date.getMonth() + 1}月`
}

/**
 * 格式化时间
 * @param {string} dateString 
 * @returns {string}
 */
function formatTime(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Toast 提示组件
 */
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg transition-all ${
      type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
    }`}>
      <div className="flex items-center gap-2">
        <span>{message}</span>
        <button onClick={onClose} className="ml-2 hover:opacity-70">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export default function Profile() {
  const { user, profile, updateProfile, signOut } = useAuth()
  const navigate = useNavigate()

  // Toast 状态
  const [toast, setToast] = useState(null)
  const showToast = (message, type = 'success') => {
    setToast({ message, type })
  }

  // 编辑昵称状态
  const [isEditingNickname, setIsEditingNickname] = useState(false)
  const [nickname, setNickname] = useState('')

  // 收藏列表
  const [favorites, setFavorites] = useState([])
  const [favoritesLoading, setFavoritesLoading] = useState(true)

  // 下载记录
  const [downloads, setDownloads] = useState([])
  const [downloadsLoading, setDownloadsLoading] = useState(true)

  // 密码修改表单
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  // 退出确认弹窗
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  // 加载收藏列表
  const loadFavorites = async () => {
    if (!user) return

    setFavoritesLoading(true)
    try {
      // 先获取收藏列表
      const { data: favoritesData, error: favoritesError } = await supabase
        .from('favorites')
        .select('id, tool_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (favoritesError) throw favoritesError

      if (!favoritesData || favoritesData.length === 0) {
        setFavorites([])
        return
      }

      // 获取工具详情
      const toolIds = favoritesData.map(f => f.tool_id)
      const { data: toolsData, error: toolsError } = await supabase
        .from('tools')
        .select('id, name, description, category')
        .in('id', toolIds)

      if (toolsError) throw toolsError

      // 合并数据
      const toolsMap = (toolsData || []).reduce((map, tool) => {
        map[tool.id] = tool
        return map
      }, {})

      const mergedData = favoritesData.map(fav => ({
        ...fav,
        tools: toolsMap[fav.tool_id] || null
      }))

      setFavorites(mergedData)
    } catch (err) {
      console.error('加载收藏失败:', err)
      showToast('加载收藏列表失败', 'error')
    } finally {
      setFavoritesLoading(false)
    }
  }

  // 加载下载记录
  const loadDownloads = async () => {
    if (!user) return

    setDownloadsLoading(true)
    try {
      const { data, error } = await supabase
        .from('download_records')
        .select('*')
        .eq('user_id', user.id)
        .order('downloaded_at', { ascending: false })

      if (error) throw error
      setDownloads(data || [])
    } catch (err) {
      console.error('加载下载记录失败:', err)
      showToast('加载下载记录失败', 'error')
    } finally {
      setDownloadsLoading(false)
    }
  }

  // 取消收藏
  const handleRemoveFavorite = async (favoriteId) => {
    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('id', favoriteId)

      if (error) throw error

      // 更新列表
      setFavorites(prev => prev.filter(f => f.id !== favoriteId))
      showToast('已取消收藏')
    } catch (err) {
      console.error('取消收藏失败:', err)
      showToast('操作失败', 'error')
    }
  }

  // 删除下载记录
  const handleDeleteDownload = async (recordId) => {
    try {
      console.log('开始删除记录:', recordId)
      console.log('当前用户:', user?.id)

      const { data, error } = await supabase
        .from('download_records')
        .delete()
        .eq('id', recordId)
        .select()  // 添加 select() 查看返回结果

      console.log('删除结果:', { data, error })

      if (error) {
        console.error('删除错误详情:', error)
        throw error
      }

      // 检查是否真的删除了数据
      if (!data || data.length === 0) {
        console.warn('没有数据被删除，可能是权限问题')
        showToast('删除失败：没有权限或记录不存在', 'error')
        return
      }

      // 更新列表
      setDownloads(prev => prev.filter(d => d.id !== recordId))
      showToast('已删除下载记录')
    } catch (err) {
      console.error('删除下载记录失败:', err)
      showToast(`删除失败: ${err.message || '未知错误'}`, 'error')
    }
  }

  // 保存昵称
  const handleSaveNickname = async () => {
    if (!nickname.trim()) {
      showToast('昵称不能为空', 'error')
      return
    }

    console.log('开始更新昵称:', nickname.trim())
    console.log('当前用户:', user?.id)

    try {
      const result = await updateProfile({ nickname: nickname.trim() })
      console.log('更新成功:', result)
      setIsEditingNickname(false)
      showToast('昵称已更新')
    } catch (err) {
      console.error('更新昵称失败，完整错误:', err)
      console.error('错误消息:', err.message)
      console.error('错误详情:', err.details)
      showToast(`更新失败: ${err.message || '未知错误'}`, 'error')
    }
  }

  // 修改密码
  const handleChangePassword = async (e) => {
    e.preventDefault()

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast('两次输入的新密码不一致', 'error')
      return
    }

    if (passwordForm.newPassword.length < 6) {
      showToast('新密码至少需要6位', 'error')
      return
    }

    setIsChangingPassword(true)
    try {
      // 先验证旧密码
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordForm.currentPassword
      })

      if (signInError) {
        showToast('当前密码错误', 'error')
        return
      }

      // 更新密码
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      })

      if (error) throw error

      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      showToast('密码修改成功')
    } catch (err) {
      showToast(err.message || '修改失败', 'error')
    } finally {
      setIsChangingPassword(false)
    }
  }

  // 退出登录
  const handleLogout = async () => {
    try {
      await signOut()
      navigate('/')
    } catch (err) {
      showToast('退出失败', 'error')
    }
  }

  // 初始化加载数据
  useEffect(() => {
    if (user) {
      loadFavorites()
      loadDownloads()
      setNickname(profile?.nickname || '')
    }
  }, [user, profile])

  // 未登录重定向
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <CardTitle>请先登录</CardTitle>
            <CardDescription>登录后查看个人中心</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              onClick={() => navigate('/login')}
            >
              去登录
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const avatarColor = getAvatarColor(user.email)
  const userInitial = user.email?.[0]?.toUpperCase() || '?'

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      {/* Toast */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      <div className="max-w-4xl mx-auto">
        {/* 用户信息卡片 */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* 头像 */}
              <div className={`w-20 h-20 rounded-full ${avatarColor} flex items-center justify-center text-white text-3xl font-bold shadow-lg`}>
                {userInitial}
              </div>

              {/* 用户信息 */}
              <div className="flex-1 text-center sm:text-left">
                <div className="flex flex-col sm:flex-row items-center gap-2 mb-2">
                  {isEditingNickname ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        className="w-40"
                        placeholder="输入昵称"
                      />
                      <Button size="sm" onClick={handleSaveNickname}>
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => {
                          setIsEditingNickname(false)
                          setNickname(profile?.nickname || '')
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <h1 className="text-2xl font-bold">
                        {profile?.nickname || '未设置昵称'}
                      </h1>
                      <button 
                        onClick={() => setIsEditingNickname(true)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
                <p className="text-gray-500 mb-1">{user.email}</p>
                <p className="text-sm text-gray-400">
                  加入于 {formatDate(user.created_at)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tab 区域 */}
        <Tabs defaultValue="favorites" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto min-h-[44px]">
            <TabsTrigger value="favorites" className="flex items-center justify-center gap-1 sm:gap-2 py-2.5 px-1 sm:px-3">
              <Heart className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline text-sm">我的收藏</span>
              <span className="sm:hidden text-xs">收藏</span>
            </TabsTrigger>
            <TabsTrigger value="downloads" className="flex items-center justify-center gap-1 sm:gap-2 py-2.5 px-1 sm:px-3">
              <Download className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline text-sm">下载记录</span>
              <span className="sm:hidden text-xs">下载</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center justify-center gap-1 sm:gap-2 py-2.5 px-1 sm:px-3">
              <Settings className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline text-sm">账号设置</span>
              <span className="sm:hidden text-xs">设置</span>
            </TabsTrigger>
          </TabsList>

          {/* 我的收藏 */}
          <TabsContent value="favorites">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-red-500" />
                  我的收藏
                </CardTitle>
                <CardDescription>您收藏的工具列表</CardDescription>
              </CardHeader>
              <CardContent>
                {favoritesLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  </div>
                ) : favorites.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">还没有收藏任何工具</p>
                    <Button onClick={() => navigate('/tools')}>
                      去发现好工具
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {favorites.map((item) => (
                      <div 
                        key={item.id} 
                        className="flex items-start justify-between p-4 border rounded-lg hover:shadow-md transition-shadow"
                      >
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">
                            {item.tools?.name}
                          </h3>
                          <p className="text-gray-500 text-sm mb-2 line-clamp-2">
                            {item.tools?.description}
                          </p>
                          <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                            {item.tools?.category}
                          </span>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/tools/${item.tool_id}`)}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleRemoveFavorite(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 下载记录 */}
          <TabsContent value="downloads">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5 text-blue-500" />
                  下载记录
                </CardTitle>
                <CardDescription>您的工具下载历史</CardDescription>
              </CardHeader>
              <CardContent>
                {downloadsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  </div>
                ) : downloads.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">还没有下载记录</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {downloads.map((record) => (
                      <div 
                        key={record.id} 
                        className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow"
                      >
                        <div className="flex-1">
                          <h4 className="font-medium text-lg mb-1">{record.tool_name}</h4>
                          <p className="text-sm text-gray-500">
                            {formatTime(record.downloaded_at)}
                          </p>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/tools/${record.tool_id}`)}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteDownload(record.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 账号设置 */}
          <TabsContent value="settings">
            <div className="space-y-6">
              {/* 修改昵称 */}
              <Card>
                <CardHeader>
                  <CardTitle>修改昵称</CardTitle>
                  <CardDescription>设置您的显示昵称</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Input
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="输入新昵称"
                      className="max-w-sm"
                    />
                    <Button onClick={handleSaveNickname}>
                      保存
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* 修改密码 */}
              <Card>
                <CardHeader>
                  <CardTitle>修改密码</CardTitle>
                  <CardDescription>更改您的登录密码</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
                    <div>
                      <label className="text-sm font-medium mb-1 block">当前密码</label>
                      <Input
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                        placeholder="输入当前密码"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">新密码</label>
                      <Input
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                        placeholder="输入新密码（至少6位）"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">确认新密码</label>
                      <Input
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        placeholder="再次输入新密码"
                        required
                      />
                    </div>
                    <Button 
                      type="submit" 
                      disabled={isChangingPassword}
                    >
                      {isChangingPassword ? '修改中...' : '修改密码'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* 危险区域 */}
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="text-red-600">危险区域</CardTitle>
                  <CardDescription>谨慎操作以下功能</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    variant="destructive"
                    onClick={() => setShowLogoutConfirm(true)}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    退出登录
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* 退出登录确认弹窗 */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-sm mx-4">
            <CardHeader>
              <CardTitle>确认退出</CardTitle>
              <CardDescription>您确定要退出登录吗？</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-3 justify-end">
              <Button 
                variant="outline" 
                onClick={() => setShowLogoutConfirm(false)}
              >
                取消
              </Button>
              <Button 
                variant="destructive"
                onClick={handleLogout}
              >
                确认退出
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
