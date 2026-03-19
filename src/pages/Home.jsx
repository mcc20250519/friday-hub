import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Download, Globe, ArrowRight, Gamepad2, Wrench, Zap, Loader2 } from 'lucide-react'
import Comments from '@/components/common/Comments'
import { usePageContent } from '@/hooks/usePageContent'
import { supabase } from '@/lib/supabase'

// Neo-Brutalism 色彩系统（与 Games / Tools 保持一致）
const NB = {
  bg:       '#FFF4E0',
  card:     '#FFFFFF',
  text:     '#1A1A1A',
  sub:      '#5A5350',
  border:   '#1A1A1A',
  shadow:   '4px 4px 0px #1A1A1A',
  shadowSm: '3px 3px 0px #1A1A1A',
  mint:     '#B4F8C8',
  pink:     '#FFAEBC',
  yellow:   '#FFE566',
  blue:     '#A8D8FF',
  tagBd:    'rgba(26,26,26,0.2)',
}

// 分类 tab 定义（与工具页 / 游戏页保持一致）
const HOME_TABS = [
  { id: 'all',    filterKey: null,      color: '#E8E8E8' },
  { id: '效率工具', filterKey: '效率工具', color: '#B4F8C8' },
  { id: '工作流',  filterKey: '工作流',  color: '#FFE566' },
  { id: '小游戏',  filterKey: '小游戏',  color: '#FFAEBC' },
]
// 分类 → 卡片主题色（严格按分类统一，不读数据库 card_bg）
const CATEGORY_BG = { '效率工具': NB.mint, '工作流': NB.yellow, '小游戏': NB.pink, 'game': NB.pink }

