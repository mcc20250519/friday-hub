import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/useToast'
import { usePageContent } from '@/hooks/usePageContent'
import { 
  Heart, 
  MapPin, 
  MessageCircle,
  CheckCircle2,
  Clock,
  CircleDashed,
  Copy,
  Check
} from 'lucide-react'

// 温暖色调
const WARM = {
  bg:      '#F7F6F3',
  card:    '#FFFFFF',
  text:    '#3D3530',
  sub:     '#8A7E77',
  accent:  '#C8602A',
  border:  '#E9E3DB',
  tagBg:   '#F2EDE8',
  tagText: '#7A6358',
  lightBg: '#FFFBF5',
}

// 状态图标
function StatusIcon({ status }) {
  const styles = {
    'completed':   { bg: '#EEF6ED', iconColor: '#3A7D44', Icon: CheckCircle2 },
    'in-progress': { bg: '#FEF3E2', iconColor: '#C8602A', Icon: Clock },
    'planned':     { bg: WARM.tagBg, iconColor: WARM.sub, Icon: CircleDashed },
  }
  const s = styles[status]
  if (!s) return null
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
      style={{ background: s.bg }}>
      <s.Icon className="h-4.5 w-4.5" style={{ color: s.iconColor, width: 18, height: 18 }} />
    </div>
  )
}

// 状态标签
function StatusLabel({ status }) {
  const labels = {
    'completed':   { text: '已上线', bg: '#EEF6ED', color: '#3A7D44' },
    'in-progress': { text: '开发中', bg: '#FEF3E2', color: '#C8602A' },
    'planned':     { text: '计划中', bg: WARM.tagBg, color: WARM.sub },
  }
  const l = labels[status]
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: l.bg, color: l.color }}>
      {l.text}
    </span>
  )
}

// 可复制文本
function CopyableText({ label, value }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success('复制成功')
    } catch {
      toast.error('复制失败，请手动复制')
    }
  }

  return (
    <div className="flex items-center gap-3 p-3.5 rounded-xl"
      style={{ background: WARM.tagBg }}>
      <span className="text-xs min-w-[48px]" style={{ color: WARM.sub }}>{label}</span>
      <span className="text-sm font-medium flex-1" style={{ color: WARM.text }}>{value}</span>
      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleCopy}>
        {copied
          ? <Check className="h-4 w-4" style={{ color: '#3A7D44' }} />
          : <Copy className="h-4 w-4" style={{ color: WARM.sub }} />}
      </Button>
    </div>
  )
}

// 默认文案
const ABOUT_DEFAULTS = {
  // 页面标题
  about_page_title:       '关于这个网站',
  about_page_subtitle:    'Friday Hub 是怎么来的',
  // 作者卡片
  about_author_emoji:     '🚀',
  about_author_name:      'Friday',
  about_author_role:      '作者 · 开发者',
  about_author_desc:      '平时喜欢折腾效率工具的普通人，有什么顺手的东西就随手做出来，够用了就分享给朋友，慢慢就攒出了这个网站。',
  // 为什么做
  about_why_title:        '为什么做这个',
  about_why_desc:         '朋友总是问我推荐什么工具，每次都要重新找找发链接，后来想着干脆整理到一个地方，方便大家直接来取。慢慢加了游戏，慢慢加了评论，就成现在这样了。',
  // 路线图标题
  about_roadmap_title:    '做过什么 / 在做什么',
  // 路线图条目（每条：title + desc + status）
  about_rm1_title:        'AI对话导航插件',
  about_rm1_desc:         '在 ChatGPT 等对话页面快速定位历史消息，一键跳转',
  about_rm1_status:       'completed',
  about_rm2_title:        '智能出行工作流',
  about_rm2_desc:         '描述你的偏好，自动生成出行计划，通过 n8n 接入高德、天气等服务',
  about_rm2_status:       'completed',
  about_rm3_title:        '健康管理工具',
  about_rm3_desc:         '久坐提醒 + 专注记录，轻量好用，不打扰正常节奏',
  about_rm3_status:       'completed',
  about_rm4_title:        '欢乐聚会游戏',
  about_rm4_desc:         '你说我猜 × 自动出题，人多聚会拉满气氛',
  about_rm4_status:       'completed',
  about_rm5_title:        '更多游戏',
  about_rm5_desc:         '剧本杀、知识竞答在做了，比想象中复杂，慢慢来',
  about_rm5_status:       'in-progress',
  about_rm6_title:        '还没想好',
  about_rm6_desc:         '有好主意的话欢迎来说，说不定下一个就做你想要的',
  about_rm6_status:       'planned',
  // 联系方式
  about_contact_title:    '来聊聊',
  about_contact_wechat:   'fridayhub',
  about_contact_email:    'hello@fridayhub.com',
  about_contact_hint:     '有工具想要、有 bug 要反馈、或者只是聊聊天，都行 😊',
  // 底部
  about_footer:           '© 2024 Friday Hub · 用 ❤️ 和 ☕ 打造',
}
const ABOUT_KEYS = Object.keys(ABOUT_DEFAULTS)

