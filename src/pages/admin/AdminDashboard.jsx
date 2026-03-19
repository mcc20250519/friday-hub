import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAdminCheck } from '@/hooks/useAdminCheck'
import {
  Plus, Edit2, Trash2, Loader2, Save, X, Upload, FileArchive,
  LayoutDashboard, Wrench, Gamepad2, FileText, Eye, EyeOff,
  ToggleLeft, ToggleRight, ChevronUp, ChevronDown, Search,
  RefreshCw, Globe, Download, ArrowLeft
} from 'lucide-react'
import { toast } from '@/hooks/useToast'
import JSZip from 'jszip'
import BackButton from '@/components/common/BackButton'
import { savePageContent, savePageContentBatch, getAllPageContent, clearAllPageContent } from '@/hooks/usePageContent'

// ── Neo-Brutalism 色彩系统 ────────────────────────────────────
const NB = {
  bg:       '#FFF4E0',
  card:     '#FFFFFF',
  text:     '#1A1A1A',
  sub:      '#5A5350',
  border:   '#1A1A1A',
  shadow:   '4px 4px 0px #1A1A1A',
  shadowSm: '2px 2px 0px #1A1A1A',
  mint:     '#B4F8C8',
  pink:     '#FFAEBC',
  yellow:   '#FFE566',
  blue:     '#A8D8FF',
  red:      '#FF9AA2',
  tagBd:    'rgba(26,26,26,0.2)',
}

// ── 管理员邮箱（与 useAdminCheck 保持一致）
const ADMIN_EMAILS = ['2995111793@qq.com']

// ── 共用 Tab 导航 ──────────────────────────────────────────────
const TABS = [
  { id: 'tools',    label: '🛠️ 内容管理',  route: '/admin' },
  { id: 'content',  label: '📝 页面文案',  route: '/admin/content' },
]

