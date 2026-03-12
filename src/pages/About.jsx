import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/useToast'
import { 
  User, 
  Heart, 
  MapPin, 
  Mail, 
  MessageCircle,
  CheckCircle2,
  Clock,
  CircleDashed,
  Sparkles,
  Copy,
  Check
} from 'lucide-react'

// 路线图数据
const roadmap = [
  {
    status: 'completed',
    title: 'AI对话导航插件',
    description: '快速切换多个AI对话平台',
  },
  {
    status: 'completed',
    title: '智能出行工作流',
    description: 'AI辅助规划出行路线',
  },
  {
    status: 'completed',
    title: '健康管理工具',
    description: '个人健康数据追踪',
  },
  {
    status: 'completed',
    title: 'AI聚会游戏',
    description: '你说我猜等多人游戏',
  },
  {
    status: 'in-progress',
    title: '更多游戏模式',
    description: 'AI剧本杀、知识竞答等',
  },
  {
    status: 'planned',
    title: '待定',
    description: '持续收集用户需求中',
  },
]

// 状态图标
function StatusIcon({ status }) {
  switch (status) {
    case 'completed':
      return (
        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
        </div>
      )
    case 'in-progress':
      return (
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
          <Clock className="h-5 w-5 text-blue-600" />
        </div>
      )
    case 'planned':
      return (
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
          <CircleDashed className="h-5 w-5 text-gray-400" />
        </div>
      )
    default:
      return null
  }
}

// 状态标签
function StatusLabel({ status }) {
  const labels = {
    'completed': { text: '已上线', className: 'bg-green-100 text-green-700' },
    'in-progress': { text: '开发中', className: 'bg-blue-100 text-blue-700' },
    'planned': { text: '计划中', className: 'bg-gray-100 text-gray-500' },
  }
  const { text, className } = labels[status]
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${className}`}>
      {text}
    </span>
  )
}

// 可复制文本组件
function CopyableText({ label, value }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success('已复制到剪贴板')
    } catch (err) {
      toast.error('复制失败，请手动复制')
    }
  }

  return (
    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
      <span className="text-gray-500 text-sm min-w-[60px]">{label}</span>
      <span className="font-medium flex-1">{value}</span>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={handleCopy}
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4 text-gray-400" />
        )}
      </Button>
    </div>
  )
}

export default function About() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* 页面标题 */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">关于我们</h1>
          <p className="text-gray-500">了解 Friday Hub 的故事</p>
        </div>

        {/* 站长介绍区 */}
        <Card>
          <CardContent className="p-8">
            <div className="flex flex-col items-center text-center">
              {/* 头像 */}
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 flex items-center justify-center text-5xl shadow-lg mb-6">
                🚀
              </div>
              
              {/* 名字 */}
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Friday</h2>
              <p className="text-gray-500 text-sm mb-4">站长 / 开发者</p>
              
              {/* 介绍 */}
              <p className="text-gray-600 max-w-md leading-relaxed">
                热爱效率工具的普通人，喜欢用AI解决生活中的小问题，把自己做的工具分享给朋友们。
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 网站故事区 */}
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <Heart className="h-5 w-5 text-orange-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">为什么做这个网站</h2>
            </div>
            <p className="text-gray-600 leading-relaxed pl-13">
              身边的朋友经常问我有没有好用的AI工具，每次都要重新发链接很麻烦，干脆做一个网站把所有工具都放在一起。
            </p>
          </CardContent>
        </Card>

        {/* 工具路线图 */}
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-purple-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">工具路线图</h2>
            </div>
            
            <div className="space-y-4">
              {roadmap.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <StatusIcon status={item.status} />
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-gray-900">{item.title}</h3>
                      <StatusLabel status={item.status} />
                    </div>
                    <p className="text-sm text-gray-500">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 联系方式 */}
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-blue-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">联系我们</h2>
            </div>
            
            <div className="space-y-3">
              <CopyableText label="微信" value="fridayhub" />
              <CopyableText label="邮箱" value="hello@fridayhub.com" />
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg text-center">
              <Sparkles className="h-5 w-5 text-blue-500 mx-auto mb-2" />
              <p className="text-sm text-blue-700">
                欢迎反馈建议，我们会持续改进！
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 底部版权 */}
        <div className="text-center text-sm text-gray-400 pt-4">
          <p>© 2024 Friday Hub. All rights reserved.</p>
          <p className="mt-1">用 ❤️ 和 AI 打造</p>
        </div>
      </div>
    </div>
  )
}
