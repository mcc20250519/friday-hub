import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/store/AuthContext'
import { toast } from '@/hooks/useToast'
import {
  ArrowLeft, Heart, Download, Workflow, Gamepad2, Globe,
  Calendar, Package, HardDrive, Loader2, ExternalLink,
  AlertCircle, FileCode, Users, Clock, Zap, Star,
} from 'lucide-react'
import JSZip from 'jszip'
import Comments from '@/components/common/Comments'
import BackButton from '@/components/common/BackButton'

// ── Neo-Brutalism 色彩系统（与 Tools/Games 完全一致）──────────
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
  purple:   '#D4BBFF',
  tagBd:    'rgba(26,26,26,0.2)',
}

// ── 辅助函数 ────────────────────────────────────────────────────
const getCategoryColor = (category) => {
  const map = { '效率工具': NB.mint, '工作流': NB.yellow, '小游戏': NB.pink }
  return map[category] || '#E8E8E8'
}

const getTypeInfo = (type) => {
  switch (type) {
    case 'download': return { icon: <Download className="h-4 w-4" />, text: '可下载', action: '下载扩展' }
    case 'workflow': return { icon: <Workflow className="h-4 w-4" />, text: '工作流模板', action: '下载工作流' }
    case 'game':     return { icon: <Gamepad2 className="h-4 w-4" />, text: '在线游戏', action: '开始游戏' }
    case 'online':   return { icon: <Globe className="h-4 w-4" />, text: '在线使用', action: '开始使用' }
    default:         return { icon: <Download className="h-4 w-4" />, text: '下载', action: '下载' }
  }
}

const formatDate = (str) => {
  if (!str) return '未知'
  const d = new Date(str)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

// ── 骨架屏 ────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div style={{ minHeight: '100vh', background: NB.bg }}>
      {/* 顶部色条骨架 */}
      <div style={{ height: '6px', background: '#E8E8E8' }} />
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ height: '28px', width: '120px', background: '#E8E8E8', borderRadius: '8px', marginBottom: '32px', animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '32px' }}>
          <div>
            <div style={{ border: `3px solid ${NB.border}`, borderRadius: '12px', background: NB.card, padding: '28px' }}>
              <div style={{ display: 'flex', gap: '20px', marginBottom: '24px' }}>
                <div style={{ width: '72px', height: '72px', background: '#E8E8E8', borderRadius: '12px', flexShrink: 0, animation: 'pulse 1.5s ease-in-out infinite' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ height: '28px', background: '#E8E8E8', borderRadius: '6px', marginBottom: '10px', animation: 'pulse 1.5s ease-in-out infinite' }} />
                  <div style={{ height: '16px', background: '#E8E8E8', borderRadius: '6px', width: '60%', animation: 'pulse 1.5s ease-in-out infinite' }} />
                </div>
              </div>
              {[1,2,3].map(i => (
                <div key={i} style={{ height: '16px', background: '#E8E8E8', borderRadius: '4px', marginBottom: '10px', width: `${100 - i * 15}%`, animation: 'pulse 1.5s ease-in-out infinite' }} />
              ))}
            </div>
          </div>
          <div style={{ border: `3px solid ${NB.border}`, borderRadius: '12px', background: NB.card, height: '240px', animation: 'pulse 1.5s ease-in-out infinite' }} />
        </div>
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>
    </div>
  )
}