export default function About() {
  const { content } = usePageContent('about', ABOUT_KEYS, ABOUT_DEFAULTS)

  // 从 content 组装路线图
  const roadmap = [1, 2, 3, 4, 5, 6].map(i => ({
    title:       content[`about_rm${i}_title`],
    description: content[`about_rm${i}_desc`],
    status:      content[`about_rm${i}_status`],
  }))

  return (
    <div className="min-h-screen py-12 px-4" style={{ background: WARM.bg }}>
      <div className="max-w-2xl mx-auto space-y-6">

        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-1.5" style={{ color: WARM.text }}>
            {content.about_page_title}
          </h1>
          <p className="text-sm" style={{ color: WARM.sub }}>
            {content.about_page_subtitle}
          </p>
        </div>

        {/* 作者介绍 */}
        <Card style={{ borderColor: WARM.border }}>
          <CardContent className="p-7">
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full flex items-center justify-center text-4xl shadow-sm mb-5"
                style={{ background: WARM.tagBg }}>
                {content.about_author_emoji}
              </div>
              <h2 className="text-xl font-bold mb-1" style={{ color: WARM.text }}>
                {content.about_author_name}
              </h2>
              <p className="text-sm mb-4" style={{ color: WARM.sub }}>
                {content.about_author_role}
              </p>
              <p className="text-sm leading-relaxed max-w-sm" style={{ color: WARM.sub }}>
                {content.about_author_desc}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 为什么做 */}
        <Card style={{ borderColor: WARM.border }}>
          <CardContent className="p-7">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: '#FEF3E2' }}>
                <Heart className="h-4.5 w-4.5" style={{ color: WARM.accent, width: 18, height: 18 }} />
              </div>
              <h2 className="text-base font-bold" style={{ color: WARM.text }}>
                {content.about_why_title}
              </h2>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: WARM.sub }}>
              {content.about_why_desc}
            </p>
          </CardContent>
        </Card>

        {/* 路线图 */}
        <Card style={{ borderColor: WARM.border }}>
          <CardContent className="p-7">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: WARM.tagBg }}>
                <MapPin className="h-4.5 w-4.5" style={{ color: WARM.accent, width: 18, height: 18 }} />
              </div>
              <h2 className="text-base font-bold" style={{ color: WARM.text }}>
                {content.about_roadmap_title}
              </h2>
            </div>

            <div className="space-y-2">
              {roadmap.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3.5 p-3.5 rounded-xl transition-colors"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <StatusIcon status={item.status} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-0.5 flex-wrap">
                      <h3 className="text-sm font-semibold" style={{ color: WARM.text }}>{item.title}</h3>
                      <StatusLabel status={item.status} />
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: WARM.sub }}>{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 联系方式 */}
        <Card style={{ borderColor: WARM.border }}>
          <CardContent className="p-7">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: '#EEF3FE' }}>
                <MessageCircle className="h-4.5 w-4.5" style={{ color: '#4A72C8', width: 18, height: 18 }} />
              </div>
              <h2 className="text-base font-bold" style={{ color: WARM.text }}>
                {content.about_contact_title}
              </h2>
            </div>

            <div className="space-y-2.5 mb-5">
              <CopyableText label="微信" value={content.about_contact_wechat} />
              <CopyableText label="邮件" value={content.about_contact_email} />
            </div>

            <div className="p-4 rounded-xl text-center text-sm"
              style={{ background: WARM.tagBg }}>
              <p style={{ color: WARM.sub }}>
                {content.about_contact_hint}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 底部 */}
        <div className="text-center text-xs pt-2" style={{ color: WARM.sub }}>
          <p>{content.about_footer}</p>
        </div>
      </div>
    </div>
  )
}