function AdminNav({ activeTab }) {
  const navigate = useNavigate()
  return (
    <div style={{ borderBottom: `3px solid ${NB.border}`, marginBottom: '32px' }}>
      <div style={{ display: 'flex', gap: 0 }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.route)}
              style={{
                padding: '12px 24px',
                fontWeight: '700',
                fontSize: '14px',
                border: `3px solid ${NB.border}`,
                borderBottom: isActive ? `3px solid ${NB.bg}` : `3px solid ${NB.border}`,
                background: isActive ? NB.yellow : NB.card,
                color: NB.text,
                cursor: 'pointer',
                marginBottom: isActive ? '-3px' : '0',
                boxShadow: isActive ? 'none' : NB.shadowSm,
                transition: 'all 0.1s ease',
                borderRadius: '8px 8px 0 0',
                marginRight: '4px',
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── 状态徽章 ──────────────────────────────────────────────────
function StatusBadge({ status }) {
  const configs = {
    published: { label: '已发布', bg: NB.mint, border: '#2BA84A' },
    draft:     { label: '草稿',   bg: NB.yellow, border: '#B7791F' },
    hidden:    { label: '已隐藏', bg: NB.pink, border: '#C05621' },
  }
  const config = configs[status] || configs.draft
  return (
    <span style={{
      padding: '2px 10px',
      fontSize: '11px',
      fontWeight: '700',
      background: config.bg,
      border: `2px solid ${config.border}`,
      borderRadius: '4px',
      color: NB.text,
    }}>
      {config.label}
    </span>
  )
}

// ────────────────────────────────────────────────────────────────
// 工具 & 游戏管理面板（统一管理 tools 表）
// ────────────────────────────────────────────────────────────────
const PANEL_TABS = [
  { id: 'tool',  label: '🛠️ 工具',  categories: ['效率工具', '工作流'], defaultCategory: '效率工具', defaultType: 'online',   defaultIcon: '🛠️', defaultBg: '#B4F8C8' },
  { id: 'game',  label: '🎮 游戏',  categories: ['小游戏'],             defaultCategory: '小游戏',  defaultType: 'game',     defaultIcon: '🎮', defaultBg: '#FFAEBC' },
]
const CARD_COLORS = [
  { label: '薄荷绿', value: '#B4F8C8' },
  { label: '泡泡糖粉', value: '#FFAEBC' },
  { label: '亮黄', value: '#FFE566' },
  { label: '天蓝', value: '#A8D8FF' },
  { label: '紫罗兰', value: '#D4BBFF' },
  { label: '橙色', value: '#FFD4A3' },
]

function ToolsPanel({ user }) {
  const [panelTab, setPanelTab]     = useState('tool') // 'tool' | 'game'
  const [tools, setTools]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [editingTool, setEditingTool] = useState(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isParsing, setIsParsing]   = useState(false)
  const [search, setSearch]         = useState('')

  const currentTab = PANEL_TABS.find(t => t.id === panelTab)

  const emptyForm = (tab = currentTab) => ({
    name: '', description: '', category: tab.defaultCategory,
    type: tab.defaultType, tags: '', icon: tab.defaultIcon,
    card_bg: tab.defaultBg, status: 'draft',
    content: '', download_url: '', url: '',
    sort_order: 0, is_active: true,
    players: '', duration: '', difficulty: '', badge: '',
  })

  const [formData, setFormData] = useState(() => emptyForm())

  const allCategories = [
    { id: '效率工具', name: '效率工具', emoji: '⚡', color: NB.mint },
    { id: '工作流',  name: '工作流',  emoji: '🔄', color: NB.yellow },
    { id: '小游戏',  name: '小游戏',  emoji: '🎮', color: NB.pink },
  ]
  const currentCategories = allCategories.filter(c => currentTab.categories.includes(c.id))
  const types = [
    { id: 'online', name: '在线工具' },
    { id: 'download', name: '下载' },
    { id: 'game', name: '游戏' },
    { id: 'workflow', name: '工作流' },
  ]
  const currentTypes = panelTab === 'game'
    ? types.filter(t => t.id === 'game')
    : types.filter(t => t.id !== 'game')
  const categories = currentCategories // 向后兼容

  const fetchTools = useCallback(async () => {
    setLoading(true)
    try {
      const categoryFilter = PANEL_TABS.find(t => t.id === panelTab)?.categories || []
      // 管理员需要看所有内容，不过滤 status 和 is_active
      const { data, error } = await supabase
        .from('tools').select('*')
        .in('category', categoryFilter)
        .order('sort_order', { ascending: true })
      if (error) throw error
      setTools(data || [])
    } catch (err) {
      toast.error('获取列表失败')
    } finally {
      setLoading(false)
    }
  }, [panelTab])

  useEffect(() => { fetchTools() }, [fetchTools])

  // 切换 tab 时重置表单
  const handlePanelTabChange = (id) => {
    setPanelTab(id)
    setEditingTool(null)
    setIsCreating(false)
    const tab = PANEL_TABS.find(t => t.id === id)
    setFormData(emptyForm(tab))
  }

  const resetForm = () => {
    const maxOrder = tools.length > 0 ? Math.max(...tools.map(t => t.sort_order ?? 0)) : 0
    setFormData({ ...emptyForm(), sort_order: maxOrder + 1 })
  }

  const handleCreate = () => { resetForm(); setIsCreating(true); setEditingTool(null) }
  const handleEdit   = (tool) => {
    setFormData({ ...emptyForm(), ...tool, tags: tool.tags?.join(', ') || '' })
    setEditingTool(tool); setIsCreating(false)
  }
  const handleCancel = () => { setEditingTool(null); setIsCreating(false); resetForm() }

  const handleSave = async () => {
    if (!formData.name?.trim() || !formData.description?.trim()) {
      toast.error('名称和描述不能为空')
      return
    }
    try {
      setSaving(true)
      const tagsArray = formData.tags
        ? (Array.isArray(formData.tags)
            ? formData.tags
            : formData.tags.split(/[,，]/).map(t => t.trim()).filter(t => t))
        : []
      // 只保留 tools 表中存在的字段，去掉 Supabase 自动管理的字段（created_at 等）
      const ALLOWED_FIELDS = [
        'name', 'description', 'category', 'type', 'tags',
        'icon', 'card_bg', 'url', 'download_url', 'content',
        'status', 'is_active', 'sort_order',
        'players', 'duration', 'difficulty', 'badge',
        'created_by', 'updated_by',
      ]
      const toolData = ALLOWED_FIELDS.reduce((acc, key) => {
        if (key in formData || key === 'tags') {
          acc[key] = key === 'tags' ? tagsArray : formData[key]
        }
        return acc
      }, {})
      if (editingTool) {
        const { error } = await supabase.from('tools').update(toolData).eq('id', editingTool.id)
        if (error) throw error
        toast.success('保存成功')
      } else {
        const { error } = await supabase.from('tools').insert([{ ...toolData, id: crypto.randomUUID() }])
        if (error) throw error
        toast.success('创建成功')
      }
      handleCancel(); fetchTools()
    } catch (err) {
      toast.error('保存失败: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (tool) => {
    if (!confirm(`确定要删除「${tool.name}」吗？此操作不可恢复。`)) return
    try {
      const { error } = await supabase.from('tools').delete().eq('id', tool.id)
      if (error) throw error
      toast.success('工具已删除')
      fetchTools()
    } catch (err) {
      toast.error('删除失败')
    }
  }

  const handleToggleActive = async (tool) => {
    try {
      const { error } = await supabase.from('tools')
        .update({ is_active: !tool.is_active }).eq('id', tool.id)
      if (error) throw error
      setTools(prev => prev.map(t => t.id === tool.id ? { ...t, is_active: !t.is_active } : t))
    } catch (err) {
      toast.error('更新失败')
    }
  }

  // 解析 ZIP 插件包
  const handleParsePlugin = async (event) => {
    const file = event.target.files[0]
    if (!file || !file.name.endsWith('.zip')) {
      toast.error('请上传 ZIP 格式的压缩包')
      return
    }
    try {
      setIsParsing(true)
      toast.info('正在解析压缩包...')
      const zipData = await file.arrayBuffer()
      const zip = await JSZip.loadAsync(zipData)
      let manifestFile = null
      zip.forEach((relativePath, zipEntry) => {
        if (relativePath.endsWith('manifest.json') && !zipEntry.dir) manifestFile = zipEntry
      })
      if (!manifestFile) { toast.error('压缩包中未找到 manifest.json'); return }
      const manifestContent = await manifestFile.async('string')
      let manifest
      try { manifest = JSON.parse(manifestContent) } catch { toast.error('manifest.json 格式错误'); return }
      const tags = []
      if (manifest.permissions?.includes('activeTab')) tags.push('标签页')
      if (manifest.permissions?.includes('storage')) tags.push('存储')
      const maxOrder = tools.length > 0 ? Math.max(...tools.map(t => t.sort_order || 0)) : 0
      let downloadUrl = ''
      try {
        const fileName = `${Date.now()}_${file.name}`
        const { error: uploadError } = await supabase.storage.from('plugin-files').upload(fileName, file, { contentType: 'application/zip', upsert: false })
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('plugin-files').getPublicUrl(fileName)
          downloadUrl = publicUrl
        }
      } catch {}
      setFormData(prev => ({
        ...prev,
        name: manifest.name || file.name.replace('.zip', ''),
        description: manifest.description || '',
        tags: tags.join(', '),
        sort_order: editingTool ? prev.sort_order : maxOrder + 1,
        download_url: downloadUrl || prev.download_url,
      }))
      toast.success('解析成功！已自动填充表单')
      if (!isCreating && !editingTool) setIsCreating(true)
    } catch (err) {
      toast.error('解析失败: ' + err.message)
    } finally {
      setIsParsing(false)
      event.target.value = ''
    }
  }

  const filtered = tools.filter(t =>
    !search || t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.description?.toLowerCase().includes(search.toLowerCase())
  )

  const getCatColor = (cat) => categories.find(c => c.id === cat)?.color || '#E8E8E8'

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}>
      <Loader2 style={{ width: '32px', height: '32px', animation: 'spin 1s linear infinite', color: NB.sub }} />
    </div>
  )

  return (
    <div>
      {/* 工具 / 游戏 Tab 切换 */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: `3px solid ${NB.border}` }}>
        {PANEL_TABS.map(tab => {
          const isActive = panelTab === tab.id
          return (
            <button key={tab.id} onClick={() => handlePanelTabChange(tab.id)}
              style={{
                padding: '10px 24px', fontWeight: '700', fontSize: '14px',
                border: `3px solid ${NB.border}`, borderBottom: isActive ? `3px solid ${NB.bg}` : `3px solid ${NB.border}`,
                background: isActive ? NB.yellow : NB.card, color: NB.text, cursor: 'pointer',
                marginBottom: isActive ? '-3px' : '0', borderRadius: '8px 8px 0 0', marginRight: '4px',
                boxShadow: isActive ? 'none' : NB.shadowSm,
              }}>
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* 编辑/创建表单 */}
      {(isCreating || editingTool) && (
        <div style={{
          border: `3px solid ${NB.border}`, boxShadow: NB.shadow,
          borderRadius: '12px', background: NB.card, marginBottom: '32px', overflow: 'hidden',
        }}>
          {/* 表单头部 */}
          <div style={{
            background: NB.yellow, borderBottom: `3px solid ${NB.border}`,
            padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <h3 style={{ fontWeight: '900', fontSize: '16px', color: NB.text, margin: 0 }}>
              {editingTool ? `✏️ 编辑：${editingTool.name}` : `➕ 添加${panelTab === 'game' ? '游戏' : '工具'}`}
            </h3>
            <button onClick={handleCancel} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: NB.text }}>
              <X style={{ width: '20px', height: '20px' }} />
            </button>
          </div>
          <div style={{ padding: '24px' }}>
            {/* ZIP 导入（仅工具） */}
            {panelTab === 'tool' && (
              <div style={{
                border: `2px dashed ${NB.tagBd}`, borderRadius: '8px',
                padding: '16px', marginBottom: '24px', textAlign: 'center',
              }}>
                <p style={{ fontSize: '13px', color: NB.sub, marginBottom: '8px' }}>
                  📦 上传 Chrome 扩展 ZIP，自动解析填充表单
                </p>
                <label style={{ cursor: 'pointer' }}>
                  <input type="file" accept=".zip" onChange={handleParsePlugin} disabled={isParsing} style={{ display: 'none' }} />
                  <button
                    type="button" disabled={isParsing}
                    onClick={() => document.querySelector('input[type="file"]')?.click()}
                    style={{
                      border: `2px solid ${NB.border}`, background: NB.card, padding: '6px 16px',
                      borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px',
                      boxShadow: NB.shadowSm,
                    }}
                  >
                    {isParsing ? <Loader2 style={{ width: '14px', height: '14px', display: 'inline', marginRight: '4px' }} /> : <Upload style={{ width: '14px', height: '14px', display: 'inline', marginRight: '4px' }} />}
                    {isParsing ? '解析中...' : '选择 ZIP 文件'}
                  </button>
                </label>
              </div>
            )}
            {/* 表单字段 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <FormField label="名称 *">
                <NbInput value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder={panelTab === 'game' ? '游戏名称' : '工具名称'} />
              </FormField>
              <FormField label="图标 Emoji">
                <NbInput value={formData.icon} onChange={e => setFormData(p => ({ ...p, icon: e.target.value }))} placeholder={panelTab === 'game' ? '🎮' : '🛠️'} maxLength={4} />
              </FormField>
              <FormField label="分类">
                <NbSelect value={formData.category} onChange={e => setFormData(p => ({ ...p, category: e.target.value }))}>
                  {currentCategories.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
                </NbSelect>
              </FormField>
              <FormField label="状态">
                <NbSelect value={formData.status || 'draft'} onChange={e => setFormData(p => ({ ...p, status: e.target.value }))}>
                  <option value="draft">草稿</option>
                  <option value="published">已发布</option>
                  <option value="hidden">隐藏</option>
                </NbSelect>
              </FormField>
              <div style={{ gridColumn: '1 / -1' }}>
                <FormField label="简短描述 *">
                  <NbInput value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="一句话介绍" />
                </FormField>
              </div>
              {/* 游戏专属字段 */}
              {panelTab === 'game' && (<>
                <FormField label="人数（如：2–4 人）">
                  <NbInput value={formData.players || ''} onChange={e => setFormData(p => ({ ...p, players: e.target.value }))} placeholder="2–4 人" />
                </FormField>
                <FormField label="时长（如：10–30 分钟）">
                  <NbInput value={formData.duration || ''} onChange={e => setFormData(p => ({ ...p, duration: e.target.value }))} placeholder="10–30 分钟" />
                </FormField>
                <FormField label="难度（如：随手就会）">
                  <NbInput value={formData.difficulty || ''} onChange={e => setFormData(p => ({ ...p, difficulty: e.target.value }))} placeholder="随手就会" />
                </FormField>
                <FormField label="徽章文字（如：最受欢迎）">
                  <NbInput value={formData.badge || ''} onChange={e => setFormData(p => ({ ...p, badge: e.target.value }))} placeholder="最受欢迎" />
                </FormField>
              </>)}
              <FormField label="卡片颜色">
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '4px' }}>
                  {CARD_COLORS.map(c => (
                    <button key={c.value} type="button" onClick={() => setFormData(p => ({ ...p, card_bg: c.value }))}
                      title={c.label}
                      style={{
                        width: '28px', height: '28px', borderRadius: '6px', background: c.value, cursor: 'pointer',
                        border: formData.card_bg === c.value ? `3px solid ${NB.border}` : `2px solid rgba(0,0,0,0.15)`,
                        boxShadow: formData.card_bg === c.value ? '2px 2px 0 #1A1A1A' : 'none',
                      }} />
                  ))}
                </div>
              </FormField>
              <FormField label="排序（越小越靠前）">
                <NbInput type="number" value={formData.sort_order} onChange={e => setFormData(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} />
              </FormField>
              <FormField label="标签（逗号分隔）">
                <NbInput value={formData.tags} onChange={e => setFormData(p => ({ ...p, tags: e.target.value }))} placeholder="标签1, 标签2" />
              </FormField>
              {panelTab === 'tool' && (
                <FormField label="类型">
                  <NbSelect value={formData.type} onChange={e => setFormData(p => ({ ...p, type: e.target.value }))}>
                    {currentTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </NbSelect>
                </FormField>
              )}
              {formData.type === 'download' && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <FormField label="下载链接">
                    <NbInput value={formData.download_url || ''} onChange={e => setFormData(p => ({ ...p, download_url: e.target.value }))} placeholder="https://example.com/download" />
                  </FormField>
                </div>
              )}
              {formData.type === 'online' && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <FormField label="在线访问链接（留空则用路由跳转）">
                    <NbInput value={formData.url || ''} onChange={e => setFormData(p => ({ ...p, url: e.target.value }))} placeholder="https://..." />
                  </FormField>
                </div>
              )}
              <div style={{ gridColumn: '1 / -1' }}>
                <FormField label="详细内容（支持 Markdown）">
                  <NbTextarea value={formData.content || ''} onChange={e => setFormData(p => ({ ...p, content: e.target.value }))} placeholder="# 使用说明&#10;&#10;详细描述..." rows={5} />
                </FormField>
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '12px' }}>
                <NbButton onClick={handleSave} disabled={saving} accent={NB.mint}>
                  {saving ? <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} /> : <Save style={{ width: '16px', height: '16px' }} />}
                  {editingTool ? '保存修改' : '创建工具'}
                </NbButton>
                <NbButton onClick={handleCancel} variant="ghost">取消</NbButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 工具栏 */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: NB.sub }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="搜索工具名称或描述..."
            style={{
              width: '100%', paddingLeft: '40px', paddingRight: '12px', paddingTop: '10px', paddingBottom: '10px',
              border: `2px solid ${NB.border}`, borderRadius: '8px', fontSize: '14px',
              background: NB.card, outline: 'none', boxShadow: NB.shadowSm,
            }}
          />
        </div>
        <button onClick={fetchTools} title="刷新" style={{ border: `2px solid ${NB.border}`, background: NB.card, padding: '10px', borderRadius: '8px', cursor: 'pointer', boxShadow: NB.shadowSm }}>
          <RefreshCw style={{ width: '16px', height: '16px', color: NB.sub }} />
        </button>
        <NbButton onClick={handleCreate} accent={NB.mint}>
          <Plus style={{ width: '16px', height: '16px' }} /> 添加{panelTab === 'game' ? '游戏' : '工具'}
        </NbButton>
      </div>

      {/* 工具列表表格 */}
      <div style={{ border: `3px solid ${NB.border}`, borderRadius: '12px', overflow: 'hidden', boxShadow: NB.shadow }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: NB.yellow, borderBottom: `3px solid ${NB.border}` }}>
              {[panelTab === 'game' ? '游戏' : '工具', '分类', '类型', '排序', '状态', '操作'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: h === '操作' ? 'right' : 'left', fontSize: '12px', fontWeight: '900', color: NB.text, whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: NB.sub, fontSize: '14px' }}>
                  暂无数据，点击「添加{panelTab === 'game' ? '游戏' : '工具'}」开始创建
                </td>
              </tr>
            ) : filtered.map((tool, idx) => (
              <tr key={tool.id} style={{ borderBottom: idx < filtered.length - 1 ? `2px solid rgba(26,26,26,0.08)` : 'none', background: idx % 2 === 0 ? NB.card : '#FAFAFA' }}>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '8px',
                      background: getCatColor(tool.category), border: `2px solid ${NB.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0,
                    }}>
                      {tool.icon || '📦'}
                    </div>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '14px', color: NB.text }}>{tool.name}</div>
                      <div style={{ fontSize: '12px', color: NB.sub, marginTop: '2px', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {tool.description}
                      </div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                  <span style={{ background: getCatColor(tool.category), border: `2px solid ${NB.border}`, padding: '2px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: '700', color: NB.text }}>
                    {tool.category}
                  </span>
                </td>
                <td style={{ padding: '14px 16px', fontSize: '13px', color: NB.sub, whiteSpace: 'nowrap' }}>
                  {tool.type}
                </td>
                <td style={{ padding: '14px 16px', fontSize: '13px', color: NB.sub, textAlign: 'center' }}>
                  {tool.sort_order}
                </td>
                <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                  <button onClick={() => handleToggleActive(tool)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '700', color: tool.is_active ? '#2BA84A' : NB.sub }}>
                    {tool.is_active ? <ToggleRight style={{ width: '20px', height: '20px' }} /> : <ToggleLeft style={{ width: '20px', height: '20px' }} />}
                    {tool.is_active ? '已启用' : '已禁用'}
                  </button>
                </td>
                <td style={{ padding: '14px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button onClick={() => handleEdit(tool)} title="编辑" style={{ background: 'transparent', border: `2px solid ${NB.border}`, borderRadius: '6px', padding: '6px', marginRight: '6px', cursor: 'pointer', boxShadow: NB.shadowSm }}>
                    <Edit2 style={{ width: '14px', height: '14px', color: NB.text }} />
                  </button>
                  <button onClick={() => handleDelete(tool)} title="删除" style={{ background: NB.red, border: `2px solid ${NB.border}`, borderRadius: '6px', padding: '6px', cursor: 'pointer', boxShadow: NB.shadowSm }}>
                    <Trash2 style={{ width: '14px', height: '14px', color: NB.text }} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: '12px', fontSize: '13px', color: NB.sub }}>共 {tools.length} 个{panelTab === 'game' ? '游戏' : '工具'}</div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────
// 页面文案管理面板
// ────────────────────────────────────────────────────────────────
const PAGE_GROUPS = [
  {
    id: 'home_hero', label: '🏠 首页 · Hero 区', keys: [
      { key: 'home_hero_badge',       label: 'Hero 角标文字',       hint: '如：一个人做的，持续更新中' },
      { key: 'home_hero_title',       label: 'Hero 标题（第1行）',  hint: '如：把好用的' },
      { key: 'home_hero_subtitle',    label: 'Hero 标题（高亮行）', hint: '如：全放这里' },
      { key: 'home_hero_desc',        label: 'Hero 描述',           hint: '首页 Hero 区的一段简介' },
      { key: 'home_hero_btn_tools',   label: 'Hero 工具按钮文字',   hint: '如：看看都有什么' },
      { key: 'home_hero_btn_games',   label: 'Hero 游戏按钮文字',   hint: '如：去玩几局' },
    ],
  },
  {
    id: 'home_banner', label: '🏠 首页 · 入口卡片', keys: [
      { key: 'home_featured_label',      label: '精选区标签',       hint: '如：精选内容' },
      { key: 'home_tab_all',             label: '精选Tab：全部',    hint: '如：全部' },
      { key: 'home_tab_tool',            label: '精选Tab：效率工具', hint: '如：效率工具' },
      { key: 'home_tab_workflow',        label: '精选Tab：工作流',  hint: '如：工作流' },
      { key: 'home_tab_game',            label: '精选Tab：小游戏',  hint: '如：小游戏' },
      { key: 'home_tools_banner_title',  label: '工具箱卡片标题',   hint: '如：工具箱' },
      { key: 'home_tools_banner_desc',   label: '工具箱卡片描述',   hint: '' },
      { key: 'home_tools_banner_btn',    label: '工具箱卡片按钮',   hint: '如：进去看看' },
      { key: 'home_games_banner_title',  label: '游戏室卡片标题',   hint: '如：游戏室' },
      { key: 'home_games_banner_desc',   label: '游戏室卡片描述',   hint: '' },
      { key: 'home_games_banner_btn',    label: '游戏室卡片按钮',   hint: '如：去玩一局' },
    ],
  },
  {
    id: 'home_cta', label: '🏠 首页 · 注册 & 底部', keys: [
      { key: 'home_cta_badge',           label: 'CTA 角标',         hint: '如：完全免费' },
      { key: 'home_cta_register_title',  label: 'CTA 注册标题',     hint: '如：注册一下，追踪更新' },
      { key: 'home_cta_register_desc',   label: 'CTA 注册描述',     hint: '' },
      { key: 'home_cta_btn_register',    label: 'CTA 注册按钮',     hint: '如：注册账号' },
      { key: 'home_cta_btn_login',       label: 'CTA 登录按钮',     hint: '如：已有账号' },
      { key: 'home_footer_text',         label: '底部提示语',        hint: '' },
      { key: 'home_footer_desc',         label: '底部描述',          hint: '' },
      { key: 'home_footer_btn',          label: '底部按钮文字',      hint: '如：联系作者' },
    ],
  },
  {
    id: 'tools', label: '🛠️ 工具页', keys: [
      { key: 'tools_page_title',   label: '页面标题',          hint: '如：自用工具箱' },
      { key: 'tools_page_desc',    label: '页面描述',          hint: '' },
      { key: 'tools_tab_all',      label: '分类Tab：全部',     hint: '如：全部' },
      { key: 'tools_tab_tool',     label: '分类Tab：效率工具', hint: '如：效率工具' },
      { key: 'tools_tab_workflow', label: '分类Tab：工作流',   hint: '如：工作流' },
    ],
  },
  {
    id: 'games', label: '🎮 游戏页', keys: [
      { key: 'games_page_title', label: '页面标题', hint: '如：游戏室' },
      { key: 'games_page_desc',  label: '页面描述', hint: '' },
    ],
  },
  {
    id: 'about_basic', label: '👤 关于页 · 基本信息', keys: [
      { key: 'about_page_title',    label: '页面标题',     hint: '如：关于这个网站' },
      { key: 'about_page_subtitle', label: '页面副标题',   hint: '如：Friday Hub 是怎么来的' },
      { key: 'about_author_emoji',  label: '作者头像 emoji', hint: '如：🚀' },
      { key: 'about_author_name',   label: '作者名字',     hint: '如：Friday' },
      { key: 'about_author_role',   label: '作者身份',     hint: '如：作者 · 开发者' },
      { key: 'about_author_desc',   label: '作者介绍',     hint: '' },
      { key: 'about_why_title',     label: '"为什么做"标题', hint: '如：为什么做这个' },
      { key: 'about_why_desc',      label: '"为什么做"内容', hint: '' },
    ],
  },
  {
    id: 'about_roadmap', label: '👤 关于页 · 路线图', keys: [
      { key: 'about_roadmap_title', label: '路线图标题', hint: '如：做过什么 / 在做什么' },
      { key: 'about_rm1_title',  label: '条目1 标题', hint: '' },
      { key: 'about_rm1_desc',   label: '条目1 描述', hint: '' },
      { key: 'about_rm1_status', label: '条目1 状态', hint: 'completed / in-progress / planned' },
      { key: 'about_rm2_title',  label: '条目2 标题', hint: '' },
      { key: 'about_rm2_desc',   label: '条目2 描述', hint: '' },
      { key: 'about_rm2_status', label: '条目2 状态', hint: 'completed / in-progress / planned' },
      { key: 'about_rm3_title',  label: '条目3 标题', hint: '' },
      { key: 'about_rm3_desc',   label: '条目3 描述', hint: '' },
      { key: 'about_rm3_status', label: '条目3 状态', hint: 'completed / in-progress / planned' },
      { key: 'about_rm4_title',  label: '条目4 标题', hint: '' },
      { key: 'about_rm4_desc',   label: '条目4 描述', hint: '' },
      { key: 'about_rm4_status', label: '条目4 状态', hint: 'completed / in-progress / planned' },
      { key: 'about_rm5_title',  label: '条目5 标题', hint: '' },
      { key: 'about_rm5_desc',   label: '条目5 描述', hint: '' },
      { key: 'about_rm5_status', label: '条目5 状态', hint: 'completed / in-progress / planned' },
      { key: 'about_rm6_title',  label: '条目6 标题', hint: '' },
      { key: 'about_rm6_desc',   label: '条目6 描述', hint: '' },
      { key: 'about_rm6_status', label: '条目6 状态', hint: 'completed / in-progress / planned' },
    ],
  },
  {
    id: 'about_contact', label: '👤 关于页 · 联系方式', keys: [
      { key: 'about_contact_title',  label: '联系区标题', hint: '如：来聊聊' },
      { key: 'about_contact_wechat', label: '微信号',     hint: '如：fridayhub' },
      { key: 'about_contact_email',  label: '邮箱',       hint: '如：hello@fridayhub.com' },
      { key: 'about_contact_hint',   label: '联系区提示语', hint: '' },
      { key: 'about_footer',         label: '底部版权信息', hint: '如：© 2024 Friday Hub · 用 ❤️ 和 ☕ 打造' },
    ],
  },
]

function ContentPanel() {
  // 直接从 localStorage 读取已保存的内容
  const [saved, setSaved] = useState(() => getAllPageContent())
  const [editing, setEditing] = useState({}) // key -> 草稿值
  const [activeGroup, setActiveGroup] = useState('home_hero')

  // 监听其他地方的更新
  useEffect(() => {
    const handler = () => setSaved(getAllPageContent())
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  // 获取当前显示值：草稿优先，其次 localStorage，最后空字符串
  const getCurrentValue = (key) => {
    if (key in editing) return editing[key]
    // 找到该 key 的默认值
    for (const group of PAGE_GROUPS) {
      const found = group.keys.find(k => k.key === key)
      if (found) return saved[key] ?? found.hint?.replace(/^如：/, '') ?? ''
    }
    return saved[key] ?? ''
  }

  const getStoredValue = (key) => saved[key] ?? null

  const isDirty = (key) => key in editing && editing[key] !== (getStoredValue(key) ?? '')

  const handleChange = (key, value) => {
    setEditing(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = (key) => {
    const value = editing[key]
    if (value === undefined) return
    savePageContent(key, value)
    setSaved(getAllPageContent())
    setEditing(prev => { const n = { ...prev }; delete n[key]; return n })
    toast.success('已保存 ✓')
  }

  const handleReset = (key) => {
    setEditing(prev => { const n = { ...prev }; delete n[key]; return n })
  }

  const handleClearKey = (key) => {
    const all = getAllPageContent()
    delete all[key]
    savePageContentBatch(all)
    // 重置整个 memoryStore（通过清除再重写）
    clearAllPageContent()
    savePageContentBatch(all)
    setSaved(getAllPageContent())
    toast.success('已恢复默认值')
  }

  const currentGroup = PAGE_GROUPS.find(g => g.id === activeGroup)

  return (
    <div>
      {/* 页面分组 Tab */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', flexWrap: 'wrap' }}>
        {PAGE_GROUPS.map(g => (
          <button key={g.id} onClick={() => setActiveGroup(g.id)}
            style={{
              padding: '10px 20px', border: `3px solid ${NB.border}`, borderRadius: '8px',
              fontWeight: '700', fontSize: '13px', cursor: 'pointer',
              background: activeGroup === g.id ? NB.blue : NB.card,
              boxShadow: activeGroup === g.id ? NB.shadow : NB.shadowSm,
              transform: activeGroup === g.id ? 'translate(-2px,-2px)' : 'none',
              transition: 'all 0.1s',
            }}>
            {g.label}
          </button>
        ))}
      </div>

      {/* 文案编辑列表 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {currentGroup?.keys.map(({ key, label, hint }) => {
          const value = getCurrentValue(key)
          const dirty = isDirty(key)
          return (
            <div key={key} style={{
              border: `3px solid ${dirty ? '#2BA84A' : NB.border}`,
              borderRadius: '10px', overflow: 'hidden', boxShadow: dirty ? `4px 4px 0px #2BA84A` : NB.shadowSm,
              transition: 'all 0.15s ease',
            }}>
              <div style={{
                padding: '12px 16px',
                background: dirty ? '#E6FFE6' : NB.yellow,
                borderBottom: `2px solid ${dirty ? '#2BA84A' : NB.border}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <span style={{ fontWeight: '700', fontSize: '13px', color: NB.text }}>{label}</span>
                  <code style={{ marginLeft: '8px', fontSize: '11px', color: NB.sub, background: 'rgba(0,0,0,0.06)', padding: '1px 6px', borderRadius: '3px' }}>{key}</code>
                </div>
                {dirty && (
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#2BA84A' }}>● 有未保存修改</span>
                )}
              </div>
              <div style={{ padding: '16px', background: NB.card }}>
                {hint && (
                  <p style={{ fontSize: '12px', color: NB.sub, marginBottom: '8px' }}>💡 {hint}</p>
                )}
                <textarea
                  value={value}
                  onChange={e => handleChange(key, e.target.value)}
                  rows={value && value.length > 60 ? 3 : 1}
                  style={{
                    width: '100%', border: `2px solid ${dirty ? '#2BA84A' : NB.border}`,
                    borderRadius: '8px', padding: '10px 14px', fontSize: '14px',
                    outline: 'none', resize: 'vertical', fontFamily: 'inherit',
                    background: NB.card, color: NB.text, lineHeight: '1.6',
                  }}
                />
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px', justifyContent: 'flex-end', alignItems: 'center' }}>
                  {saved[key] !== undefined && !dirty && (
                    <button onClick={() => handleClearKey(key)}
                      style={{ border: `2px solid ${NB.tagBd}`, background: NB.card, padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', color: NB.sub }}>
                      恢复默认
                    </button>
                  )}
                  {dirty && (
                    <button onClick={() => handleReset(key)}
                      style={{ border: `2px solid ${NB.border}`, background: NB.card, padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                      撤销
                    </button>
                  )}
                  <button onClick={() => handleSave(key)} disabled={!dirty}
                    style={{
                      border: `2px solid ${dirty ? '#2BA84A' : NB.tagBd}`,
                      background: dirty ? NB.mint : '#F5F5F5',
                      padding: '6px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: '700',
                      cursor: dirty ? 'pointer' : 'not-allowed', color: NB.text,
                      boxShadow: dirty ? NB.shadowSm : 'none',
                      opacity: dirty ? 1 : 0.6,
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                    }}>
                    <Save style={{ width: '12px', height: '12px' }} />
                    保存
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <p style={{ marginTop: '24px', fontSize: '13px', color: NB.sub, padding: '12px 16px', background: NB.blue, border: `2px solid ${NB.border}`, borderRadius: '8px' }}>
        💡 修改文案后点击「保存」立即生效，刷新页面后依然保留。点击「恢复默认」可还原原始文案。
      </p>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────
// 通用 UI 原子组件（NB 风格）
// ────────────────────────────────────────────────────────────────
function FormField({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontWeight: '700', fontSize: '13px', color: NB.text, marginBottom: '6px' }}>{label}</label>
      {children}
    </div>
  )
}

function NbInput({ value, onChange, placeholder, type = 'text', maxLength, disabled }) {
  return (
    <input
      type={type} value={value ?? ''} onChange={onChange} placeholder={placeholder}
      maxLength={maxLength} disabled={disabled}
      style={{
        width: '100%', padding: '9px 12px', border: `2px solid ${NB.border}`,
        borderRadius: '8px', fontSize: '14px', background: NB.card,
        outline: 'none', boxShadow: NB.shadowSm, color: NB.text,
      }}
    />
  )
}

function NbSelect({ value, onChange, children }) {
  return (
    <select value={value} onChange={onChange}
      style={{
        width: '100%', padding: '9px 12px', border: `2px solid ${NB.border}`,
        borderRadius: '8px', fontSize: '14px', background: NB.card,
        outline: 'none', boxShadow: NB.shadowSm, color: NB.text, cursor: 'pointer',
      }}>
      {children}
    </select>
  )
}

function NbTextarea({ value, onChange, placeholder, rows = 4 }) {
  return (
    <textarea value={value ?? ''} onChange={onChange} placeholder={placeholder} rows={rows}
      style={{
        width: '100%', padding: '9px 12px', border: `2px solid ${NB.border}`,
        borderRadius: '8px', fontSize: '14px', background: NB.card,
        outline: 'none', boxShadow: NB.shadowSm, color: NB.text, resize: 'vertical', fontFamily: 'inherit',
      }} />
  )
}

function NbButton({ onClick, disabled, children, accent, variant = 'default' }) {
  const [pressed, setPressed] = useState(false)
  if (variant === 'ghost') {
    return (
      <button onClick={onClick} disabled={disabled}
        style={{
          padding: '10px 20px', border: `2px solid ${NB.tagBd}`, borderRadius: '8px',
          fontWeight: '700', fontSize: '13px', cursor: disabled ? 'not-allowed' : 'pointer',
          background: 'transparent', color: NB.sub, opacity: disabled ? 0.5 : 1,
        }}>
        {children}
      </button>
    )
  }
  return (
    <button
      onClick={onClick} disabled={disabled}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        padding: '10px 20px', border: `3px solid ${NB.border}`, borderRadius: '8px',
        fontWeight: '700', fontSize: '13px', cursor: disabled ? 'not-allowed' : 'pointer',
        background: accent || NB.yellow, color: NB.text,
        boxShadow: pressed ? 'none' : NB.shadow,
        transform: pressed ? 'translate(4px,4px)' : 'none',
        transition: 'all 0.08s ease',
        opacity: disabled ? 0.6 : 1,
      }}>
      {children}
    </button>
  )
}

// ────────────────────────────────────────────────────────────────
// 主入口组件
// ────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate   = useNavigate()
  const location   = useLocation()
  const { user }   = useAdminCheck()
  const [isAuthed, setIsAuthed] = useState(false)

  useEffect(() => {
    if (user && ADMIN_EMAILS.includes(user.email)) setIsAuthed(true)
  }, [user])

  // 根据路由确定当前 Tab
  const getActiveTab = () => {
    if (location.pathname.includes('/admin/content')) return 'content'
    return 'tools'
  }
  const activeTab = getActiveTab()

  if (!isAuthed) {
    return (
      <div style={{ minHeight: '100vh', background: NB.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 style={{ width: '32px', height: '32px', animation: 'spin 1s linear infinite', color: NB.sub }} />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: NB.bg }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px' }}>
        {/* 页面头部 */}
        <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <BackButton to="/profile" variant="ghost" style={{ padding: '8px' }} />
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '900', color: NB.text, letterSpacing: '-0.03em', margin: 0 }}>
              🎛️ 管理后台
            </h1>
            <p style={{ color: NB.sub, fontSize: '14px', margin: '4px 0 0 0' }}>
              管理员：{user?.email}
            </p>
          </div>
        </div>

        {/* 导航 Tab */}
        <AdminNav activeTab={activeTab} />

        {/* 内容区 */}
        {activeTab === 'tools'   && <ToolsPanel   user={user} />}
        {activeTab === 'content' && <ContentPanel />}
      </div>

      {/* spin 动画 */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
