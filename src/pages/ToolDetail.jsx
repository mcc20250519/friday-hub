import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/store/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/hooks/useToast'
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
  AlertCircle,
  FileCode
} from 'lucide-react'
import JSZip from 'jszip'

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
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '下载',
    onConfirm: null,
  })

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
        toast({ title: '已取消收藏', variant: 'default' })
      } else {
        // 添加收藏
        await supabase
          .from('favorites')
          .insert({ user_id: user.id, tool_id: id })
        setIsFavorited(true)
        toast.success('已添加到收藏')
      }
    } catch (err) {
      console.error('收藏操作失败:', err)
      toast.error('操作失败，请稍后重试')
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
      toast.info('开始下载...')
      window.open(tool.download_url, '_blank')
    } else {
      // 内置工具提示可以使用下载功能
      toast.info('点击下方「下载扩展」按钮获取工具')
    }
  }

  // 下载 Chrome 扩展源码（可直接加载）- 所有工具都支持
  const handleDownloadSource = async () => {
    if (!tool) {
      toast.error('工具信息不完整')
      return
    }

    try {
      // 如果有原始下载链接（从存储桶），直接下载原始文件
      if (tool.download_url && tool.download_url.includes('plugin-files')) {
        toast.info('开始下载原始插件文件...')
        const link = document.createElement('a')
        link.href = tool.download_url
        link.download = `${tool.name || 'plugin'}.zip`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        toast.success('下载已开始')
        return
      }

      toast.info('正在打包扩展源码...')
      
      const zip = new JSZip()
      const folderName = tool.id || tool.component
      const folder = zip.folder(folderName)

      // 根据工具类型生成不同的扩展代码
      const extensionCode = generateExtensionCode(tool)

      // 创建 manifest.json
      folder.file('manifest.json', JSON.stringify(extensionCode.manifest, null, 2))

      // 创建 popup.html
      if (extensionCode.popupHtml) {
        folder.file('popup.html', extensionCode.popupHtml)
      }

      // 创建 popup.js
      if (extensionCode.popupJs) {
        folder.file('popup.js', extensionCode.popupJs)
      }

      // 创建 content.js
      if (extensionCode.contentJs) {
        folder.file('content.js', extensionCode.contentJs)
      }

      // 创建 background.js
      if (extensionCode.backgroundJs) {
        folder.file('background.js', extensionCode.backgroundJs)
      }

      // 创建 README
      const readme = `# ${tool.name} - Chrome 扩展

${tool.description}

## 安装方法

1. 下载并解压本文件夹
2. 打开 Chrome 浏览器，访问 chrome://extensions/
3. 开启右上角的「开发者模式」
4. 点击「加载已解压的扩展程序」
5. 选择解压后的文件夹

## 使用说明

${extensionCode.usage || '安装后点击浏览器右上角的扩展图标即可使用。'}

## 文件结构

${extensionCode.fileStructure || `- manifest.json - 扩展配置文件
- popup.html - 弹出窗口界面
- popup.js - 弹出窗口逻辑`}

## 功能特点

${extensionCode.features || '- 简单易用\n- 即装即用'}

---

来自 Friday Hub (https://friday-hub.vercel.app)
`
      folder.file('README.md', readme)

      // 创建图标说明
      folder.file('icons/README.txt', `请将以下尺寸的 PNG 图标放入此文件夹：
- icon16.png (16x16)
- icon48.png (48x48)
- icon128.png (128x128)

可以使用 https://favicon.io/favicon-converter/ 生成图标`)

      // 生成 zip 文件
      const content = await zip.generateAsync({ type: 'blob' })
      
      // 创建下载链接
      const url = window.URL.createObjectURL(content)
      const link = document.createElement('a')
      link.href = url
      link.download = `${folderName}-extension.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      // 记录下载
      if (user) {
        await supabase
          .from('download_records')
          .insert({
            user_id: user.id,
            tool_id: tool.id,
            tool_name: tool.name + ' (扩展源码)'
          })
      }

      toast.success('扩展源码已打包下载！')
    } catch (error) {
      console.error('打包源码失败:', error)
      toast.error('打包失败: ' + error.message)
    }
  }

  // 获取按钮配置
  const getButtonConfig = () => {
    if (!tool) return { text: '加载中...', icon: <Download className="h-5 w-5" /> }
    
    switch (tool.type) {
      case 'download':
        return { 
          text: '下载扩展', 
          icon: <Download className="h-5 w-5" />,
          confirmTitle: '下载插件确认',
          confirmMessage: `确定要下载「${tool.name}」扩展吗？下载后可以解压加载到 Chrome 浏览器中使用。`
        }
      case 'workflow':
        return { 
          text: '下载工作流', 
          icon: <Workflow className="h-5 w-5" />,
          confirmTitle: '下载工作流确认',
          confirmMessage: `确定要下载「${tool.name}」工作流吗？需要 n8n 环境才能运行。`
        }
      case 'game':
        return { 
          text: '开始游戏', 
          icon: <Gamepad2 className="h-5 w-5" />,
          confirmTitle: null,
          confirmMessage: null
        }
      case 'online':
        return { 
          text: '开始使用', 
          icon: <Globe className="h-5 w-5" />,
          confirmTitle: null,
          confirmMessage: null
        }
      default:
        return { 
          text: '下载', 
          icon: <Download className="h-5 w-5" />,
          confirmTitle: '下载确认',
          confirmMessage: `确定要下载「${tool.name}」吗？`
        }
    }
  }

  // 处理主按钮点击
  const handleMainAction = () => {
    if (!tool) return
    
    const config = getButtonConfig()
    
    // 游戏和在线工具直接跳转，不需要确认
    if (tool.type === 'game') {
      navigate('/games/party')
      return
    }
    
    if (tool.type === 'online') {
      toast.info('该工具为在线工具，可直接在下方使用')
      return
    }
    
    // 插件类型：检查是否有原始文件
    if (tool.type === 'download') {
      if (tool.download_url) {
        // 有原始文件，直接下载
        setConfirmDialog({
          isOpen: true,
          title: config.confirmTitle,
          message: config.confirmMessage,
          confirmText: '确认下载',
          onConfirm: () => {
            setConfirmDialog(prev => ({ ...prev, isOpen: false }))
            handleAction()
          },
        })
      } else {
        // 没有原始文件，提示生成源码
        setConfirmDialog({
          isOpen: true,
          title: '生成扩展源码确认',
          message: `「${tool.name}」暂无上传的原始文件，系统将自动生成一个基础扩展源码模板。\n\n注意：生成的代码可能需要根据实际情况修改和完善。`,
          confirmText: '生成并下载',
          onConfirm: () => {
            setConfirmDialog(prev => ({ ...prev, isOpen: false }))
            handleDownloadSource()
          },
        })
      }
      return
    }
    
    // 其他下载类型（工作流等）
    setConfirmDialog({
      isOpen: true,
      title: config.confirmTitle,
      message: config.confirmMessage,
      confirmText: '确认下载',
      onConfirm: () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }))
        handleAction()
      },
    })
  }

  // 处理扩展源码生成确认
  const handleExtensionDownload = () => {
    if (!tool) return
    
    setConfirmDialog({
      isOpen: true,
      title: '生成扩展源码确认',
      message: `「${tool.name}」暂无上传的原始文件，系统将自动生成一个基础扩展源码模板。\n\n注意：生成的代码可能需要根据实际情况修改和完善。`,
      confirmText: '生成源码',
      onConfirm: () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }))
        handleDownloadSource()
      },
    })
  }

  // 根据工具类型生成扩展代码
  const generateExtensionCode = (tool) => {
    const baseManifest = {
      manifest_version: 3,
      name: tool.name,
      version: tool.version || '1.0.0',
      description: tool.description,
      icons: {
        16: 'icons/icon16.png',
        48: 'icons/icon48.png',
        128: 'icons/icon128.png'
      },
      permissions: ['activeTab'],
      action: {
        default_popup: 'popup.html',
        default_icon: {
          16: 'icons/icon16.png',
          48: 'icons/icon48.png'
        }
      }
    }

    // 根据不同组件生成不同代码
    switch (tool.component) {
      case 'json-formatter':
        return generateJsonFormatterExtension(tool, baseManifest)
      case 'extension-generator':
        return generateExtensionGeneratorExtension(tool, baseManifest)
      default:
        return generateDefaultExtension(tool, baseManifest)
    }
  }

  // JSON 格式化器扩展
  const generateJsonFormatterExtension = (tool, manifest) => {
    return {
      manifest: {
        ...manifest,
        permissions: ['activeTab', 'scripting']
      },
      popupHtml: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { width: 400px; padding: 16px; font-family: system-ui, -apple-system, sans-serif; }
    h1 { font-size: 16px; margin-bottom: 12px; color: #333; }
    textarea { width: 100%; height: 120px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-family: monospace; font-size: 13px; resize: vertical; }
    .buttons { display: flex; gap: 8px; margin-top: 12px; }
    button { flex: 1; padding: 10px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; }
    .btn-primary { background: #4CAF50; color: white; }
    .btn-primary:hover { background: #45a049; }
    .btn-secondary { background: #f0f0f0; color: #333; }
    .btn-secondary:hover { background: #e0e0e0; }
    #result { margin-top: 12px; padding: 12px; background: #f5f5f5; border-radius: 4px; font-family: monospace; font-size: 12px; max-height: 200px; overflow: auto; white-space: pre-wrap; word-break: break-all; }
    .error { color: #d32f2f; background: #ffebee !important; }
    .success { color: #388e3c; background: #e8f5e9 !important; }
  </style>
</head>
<body>
  <h1>🛠️ ${tool.name}</h1>
  <textarea id="input" placeholder="粘贴 JSON 内容..."></textarea>
  <div class="buttons">
    <button class="btn-primary" id="formatBtn">格式化</button>
    <button class="btn-secondary" id="minifyBtn">压缩</button>
  </div>
  <div id="result"></div>
  <script src="popup.js"></script>
</body>
</html>`,
      popupJs: `// ${tool.name} - Popup Script

document.getElementById('formatBtn').addEventListener('click', () => {
  const input = document.getElementById('input').value;
  const result = document.getElementById('result');
  
  try {
    if (!input.trim()) {
      result.textContent = '请输入 JSON 内容';
      result.className = 'error';
      return;
    }
    
    const parsed = JSON.parse(input);
    result.textContent = JSON.stringify(parsed, null, 2);
    result.className = 'success';
  } catch (err) {
    result.textContent = '错误: ' + err.message;
    result.className = 'error';
  }
});

document.getElementById('minifyBtn').addEventListener('click', () => {
  const input = document.getElementById('input').value;
  const result = document.getElementById('result');
  
  try {
    if (!input.trim()) {
      result.textContent = '请输入 JSON 内容';
      result.className = 'error';
      return;
    }
    
    const parsed = JSON.parse(input);
    result.textContent = JSON.stringify(parsed);
    result.className = 'success';
  } catch (err) {
    result.textContent = '错误: ' + err.message;
    result.className = 'error';
  }
});`,
      usage: '1. 点击浏览器右上角的扩展图标\n2. 在弹出窗口中粘贴 JSON 内容\n3. 点击「格式化」或「压缩」按钮\n4. 查看格式化后的结果',
      fileStructure: `- manifest.json - 扩展配置文件
- popup.html - 弹出窗口界面
- popup.js - 弹出窗口逻辑
- icons/ - 图标文件夹`,
      features: '- 快速格式化 JSON 内容\n- 一键压缩 JSON\n- 直接在浏览器中使用\n- 无需联网'
    }
  }

  // 扩展生成器扩展（示例）
  const generateExtensionGeneratorExtension = (tool, manifest) => {
    return {
      manifest: {
        ...manifest,
        permissions: ['activeTab', 'storage']
      },
      popupHtml: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { width: 350px; padding: 16px; font-family: system-ui, -apple-system, sans-serif; }
    h1 { font-size: 16px; margin-bottom: 12px; color: #333; }
    .field { margin-bottom: 12px; }
    label { display: block; font-size: 13px; color: #666; margin-bottom: 4px; }
    input, select { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
    button { width: 100%; padding: 12px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; }
    button:hover { background: #45a049; }
    #output { margin-top: 12px; padding: 12px; background: #f5f5f5; border-radius: 4px; font-family: monospace; font-size: 12px; max-height: 150px; overflow: auto; white-space: pre-wrap; }
  </style>
</head>
<body>
  <h1>🔧 ${tool.name}</h1>
  <div class="field">
    <label>扩展名称</label>
    <input type="text" id="extName" placeholder="My Extension" value="My Extension">
  </div>
  <div class="field">
    <label>版本号</label>
    <input type="text" id="extVersion" placeholder="1.0.0" value="1.0.0">
  </div>
  <div class="field">
    <label>描述</label>
    <input type="text" id="extDesc" placeholder="A useful extension">
  </div>
  <button id="generateBtn">生成 Manifest</button>
  <pre id="output"></pre>
  <script src="popup.js"></script>
</body>
</html>`,
      popupJs: `// ${tool.name} - Popup Script

document.getElementById('generateBtn').addEventListener('click', () => {
  const name = document.getElementById('extName').value || 'My Extension';
  const version = document.getElementById('extVersion').value || '1.0.0';
  const description = document.getElementById('extDesc').value || 'A Chrome extension';
  
  const manifest = {
    manifest_version: 3,
    name: name,
    version: version,
    description: description,
    action: {
      default_popup: 'popup.html',
      default_icon: {
        16: 'icons/icon16.png',
        48: 'icons/icon48.png'
      }
    },
    icons: {
      16: 'icons/icon16.png',
      48: 'icons/icon48.png',
      128: 'icons/icon128.png'
    }
  };
  
  document.getElementById('output').textContent = JSON.stringify(manifest, null, 2);
});`,
      usage: '1. 点击扩展图标打开工具\n2. 填写扩展信息\n3. 点击「生成 Manifest」\n4. 复制生成的配置到 manifest.json 文件',
      fileStructure: `- manifest.json - 扩展配置文件
- popup.html - 弹出窗口界面
- popup.js - 弹出窗口逻辑
- icons/ - 图标文件夹`,
      features: '- 快速生成 manifest.json\n- 自定义扩展信息\n- 实时预览配置'
    }
  }

  // 默认扩展模板
  const generateDefaultExtension = (tool, manifest) => {
    return {
      manifest: manifest,
      popupHtml: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { width: 300px; padding: 16px; font-family: system-ui, -apple-system, sans-serif; text-align: center; }
    h1 { font-size: 18px; margin-bottom: 12px; color: #333; }
    p { color: #666; font-size: 14px; margin-bottom: 16px; }
    .btn { padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; }
    .btn:hover { background: #45a049; }
  </style>
</head>
<body>
  <h1>${tool.name}</h1>
  <p>${tool.description}</p>
  <button class="btn" id="actionBtn">开始使用</button>
  <script src="popup.js"></script>
</body>
</html>`,
      popupJs: `// ${tool.name} - Popup Script

document.getElementById('actionBtn').addEventListener('click', () => {
  alert('欢迎使用 ${tool.name}！');
});`,
      usage: '1. 点击浏览器右上角的扩展图标\n2. 在弹出窗口中点击按钮即可使用',
      fileStructure: `- manifest.json - 扩展配置文件
- popup.html - 弹出窗口界面
- popup.js - 弹出窗口逻辑
- icons/ - 图标文件夹`,
      features: '- 简洁易用\n- 快速访问\n- 轻量级设计'
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* 移动端：操作卡片放在最上方 */}
        <div className="lg:hidden mb-6">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <Button
                onClick={handleMainAction}
                className="w-full bg-purple-600 hover:bg-purple-700 text-base sm:text-lg h-12 sm:h-14"
              >
                {getButtonConfig().icon}
                <span className="ml-2">{getButtonConfig().text}</span>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* 左侧主内容 */}
          <div className="lg:col-span-2 space-y-6 sm:space-y-8">
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

          {/* 右侧操作区 - 仅桌面端显示 */}
          <div className="hidden lg:block space-y-6">
            {/* 下载/使用卡片 */}
            <Card className="sticky top-24">
              <CardContent className="p-6">
                {/* 主按钮 */}
                <Button
                  onClick={handleMainAction}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-lg h-14"
                >
                  {getButtonConfig().icon}
                  <span className="ml-2">{getButtonConfig().text}</span>
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

      {/* 确认对话框 */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              {confirmDialog.title}
            </h3>
            <p className="text-gray-600 mb-6">
              {confirmDialog.message}
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
              >
                取消
              </Button>
              <Button
                onClick={() => confirmDialog.onConfirm && confirmDialog.onConfirm()}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {confirmDialog.confirmText}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
