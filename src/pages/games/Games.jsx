import { useNavigate } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import { Users, Clock, Zap, Loader2 } from 'lucide-react'
import { usePageContent } from '@/hooks/usePageContent'
import { supabase } from '@/lib/supabase'

// Neo-Brutalism 色彩系统
const NB = {
  bg:        '#FFF4E0',  // 复古米黄
  text:      '#1A1A1A',  // 深黑
  sub:       '#5A5350',  // 次要文字
  border:    '#1A1A1A',  // 边框
  shadow:    '4px 4px 0px #1A1A1A',
  shadowSm:  '3px 3px 0px #1A1A1A',
  mint:      '#B4F8C8',  // 薄荷绿（工具）
  pink:      '#FFAEBC',  // 泡泡糖粉（游戏）
  yellow:    '#FFE566',  // 亮黄
  blue:      '#A8D8FF',  // 天蓝
  tagBorder: 'rgba(26,26,26,0.25)',
}

// 游戏页所有游戏数据从数据库 tools 表（category=小游戏）加载
// url 字段存储路由 id（如 uno、party），status='published' 表示可玩

// 粒子爆裂效果
function spawnParticles(x, y) {
  const colors = [NB.pink, NB.mint, NB.yellow, NB.blue, '#FF6B9D', '#4EE76E']
  const count = 18

  for (let i = 0; i < count; i++) {
    const el = document.createElement('div')
    const size = 6 + Math.random() * 8
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5
    const distance = 50 + Math.random() * 70
    const dx = Math.cos(angle) * distance
    const dy = Math.sin(angle) * distance

    el.style.cssText = `
      position: fixed;
      left: ${x - size / 2}px;
      top: ${y - size / 2}px;
      width: ${size}px;
      height: ${size}px;
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      border: 2px solid ${NB.border};
      pointer-events: none;
      z-index: 9999;
      transition: transform 0.6s cubic-bezier(.25,.46,.45,.94), opacity 0.6s ease;
      transform: translate(0,0) scale(1);
      opacity: 1;
    `
    document.body.appendChild(el)

    // 触发动画
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transform = `translate(${dx}px, ${dy}px) scale(0) rotate(${Math.random() * 360}deg)`
        el.style.opacity = '0'
      })
    })

    setTimeout(() => el.remove(), 700)
  }
}

function GameCard({ game }) {
  const navigate = useNavigate()
  const cardRef = useRef(null)

  // 兼容数据库字段和原硬编码字段
  const available = game.available ?? (game.status === 'published')
  const cardBg = NB.pink  // 游戏统一用粉色，忽略数据库 card_bg，确保所有游戏卡片颜色一致
  const emoji = game.emoji || game.icon || '🎮'
  const desc = game.desc || game.description || ''
  const accentColor = game.accentColor || '#1A1A1A'
  // 路由 id：优先用 url 字段（如 uno），其次用 id
  const routeId = game.url || game.id

  const handlePointerDown = (e) => {
    if (!available) return
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
    if (!available) return
    spawnParticles(e.clientX, e.clientY)
    setTimeout(() => {
      navigate(`/games/${routeId}`)
    }, 120)
  }

  return (
    <div
      ref={cardRef}
      className="flex flex-col"
      style={{
        border: `3px solid ${NB.border}`,
        boxShadow: NB.shadow,
        borderRadius: '12px',
        background: available ? '#fff' : '#F5F5F5',
        transform: 'translate(0,0)',
        transition: 'transform 0.08s ease, box-shadow 0.08s ease',
        cursor: available ? 'pointer' : 'default',
        minHeight: 260,
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onClick={handleClick}
    >
      {/* 顶部色条 */}
      <div
        style={{
          height: '6px',
          background: cardBg,
          borderBottom: `2px solid ${NB.border}`,
          borderRadius: '9px 9px 0 0',
          flexShrink: 0,
        }}
      />

      {/* 内容区 */}
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* 顶部行：图标 + 角标 */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
          {/* 图标 */}
          <div
            style={{
              width: 48, height: 48, borderRadius: 12, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem',
              background: cardBg,
              border: `2px solid ${NB.border}`,
              boxShadow: '2px 2px 0px #1A1A1A',
              filter: available ? 'none' : 'grayscale(0.6)',
            }}
          >
            {emoji}
          </div>
          {/* 角标 */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '2px 8px', fontSize: '0.7rem', fontWeight: 900,
            background: available ? NB.pink : '#E0E0E0',
            border: `2px solid ${NB.border}`, borderRadius: 4, color: NB.text,
          }}>
            🎮 游戏
          </div>
        </div>

        {/* 标题 */}
        <h3
          style={{ fontSize: '0.9rem', fontWeight: 900, color: NB.text, marginBottom: 6, lineHeight: 1.3, letterSpacing: '-0.01em' }}
        >
          {game.name}
        </h3>

        {/* 描述 */}
        <p
          style={{
            fontSize: '0.875rem', color: NB.sub, lineHeight: 1.65, marginBottom: 12, flex: 1,
            display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}
        >
          {desc}
        </p>

        {/* 元信息（人数/时长/难度） */}
        {(game.players || game.duration || game.difficulty) && (
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.75rem', color: NB.sub, marginBottom: 12, flexWrap: 'wrap' }}
          >
            {game.players && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Users style={{ width: 12, height: 12 }} />
              {game.players}
            </span>}
            {game.duration && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock style={{ width: 12, height: 12 }} />
              {game.duration}
            </span>}
            {game.difficulty && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Zap style={{ width: 12, height: 12 }} />
              {game.difficulty}
            </span>}
          </div>
        )}

        {/* 底部 CTA */}
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: '0.75rem', fontWeight: 900, color: available ? NB.text : NB.sub,
            borderTop: `1.5px solid ${NB.tagBorder}`, paddingTop: 10, marginTop: 'auto',
          }}
        >
          {available
            ? <><span style={{ fontSize: '0.875rem' }}>🎮</span>去玩一局</>
            : <>⏳ 敬请期待</>}
          {available && <span style={{ marginLeft: 'auto', fontSize: '0.875rem' }}>→</span>}
        </div>
      </div>
    </div>
  )
}

