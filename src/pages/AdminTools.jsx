import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/store/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Edit2, Trash2, Loader2, Save, X, Upload, FileArchive } from 'lucide-react'
import { toast } from '@/hooks/useToast'
import JSZip from 'jszip'

// 管理员邮箱列表（你可以修改）
const ADMIN_EMAILS = [
  '2995111793@qq.com',
  // 在此添加其他管理员邮箱
]

/**
 * 工具管理后台
 * 只有管理员可以访问
 */
export default function AdminTools() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tools, setTools] = useState([])
  const [editingTool, setEditingTool] = useState(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isParsing, setIsParsing] = useState(false)

  // 表单状态
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '效率工具',
    type: 'online',
    tags: '',
    icon: '🛠️',
    content: '',
    download_url: '',
    sort_order: 0,
    is_active: true,
  })

  const categories = [
    { id: '效率工具', name: '效率工具', emoji: '⚡' },
    { id: '工作流', name: '工作流', emoji: '🔄' },
    { id: '小游戏', name: '小游戏', emoji: '🎮' },
  ]

  const types = [
    { id: 'online', name: '在线工具' },
    { id: 'download', name: '下载' },
    { id: 'game', name: '游戏' },
    { id: 'workflow', name: '工作流' },
  ]

  // 检查权限
  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    if (!ADMIN_EMAILS.includes(user.email)) {
      toast.error('无权访问管理后台')
      navigate('/')
      return
    }
    fetchTools()
  }, [user, navigate])

  // 获取工具列表
  const fetchTools = async () => {
    try {
      const { data, error } = await supabase
        .from('tools')
        .select('*')
        .order('sort_order', { ascending: true })

      if (error) throw error
      setTools(data || [])
    } catch (err) {
      toast.error('获取工具列表失败')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // 重置表单
  const resetForm = () => {
    // 计算下一个排序值（从1开始，取最大值 + 1）
    const maxSortOrder = tools.length > 0 
      ? Math.max(...tools.map(t => t.sort_order ?? 0)) 
      : 0
    const nextSortOrder = maxSortOrder === 0 ? 1 : maxSortOrder + 1
    
    console.log('调试 - tools长度:', tools.length)
    console.log('调试 - 所有sort_order:', tools.map(t => t.sort_order))
    console.log('调试 - maxSortOrder:', maxSortOrder)
    console.log('调试 - nextSortOrder:', nextSortOrder)
    
    setFormData({
      name: '',
      description: '',
      category: '效率工具',
      type: 'online',
      tags: '',
      icon: '🛠️',
      content: '',
      download_url: '',
      sort_order: nextSortOrder,
      is_active: true,
    })
  }

  // 开始创建
  const handleCreate = () => {
    console.log('调试 - handleCreate被调用, tools长度:', tools.length)
    resetForm()
    setIsCreating(true)
    setEditingTool(null)
  }

  // 解析上传的插件压缩包
  const handleParsePlugin = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    // 检查文件类型
    if (!file.name.endsWith('.zip')) {
      toast.error('请上传 ZIP 格式的压缩包')
      return
    }

    try {
      setIsParsing(true)
      toast.info('正在解析压缩包...')

      // 读取 ZIP 文件
      const zipData = await file.arrayBuffer()
      const zip = await JSZip.loadAsync(zipData)

      // 查找 manifest.json
      let manifestFile = null
      let manifestPath = ''

      // 遍历查找 manifest.json
      zip.forEach((relativePath, zipEntry) => {
        if (relativePath.endsWith('manifest.json') && !zipEntry.dir) {
          manifestFile = zipEntry
          manifestPath = relativePath
        }
      })

      if (!manifestFile) {
        toast.error('压缩包中未找到 manifest.json')
        setIsParsing(false)
        return
      }

      // 解析 manifest.json
      const manifestContent = await manifestFile.async('string')
      let manifest
      try {
        manifest = JSON.parse(manifestContent)
      } catch {
        toast.error('manifest.json 格式错误')
        setIsParsing(false)
        return
      }

      // 提取工具信息
      const toolInfo = {
        name: manifest.name || file.name.replace('.zip', ''),
        description: manifest.description || '',
        version: manifest.version || '1.0.0',
      }

      // 查找主要 JS 文件
      let mainCode = ''
      const jsFiles = []
      zip.forEach((relativePath, zipEntry) => {
        if (relativePath.endsWith('.js') && !zipEntry.dir) {
          jsFiles.push({ path: relativePath, entry: zipEntry })
        }
      })

      // 优先读取 popup.js 或 content.js
      const priorityFiles = ['popup.js', 'content.js', 'background.js', 'index.js']
      for (const priorityFile of priorityFiles) {
        const found = jsFiles.find(f => f.path.endsWith(priorityFile))
        if (found) {
          mainCode = await found.entry.async('string')
          break
        }
      }

      // 提取标签（从权限和名称中推断）
      const tags = []
      if (manifest.permissions) {
        if (manifest.permissions.includes('activeTab')) tags.push('标签页')
        if (manifest.permissions.includes('storage')) tags.push('存储')
        if (manifest.permissions.includes('scripting')) tags.push('脚本')
      }
      if (manifest.content_scripts) tags.push('内容脚本')
      if (manifest.background) tags.push('后台脚本')

      // 计算排序值（从1开始）
      const maxSortOrder = tools.length > 0 
        ? Math.max(...tools.map(t => t.sort_order || 0)) 
        : 0
      const nextSortOrder = maxSortOrder === 0 ? 1 : maxSortOrder + 1

      // 上传原始 ZIP 文件到存储桶
      let downloadUrl = ''
      try {
        const fileName = `${Date.now()}_${file.name}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('plugin-files')
          .upload(fileName, file, {
            contentType: 'application/zip',
            upsert: false
          })
        
        if (uploadError) {
          console.warn('文件上传失败:', uploadError)
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('plugin-files')
            .getPublicUrl(fileName)
          downloadUrl = publicUrl
        }
      } catch (uploadErr) {
        console.warn('文件上传出错:', uploadErr)
      }

      // 自动填充表单
      // 编辑模式下保持原有排序值，新建模式使用计算的新排序值
      setFormData({
        ...formData,
        name: toolInfo.name,
        description: toolInfo.description,
        version: toolInfo.version,
        tags: tags.join(', '),
        icon: getIconFromName(toolInfo.name),
        content: generateToolContent(toolInfo, manifest, mainCode),
        sort_order: editingTool ? formData.sort_order : nextSortOrder,
        download_url: downloadUrl || formData.download_url,
      })

      toast.success('解析成功！已自动填充表单')
      
      // 如果是新建状态，保持新建；如果是编辑状态，切换到新建
      if (!isCreating && !editingTool) {
        setIsCreating(true)
      }
    } catch (error) {
      console.error('解析失败:', error)
      toast.error('解析失败: ' + error.message)
    } finally {
      setIsParsing(false)
      // 清空 input，允许重复上传同一文件
      event.target.value = ''
    }
  }

  // 根据工具名称获取图标
  const getIconFromName = (name) => {
    const iconMap = {
      json: '📋',
      format: '📋',
      格式化: '📋',
      extension: '🔧',
      扩展: '🔧',
      chrome: '🔧',
      tool: '🛠️',
      工具: '🛠️',
      download: '⬇️',
      下载: '⬇️',
      game: '🎮',
      游戏: '🎮',
      chat: '💬',
      聊天: '💬',
      image: '🖼️',
      图片: '🖼️',
      text: '📝',
      文本: '📝',
      code: '💻',
      代码: '💻',
      search: '🔍',
      搜索: '🔍',
    }
    
    const lowerName = name.toLowerCase()
    for (const [key, icon] of Object.entries(iconMap)) {
      if (lowerName.includes(key)) return icon
    }
    return '📦'
  }

  // 生成工具详细介绍
  const generateToolContent = (toolInfo, manifest, mainCode) => {
    let content = `# ${toolInfo.name}

${toolInfo.description}

## 版本信息

- **版本**: ${toolInfo.version}
- **Manifest 版本**: ${manifest.manifest_version || 3}

`

    if (manifest.permissions && manifest.permissions.length > 0) {
      content += `## 所需权限

${manifest.permissions.map(p => `- ${p}`).join('\n')}

`
    }

    if (manifest.content_scripts) {
      content += `## 内容脚本

匹配规则:
${manifest.content_scripts[0].matches.map(m => `- \`${m}\``).join('\n')}

`
    }

    if (mainCode) {
      content += `## 核心代码预览

\`\`\`javascript
${mainCode.substring(0, 500)}${mainCode.length > 500 ? '\n// ... 代码已截断' : ''}
\`\`\`

`
    }

    content += `## 安装说明

1. 下载扩展压缩包
2. 解压到本地文件夹
3. 打开 Chrome 浏览器，访问 chrome://extensions/
4. 开启「开发者模式」
5. 点击「加载已解压的扩展程序」
6. 选择解压后的文件夹

## 使用说明

安装后点击浏览器右上角的扩展图标即可使用。

---

*此工具由 Friday Hub 自动解析生成*
`

    return content
  }

  // 调整排序顺序
  // 当把工具从 oldOrder 移动到 newOrder 时，自动调整其他工具的排序
  const adjustSortOrder = async (oldOrder, newOrder, excludeId) => {
    try {
      if (newOrder < oldOrder) {
        // 往前移：把 [newOrder, oldOrder-1] 区间的工具排序 +1
        const { error } = await supabase
          .from('tools')
          .update({ sort_order: supabase.rpc('increment_sort_order', { 
            start_order: newOrder, 
            end_order: oldOrder - 1 
          })})
          .gte('sort_order', newOrder)
          .lte('sort_order', oldOrder - 1)
          .neq('id', excludeId)

        if (error) {
          // 如果 RPC 不存在，使用手动更新
          const toolsToUpdate = tools.filter(
            t => t.sort_order >= newOrder && t.sort_order <= oldOrder - 1 && t.id !== excludeId
          )
          for (const tool of toolsToUpdate) {
            await supabase
              .from('tools')
              .update({ sort_order: tool.sort_order + 1 })
              .eq('id', tool.id)
          }
        }
      } else if (newOrder > oldOrder) {
        // 往后移：把 [oldOrder+1, newOrder] 区间的工具排序 -1
        const toolsToUpdate = tools.filter(
          t => t.sort_order >= oldOrder + 1 && t.sort_order <= newOrder && t.id !== excludeId
        )
        for (const tool of toolsToUpdate) {
          await supabase
            .from('tools')
            .update({ sort_order: tool.sort_order - 1 })
            .eq('id', tool.id)
        }
      }
    } catch (err) {
      console.error('调整排序失败:', err)
      // 不阻断主流程，继续保存
    }
  }

  // 开始编辑
  const handleEdit = (tool) => {
    setFormData({
      ...tool,
      tags: tool.tags?.join(', ') || '',
    })
    setEditingTool(tool)
    setIsCreating(false)
  }

  // 取消编辑
  const handleCancel = () => {
    setEditingTool(null)
    setIsCreating(false)
    resetForm()
  }

  // 保存工具
  const handleSave = async () => {
    try {
      setSaving(true)

      // 处理标签
      const tagsArray = formData.tags
        .split(/[,，]/)
        .map(t => t.trim())
        .filter(t => t)

      const toolData = {
        ...formData,
        tags: tagsArray,
      }

      if (editingTool) {
        // 更新
        const oldOrder = editingTool.sort_order
        const newOrder = toolData.sort_order

        // 如果排序值发生变化，需要调整其他工具的排序
        if (oldOrder !== newOrder) {
          await adjustSortOrder(oldOrder, newOrder, editingTool.id)
        }

        const { error } = await supabase
          .from('tools')
          .update(toolData)
          .eq('id', editingTool.id)

        if (error) throw error
        toast.success('工具更新成功')
      } else {
        // 创建 - 生成 UUID
        const { error } = await supabase
          .from('tools')
          .insert([{
            ...toolData,
            id: crypto.randomUUID(),
          }])

        if (error) throw error
        toast.success('工具创建成功')
      }

      handleCancel()
      fetchTools()
    } catch (err) {
      toast.error('保存失败: ' + err.message)
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  // 删除工具
  const handleDelete = async (tool) => {
    if (!confirm(`确定要删除 "${tool.name}" 吗？此操作不可恢复。`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('tools')
        .delete()
        .eq('id', tool.id)

      if (error) throw error
      toast.success('工具已删除')
      fetchTools()
    } catch (err) {
      toast.error('删除失败')
      console.error(err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">工具管理后台</h1>
            <p className="text-gray-500">共 {tools.length} 个工具</p>
          </div>
          <Button onClick={handleCreate} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-2" />
            添加工具
          </Button>
        </div>

        {/* 编辑/创建表单 */}
        {(isCreating || editingTool) && (
          <>
            {/* 上传插件压缩包区域 */}
            <Card className="mb-6 border-dashed border-2 border-purple-300 hover:border-purple-400 transition-colors">
              <CardContent className="p-6">
                <div className="flex justify-end">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => editingTool ? setEditingTool(null) : setIsCreating(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="text-center -mt-4">
                  <FileArchive className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {editingTool ? '更新插件' : '快速导入插件'}
                  </h3>
                  <p className="text-gray-500 text-sm mb-4">
                    {editingTool 
                      ? '上传新的 ZIP 压缩包来更新此插件的信息' 
                      : '上传 Chrome 扩展的 ZIP 压缩包，自动解析并填充表单'}
                  </p>
                  <div className="flex justify-center">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept=".zip"
                        onChange={handleParsePlugin}
                        disabled={isParsing}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isParsing}
                        className="border-purple-300 hover:bg-purple-50"
                        onClick={() => document.querySelector('input[type="file"]').click()}
                      >
                        {isParsing ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4 mr-2" />
                        )}
                        {isParsing ? '解析中...' : `选择 ZIP 文件${editingTool ? ' (更新)' : ''}`}
                      </Button>
                    </label>
                  </div>
                  <p className="text-xs text-gray-400 mt-3">
                    支持自动解析 manifest.json、提取权限信息、生成文档
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card key={editingTool ? `edit-${editingTool.id}` : 'create'} className="mb-8 border-purple-200 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {editingTool ? '编辑工具' : '添加新工具'}
                    <Button variant="ghost" size="sm" onClick={handleCancel}>
                      <X className="w-4 h-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 名称 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    工具名称 *
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="输入工具名称"
                  />
                </div>

                {/* 图标 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    图标 Emoji *
                  </label>
                  <Input
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    placeholder="🛠️"
                    maxLength={2}
                  />
                </div>

                {/* 分类 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    分类 *
                  </label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.emoji} {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 类型 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    类型 *
                  </label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {types.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 描述 */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    简短描述 *
                  </label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="一句话描述这个工具"
                  />
                </div>

                {/* 标签 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    标签（用逗号分隔）
                  </label>
                  <Input
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="json, 格式化, 开发工具"
                  />
                </div>

                {/* 排序 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    排序顺序（数字越小越靠前）
                  </label>
                  <Input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                  />
                </div>

                {/* 下载链接 */}
                {formData.type === 'download' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      下载链接
                    </label>
                    <Input
                      value={formData.download_url}
                      onChange={(e) => setFormData({ ...formData, download_url: e.target.value })}
                      placeholder="https://example.com/download"
                    />
                  </div>
                )}

                {/* 详细内容 */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    详细内容（支持 Markdown）
                  </label>
                  <Textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="# 使用说明\n\n详细描述这个工具的功能和使用方法..."
                    rows={6}
                  />
                </div>

                {/* 保存按钮 */}
                <div className="md:col-span-2 flex gap-3">
                  <Button
                    onClick={handleSave}
                    disabled={saving || !formData.name || !formData.description}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    {editingTool ? '保存修改' : '创建工具'}
                  </Button>
                  <Button variant="outline" onClick={handleCancel}>
                    取消
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
        )}

        {/* 工具列表 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  工具
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  分类
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  排序
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tools.map((tool) => (
                <tr key={tool.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">{tool.icon}</span>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {tool.name}
                        </div>
                        <div className="text-sm text-gray-500 line-clamp-1">
                          {tool.description}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-700">
                      {tool.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {tool.sort_order}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(tool)}
                      className="text-blue-600 hover:text-blue-900 mr-2"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(tool)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