// 单张卡片（工具 or 游戏）
// showBadge：全部Tab下显示分类角标做区分；单一分类Tab下隐藏角标
function PreviewCard({ tool, showBadge = true }) {
  const cardRef = useRef(null)
  const isGame = tool.type === 'game' || tool.category === '小游戏'
  // 颜色严格按分类统一，忽略数据库单条 card_bg，确保同类卡片颜色一致
  const cardBg = CATEGORY_BG[tool.category] || (isGame ? NB.pink : NB.mint)
  // 游戏跳转到 /games/<url 或 id>，工具跳转到 /tools/<id>
  const href = isGame ? `/games/${tool.url || tool.id}` : `/tools/${tool.id}`

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

  const handleClick = (e) => {
    e.preventDefault()
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
        {/* 顶部色条（用borderRadius让圆角生效，不用overflow:hidden） */}
        <div style={{ height: '6px', background: cardBg, borderBottom: `2px solid ${NB.border}`, flexShrink: 0, borderRadius: '9px 9px 0 0' }} />

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
          {/* 顶部行：图标 + 角标横排 */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
            {/* 图标 */}
            <div style={{
              width: 48, height: 48, borderRadius: 12, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem',
              background: cardBg,
              border: `2px solid ${NB.border}`,
              boxShadow: '2px 2px 0px #1A1A1A',
            }}>
              {tool.icon || (isGame ? '🎮' : '🛠️')}
            </div>
            {/* 角标：全部Tab下显示，用分类颜色区分；单一分类Tab下隐藏 */}
            {showBadge && (isGame ? (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '2px 8px', fontSize: '0.7rem', fontWeight: 900,
                background: cardBg, border: `2px solid ${NB.border}`, borderRadius: 4, color: NB.text,
              }}>
                <Gamepad2 style={{ width: 12, height: 12 }} /> 游戏
              </div>
            ) : tool.category ? (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '2px 8px', fontSize: '0.7rem', fontWeight: 900,
                background: cardBg, border: `2px solid ${NB.border}`, borderRadius: 4, color: NB.text,
              }}>
                <Wrench style={{ width: 12, height: 12 }} /> {tool.category}
              </div>
            ) : null)}
          </div>

          {/* 标题 */}
          <h3 style={{ fontSize: '0.9rem', fontWeight: 900, color: NB.text, marginBottom: 6, lineHeight: 1.3, letterSpacing: '-0.01em' }}>
            {tool.name}
          </h3>

          {/* 描述 */}
          <p style={{ fontSize: '0.875rem', color: NB.sub, lineHeight: 1.65, marginBottom: 12, flex: 1,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {tool.description}
          </p>

          {/* 标签 */}
          {(tool.tags || []).length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {(tool.tags || []).map((tag) => (
                <span key={tag} style={{
                  padding: '2px 8px', fontSize: '0.75rem', fontWeight: 600,
                  border: `2px solid ${NB.tagBd}`, borderRadius: 4, color: NB.sub,
                }}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* 底部操作行 */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: '0.75rem', fontWeight: 900, color: NB.text,
            borderTop: `1.5px solid ${NB.tagBd}`, paddingTop: 10, marginTop: 'auto',
          }}>
            {isGame
              ? <><Gamepad2 style={{ width: 14, height: 14 }} />去玩一局</>
              : tool.type === 'download'
                ? <><Download style={{ width: 14, height: 14 }} />下载使用</>
                : <><Globe style={{ width: 14, height: 14 }} />在线体验</>}
            <ArrowRight style={{ width: 14, height: 14, marginLeft: 'auto' }}
              className="group-hover:translate-x-1 transition-transform duration-150" />
          </div>
        </div>
      </div>
    </div>
  )
}

// 在组件外部定义，避免每次渲染创建新对象
const HOME_DEFAULTS = {
  home_hero_title: '把好用的',
  home_hero_subtitle: '全放这里',
  home_hero_desc: '效率工具、工作流模板、朋友聚会用的小游戏，都是自己平时真在用的，每一件都跑通了才放上来。',
  home_hero_badge: '一个人做的，持续更新中',
  home_hero_btn_tools: '看看都有什么',
  home_hero_btn_games: '去玩几局',
  home_featured_label: '精选内容',
  home_tab_all:      '全部',
  home_tab_tool:     '效率工具',
  home_tab_workflow: '工作流',
  home_tab_game:     '小游戏',
  home_tools_banner_title: '工具箱',
  home_tools_banner_desc: '效率、自动化、日常小工具，跑通了才放上来',
  home_tools_banner_btn: '进去看看',
  home_games_banner_title: '游戏室',
  home_games_banner_desc: 'UNO 对战、你说我猜，叫上几个人开局就行',
  home_games_banner_btn: '去玩一局',
  home_cta_badge: '完全免费',
  home_cta_register_title: '注册一下，追踪更新',
  home_cta_register_desc: '有新东西上线第一时间通知，不发没用的',
  home_cta_btn_register: '注册账号',
  home_cta_btn_login: '已有账号',
  home_footer_text: '还有些在做的东西，快了',
  home_footer_desc: '有想法也欢迎来聊，说不定下一个就是你想要的',
  home_footer_btn: '联系作者',
}
const HOME_KEYS = Object.keys(HOME_DEFAULTS)

export default function Home() {
  const [activeTab, setActiveTab] = useState('all')
  const [items, setItems] = useState([])
  const [loadingItems, setLoadingItems] = useState(true)
  const { content } = usePageContent('home', HOME_KEYS, HOME_DEFAULTS)

  useEffect(() => {
    supabase
      .from('tools')
      .select('*')
      .eq('status', 'published')
      .neq('is_active', false)               // is_active 为 true 或 NULL 都显示
      .order('sort_order', { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error('[Home] 查询失败:', error)
        setItems(data || [])
        setLoadingItems(false)
      })
      .catch((err) => {
        console.error('[Home] 查询异常:', err)
        setLoadingItems(false)
      })
  }, [])

  // Tab 名称从 content 读取，与工具页 / 游戏页保持一致
  const TAB_LABELS = {
    'all':    content.home_tab_all,
    '效率工具': content.home_tab_tool,
    '工作流':  content.home_tab_workflow,
    '小游戏':  content.home_tab_game,
  }

  // 只显示数据库中实际有内容的 Tab
  const activeCategorySet = new Set(items.map(i => i.category))
  const visibleTabs = HOME_TABS.filter(
    t => t.id === 'all' || activeCategorySet.has(t.filterKey)
  )

  const filtered = activeTab === 'all'
    ? items
    : items.filter((t) => t.category === activeTab)

  return (
    <div className="min-h-screen" style={{ background: NB.bg }}>

      {/* ── Hero ─────────────────────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={{ borderBottom: `3px solid ${NB.border}` }}
      >
        {/* 背景装饰色块 */}
        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
          {/* 左上角大色块 */}
          <div style={{
            position: 'absolute', top: '-40px', left: '-60px',
            width: '320px', height: '320px',
            background: NB.mint, borderRadius: '50%',
            opacity: 0.45, filter: 'blur(0px)',
          }} />
          {/* 右上角粉色 */}
          <div style={{
            position: 'absolute', top: '-20px', right: '-40px',
            width: '220px', height: '220px',
            background: NB.pink, borderRadius: '50%',
            opacity: 0.4,
          }} />
          {/* 右下黄色 */}
          <div style={{
            position: 'absolute', bottom: '-30px', right: '18%',
            width: '160px', height: '160px',
            background: NB.yellow, borderRadius: '50%',
            opacity: 0.5,
          }} />
        </div>

        <div className="relative max-w-5xl mx-auto px-6 py-16 md:py-24">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-10">

            {/* 左：主文案 */}
            <div className="flex-1 max-w-xl">
              {/* 标签牌 */}
              <div
                className="inline-flex items-center gap-2 px-3 py-1 text-xs font-black mb-5"
                style={{
                  background: NB.yellow,
                  border: `2px solid ${NB.border}`,
                  boxShadow: NB.shadowSm,
                  borderRadius: '4px',
                  color: NB.text,
                  letterSpacing: '0.06em',
                }}
              >
                <Zap className="h-3 w-3" />
                {content.home_hero_badge}
              </div>

              <h1
                className="text-4xl sm:text-5xl md:text-[3.5rem] font-black leading-none mb-4"
                style={{
                  color: NB.text,
                  letterSpacing: '-0.04em',
                  lineHeight: 1.05,
                }}
              >
                {content.home_hero_title}<br />
                <span
                  style={{
                    background: NB.pink,
                    border: `3px solid ${NB.border}`,
                    padding: '0 8px 4px',
                    display: 'inline-block',
                    marginTop: '4px',
                    boxShadow: '4px 4px 0px #1A1A1A',
                    borderRadius: '6px',
                  }}
                >
                  {content.home_hero_subtitle}
                </span>
              </h1>

              <p
                className="text-base md:text-lg mb-8 leading-relaxed max-w-sm"
                style={{ color: NB.sub, lineHeight: 1.75 }}
              >
                {content.home_hero_desc}
              </p>

              {/* CTA 按钮组 */}
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/tools"
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-black transition-all duration-150"
                  style={{
                    background: NB.text,
                    color: '#fff',
                    border: `2px solid ${NB.border}`,
                    boxShadow: NB.shadow,
                    borderRadius: '8px',
                  }}
                  onMouseDown={(e) => e.currentTarget.style.cssText += ';transform:translate(4px,4px);box-shadow:0 0 0 #1A1A1A'}
                  onMouseUp={(e) => e.currentTarget.style.cssText += ';transform:translate(0,0);box-shadow:4px 4px 0px #1A1A1A'}
                  onMouseLeave={(e) => e.currentTarget.style.cssText += ';transform:translate(0,0);box-shadow:4px 4px 0px #1A1A1A'}
                >
                  <Wrench className="h-4 w-4" />
                  {content.home_hero_btn_tools}
                </Link>
                <Link
                  to="/games"
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-black transition-all duration-150"
                  style={{
                    background: NB.pink,
                    color: NB.text,
                    border: `2px solid ${NB.border}`,
                    boxShadow: NB.shadow,
                    borderRadius: '8px',
                  }}
                  onMouseDown={(e) => e.currentTarget.style.cssText += ';transform:translate(4px,4px);box-shadow:0 0 0 #1A1A1A'}
                  onMouseUp={(e) => e.currentTarget.style.cssText += ';transform:translate(0,0);box-shadow:4px 4px 0px #1A1A1A'}
                  onMouseLeave={(e) => e.currentTarget.style.cssText += ';transform:translate(0,0);box-shadow:4px 4px 0px #1A1A1A'}
                >
                  <Gamepad2 className="h-4 w-4" />
                  {content.home_hero_btn_games}
                </Link>
              </div>
            </div>

            {/* 右：数据展示 */}
            <div className="flex flex-row lg:flex-col gap-3 flex-wrap">
              {[
                { num: '4+', label: '款工具', bg: NB.mint },
                { num: '2',  label: '款游戏', bg: NB.pink },
                { num: '↑',  label: '持续更新', bg: NB.yellow },
              ].map((item) => (
                <div
                  key={item.label}
                  className="px-5 py-4 text-center"
                  style={{
                    background: item.bg,
                    border: `3px solid ${NB.border}`,
                    boxShadow: NB.shadow,
                    borderRadius: '10px',
                    minWidth: '90px',
                  }}
                >
                  <div className="text-2xl font-black" style={{ color: NB.text }}>{item.num}</div>
                  <div className="text-xs font-semibold mt-0.5" style={{ color: NB.sub }}>{item.label}</div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ── Tab + 工具预览 ─────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-4">
        <div className="flex items-center gap-3 mb-6">
          <div
            className="px-3 py-1 text-sm font-black"
            style={{
              background: NB.mint,
              border: `2px solid ${NB.border}`,
              boxShadow: '2px 2px 0px #1A1A1A',
              borderRadius: '4px',
              color: NB.text,
            }}
          >
            {content.home_featured_label}
          </div>
          <div className="h-px flex-1" style={{ background: NB.border, opacity: 0.15 }} />
          <Link
            to="/tools"
            className="text-xs font-black flex items-center gap-1"
            style={{ color: NB.sub }}
          >
            查看全部 <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* 分类 Tab（仅在有内容时显示） */}
        {visibleTabs.length > 1 && (
          <div className="flex gap-2 mb-6 flex-wrap">
            {visibleTabs.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="px-4 py-1.5 text-sm font-black whitespace-nowrap transition-all duration-150"
                  style={{
                    background: isActive ? tab.color : '#fff',
                    border: `2px solid ${NB.border}`,
                    boxShadow: isActive ? 'inset 1px 1px 0px rgba(0,0,0,0.12)' : '2px 2px 0px #1A1A1A',
                    borderRadius: '6px',
                    color: NB.text,
                  }}
                >
                  {TAB_LABELS[tab.id]}
                </button>
              )
            })}
          </div>
        )}

        {loadingItems ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: NB.sub }} />
          </div>
        ) : filtered.length > 0 ? (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
          >
            {filtered.map((tool) => (
              <PreviewCard key={tool.id} tool={tool} showBadge={activeTab === 'all'} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-sm" style={{ color: NB.sub }}>暂时还没有发布的内容</p>
          </div>
        )}
      </section>

      {/* ── 双入口 Banner ─────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* 工具入口 */}
          <Link
            to="/tools"
            className="group block"
          >
            <div
              className="p-7 transition-all duration-150"
              style={{
                background: NB.mint,
                border: `3px solid ${NB.border}`,
                boxShadow: NB.shadow,
                borderRadius: '12px',
              }}
              onMouseDown={(e) => { e.currentTarget.style.transform = 'translate(4px,4px)'; e.currentTarget.style.boxShadow = '0 0 0 #1A1A1A' }}
              onMouseUp={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = NB.shadow }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = NB.shadow }}
            >
              <div
                className="w-12 h-12 flex items-center justify-center mb-4"
                style={{ background: '#fff', border: `2px solid ${NB.border}`, boxShadow: '2px 2px 0px #1A1A1A', borderRadius: '8px' }}
              >
                <Wrench className="h-6 w-6" style={{ color: NB.text }} />
              </div>
              <h3 className="text-lg font-black mb-1.5" style={{ color: NB.text, letterSpacing: '-0.02em' }}>
                {content.home_tools_banner_title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: NB.sub }}>
                {content.home_tools_banner_desc}
              </p>
              <div className="flex items-center gap-1 mt-4 text-sm font-black" style={{ color: NB.text }}>
                {content.home_tools_banner_btn} <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-150" />
              </div>
            </div>
          </Link>

          {/* 游戏入口 */}
          <Link
            to="/games"
            className="group block"
          >
            <div
              className="p-7 transition-all duration-150"
              style={{
                background: NB.pink,
                border: `3px solid ${NB.border}`,
                boxShadow: NB.shadow,
                borderRadius: '12px',
              }}
              onMouseDown={(e) => { e.currentTarget.style.transform = 'translate(4px,4px)'; e.currentTarget.style.boxShadow = '0 0 0 #1A1A1A' }}
              onMouseUp={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = NB.shadow }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = NB.shadow }}
            >
              <div
                className="w-12 h-12 flex items-center justify-center mb-4"
                style={{ background: '#fff', border: `2px solid ${NB.border}`, boxShadow: '2px 2px 0px #1A1A1A', borderRadius: '8px' }}
              >
                <Gamepad2 className="h-6 w-6" style={{ color: NB.text }} />
              </div>
              <h3 className="text-lg font-black mb-1.5" style={{ color: NB.text, letterSpacing: '-0.02em' }}>
                {content.home_games_banner_title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: NB.sub }}>
                {content.home_games_banner_desc}
              </p>
              <div className="flex items-center gap-1 mt-4 text-sm font-black" style={{ color: NB.text }}>
                {content.home_games_banner_btn} <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-150" />
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* ── 注册 CTA ─────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        <div
          className="px-8 sm:px-12 py-10 relative overflow-hidden"
          style={{
            background: NB.text,
            border: `3px solid ${NB.border}`,
            boxShadow: NB.shadow,
            borderRadius: '16px',
          }}
        >
          {/* 装饰圆点 */}
          <div style={{
            position: 'absolute', top: '-30px', right: '-30px',
            width: '120px', height: '120px',
            background: NB.yellow, borderRadius: '50%', opacity: 0.15,
          }} />
          <div style={{
            position: 'absolute', bottom: '-20px', left: '30px',
            width: '80px', height: '80px',
            background: NB.mint, borderRadius: '50%', opacity: 0.12,
          }} />

          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <div
                className="inline-block px-2 py-0.5 text-xs font-black mb-3"
                style={{
                  background: NB.yellow,
                  border: `1.5px solid rgba(255,255,255,0.3)`,
                  borderRadius: '4px',
                  color: NB.text,
                }}
              >
                {content.home_cta_badge}
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mb-1.5"
                style={{ letterSpacing: '-0.02em' }}>
                {content.home_cta_register_title}
              </h2>
              <p className="text-sm max-w-xs" style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
                {content.home_cta_register_desc}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-black"
                style={{
                  background: NB.yellow,
                  color: NB.text,
                  border: `2px solid rgba(255,255,255,0.3)`,
                  boxShadow: '3px 3px 0px rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                }}
              >
                {content.home_cta_btn_register} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center px-6 py-3 text-sm font-black"
                style={{
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.65)',
                  border: `2px solid rgba(255,255,255,0.2)`,
                  borderRadius: '8px',
                }}
              >
                {content.home_cta_btn_login}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 尾部提示条 ──────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        <div
          className="px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4"
          style={{
            background: NB.yellow,
            border: `3px solid ${NB.border}`,
            boxShadow: NB.shadowSm,
            borderRadius: '12px',
          }}
        >
          <div>
            <p className="font-black text-sm sm:text-base" style={{ color: NB.text }}>
              {content.home_footer_text}
            </p>
            <p className="text-xs sm:text-sm mt-0.5" style={{ color: NB.sub }}>
              {content.home_footer_desc}
            </p>
          </div>
          <Link
            to="/about"
            className="flex-shrink-0 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-black"
            style={{
              background: NB.text,
              color: '#fff',
              border: `2px solid ${NB.border}`,
              boxShadow: NB.shadowSm,
              borderRadius: '8px',
            }}
          >
            {content.home_footer_btn} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ── 评论区 ────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <Comments />
      </section>

    </div>
  )
}
