import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Download, FileCode, Puzzle, Wand2 } from 'lucide-react'
import { toast } from '@/hooks/useToast'
import JSZip from 'jszip'

/**
 * Chrome 扩展生成器
 * 根据用户配置自动生成插件代码并打包下载
 */
export default function ExtensionGenerator() {
  const [config, setConfig] = useState({
    name: 'My Extension',
    version: '1.0.0',
    description: 'A custom Chrome extension',
    author: '',
    // 功能开关
    contentScript: true,
    popup: true,
    background: false,
    options: false,
    // 权限
    permissions: {
      activeTab: false,
      storage: false,
      tabs: false,
      scripting: false,
    },
    // 内容脚本配置
    matches: 'https://*/*',
  })

  const [generating, setGenerating] = useState(false)

  // 生成 manifest.json
  const generateManifest = () => {
    const manifest = {
      manifest_version: 3,
      name: config.name,
      version: config.version,
      description: config.description,
      ...(config.author && { author: config.author }),
    }

    // 添加权限
    const permissions = []
    const hostPermissions = []
    
    if (config.permissions.activeTab) permissions.push('activeTab')
    if (config.permissions.storage) permissions.push('storage')
    if (config.permissions.tabs) permissions.push('tabs')
    if (config.permissions.scripting) permissions.push('scripting')
    
    if (permissions.length > 0) {
      manifest.permissions = permissions
    }

    // 内容脚本
    if (config.contentScript) {
      manifest.content_scripts = [{
        matches: config.matches.split(',').map(m => m.trim()),
        js: ['content.js'],
        css: ['content.css'],
        run_at: 'document_end'
      }]
    }

    // Popup
    if (config.popup) {
      manifest.action = {
        default_popup: 'popup.html',
        default_icon: {
          16: 'icons/icon16.png',
          48: 'icons/icon48.png',
          128: 'icons/icon128.png'
        }
      }
    }

    // Background service worker
    if (config.background) {
      manifest.background = {
        service_worker: 'background.js',
        type: 'module'
      }
    }

    // Options page
    if (config.options) {
      manifest.options_page = 'options.html'
    }

    // Icons
    manifest.icons = {
      16: 'icons/icon16.png',
      48: 'icons/icon48.png',
      128: 'icons/icon128.png'
    }

    return JSON.stringify(manifest, null, 2)
  }

  // 生成 content script
  const generateContentScript = () => `// Content Script - ${config.name}
// This script runs on pages matching: ${config.matches}

console.log('${config.name} is running on:', window.location.href);

// 页面加载完成后执行
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function init() {
  // 在这里添加你的代码
  console.log('Page initialized');
  
  // 示例：高亮所有链接
  // const links = document.querySelectorAll('a');
  // links.forEach(link => {
  //   link.style.backgroundColor = 'yellow';
  // });
}

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageInfo') {
    sendResponse({
      url: window.location.href,
      title: document.title,
      success: true
    });
  }
  return true;
});
`

  // 生成 content.css
  const generateContentCSS = () => `/* Content Styles - ${config.name} */
/* This CSS is injected into matching pages */

/* 示例：添加自定义样式 */
.custom-highlight {
  background-color: rgba(255, 255, 0, 0.3) !important;
  border: 2px solid orange !important;
}
`

  // 生成 popup.html
  const generatePopupHTML = () => `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      width: 300px;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
    }
    h1 {
      font-size: 16px;
      margin-bottom: 12px;
      color: #333;
    }
    .info-box {
      background: #f5f5f5;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 12px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .info-row:last-child {
      margin-bottom: 0;
    }
    button {
      width: 100%;
      padding: 10px;
      background: #4CAF50;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }
    button:hover {
      background: #45a049;
    }
    #status {
      margin-top: 12px;
      padding: 8px;
      border-radius: 4px;
      text-align: center;
      display: none;
    }
    #status.success {
      display: block;
      background: #d4edda;
      color: #155724;
    }
    #status.error {
      display: block;
      background: #f8d7da;
      color: #721c24;
    }
  </style>
</head>
<body>
  <h1>${config.name}</h1>
  
  <div class="info-box">
    <div class="info-row">
      <span>当前页面:</span>
      <span id="pageUrl">加载中...</span>
    </div>
    <div class="info-row">
      <span>页面标题:</span>
      <span id="pageTitle">-</span>
    </div>
  </div>
  
  <button id="actionBtn">执行操作</button>
  
  <div id="status"></div>
  
  <script src="popup.js"></script>
</body>
</html>
`

  // 生成 popup.js
  const generatePopupJS = () => `// Popup Script - ${config.name}

document.addEventListener('DOMContentLoaded', async () => {
  const pageUrlEl = document.getElementById('pageUrl');
  const pageTitleEl = document.getElementById('pageTitle');
  const actionBtn = document.getElementById('actionBtn');
  const statusEl = document.getElementById('status');

  // 获取当前标签页信息
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (tab) {
    pageUrlEl.textContent = tab.url.length > 30 ? tab.url.substring(0, 30) + '...' : tab.url;
    pageTitleEl.textContent = tab.title.length > 20 ? tab.title.substring(0, 20) + '...' : tab.title;
  }

  // 按钮点击事件
  actionBtn.addEventListener('click', async () => {
    try {
      // 发送消息到 content script
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getPageInfo' });
      
      if (response && response.success) {
        showStatus('操作成功！', 'success');
        console.log('Page info:', response);
      } else {
        showStatus('操作失败', 'error');
      }
    } catch (error) {
      showStatus('无法连接到页面，请刷新后重试', 'error');
      console.error('Error:', error);
    }
  });

  function showStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = type;
    setTimeout(() => {
      statusEl.className = '';
    }, 3000);
  }
});
`

  // 生成 background.js
  const generateBackgroundJS = () => `// Background Service Worker - ${config.name}

// 扩展安装时执行
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details);
  
  if (details.reason === 'install') {
    // 首次安装
    console.log('Welcome to ${config.name}!');
  } else if (details.reason === 'update') {
    // 更新
    console.log('Extension updated to version', chrome.runtime.getManifest().version);
  }
});

// 监听标签页更新
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    console.log('Page loaded:', tab.url);
  }
});

// 监听消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getStorage') {
    chrome.storage.local.get(request.key, (result) => {
      sendResponse(result);
    });
    return true;
  }
  
  if (request.action === 'setStorage') {
    chrome.storage.local.set(request.data, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});
`

  // 生成 README
  const generateREADME = () => `# ${config.name}

${config.description}

## 安装方法

1. 下载并解压本扩展文件
2. 打开 Chrome 浏览器，访问 chrome://extensions/
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择解压后的文件夹

## 文件结构

\`\`\`
${config.name.toLowerCase().replace(/\s+/g, '-')}/
├── manifest.json       # 扩展配置文件
├── content.js          # 内容脚本
├── content.css         # 内容样式
├── popup.html          # 弹出窗口
├── popup.js            # 弹出窗口脚本
${config.background ? '├── background.js       # 后台服务脚本\n' : ''}${config.options ? '├── options.html        # 选项页面\n' : ''}└── icons/              # 图标文件夹
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
\`\`\`

## 功能说明

${config.contentScript ? '- **内容脚本**: 自动注入到匹配的网页中\n' : ''}${config.popup ? '- **弹出窗口**: 点击扩展图标显示的界面\n' : ''}${config.background ? '- **后台脚本**: 持续运行的后台服务\n' : ''}${config.options ? '- **选项页面**: 扩展的设置页面\n' : ''}
## 开发说明

修改代码后，在 chrome://extensions/ 页面点击刷新按钮即可更新扩展。

## 权限说明

本扩展申请的权限：
${Object.entries(config.permissions).filter(([_, v]) => v).map(([k]) => `- ${k}`).join('\n') || '- 无特殊权限'}

## 版本历史

- v${config.version} - 初始版本
`

  // 生成并下载 zip
  const handleDownload = async () => {
    try {
      setGenerating(true)

      const zip = new JSZip()
      const folderName = config.name.toLowerCase().replace(/\s+/g, '-')
      const folder = zip.folder(folderName)

      // 添加核心文件
      folder.file('manifest.json', generateManifest())
      folder.file('README.md', generateREADME())

      // 内容脚本
      if (config.contentScript) {
        folder.file('content.js', generateContentScript())
        folder.file('content.css', generateContentCSS())
      }

      // Popup
      if (config.popup) {
        folder.file('popup.html', generatePopupHTML())
        folder.file('popup.js', generatePopupJS())
      }

      // Background
      if (config.background) {
        folder.file('background.js', generateBackgroundJS())
      }

      // 添加图标占位文件说明
      const iconsFolder = folder.folder('icons')
      iconsFolder.file('README.txt', `请将以下尺寸的 PNG 图标放入此文件夹：
- icon16.png (16x16)
- icon48.png (48x48)  
- icon128.png (128x128)

可以使用在线工具生成：https://favicon.io/favicon-converter/`)

      // 生成 zip 文件
      const content = await zip.generateAsync({ type: 'blob' })
      
      // 创建下载链接
      const url = window.URL.createObjectURL(content)
      const link = document.createElement('a')
      link.href = url
      link.download = `${folderName}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success('扩展代码已生成并开始下载！')
    } catch (error) {
      console.error('生成失败:', error)
      toast.error('生成失败: ' + error.message)
    } finally {
      setGenerating(false)
    }
  }

  // 如果没有 JSZip，提示安装
  const checkJSZip = () => {
    try {
      // 检查是否能使用 JSZip（实际检查在运行时）
      return true
    } catch {
      return false
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Puzzle className="w-8 h-8 text-purple-600" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Chrome 扩展生成器</h2>
        <p className="text-gray-600">根据你的配置自动生成 Chrome 扩展代码并打包下载</p>
      </div>

      {/* 基本信息 */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileCode className="w-5 h-5" />
            基本信息
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">扩展名称 *</Label>
              <Input
                id="name"
                value={config.name}
                onChange={(e) => setConfig({ ...config, name: e.target.value })}
                placeholder="My Extension"
              />
            </div>
            <div>
              <Label htmlFor="version">版本号</Label>
              <Input
                id="version"
                value={config.version}
                onChange={(e) => setConfig({ ...config, version: e.target.value })}
                placeholder="1.0.0"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="description">描述</Label>
              <Input
                id="description"
                value={config.description}
                onChange={(e) => setConfig({ ...config, description: e.target.value })}
                placeholder="A custom Chrome extension"
              />
            </div>
            <div>
              <Label htmlFor="author">作者</Label>
              <Input
                id="author"
                value={config.author}
                onChange={(e) => setConfig({ ...config, author: e.target.value })}
                placeholder="Your Name"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 功能模块 */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">功能模块</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="contentScript"
                checked={config.contentScript}
                onCheckedChange={(checked) => setConfig({ ...config, contentScript: checked })}
              />
              <Label htmlFor="contentScript" className="cursor-pointer">内容脚本</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="popup"
                checked={config.popup}
                onCheckedChange={(checked) => setConfig({ ...config, popup: checked })}
              />
              <Label htmlFor="popup" className="cursor-pointer">弹出窗口</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="background"
                checked={config.background}
                onCheckedChange={(checked) => setConfig({ ...config, background: checked })}
              />
              <Label htmlFor="background" className="cursor-pointer">后台脚本</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="options"
                checked={config.options}
                onCheckedChange={(checked) => setConfig({ ...config, options: checked })}
              />
              <Label htmlFor="options" className="cursor-pointer">选项页面</Label>
            </div>
          </div>

          {config.contentScript && (
            <div className="mt-4">
              <Label htmlFor="matches">匹配网址模式</Label>
              <Input
                id="matches"
                value={config.matches}
                onChange={(e) => setConfig({ ...config, matches: e.target.value })}
                placeholder="https://*/*, http://*/*"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">多个模式用逗号分隔</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 权限配置 */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">所需权限</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries({
              activeTab: '当前标签页',
              storage: '存储',
              tabs: '标签页',
              scripting: '脚本注入'
            }).map(([key, label]) => (
              <div key={key} className="flex items-center space-x-2">
                <Checkbox
                  id={`perm-${key}`}
                  checked={config.permissions[key]}
                  onCheckedChange={(checked) => setConfig({
                    ...config,
                    permissions: { ...config.permissions, [key]: checked }
                  })}
                />
                <Label htmlFor={`perm-${key}`} className="cursor-pointer">{label}</Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 预览 */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">生成的 manifest.json 预览</h3>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto text-sm max-h-[300px]">
            {generateManifest()}
          </pre>
        </CardContent>
      </Card>

      {/* 下载按钮 */}
      <div className="flex justify-center">
        <Button
          onClick={handleDownload}
          disabled={generating || !config.name}
          className="bg-purple-600 hover:bg-purple-700 text-lg px-8 py-6 h-auto"
        >
          {generating ? (
            <>
              <Wand2 className="w-5 h-5 mr-2 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <Download className="w-5 h-5 mr-2" />
              下载扩展代码 (.zip)
            </>
          )}
        </Button>
      </div>

      <p className="text-center text-sm text-gray-500">
        下载后解压，在 chrome://extensions/ 中加载即可使用
      </p>
    </div>
  )
}
