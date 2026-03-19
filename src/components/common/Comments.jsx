import { useState, useEffect, useCallback, useRef } from 'react'
import React from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/store/AuthContext'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/hooks/useToast'
import { MessageCircle, Send, User, Loader2, Trash2, Reply, Heart, X, MessagesSquare } from 'lucide-react'

// 温暖色调
const W = {
  text:   '#3D3530',
  sub:    '#8A7E77',
  accent: '#C8602A',
  border: '#E9E3DB',
  tagBg:  '#F2EDE8',
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diff = now - date
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

// 从所有回复中找点赞最多的一条
const pickTopReply = (replies, likeStates) => {
  if (!replies || replies.length === 0) return null
  let top = replies[0]
  let maxLikes = likeStates[replies[0]?.id]?.count ?? replies[0]?.like_count ?? 0
  for (let i = 1; i < replies.length; i++) {
    const likes = likeStates[replies[i].id]?.count ?? replies[i].like_count ?? 0
    if (likes > maxLikes) {
      maxLikes = likes
      top = replies[i]
    }
  }
  return top
}

/**
 * 从所有评论中提取两个人之间的对话链。
 */
const extractConversation = (startComment, targetUserId, allComments) => {
  const userA = startComment.user_id
  const userB = targetUserId
  if (userA === userB) return []

  const commentById = {}
  allComments.forEach(c => { commentById[c.id] = c })

  const chain = []
  let cur = startComment
  while (cur) {
    chain.unshift(cur)
    cur = cur.parent_id ? commentById[cur.parent_id] : null
  }

  const collectDescendants = (id, visited = new Set()) => {
    if (visited.has(id)) return []
    visited.add(id)
    const children = allComments.filter(c => c.parent_id === id)
    const result = []
    for (const child of children) {
      result.push(child)
      result.push(...collectDescendants(child.id, visited))
    }
    return result
  }
  const descendants = collectDescendants(startComment.id)

  const all = [...chain, ...descendants]
  const seen = new Set()
  const unique = all.filter(c => {
    if (seen.has(c.id)) return false
    seen.add(c.id)
    return true
  })

  return unique
    .filter(c => c.user_id === userA || c.user_id === userB)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
}

// ─── 对话 Modal ──────────────────────────────────────────────────────────────
const ConversationModal = ({ conversation, userA, userB, onClose }) => {
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  const nameA = userA?.profiles?.nickname || '匿名'
  const nameB = userB?.profiles?.nickname || '匿名'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm p-4"
      style={{ background: 'rgba(61,53,48,0.45)' }}
      onClick={handleBackdropClick}
    >
      <div className="rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col"
        style={{ background: '#fff', border: `1px solid ${W.border}` }}>
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: W.border }}>
          <div className="flex items-center gap-2">
            <MessagesSquare className="h-5 w-5" style={{ color: W.accent }} />
            <span className="font-semibold" style={{ color: W.text }}>
              {nameA} 与 {nameB}
            </span>
            <span className="text-xs font-normal" style={{ color: W.sub }}>共 {conversation.length} 条</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
            style={{ color: W.sub }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 消息列表 */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4" style={{ background: '#FFFBF5' }}>
          {conversation.map((msg) => {
            const isA = msg.user_id === userA?.user_id
            const name = msg.profiles?.nickname || '匿名'
            const initial = name.charAt(0).toUpperCase()

            return (
              <div key={msg.id} className={`flex gap-3 ${isA ? '' : 'flex-row-reverse'}`}>
                {/* 头像 */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs"
                  style={{ background: W.tagBg }}>
                  <span className="font-medium" style={{ color: W.accent }}>{initial}</span>
                </div>
                {/* 气泡 */}
                <div className={`max-w-[75%] ${isA ? '' : 'items-end'} flex flex-col gap-1`}>
                  <div className="flex items-center gap-1.5">
                    {isA ? (
                      <>
                        <span className="text-xs font-medium" style={{ color: W.text }}>{name}</span>
                        <span className="text-xs" style={{ color: W.sub }}>{formatDate(msg.created_at)}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-xs" style={{ color: W.sub }}>{formatDate(msg.created_at)}</span>
                        <span className="text-xs font-medium" style={{ color: W.text }}>{name}</span>
                      </>
                    )}
                  </div>
                  <div
                    className="px-3 py-2 text-sm whitespace-pre-wrap break-words"
                    style={isA
                      ? { background: W.tagBg, color: W.text, borderRadius: '4px 14px 14px 14px' }
                      : { background: '#EEEBE8', color: W.text, borderRadius: '14px 4px 14px 14px' }}
                  >
                    {msg.content}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* 底部提示 */}
        <div className="px-5 py-3 border-t text-center" style={{ borderColor: W.border }}>
          <span className="text-xs" style={{ color: W.sub }}>仅显示两人之间的消息</span>
        </div>
      </div>
    </div>
  )
}

// ─── 单条回复行（平铺，带"回复 @xxx"标签）─────────────────────────────────
const ReplyItem = React.memo(function ReplyItem({
  reply,
  parentComment,
  allComments,
  user,
  userProfile,
  onDelete,
  onReplyAdded,
  onLike,
  likeStates,
}) {
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [conversation, setConversation] = useState(null)

  const likeCount = likeStates[reply.id]?.count ?? reply.like_count ?? 0
  const isLiked = likeStates[reply.id]?.isLiked ?? reply.is_liked ?? false
  const isOwn = user?.id === reply.user_id

  const replyTarget = reply.parent_id && reply.parent_id !== parentComment.id
    ? allComments.find(c => c.id === reply.parent_id)
    : null
  const targetComment = replyTarget || parentComment
  const targetName = targetComment?.profiles?.nickname || '匿名'

  const conv = extractConversation(reply, targetComment.user_id, allComments)
  const hasConversation = conv.length >= 2 &&
    conv.some(c => c.user_id === reply.user_id) &&
    conv.some(c => c.user_id === targetComment.user_id)

  const handleOpenConversation = () => { setConversation(conv) }

  const handleSubmitReply = async () => {
    if (!replyContent.trim()) { toast.error('请输入回复内容'); return }
    setSubmitting(true)
    const replyText = replyContent.trim()
    const tempId = `temp_reply_${Date.now()}`

    try {
      const optimisticReply = {
        id: tempId,
        user_id: user.id,
        content: replyText,
        parent_id: reply.id,
        tool_id: parentComment.tool_id,
        created_at: new Date().toISOString(),
        profiles: userProfile || { nickname: '匿名' },
        like_count: 0,
        is_liked: false
      }
      setReplyContent('')
      setShowReplyForm(false)
      onReplyAdded(optimisticReply, null)

      const { data, error } = await supabase
        .from('comments')
        .insert({ user_id: user.id, content: replyText, parent_id: reply.id, tool_id: parentComment.tool_id })
        .select()
      if (error) throw error

      const realReply = data?.[0]
      if (realReply) {
        realReply.profiles = userProfile || { nickname: '匿名' }
        realReply.like_count = 0
        realReply.is_liked = false
        onReplyAdded(realReply, tempId)
      }
      toast.success('回复成功')
    } catch (err) {
      console.error('回复失败:', err)
      toast.error('回复失败，请稍后重试')
      onReplyAdded(null, tempId)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="flex gap-2 py-2">
        {/* 小头像 */}
        <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs mt-0.5"
          style={{ background: W.tagBg }}>
          {reply.profiles?.nickname ? (
            <span className="font-medium" style={{ color: W.accent }}>{reply.profiles.nickname.charAt(0).toUpperCase()}</span>
          ) : (
            <User className="h-3.5 w-3.5" style={{ color: W.sub }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            <span className="text-sm font-medium" style={{ color: W.text }}>{reply.profiles?.nickname || '匿名'}</span>
            {isOwn && (
              <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: W.tagBg, color: W.accent }}>你</span>
            )}
            <span className="text-xs font-normal" style={{ color: W.sub }}>回复</span>
            <span className="text-xs font-medium" style={{ color: W.accent }}>@{targetName}</span>
            <span className="text-xs" style={{ color: W.sub }}>{formatDate(reply.created_at)}</span>
          </div>
          <p className="text-sm whitespace-pre-wrap break-words" style={{ color: W.text }}>{reply.content}</p>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <button
              onClick={() => onLike(reply.id)}
              className="text-xs flex items-center gap-1 transition-colors"
              style={{ color: isLiked ? '#E05050' : W.sub }}
            >
              <Heart className={`h-3 w-3 ${isLiked ? 'fill-current' : ''}`} />
              {likeCount > 0 ? likeCount : '点赞'}
            </button>
            {user && (
              <button
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="text-xs flex items-center gap-1 transition-colors"
                style={{ color: W.sub }}
              >
                <Reply className="h-3 w-3" />
                回复
              </button>
            )}
            {isOwn && (
              <button
                onClick={() => onDelete(reply.id)}
                className="text-xs flex items-center gap-1 transition-colors"
                style={{ color: W.sub }}
              >
                <Trash2 className="h-3 w-3" />
                删除
              </button>
            )}
            {hasConversation && (
              <button
                onClick={handleOpenConversation}
                className="text-xs flex items-center gap-1 transition-colors"
                style={{ color: W.sub }}
              >
                <MessagesSquare className="h-3 w-3" />
                查看对话
              </button>
            )}
          </div>
          {showReplyForm && (
            <div className="mt-2">
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder={`回复 @${reply.profiles?.nickname || '匿名'}…`}
                className="min-h-[70px] text-sm"
                style={{ borderColor: W.border }}
              />
              <div className="flex gap-2 mt-2">
                <Button size="sm" onClick={handleSubmitReply} disabled={submitting}
                  style={{ background: W.text, color: '#fff' }}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 mr-1" />发送</>}
                </Button>
                <Button size="sm" variant="outline"
                  style={{ borderColor: W.border, color: W.sub }}
                  onClick={() => { setShowReplyForm(false); setReplyContent('') }}>取消</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {conversation && (
        <ConversationModal
          conversation={conversation}
          userA={reply}
          userB={targetComment}
          onClose={() => setConversation(null)}
        />
      )}
    </>
  )
})

// ─── 顶层评论组件（含平铺回复区）────────────────────────────────────────────
const CommentItem = React.memo(function CommentItem({
  comment,
  user,
  userProfile,
  onDelete,
  onReplyAdded,
  allComments,
  onLike,
  likeStates,
  activeExpandedComments,
}) {
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [manualExpanded, setManualExpanded] = useState(null)

  const likeCount = likeStates[comment.id]?.count ?? comment.like_count ?? 0
  const isLiked = likeStates[comment.id]?.isLiked ?? comment.is_liked ?? false
  const isOwn = user?.id === comment.user_id

  const collectAllReplies = (parentId, visited = new Set()) => {
    if (visited.has(parentId)) return []
    visited.add(parentId)
    const direct = allComments.filter(c => c.parent_id === parentId)
    const result = []
    for (const r of direct) {
      result.push(r)
      result.push(...collectAllReplies(r.id, visited))
    }
    return result
  }
  const allReplies = collectAllReplies(comment.id)
  const topReply = pickTopReply(allReplies, likeStates)
  const hiddenCount = Math.max(0, allReplies.length - 1)

  const shouldAutoExpand = activeExpandedComments?.has(comment.id)
  const showAllReplies = manualExpanded !== null ? manualExpanded : shouldAutoExpand
  const repliesToShow = showAllReplies ? allReplies : (topReply ? [topReply] : [])

  const handleSubmitReply = async () => {
    if (!replyContent.trim()) { toast.error('请输入回复内容'); return }
    setSubmitting(true)
    const replyText = replyContent.trim()
    const tempId = `temp_reply_${Date.now()}`

    try {
      const optimisticReply = {
        id: tempId,
        user_id: user.id,
        content: replyText,
        parent_id: comment.id,
        tool_id: comment.tool_id,
        created_at: new Date().toISOString(),
        profiles: userProfile || { nickname: '匿名' },
        like_count: 0,
        is_liked: false
      }
      setReplyContent('')
      setShowReplyForm(false)
      onReplyAdded(optimisticReply, null)

      const { data, error } = await supabase
        .from('comments')
        .insert({ user_id: user.id, content: replyText, parent_id: comment.id, tool_id: comment.tool_id })
        .select()
      if (error) throw error

      const realReply = data?.[0]
      if (realReply) {
        realReply.profiles = userProfile || { nickname: '匿名' }
        realReply.like_count = 0
        realReply.is_liked = false
        onReplyAdded(realReply, tempId)
      }
      toast.success('回复成功')
    } catch (err) {
      console.error('回复失败:', err)
      toast.error('回复失败，请稍后重试')
      onReplyAdded(null, tempId)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="py-4">
      {/* 顶层评论主体 */}
      <div className="flex gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm"
          style={{ background: W.tagBg }}>
          {comment.profiles?.nickname ? (
            <span className="font-medium" style={{ color: W.accent }}>{comment.profiles.nickname.charAt(0).toUpperCase()}</span>
          ) : (
            <User className="h-5 w-5" style={{ color: W.sub }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium" style={{ color: W.text }}>{comment.profiles?.nickname || '匿名'}</span>
            <span className="text-xs" style={{ color: W.sub }}>{formatDate(comment.created_at)}</span>
            {isOwn && <span className="text-xs px-2 py-0.5 rounded" style={{ background: W.tagBg, color: W.accent }}>你</span>}
          </div>
          <p className="text-sm whitespace-pre-wrap break-words" style={{ color: W.text }}>{comment.content}</p>
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={() => onLike(comment.id)}
              className="text-xs flex items-center gap-1 transition-colors"
              style={{ color: isLiked ? '#E05050' : W.sub }}
            >
              <Heart className={`h-3 w-3 ${isLiked ? 'fill-current' : ''}`} />
              {likeCount > 0 ? likeCount : '点赞'}
            </button>
            {user && (
              <button
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="text-xs flex items-center gap-1 transition-colors"
                style={{ color: W.sub }}
              >
                <Reply className="h-3 w-3" />
                回复
              </button>
            )}
            {isOwn && (
              <button
                onClick={() => onDelete(comment.id)}
                className="text-xs flex items-center gap-1 transition-colors"
                style={{ color: W.sub }}
              >
                <Trash2 className="h-3 w-3" />
                删除
              </button>
            )}
          </div>

          {/* 回复输入框 */}
          {showReplyForm && (
            <div className="mt-3">
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder={`回复 ${comment.profiles?.nickname || '匿名'}…`}
                className="min-h-[80px] text-sm"
                style={{ borderColor: W.border }}
              />
              <div className="flex gap-2 mt-2">
                <Button size="sm" onClick={handleSubmitReply} disabled={submitting}
                  style={{ background: W.text, color: '#fff' }}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 mr-1" />发送</>}
                </Button>
                <Button size="sm" variant="outline"
                  style={{ borderColor: W.border, color: W.sub }}
                  onClick={() => { setShowReplyForm(false); setReplyContent('') }}>取消</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 回复区（平铺） */}
      {(repliesToShow.length > 0 || (!showAllReplies && hiddenCount > 0)) && (
        <div className="mt-2 ml-[52px]">
          <div className="rounded-xl px-3" style={{ background: '#FFFBF5', border: `1px solid ${W.border}` }}>
            {repliesToShow.map((reply) => (
              <ReplyItem
                key={reply.id}
                reply={reply}
                parentComment={comment}
                allComments={allComments}
                user={user}
                userProfile={userProfile}
                onDelete={onDelete}
                onReplyAdded={onReplyAdded}
                onLike={onLike}
                likeStates={likeStates}
              />
            ))}

            {!showAllReplies && hiddenCount > 0 && (
              <button
                onClick={() => setManualExpanded(true)}
                className="w-full text-left py-2 text-xs"
                style={{ color: W.accent }}
              >
                展开 {hiddenCount} 条回复 ›
              </button>
            )}
            {showAllReplies && allReplies.length > 1 && (
              <button
                onClick={() => setManualExpanded(false)}
                className="w-full text-left py-2 text-xs"
                style={{ color: W.sub }}
              >
                收起回复
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
})

// ─── 主评论区组件 ─────────────────────────────────────────────────────────────
export default function Comments({ toolId = null }) {
  const { user, profile } = useAuth()
  const [commentMap, setCommentMap] = useState(new Map())
  const [commentIds, setCommentIds] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [likeStates, setLikeStates] = useState({})
  const [activeExpandedComments, setActiveExpandedComments] = useState(new Set())
  const initializedRef = useRef(false)

  // ─── 初始加载（只执行一次）
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    const load = async () => {
      setLoading(true)
      try {
        let query = supabase
          .from('comments')
          .select('*')
          .order('created_at', { ascending: true })

        if (toolId) {
          query = query.eq('tool_id', toolId)
        } else {
          query = query.is('tool_id', null)
        }

        const { data, error } = await query
        if (error) throw error

        const rows = data || []

        if (rows.length > 0) {
          const userIds = [...new Set(rows.map(c => c.user_id))]
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('*')
            .in('id', userIds)

          const profileMap = {}
          profilesData?.forEach(p => { profileMap[p.id] = p })
          rows.forEach(c => {
            c.profiles = profileMap[c.user_id] || { nickname: '匿名' }
          })
        }

        const newLikeStates = {}
        if (user && rows.length > 0) {
          const ids = rows.map(c => c.id)
          const [{ data: allLikes }, { data: myLikes }] = await Promise.all([
            supabase.from('comment_likes').select('comment_id').in('comment_id', ids),
            supabase.from('comment_likes').select('comment_id').in('comment_id', ids).eq('user_id', user.id)
          ])

          const countMap = {}
          allLikes?.forEach(l => { countMap[l.comment_id] = (countMap[l.comment_id] || 0) + 1 })
          const mySet = new Set(myLikes?.map(l => l.comment_id) || [])

          rows.forEach(c => {
            newLikeStates[c.id] = { count: countMap[c.id] || 0, isLiked: mySet.has(c.id) }
          })
        }

        const map = new Map()
        const ids = []
        rows.forEach(c => {
          map.set(c.id, c)
          ids.push(c.id)
        })
        setCommentMap(map)
        setCommentIds(ids)
        setLikeStates(newLikeStates)
      } catch (err) {
        console.error('获取评论失败:', err)
      } finally {
        setLoading(false)
      }
    }

    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── 提交新评论
  const handleSubmit = async () => {
    if (!user) { toast.error('请先登录后再发表评论'); return }
    if (!newComment.trim()) { toast.error('说点什么吧'); return }

    setSubmitting(true)
    const commentContent = newComment.trim()
    const tempId = `temp_${Date.now()}`

    const optimisticComment = {
      id: tempId,
      user_id: user.id,
      content: commentContent,
      tool_id: toolId || null,
      parent_id: null,
      created_at: new Date().toISOString(),
      profiles: profile || { nickname: '匿名' },
      like_count: 0,
      is_liked: false
    }
    setCommentMap(prev => new Map(prev).set(tempId, optimisticComment))
    setCommentIds(prev => [...prev, tempId])
    setNewComment('')

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({ user_id: user.id, content: commentContent, tool_id: toolId || null })
        .select()
      if (error) throw error

      const realComment = data?.[0]
      if (realComment) {
        realComment.profiles = profile || { nickname: '匿名' }
        realComment.like_count = 0
        realComment.is_liked = false

        setCommentMap(prev => {
          const next = new Map(prev)
          next.delete(tempId)
          next.set(realComment.id, realComment)
          return next
        })
        setCommentIds(prev => prev.map(id => id === tempId ? realComment.id : id))
      }

      toast.success('发布成功')
    } catch (err) {
      console.error('评论失败:', err)
      setCommentMap(prev => { const next = new Map(prev); next.delete(tempId); return next })
      setCommentIds(prev => prev.filter(id => id !== tempId))
      setNewComment(commentContent)
      toast.error('发布失败，稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── 删除评论（级联删除子评论）
  const handleDelete = async (commentId) => {
    if (!confirm('确定删除这条评论？')) return

    try {
      const { error } = await supabase.from('comments').delete().eq('id', commentId)
      if (error) throw error

      toast.success('已删除')
      const toDelete = new Set()
      const collect = (id) => {
        toDelete.add(id)
        commentIds.forEach(cid => {
          const c = commentMap.get(cid)
          if (c?.parent_id === id) collect(c.id)
        })
      }
      collect(commentId)

      setCommentMap(prev => {
        const next = new Map(prev)
        toDelete.forEach(id => next.delete(id))
        return next
      })
      setCommentIds(prev => prev.filter(id => !toDelete.has(id)))
    } catch (err) {
      console.error('删除失败:', err)
      toast.error('删除失败，稍后重试')
    }
  }

  // ─── 点赞（乐观更新）
  const handleLike = useCallback(async (commentId) => {
    if (!user) { toast.error('登录后才能点赞'); return }

    const prev = likeStates[commentId] || { count: 0, isLiked: false }
    const isCurrentlyLiked = prev.isLiked

    setLikeStates(s => ({
      ...s,
      [commentId]: { count: isCurrentlyLiked ? prev.count - 1 : prev.count + 1, isLiked: !isCurrentlyLiked }
    }))

    try {
      if (isCurrentlyLiked) {
        await supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', user.id)
      } else {
        await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: user.id })
      }
    } catch (err) {
      console.error('点赞失败:', err)
      setLikeStates(s => ({ ...s, [commentId]: prev }))
      toast.error('操作失败，稍后重试')
    }
  }, [user, likeStates])

  // ─── 处理回复（追加 / 替换 / 删除临时条目）
  const handleReplyAdded = useCallback((newReply, tempId) => {
    if (newReply && tempId === null) {
      setCommentMap(prev => new Map(prev).set(newReply.id, newReply))
      setCommentIds(prev => [...prev, newReply.id])
      if (newReply.parent_id) {
        let topLevelId = newReply.parent_id
        let cur = commentMap.get(topLevelId)
        while (cur?.parent_id) {
          topLevelId = cur.parent_id
          cur = commentMap.get(topLevelId)
        }
        setActiveExpandedComments(prev => new Set(prev).add(topLevelId))
      }
    } else if (newReply && tempId !== null) {
      setCommentMap(prev => {
        const next = new Map(prev)
        next.delete(tempId)
        next.set(newReply.id, newReply)
        return next
      })
      setCommentIds(prev => prev.map(id => id === tempId ? newReply.id : id))
      if (newReply.parent_id) {
        let topLevelId = newReply.parent_id
        let cur = commentMap.get(topLevelId)
        while (cur?.parent_id) {
          topLevelId = cur.parent_id
          cur = commentMap.get(topLevelId)
        }
        setActiveExpandedComments(prev => new Set(prev).add(topLevelId))
      }
    } else if (!newReply && tempId !== null) {
      setCommentMap(prev => { const next = new Map(prev); next.delete(tempId); return next })
      setCommentIds(prev => prev.filter(id => id !== tempId))
    }
  }, [commentMap])

  const allComments = commentIds.map(id => commentMap.get(id)).filter(Boolean)
  const topLevelComments = allComments.filter(c => !c.parent_id)

  return (
    <Card className="mt-8" style={{ borderColor: W.border }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" style={{ color: W.accent }} />
          <span style={{ color: W.text }}>聊聊</span>
          {topLevelComments.length > 0 && (
            <span className="text-sm font-normal" style={{ color: W.sub }}>
              {topLevelComments.length} 条
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* 评论输入框 */}
        {user ? (
          <div className="mb-6">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm"
                style={{ background: W.tagBg }}>
                {profile?.nickname ? (
                  <span className="font-medium" style={{ color: W.accent }}>{profile.nickname.charAt(0).toUpperCase()}</span>
                ) : (
                  <User className="h-5 w-5" style={{ color: W.sub }} />
                )}
              </div>
              <div className="flex-1">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="说点什么…"
                  className="min-h-[90px] mb-3"
                  style={{ borderColor: W.border }}
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting || !newComment.trim()}
                    style={{ background: W.text, color: '#fff' }}
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                    发布
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-6 p-4 rounded-xl text-center" style={{ background: W.tagBg }}>
            <p className="text-sm mb-3" style={{ color: W.sub }}>登录后可以参与讨论</p>
            <div className="flex justify-center gap-3">
              <Link
                to={`/login${toolId ? `?redirect=/tools/${toolId}` : ''}`}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
                style={{ background: W.text, color: '#fff' }}
              >
                登录
              </Link>
              <Link
                to={`/register${toolId ? `?redirect=/tools/${toolId}` : ''}`}
                className="px-4 py-2 border rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
                style={{ borderColor: W.border, color: W.text, background: '#fff' }}
              >
                注册
              </Link>
            </div>
          </div>
        )}

        {/* 评论列表 */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-7 w-7 animate-spin" style={{ color: W.accent }} />
          </div>
        ) : topLevelComments.length > 0 ? (
          <div className="divide-y" style={{ borderColor: W.border }}>
            {topLevelComments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                user={user}
                userProfile={profile}
                onDelete={handleDelete}
                onReplyAdded={handleReplyAdded}
                allComments={allComments}
                onLike={handleLike}
                likeStates={likeStates}
                activeExpandedComments={activeExpandedComments}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <MessageCircle className="h-10 w-10 mx-auto mb-3" style={{ color: W.border }} />
            <p className="text-sm" style={{ color: W.sub }}>还没人说话，来说第一句</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