// 在组件外部定义，避免每次渲染创建新对象
const GAMES_DEFAULTS = {
  games_page_title: '随便玩玩',
  games_page_desc: '不需要注册会员，不用下载 APP，\n叫上几个人，开局就行。',
}
const GAMES_KEYS = Object.keys(GAMES_DEFAULTS)

export default function Games() {
  const [isEntering, setIsEntering] = useState(true)
  const [games, setGames] = useState([])
  const [loadingGames, setLoadingGames] = useState(true)
  const { content } = usePageContent('games', GAMES_KEYS, GAMES_DEFAULTS)

  useEffect(() => {
    const timer = requestAnimationFrame(() => setIsEntering(false))
    return () => cancelAnimationFrame(timer)
  }, [])

  useEffect(() => {
    // 用 type='game' 查询，兼容 category 字段值不一致的情况
    // 同时也覆盖 category='小游戏' 的记录（通过 or 条件）
    supabase
      .from('tools')
      .select('id, name, description, category, tags, type, icon, card_bg, url, players, duration, difficulty, badge, status, sort_order, is_active')
      .or('type.eq.game,category.eq.小游戏')
      .neq('is_active', false)               // 后台禁用（is_active=false）的不显示
      .order('sort_order', { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error('[Games] 查询失败:', error)
        setGames(data || [])
        setLoadingGames(false)
      })
      .catch((err) => {
        console.error('[Games] 查询异常:', err)
        setLoadingGames(false)
      })
  }, [])

  const availableGames = games.filter((g) => g.status === 'published')
  const upcomingGames = games.filter((g) => g.status !== 'published')

  return (
    <div
      className="min-h-screen transition-opacity duration-500 ease-out"
      style={{ background: NB.bg, opacity: isEntering ? 0 : 1 }}
    >
      {/* Banner */}
      <div
        style={{
          background: NB.pink,
          borderBottom: `3px solid ${NB.border}`,
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div>
              <div
                className="inline-block px-3 py-1 text-xs font-black mb-4"
                style={{
                  background: NB.yellow,
                  border: `2px solid ${NB.border}`,
                  boxShadow: NB.shadowSm,
                  borderRadius: '4px',
                  color: NB.text,
                  letterSpacing: '0.08em',
                }}
              >
                GAME ROOM
              </div>
              <h1
                className="text-4xl sm:text-5xl font-black leading-none mb-3"
                style={{
                  color: NB.text,
                  letterSpacing: '-0.03em',
                  textShadow: '3px 3px 0px rgba(0,0,0,0.15)',
                }}
              >
                {content.games_page_title}
              </h1>
              <p
                className="text-base max-w-xs"
                style={{ color: NB.sub, lineHeight: '1.7', whiteSpace: 'pre-wrap' }}
              >
                {content.games_page_desc}
              </p>
            </div>

            {/* 数据角标 */}
            <div className="flex gap-3 self-start sm:self-end">
              {[
                { num: `${availableGames.length}`, label: '款可玩' },
                { num: '10+', label: '人同局' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="px-4 py-3 text-center"
                  style={{
                    background: '#fff',
                    border: `3px solid ${NB.border}`,
                    boxShadow: NB.shadow,
                    borderRadius: '8px',
                    minWidth: '72px',
                  }}
                >
                  <div className="text-2xl font-black" style={{ color: NB.text }}>
                    {item.num}
                  </div>
                  <div className="text-xs font-semibold" style={{ color: NB.sub }}>
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 游戏列表 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* 现在能玩的 */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-5">
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
              ▶ 现在就能玩
            </div>
            <div
              className="h-px flex-1"
              style={{ background: NB.border, opacity: 0.2 }}
            />
          </div>

          {loadingGames ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: NB.sub }} />
            </div>
          ) : availableGames.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {availableGames.map((game) => (
                <div key={game.id} style={{ paddingBottom: 4, paddingRight: 4 }}>
                  <GameCard game={game} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-sm" style={{ color: NB.sub }}>暂时还没有可玩的游戏</p>
            </div>
          )}
        </div>

        {/* 即将上线 */}
        {!loadingGames && upcomingGames.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div
                className="px-3 py-1 text-sm font-black"
                style={{
                  background: '#E0E0E0',
                  border: `2px solid ${NB.border}`,
                  boxShadow: '2px 2px 0px #1A1A1A',
                  borderRadius: '4px',
                  color: NB.sub,
                }}
              >
                ⏳ 在做了在做了
              </div>
              <div
                className="h-px flex-1"
                style={{ background: NB.border, opacity: 0.15 }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {upcomingGames.map((game) => (
                <div key={game.id} style={{ paddingBottom: 4, paddingRight: 4 }}>
                  <GameCard game={game} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 底部 */}
        <div className="mt-12 text-center">
          <div
            className="inline-block px-5 py-3 text-sm font-semibold"
            style={{
              border: `2px dashed ${NB.tagBorder}`,
              borderRadius: '8px',
              color: NB.sub,
            }}
          >
            有想法想加进来？欢迎来告诉我 →
          </div>
        </div>
      </div>
    </div>
  )
}
