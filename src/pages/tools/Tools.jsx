import { useState, useEffect, useRef } from 'react'

import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, ArrowRight, Download, Workflow, Globe, Gamepad2, Loader2 } from 'lucide-react'
import { usePageContent } from '@/hooks/usePageContent'

// Neo-Brutalism 色彩系统
const NB = {
  bg:        '#FFF4E0',  // 复古米黄
  card:      '#FFFFFF',
  text:      '#1A1A1A',  // 深黑
  sub:       '#5A5350',
  border:    '#1A1A1A',
  shadow:    '4px 4px 0px #1A1A1A',
  shadowSm:  '3px 3px 0px #1A1A1A',
  mint:      '#B4F8C8',  // 工具区薄荷绿
  pink:      '#FFAEBC',  // 游戏区泡泡糖粉
  yellow:    '#FFE566',
  tagBorder: 'rgba(26,26,26,0.2)',
}

// 每个分类对应的强调色
const CATEGORY_COLOR = {
  '效率工具': NB.mint,
  '工作流':   NB.yellow,
  'all':     '#E8E8E8',
}

const getTypeIcon = (type) => {
  switch (type) {
    case 'download': return <Download className="h-3.5 w-3.5" />
    case 'workflow': return <Workflow className="h-3.5 w-3.5" />
    case 'game':     return <Gamepad2 className="h-3.5 w-3.5" />
    case 'online':   return <Globe className="h-3.5 w-3.5" />
    default:         return <Download className="h-3.5 w-3.5" />
  }
}

const getTypeText = (type) => {
  switch (type) {
    case 'download': return '可下载'
    case 'workflow': return '工作流模板'
    case 'game':     return '在线游戏'
    case 'online':   return '在线使用'
    default:         return '下载'
  }
}


const getCategoryColor = (category) => {
  return CATEGORY_COLOR[category] || '#E8E8E8'
}

// 骨架屏
function ToolCardSkeleton() {
  return (
    <div
      style={{
        border: `3px solid ${NB.border}`,
        boxShadow: NB.shadow,
        borderRadius: '12px',
        background: NB.card,
        padding: '20px',
      }}
    >
      <div className="flex items-start gap-4">
        <div
          className="w-12 h-12 rounded-lg animate-pulse"
          style={{ background: '#E8E8E8', border: `2px solid ${NB.tagBorder}` }}
        />
        <div className="flex-1 space-y-3">
          <div className="h-5 rounded animate-pulse" style={{ background: '#E8E8E8', width: '60%' }} />
          <div className="h-4 rounded animate-pulse" style={{ background: '#E8E8E8', width: '100%' }} />
          <div className="h-4 rounded animate-pulse" style={{ background: '#E8E8E8', width: '80%' }} />
        </div>
      </div>
    </div>
  )
}