// ── 相关工具卡片 ────────────────────────────────────────────────
function RelatedCard({ tool }) {
  const [pressed, setPressed] = useState(false)
  const cardColor = getCategoryColor(tool.category)
  return (
    <Link to={`/tools/${tool.id}`} style={{ display: 'block', textDecoration: 'none' }}>
      <div
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        onMouseLeave={() => setPressed(false)}
        style={{
          border: `3px solid ${NB.border}`, borderRadius: '10px', background: NB.card, overflow: 'hidden',
          boxShadow: pressed ? 'none' : NB.shadow,
          transform: pressed ? 'translate(4px,4px)' : 'none',
          transition: 'transform 0.1s ease, box-shadow 0.1s ease',
        }}>
        <div style={{ height: '5px', background: cardColor, borderBottom: `2px solid ${NB.border}` }} />
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0,
              background: cardColor, border: `2px solid ${NB.border}`, boxShadow: '2px 2px 0px #1A1A1A',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
            }}>
              {tool.icon || '📦'}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: '800', fontSize: '14px', color: NB.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tool.name}</div>
              <div style={{ fontSize: '12px', color: NB.sub, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tool.description}</div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

// ── 主组件 ────────────────────────────────────────────────────
export default function ToolDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [tool, setTool] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isFavorited, setIsFavorited] = useState(false)
  const [favoriteLoading, setFavoriteLoading] = useState(false)
  const [relatedTools, setRelatedTools] = useState([])
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false })

  useEffect(() => {
    fetchToolDetail()
  }, [id])

  const fetchToolDetail = async () => {
    try {
      setLoading(true); setError(''); setTool(null)
      const { data, error: err } = await supabase.from('tools').select('*').eq('id', id).single()
      if (err) {
        setError(err.code === 'PGRST116' ? '工具不存在' : '获取工具详情失败')
      } else {
        setTool(data)
        fetchRelated(data.category, data.id)
        if (user) checkFavorite(data.id)
      }
    } catch (err) {
      setError('获取工具详情失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const fetchRelated = async (category, currentId) => {
    try {
      const { data } = await supabase
        .from('tools').select('id, name, category, description, tags, icon, card_bg')
        .eq('category', category).neq('id', currentId).limit(3)
      setRelatedTools(data || [])
    } catch {}
  }

  const checkFavorite = async (toolId) => {
    if (!user) return
    try {
      const { data } = await supabase.from('favorites')
        .select('*').eq('user_id', user.id).eq('tool_id', toolId).single()
      setIsFavorited(!!data)
    } catch { setIsFavorited(false) }
  }

  const toggleFavorite = async () => {
    if (!user) { navigate(`/login?redirect=/tools/${id}`); return }
    setFavoriteLoading(true)
    try {
      if (isFavorited) {
        await supabase.from('favorites').delete().eq('user_id', user.id).eq('tool_id', id)
        setIsFavorited(false)
        toast({ title: '已取消收藏' })
      } else {
        await supabase.from('favorites').insert({ user_id: user.id, tool_id: id })
        setIsFavorited(true)
        toast.success('已添加到收藏')
      }
    } catch { toast.error('操作失败') } finally { setFavoriteLoading(false) }
  }

  const handleMainAction = () => {
    if (!tool) return
    if (tool.type === 'game') { navigate('/games/party'); return }
    if (tool.type === 'online') { toast.info('该工具为在线工具，可直接使用'); return }
    if (tool.type === 'download' || tool.type === 'workflow') {
      const typeInfo = getTypeInfo(tool.type)
      setConfirmDialog({
        isOpen: true,
        title: `${typeInfo.action}确认`,
        message: tool.download_url
          ? `确定要下载「${tool.name}」吗？`
          : `「${tool.name}」暂无上传文件，将自动生成基础扩展源码模板。`,
        confirmText: tool.download_url ? '确认下载' : '生成并下载',
        onConfirm: () => {
          setConfirmDialog({ isOpen: false })
          if (tool.download_url) {
            window.open(tool.download_url, '_blank')
            if (user) supabase.from('download_records').insert({ user_id: user.id, tool_id: id, tool_name: tool.name }).catch(() => {})
          } else {
            handleDownloadSource()
          }
        },
      })
    }
  }

  const handleDownloadSource = async () => {
    if (!tool) return
    try {
      toast.info('正在打包扩展源码...')
      const zip = new JSZip()
      const folder = zip.folder(tool.id || 'extension')
      folder.file('manifest.json', JSON.stringify({
        manifest_version: 3, name: tool.name, version: '1.0.0',
        description: tool.description, permissions: ['activeTab'],
        action: { default_popup: 'popup.html' }
      }, null, 2))
      folder.file('popup.html', `<!DOCTYPE html>\n<html>\n<head><meta charset="UTF-8"><style>body{width:300px;padding:16px;font-family:system-ui;}</style></head>\n<body><h1>${tool.name}</h1><p>${tool.description}</p></body>\n</html>`)
      folder.file('popup.js', `// ${tool.name}\nconsole.log('${tool.name} loaded');`)
      const content = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(content)
      const a = document.createElement('a'); a.href = url; a.download = `${tool.id}-extension.zip`
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('扩展源码已打包下载！')
    } catch (err) { toast.error('打包失败: ' + err.message) }
  }

  // ── 加载/错误状态 ─────────────────────────────────────────────
  if (loading || (!tool && !error)) return <Skeleton />

  if (error || !tool) {
    return (
      <div style={{ minHeight: '100vh', background: NB.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ textAlign: 'center', border: `3px solid ${NB.border}`, borderRadius: '16px', padding: '48px', background: NB.card, boxShadow: NB.shadow, maxWidth: '480px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>😢</div>
          <h2 style={{ fontSize: '22px', fontWeight: '900', color: NB.text, marginBottom: '8px' }}>{error || '工具不存在'}</h2>
          <p style={{ color: NB.sub, marginBottom: '24px' }}>该工具可能已被删除或链接有误</p>
          <BackButton to="/tools" variant="outline" style={{ background: NB.mint, padding: '10px 24px', boxShadow: NB.shadow }}>
            返回工具库
          </BackButton>
        </div>
      </div>
    )
  }

  const cardColor = getCategoryColor(tool.category)
  const typeInfo = getTypeInfo(tool.type)

  return (
    <div style={{ minHeight: '100vh', background: NB.bg, paddingBottom: '64px' }}>
      {/* ── 顶部色条（与工具卡片一致）──────────────────────────────── */}
      <div style={{ height: '8px', background: cardColor, borderBottom: `3px solid ${NB.border}` }} />

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>
        {/* ── 返回按钮 ──────────────────────────────────────────────── */}
        <BackButton variant="ghost" style={{ marginBottom: '24px' }} />

        {/* ── 主内容区布局 ──────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
          {/* 移动端操作按钮（在最上方） */}
          <div style={{ display: 'block' }} className="lg:hidden">
            <ActionCard
              tool={tool} typeInfo={typeInfo} cardColor={cardColor}
              isFavorited={isFavorited} favoriteLoading={favoriteLoading}
              onAction={handleMainAction} onFavorite={toggleFavorite}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: '24px' }}>
            {/* 桌面端布局：左主右侧栏 */}
            <div style={{ display: 'contents' }}>
              <div style={{ gridColumn: '1 / 2' }}>
                {/* ── Hero 卡片 ──────────────────────────────────────── */}
                <div style={{
                  border: `3px solid ${NB.border}`, borderRadius: '14px', background: NB.card,
                  boxShadow: NB.shadow, overflow: 'hidden', marginBottom: '24px',
                }}>
                  {/* 顶部色条 */}
                  <div style={{ height: '6px', background: cardColor, borderBottom: `2px solid ${NB.border}` }} />
                  <div style={{ padding: '24px 28px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start' }}>
                      {/* 图标 */}
                      <div style={{
                        width: '72px', height: '72px', flexShrink: 0, borderRadius: '14px',
                        background: cardColor, border: `3px solid ${NB.border}`, boxShadow: NB.shadow,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px',
                      }}>
                        {tool.icon || '📦'}
                      </div>
                      {/* 标题信息 */}
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <h1 style={{ fontSize: '26px', fontWeight: '900', color: NB.text, letterSpacing: '-0.03em', margin: '0 0 8px 0' }}>
                          {tool.name}
                        </h1>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                          {/* 分类标签 */}
                          <span style={{
                            background: cardColor, border: `2px solid ${NB.border}`, borderRadius: '5px',
                            padding: '2px 10px', fontSize: '12px', fontWeight: '700', color: NB.text,
                          }}>
                            {tool.category}
                          </span>
                          {/* 类型标签 */}
                          <span style={{
                            border: `2px solid ${NB.tagBd}`, borderRadius: '5px',
                            padding: '2px 10px', fontSize: '12px', fontWeight: '600', color: NB.sub,
                            display: 'flex', alignItems: 'center', gap: '4px',
                          }}>
                            {typeInfo.icon} {typeInfo.text}
                          </span>
                          {/* 版本 */}
                          {tool.version && (
                            <span style={{ border: `2px solid ${NB.tagBd}`, borderRadius: '5px', padding: '2px 10px', fontSize: '12px', color: NB.sub }}>
                              v{tool.version}
                            </span>
                          )}
                        </div>
                        {/* 时间信息 */}
                        <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: NB.sub }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar style={{ width: '13px', height: '13px' }} />
                            更新于 {formatDate(tool.updated_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 标签组 */}
                    {tool.tags && tool.tags.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '16px', paddingTop: '16px', borderTop: `2px solid rgba(26,26,26,0.06)` }}>
                        {tool.tags.map((tag, i) => (
                          <span key={i} style={{
                            border: `2px solid ${NB.tagBd}`, borderRadius: '5px',
                            padding: '3px 10px', fontSize: '12px', fontWeight: '600', color: NB.sub,
                          }}>#{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* ── 工具简介 ──────────────────────────────────────── */}
                <ContentBlock title="工具介绍" accent={cardColor}>
                  <p style={{ color: NB.sub, lineHeight: '1.75', fontSize: '15px', whiteSpace: 'pre-wrap', margin: 0 }}>
                    {tool.description || '暂无详细介绍'}
                  </p>
                </ContentBlock>

                {/* ── 详细内容（Markdown 文本） ─────────────────────── */}
                {tool.content && (
                  <ContentBlock title="详细说明" accent={cardColor}>
                    <div style={{ color: NB.sub, lineHeight: '1.75', fontSize: '14px' }}
                      dangerouslySetInnerHTML={{ __html: renderMarkdownLite(tool.content) }} />
                  </ContentBlock>
                )}

                {/* ── 游戏专属信息 ─────────────────────────────────── */}
                {tool.type === 'game' && (tool.players || tool.duration || tool.difficulty) && (
                  <ContentBlock title="游戏信息" accent={NB.pink}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                      {[
                        { icon: <Users style={{ width: '18px', height: '18px' }} />, label: '人数', value: tool.players },
                        { icon: <Clock style={{ width: '18px', height: '18px' }} />, label: '时长', value: tool.duration },
                        { icon: <Zap style={{ width: '18px', height: '18px' }} />, label: '难度', value: tool.difficulty },
                      ].filter(i => i.value).map(item => (
                        <div key={item.label} style={{
                          border: `2px solid ${NB.border}`, borderRadius: '10px', padding: '14px',
                          background: NB.pink, boxShadow: NB.shadowSm, textAlign: 'center',
                        }}>
                          <div style={{ marginBottom: '6px', color: NB.text }}>{item.icon}</div>
                          <div style={{ fontSize: '12px', color: NB.sub, marginBottom: '2px' }}>{item.label}</div>
                          <div style={{ fontWeight: '800', fontSize: '14px', color: NB.text }}>{item.value}</div>
                        </div>
                      ))}
                    </div>
                  </ContentBlock>
                )}

                {/* ── 使用说明 ──────────────────────────────────────── */}
                <ContentBlock title="使用说明" accent={NB.yellow}>
                  <ol style={{ paddingLeft: '20px', margin: 0 }}>
                    {getUsageSteps(tool).map((step, i) => (
                      <li key={i} style={{ color: NB.sub, fontSize: '14px', lineHeight: '1.75', marginBottom: '6px' }}>{step}</li>
                    ))}
                  </ol>
                </ContentBlock>
              </div>
            </div>
          </div>
        </div>

        {/* ── 相关工具 ──────────────────────────────────────────────── */}
        {relatedTools.length > 0 && (
          <div style={{ marginTop: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ height: '3px', background: NB.border, flex: 1 }} />
              <span style={{ fontWeight: '900', fontSize: '16px', color: NB.text, padding: '0 8px' }}>相关推荐</span>
              <div style={{ height: '3px', background: NB.border, flex: 1 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
              {relatedTools.map(t => <RelatedCard key={t.id} tool={t} />)}
            </div>
          </div>
        )}

        {/* ── 评论区 ────────────────────────────────────────────────── */}
        <div style={{ marginTop: '40px' }}>
          <Comments toolId={id} />
        </div>
      </div>

      {/* ── 桌面端右侧悬浮操作卡片 ────────────────────────────────── */}
      <DesktopSideCard
        tool={tool} typeInfo={typeInfo} cardColor={cardColor}
        isFavorited={isFavorited} favoriteLoading={favoriteLoading}
        onAction={handleMainAction} onFavorite={toggleFavorite}
      />

      {/* ── 确认对话框 ─────────────────────────────────────────────── */}
      {confirmDialog.isOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '24px' }}>
          <div style={{
            background: NB.card, border: `3px solid ${NB.border}`, borderRadius: '14px',
            boxShadow: NB.shadow, maxWidth: '420px', width: '100%', padding: '28px',
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '900', color: NB.text, marginBottom: '12px', margin: '0 0 12px 0' }}>
              {confirmDialog.title}
            </h3>
            <p style={{ color: NB.sub, lineHeight: '1.65', marginBottom: '24px', margin: '0 0 24px 0' }}>
              {confirmDialog.message}
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmDialog({ isOpen: false })}
                style={{ border: `2px solid ${NB.tagBd}`, background: 'transparent', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', color: NB.sub }}>
                取消
              </button>
              <button
                onClick={() => confirmDialog.onConfirm && confirmDialog.onConfirm()}
                style={{ border: `3px solid ${NB.border}`, background: NB.mint, padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px', color: NB.text, boxShadow: NB.shadowSm }}>
                {confirmDialog.confirmText || '确认'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── 右侧悬浮操作卡片（桌面端） ────────────────────────────────
function DesktopSideCard({ tool, typeInfo, cardColor, isFavorited, favoriteLoading, onAction, onFavorite }) {
  const [pressed, setPressed] = useState(false)
  const [favPressed, setFavPressed] = useState(false)

  return (
    <div style={{
      position: 'fixed', right: '24px', top: '50%', transform: 'translateY(-50%)',
      width: '220px', display: 'none', zIndex: 20,
    }} className="xl:block" id="desktop-side-card">
      <style>{`@media (min-width: 1280px) { #desktop-side-card { display: block !important; } }`}</style>
      <div style={{
        border: `3px solid ${NB.border}`, borderRadius: '14px', background: NB.card,
        boxShadow: NB.shadow, overflow: 'hidden',
      }}>
        <div style={{ height: '6px', background: cardColor, borderBottom: `2px solid ${NB.border}` }} />
        <div style={{ padding: '20px' }}>
          {/* 主操作按钮 */}
          <button
            onMouseDown={() => setPressed(true)}
            onMouseUp={() => setPressed(false)}
            onMouseLeave={() => setPressed(false)}
            onClick={onAction}
            style={{
              width: '100%', border: `3px solid ${NB.border}`, borderRadius: '10px',
              background: cardColor, padding: '14px', fontWeight: '900', fontSize: '15px',
              cursor: 'pointer', color: NB.text,
              boxShadow: pressed ? 'none' : NB.shadow,
              transform: pressed ? 'translate(4px,4px)' : 'none',
              transition: 'all 0.08s ease',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              marginBottom: '12px',
            }}>
            {typeInfo.icon}
            {typeInfo.action}
          </button>

          {/* 收藏按钮 */}
          <button
            onMouseDown={() => setFavPressed(true)}
            onMouseUp={() => setFavPressed(false)}
            onMouseLeave={() => setFavPressed(false)}
            onClick={onFavorite}
            disabled={favoriteLoading}
            style={{
              width: '100%', border: `2px solid ${isFavorited ? '#E88FAA' : NB.tagBd}`,
              borderRadius: '10px', background: isFavorited ? '#FFE4EC' : 'transparent',
              padding: '10px', fontWeight: '700', fontSize: '13px',
              cursor: favoriteLoading ? 'not-allowed' : 'pointer',
              color: isFavorited ? '#C05621' : NB.sub,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              transform: favPressed ? 'scale(0.97)' : 'scale(1)',
              transition: 'all 0.08s ease',
            }}>
            {favoriteLoading
              ? <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
              : <Heart style={{ width: '16px', height: '16px', fill: isFavorited ? '#E88FAA' : 'transparent', stroke: isFavorited ? '#E88FAA' : 'currentColor' }} />}
            {isFavorited ? '已收藏' : '收藏'}
          </button>

          {/* 元信息 */}
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: `2px solid rgba(26,26,26,0.06)` }}>
            {[
              { label: '版本', value: tool.version || '1.0.0' },
              { label: '更新', value: formatDate(tool.updated_at) },
              tool.file_size && { label: '大小', value: tool.file_size },
            ].filter(Boolean).map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: NB.sub }}>{item.label}</span>
                <span style={{ fontSize: '12px', fontWeight: '700', color: NB.text }}>{item.value}</span>
              </div>
            ))}
          </div>

          {/* 说明块 */}
          <div style={{
            marginTop: '12px', padding: '12px', background: NB.blue,
            border: `2px solid ${NB.border}`, borderRadius: '8px', fontSize: '12px', color: NB.text, lineHeight: '1.6',
          }}>
            <strong>使用须知</strong>
            <ul style={{ margin: '6px 0 0 0', paddingLeft: '16px' }}>
              <li>所有工具均经过站长亲测</li>
              <li>下载工具请按照说明安装</li>
            </ul>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ── 移动端操作卡片 ────────────────────────────────────────────
function ActionCard({ tool, typeInfo, cardColor, isFavorited, favoriteLoading, onAction, onFavorite }) {
  const [pressed, setPressed] = useState(false)
  return (
    <div style={{
      border: `3px solid ${NB.border}`, borderRadius: '12px', background: NB.card,
      boxShadow: NB.shadow, overflow: 'hidden',
    }}>
      <div style={{ height: '5px', background: cardColor, borderBottom: `2px solid ${NB.border}` }} />
      <div style={{ padding: '16px', display: 'flex', gap: '10px' }}>
        <button
          onMouseDown={() => setPressed(true)}
          onMouseUp={() => setPressed(false)}
          onMouseLeave={() => setPressed(false)}
          onClick={onAction}
          style={{
            flex: 1, border: `3px solid ${NB.border}`, borderRadius: '10px',
            background: cardColor, padding: '12px', fontWeight: '900', fontSize: '14px',
            cursor: 'pointer', color: NB.text,
            boxShadow: pressed ? 'none' : NB.shadow,
            transform: pressed ? 'translate(4px,4px)' : 'none',
            transition: 'all 0.08s ease',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          }}>
          {typeInfo.icon} {typeInfo.action}
        </button>
        <button onClick={onFavorite} disabled={favoriteLoading}
          style={{
            border: `2px solid ${isFavorited ? '#E88FAA' : NB.tagBd}`,
            borderRadius: '10px', background: isFavorited ? '#FFE4EC' : 'transparent',
            padding: '12px 14px', cursor: favoriteLoading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          {favoriteLoading
            ? <Loader2 style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite', color: NB.sub }} />
            : <Heart style={{ width: '18px', height: '18px', fill: isFavorited ? '#E88FAA' : 'transparent', stroke: isFavorited ? '#E88FAA' : NB.sub }} />}
        </button>
      </div>
    </div>
  )
}

// ── 内容块容器 ────────────────────────────────────────────────
function ContentBlock({ title, accent, children }) {
  return (
    <div style={{
      border: `3px solid ${NB.border}`, borderRadius: '12px', background: NB.card,
      boxShadow: NB.shadowSm, overflow: 'hidden', marginBottom: '20px',
    }}>
      <div style={{
        background: accent || NB.yellow, borderBottom: `2px solid ${NB.border}`,
        padding: '12px 20px', fontWeight: '900', fontSize: '14px', color: NB.text,
      }}>
        {title}
      </div>
      <div style={{ padding: '20px' }}>
        {children}
      </div>
    </div>
  )
}

// ── 工具函数 ──────────────────────────────────────────────────
function getUsageSteps(tool) {
  switch (tool.type) {
    case 'download':
      return [
        '点击右侧「下载扩展」按钮',
        '解压下载的 ZIP 文件',
        '打开 Chrome，访问 chrome://extensions/',
        '开启「开发者模式」，点击「加载已解压的扩展程序」',
        '选择解压后的文件夹，安装完成',
      ]
    case 'workflow':
      return [
        '点击「下载工作流」获取 JSON 文件',
        '在 n8n 中选择「导入工作流」',
        '导入 JSON 文件并配置必要的凭证',
        '测试运行工作流',
      ]
    case 'game':
      return [
        '点击「开始游戏」进入游戏大厅',
        '创建或加入房间，邀请好友',
        '确认人数后开始游戏',
      ]
    case 'online':
      return [
        '直接在页面下方使用在线工具',
        '无需安装，开箱即用',
        '如有问题，欢迎在评论区反馈',
      ]
    default:
      return ['点击下载按钮获取工具', '按照说明进行安装和配置']
  }
}

// 极简 Markdown 渲染（只处理标题、加粗、代码块）
function renderMarkdownLite(text) {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h4 style="font-weight:900;font-size:14px;margin:16px 0 6px 0">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 style="font-weight:900;font-size:16px;margin:20px 0 8px 0;border-bottom:2px solid rgba(26,26,26,0.08);padding-bottom:6px">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 style="font-weight:900;font-size:20px;margin:0 0 12px 0">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code style="background:rgba(26,26,26,0.06);padding:1px 6px;border-radius:3px;font-size:13px">$1</code>')
    .replace(/^- (.+)$/gm, '<li style="margin-bottom:4px">$1</li>')
    .replace(/(<li.*<\/li>)/s, '<ul style="padding-left:20px;margin:8px 0">$1</ul>')
    .replace(/\n\n/g, '</p><p style="margin:10px 0">')
    .replace(/\n/g, '<br>')
}