// 工具卡片
function ToolCard({ tool }) {
  const cardRef = useRef(null)
  const cardColor = getCategoryColor(tool.category)
  const isGame = tool.type === 'game' || tool.category === '小游戏'

  const href = `/tools/${tool.id}`

  const handlePointerDown = () => {
    if (cardRef.current) {
      cardRef.current.style.transform = 'translate(4px,4px)'
      cardRef.current.style.boxShadow = '0 0 0 #1A1A1A'
    }
  }

  const handlePointerUp = () => {
    if (cardRef.current) {
      cardRef.current.style.transform = 'translate(0,0)'
      cardRef.current.style.boxShadow = NB.shadow
    }
  }

  const handleClick = () => {
    setTimeout(() => {
      window.location.href = href
    }, 120)
  }

  return (
    <div
      className="group"
      style={{ display: 'block', paddingBottom: 4, paddingRight: 4, cursor: 'pointer' }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onClick={handleClick}
    >
      <div
        ref={cardRef}
        style={{
          border: `3px solid ${NB.border}`,
          boxShadow: NB.shadow,
          borderRadius: '12px',
          background: NB.card,
          transform: 'translate(0,0)',
          transition: 'transform 0.1s ease, box-shadow 0.1s ease',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 260,
        }}
      >
        {/* 顶部彩色色条 */}
        <div
          style={{
            height: '6px',
            background: cardColor,
            borderBottom: `2px solid ${NB.border}`,
            borderRadius: '9px 9px 0 0',
            flexShrink: 0,
          }}
        />

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
          {/* 顶部行：图标 + 角标横排 */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
            {/* 图标 */}
            <div
              style={{
                width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.5rem',
                background: cardColor,
                border: `2px solid ${NB.border}`,
                boxShadow: '2px 2px 0px #1A1A1A',
              }}
            >
              {tool.icon || (isGame ? '🎮' : '🛠️')}
            </div>
            {/* 角标 */}
            {tool.category ? (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '2px 8px', fontSize: '0.7rem', fontWeight: 900,
                background: isGame ? NB.pink : NB.mint,
                border: `2px solid ${NB.border}`, borderRadius: 4, color: NB.text,
              }}>
                {isGame ? <>{getTypeIcon('game')} 游戏</> : <>{getTypeIcon('download')} {tool.category}</>}
              </div>
            ) : null}
          </div>

          {/* 标题 */}
          <h3
            style={{ fontSize: '0.9rem', fontWeight: 900, color: NB.text, marginBottom: 6, lineHeight: 1.3, letterSpacing: '-0.01em' }}
          >
            {tool.name}
          </h3>

          {/* 描述 */}
          <p
            style={{
              fontSize: '0.875rem', color: NB.sub, lineHeight: 1.65, marginBottom: 12, flex: 1,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}
          >
            {tool.description}
          </p>

          {/* 标签 */}
          {tool.tags && tool.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {tool.tags.slice(0, 3).map((tag, idx) => (
                <span
                  key={idx}
                  style={{
                    padding: '2px 8px', fontSize: '0.75rem', fontWeight: 600,
                    border: `2px solid ${NB.tagBorder}`,
                    borderRadius: 4, color: NB.sub, background: 'transparent',
                  }}
                >
                  {tag}
                </span>
              ))}
              {tool.tags.length > 3 && (
                <span
                  style={{
                    padding: '2px 8px', fontSize: '0.75rem', fontWeight: 600,
                    border: `2px solid ${NB.tagBorder}`,
                    borderRadius: 4, color: NB.sub,
                  }}
                >
                  +{tool.tags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* 底部 CTA */}
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: '0.75rem', fontWeight: 900, color: NB.text,
              borderTop: `1.5px solid ${NB.tagBorder}`, paddingTop: 10, marginTop: 'auto',
            }}
          >
            {isGame
              ? <><Gamepad2 style={{ width: 14, height: 14 }} />去玩一局</>
              : tool.type === 'download'
                ? <><Download style={{ width: 14, height: 14 }} />下载使用</>
                : <><Globe style={{ width: 14, height: 14 }} />在线体验</>}
            <ArrowRight
              style={{ width: 14, height: 14, marginLeft: 'auto' }}
              className="group-hover:translate-x-1 transition-transform duration-150"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// 在组件外部定义，避免每次渲染创建新对象
const TOOLS_DEFAULTS = {
  tools_page_title: '自用工具箱',
  tools_page_desc: '平时真在用的那些，每一件都跑通了才放上来，\n不堆数量，只挑好用的。',
  tools_tab_all:     '全部',
  tools_tab_tool:    '效率工具',
  tools_tab_workflow: '工作流',
}
const TOOLS_KEYS = Object.keys(TOOLS_DEFAULTS)

export default function Tools() {
  const [tools, setTools] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const { content } = usePageContent('tools', TOOLS_KEYS, TOOLS_DEFAULTS)

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
        .eq('status', 'published')
        .not('type', 'eq', 'game')           // 工具页不显示游戏
        .neq('is_active', false)             // is_active 为 true 或 NULL 都显示
        .order('sort_order', { ascending: true })
      if (supabaseError) throw supabaseError
      setTools(data || [])
    } catch (err) {
      console.error('获取工具列表失败:', err)
      setError('加载失败，稍后再试')
    } finally {
      setLoading(false)
    }
  }

  const filteredTools = tools.filter((tool) => {
    if (activeCategory !== 'all' && tool.category !== activeCategory) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      if (
        !tool.name?.toLowerCase().includes(q) &&
        !tool.description?.toLowerCase().includes(q) &&
        !tool.tags?.some(t => t.toLowerCase().includes(q))
      ) return false
    }
    return true
  })

  return (
    <div className="min-h-screen" style={{ background: NB.bg }}>

      {/* Banner */}
      <section
        style={{
          background: NB.mint,
          borderBottom: `3px solid ${NB.border}`,
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <div
                className="inline-block px-3 py-1 text-xs font-black mb-4"
                style={{
                  background: NB.yellow,
                  border: `2px solid ${NB.border}`,
                  boxShadow: '2px 2px 0px #1A1A1A',
                  borderRadius: '4px',
                  color: NB.text,
                  letterSpacing: '0.08em',
                }}
              >
                TOOLBOX
              </div>
              <h1
                className="text-4xl sm:text-5xl font-black leading-none mb-3"
                style={{
                  color: NB.text,
                  letterSpacing: '-0.03em',
                  textShadow: '3px 3px 0px rgba(0,0,0,0.12)',
                }}
              >
                {content.tools_page_title}
              </h1>
              <p
                className="text-base max-w-sm"
                style={{ color: NB.sub, lineHeight: '1.7', whiteSpace: 'pre-wrap' }}
              >
                {content.tools_page_desc}
              </p>
            </div>

            {/* 统计角标 */}
            {!loading && (
              <div
                className="px-5 py-3 text-center self-start sm:self-end"
                style={{
                  background: '#fff',
                  border: `3px solid ${NB.border}`,
                  boxShadow: NB.shadow,
                  borderRadius: '8px',
                }}
              >
                <div className="text-2xl font-black" style={{ color: NB.text }}>
                  {tools.length}
                </div>
                <div className="text-xs font-semibold" style={{ color: NB.sub }}>
                  件工具
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 筛选栏 */}
      <section
        className="sticky top-16 z-30"
        style={{
          background: NB.bg,
          borderBottom: `3px solid ${NB.border}`,
        }}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 -mx-3 px-3 sm:mx-0 sm:px-0">
              {[
                  { id: 'all',    name: content.tools_tab_all,     emoji: '📦' },
                  { id: '效率工具', name: content.tools_tab_tool,    emoji: '⚡' },
                  { id: '工作流',  name: content.tools_tab_workflow, emoji: '🔄' },
                ].map((cat) => {
                const isActive = activeCategory === cat.id
                const catColor = CATEGORY_COLOR[cat.id] || '#E8E8E8'
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className="flex-shrink-0 px-3 sm:px-4 py-2 text-sm font-black whitespace-nowrap transition-all duration-150 min-h-[38px]"
                    style={{
                      background: isActive ? catColor : '#fff',
                      border: `2px solid ${NB.border}`,
                      boxShadow: isActive
                        ? 'inset 1px 1px 0px rgba(0,0,0,0.12)'
                        : '2px 2px 0px #1A1A1A',
                      borderRadius: '6px',
                      color: NB.text,
                      transform: 'translate(0,0)',
                    }}
                  >
                    <span className="mr-1">{cat.emoji}</span>
                    <span className="hidden sm:inline">{cat.name}</span>
                    <span className="sm:hidden">{cat.name.slice(0, 2)}</span>
                  </button>
                )
              })}
            </div>
            <div className="relative w-full sm:flex-1 sm:max-w-md sm:ml-auto">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
                style={{ color: NB.sub }}
              />
              <Input
                type="text"
                placeholder="搜索工具…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full"
                style={{
                  border: `2px solid ${NB.border}`,
                  boxShadow: '2px 2px 0px #1A1A1A',
                  borderRadius: '6px',
                  background: '#fff',
                  color: NB.text,
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 列表区域 */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div
            className="mb-6 p-4 text-center"
            style={{
              border: `2px solid #E05050`,
              borderRadius: '8px',
              background: '#FFF0F0',
            }}
          >
            <p className="text-sm mb-2" style={{ color: '#B03030' }}>{error}</p>
            <Button
              onClick={fetchTools}
              className="text-sm font-bold"
              style={{
                border: `2px solid ${NB.border}`,
                boxShadow: NB.shadowSm,
                background: '#fff',
                color: NB.text,
                borderRadius: '6px',
              }}
            >
              重新加载
            </Button>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => <ToolCardSkeleton key={i} />)}
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm font-semibold" style={{ color: NB.sub }}>
                共{' '}
                <span className="font-black" style={{ color: NB.text }}>
                  {filteredTools.length}
                </span>{' '}
                件
              </p>
            </div>

            {filteredTools.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredTools.map((tool) => (
                  <ToolCard key={tool.id} tool={tool} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{
                    background: '#E8E8E8',
                    border: `3px solid ${NB.border}`,
                    boxShadow: NB.shadow,
                  }}
                >
                  <Search className="h-9 w-9" style={{ color: NB.sub }} />
                </div>
                <h3
                  className="text-base font-black mb-1.5"
                  style={{ color: NB.text }}
                >
                  没找到
                </h3>
                <p className="text-sm mb-5" style={{ color: NB.sub }}>
                  换个关键词，或者清掉筛选条件
                </p>
                <button
                  onClick={() => { setActiveCategory('all'); setSearchQuery('') }}
                  className="text-sm font-black px-5 py-2.5"
                  style={{
                    border: `2px solid ${NB.border}`,
                    boxShadow: NB.shadowSm,
                    borderRadius: '6px',
                    background: NB.yellow,
                    color: NB.text,
                  }}
                >
                  清除筛选
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
