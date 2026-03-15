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
 * 策略：从 startComment 出发，沿 parent_id 向上追溯整条线；
 * 再向下找所有互相回复的节点。
 * 只保留 userA 和 userB 两个人的消息，按时间排序。
 */
const extractConversation = (startComment, targetUserId, allComments) => {
  const userA = startComment.user_id
  const userB = targetUserId
  if (userA === userB) return []

  // 建立 id -> comment 的 map
  const commentById = {}
  allComments.forEach(c => { commentById[c.id] = c })

  // 收集整条回复链（向上追溯到根）
  const chain = []
  let cur = startComment
  while (cur) {
    chain.unshift(cur)
    cur = cur.parent_id ? commentById[cur.parent_id] : null
  }

  // 向下递归找所有后代
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

  // 合并并去重
  const all = [...chain, ...descendants]
  const seen = new Set()
  const unique = all.filter(c => {
    if (seen.has(c.id)) return false
    seen.add(c.id)
    return true
  })

  // 只保留两个人的消息，按时间升序
  return unique
    .filter(c => c.user_id === userA || c.user_id === userB)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
}

// ─── 对话 Modal ──────────────────────────────────────────────────────────────
const ConversationModal = ({ conversation, userA, userB, onClose }) => {
  // 点击背景关闭
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  const nameA = userA?.profiles?.nickname || '匿名用户'
  const nameB = userB?.profiles?.nickname || '匿名用户'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <MessagesSquare className="h-5 w-5 text-purple-600" />
            <span className="font-semibold text-gray-900">
              {nameA} 与 {nameB} 的对话
            </span>
            <span className="text-xs text-gray-400 font-normal">共 {conversation.length} 条</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* 消息列表 */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {conversation.map((msg, idx) => {
            const isA = msg.user_id === userA?.user_id
            const name = msg.profiles?.nickname || '匿名用户'
            const initial = name.charAt(0).toUpperCase()

            return (
              <div key={msg.id} className={`flex gap-3 ${isA ? '' : 'flex-row-reverse'}`}>
                {/* 头像 */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center text-xs">
                  <span className="text-purple-600 font-medium">{initial}</span>
                </div>
                {/* 气泡 */}
                <div className={`max-w-[75%] ${isA ? '' : 'items-end'} flex flex-col gap-1`}>
                  <div className="flex items-center gap-1.5">
                    {isA ? (
                      <>
                        <span className="text-xs font-medium text-gray-700">{name}</span>
                        <span className="text-xs text-gray-400">{formatDate(msg.created_at)}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-xs text-gray-400">{formatDate(msg.created_at)}</span>
                        <span className="text-xs font-medium text-gray-700">{name}</span>
                      </>
                    )}
                  </div>
                  <div
                    className={`px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                      isA
                        ? 'bg-purple-50 text-gray-800 rounded-tl-sm'
                        : 'bg-gray-100 text-gray-800 rounded-tr-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* 底部提示 */}
        <div className="px-5 py-3 border-t border-gray-100 text-center">
          <span className="text-xs text-gray-400">仅显示两人之间的互动消息</span>
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
  const [conversation, setConversation] = useState(null) // null = 关闭

  const likeCount = likeStates[reply.id]?.count ?? reply.like_count ?? 0
  const isLiked = likeStates[reply.id]?.isLiked ?? reply.is_liked ?? false
  const isOwn = user?.id === reply.user_id

  // 找被回复的那条评论的对象
  const replyTarget = reply.parent_id && reply.parent_id !== parentComment.id
    ? allComments.find(c => c.id === reply.parent_id)
    : null
  const targetComment = replyTarget || parentComment
  const targetName = targetComment?.profiles?.nickname || '匿名用户'

  // 计算两人之间的对话是否满足 >=2 轮
  const conv = extractConversation(reply, targetComment.user_id, allComments)
  // 两人都说过话才算"对话"，且至少有 2 条
  const hasConversation = conv.length >= 2 &&
    conv.some(c => c.user_id === reply.user_id) &&
    conv.some(c => c.user_id === targetComment.user_id)

  const handleOpenConversation = () => {
    setConversation(conv)
  }

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
        profiles: userProfile || { nickname: '匿名用户' },
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
        realReply.profiles = userProfile || { nickname: '匿名用户' }
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
        <div className="flex-shrink-0 w-7 h-7 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center text-xs mt-0.5">
          {reply.profiles?.nickname ? (
            <span className="text-purple-600 font-medium">{reply.profiles.nickname.charAt(0).toUpperCase()}</span>
          ) : (
            <User className="h-3.5 w-3.5 text-purple-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            <span className="text-sm font-medium text-gray-900">{reply.profiles?.nickname || '匿名用户'}</span>
            {isOwn && (
              <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded">你</span>
            )}
            <span className="text-xs text-gray-400 font-normal">回复</span>
            <span className="text-xs font-medium text-purple-600">@{targetName}</span>
            <span className="text-xs text-gray-400">{formatDate(reply.created_at)}</span>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{reply.content}</p>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <button
              onClick={() => onLike(reply.id)}
              className={`text-xs flex items-center gap-1 transition-colors ${isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
            >
              <Heart className={`h-3 w-3 ${isLiked ? 'fill-current' : ''}`} />
              {likeCount > 0 ? likeCount : '点赞'}
            </button>
            {user && (
              <button
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="text-xs text-gray-400 hover:text-purple-600 flex items-center gap-1 transition-colors"
              >
                <Reply className="h-3 w-3" />
                回复
              </button>
            )}
            {isOwn && (
              <button
                onClick={() => onDelete(reply.id)}
                className="text-xs text-gray-400 hover:text-red-600 flex items-center gap-1 transition-colors"
              >
                <Trash2 className="h-3 w-3" />
                删除
              </button>
            )}
            {/* 查看对话按钮：两人之间有 2 条及以上互动才显示 */}
            {hasConversation && (
              <button
                onClick={handleOpenConversation}
                className="text-xs text-gray-400 hover:text-purple-600 flex items-center gap-1 transition-colors"
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
                placeholder={`回复 @${reply.profiles?.nickname || '匿名用户'}...`}
                className="min-h-[70px] text-sm"
              />
              <div className="flex gap-2 mt-2">
                <Button size="sm" onClick={handleSubmitReply} disabled={submitting} className="bg-purple-600 hover:bg-purple-700">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 mr-1" />发送</>}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setShowReplyForm(false); setReplyContent('') }}>取消</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 对话 Modal */}
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
  activeExpandedComments, // 本次会话中用户刚回复过的评论ID集合
}) {
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [manualExpanded, setManualExpanded] = useState(null) // null=未手动操作, true=手动展开, false=手动收起

  const likeCount = likeStates[comment.id]?.count ?? comment.like_count ?? 0
  const isLiked = likeStates[comment.id]?.isLiked ?? comment.is_liked ?? false
  const isOwn = user?.id === comment.user_id

  // 递归收集该评论下所有层级的回复，按时间排序（平铺展示）
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

  // 本次会话中刚参与过回复的评论才自动展开
  const shouldAutoExpand = activeExpandedComments?.has(comment.id)

  // 展开逻辑：手动操作优先级最高；否则看是否刚参与过回复
  const showAllReplies = manualExpanded !== null ? manualExpanded : shouldAutoExpand

  // 默认只显示 1 条点赞最高的，展开后全显示
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
        profiles: userProfile || { nickname: '匿名用户' },
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
        realReply.profiles = userProfile || { nickname: '匿名用户' }
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
        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center text-sm">
          {comment.profiles?.nickname ? (
            <span className="text-purple-600 font-medium">{comment.profiles.nickname.charAt(0).toUpperCase()}</span>
          ) : (
            <User className="h-5 w-5 text-purple-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-gray-900">{comment.profiles?.nickname || '匿名用户'}</span>
            <span className="text-xs text-gray-400">{formatDate(comment.created_at)}</span>
            {isOwn && <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded">你</span>}
          </div>
          <p className="text-gray-700 text-sm whitespace-pre-wrap break-words">{comment.content}</p>
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={() => onLike(comment.id)}
              className={`text-xs flex items-center gap-1 transition-colors ${isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}
            >
              <Heart className={`h-3 w-3 ${isLiked ? 'fill-current' : ''}`} />
              {likeCount > 0 ? likeCount : '点赞'}
            </button>
            {user && (
              <button
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="text-xs text-gray-500 hover:text-purple-600 flex items-center gap-1 transition-colors"
              >
                <Reply className="h-3 w-3" />
                回复
              </button>
            )}
            {isOwn && (
              <button
                onClick={() => onDelete(comment.id)}
                className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1 transition-colors"
              >
                <Trash2 className="h-3 w-3" />
                删除
              </button>
            )}
          </div>

          {/* 回复输入框（直接回复顶层评论） */}
          {showReplyForm && (
            <div className="mt-3">
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder={`回复 ${comment.profiles?.nickname || '匿名用户'}...`}
                className="min-h-[80px] text-sm"
              />
              <div className="flex gap-2 mt-2">
                <Button size="sm" onClick={handleSubmitReply} disabled={submitting} className="bg-purple-600 hover:bg-purple-700">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 mr-1" />发送回复</>}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setShowReplyForm(false); setReplyContent('') }}>取消</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 回复区（平铺，灰色背景块，无层级缩进） */}
      {(repliesToShow.length > 0 || (!showAllReplies && hiddenCount > 0)) && (
        <div className="mt-2 ml-[52px]">
          <div className="bg-gray-50 rounded-lg px-3 divide-y divide-gray-100">
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

            {/* 展开/收起按钮 */}
            {!showAllReplies && hiddenCount > 0 && (
              <button
                onClick={() => setManualExpanded(true)}
                className="w-full text-left py-2 text-xs text-purple-600 hover:text-purple-700"
              >
                展开 {hiddenCount} 条回复 ›
              </button>
            )}
            {showAllReplies && allReplies.length > 1 && (
              <button
                onClick={() => setManualExpanded(false)}
                className="w-full text-left py-2 text-xs text-gray-400 hover:text-gray-600"
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
  // 本次会话中用户回复过的顶层评论ID集合（用于自动展开回复区）
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
            c.profiles = profileMap[c.user_id] || { nickname: '匿名用户' }
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
    if (!newComment.trim()) { toast.error('请输入评论内容'); return }

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
      profiles: profile || { nickname: '匿名用户' },
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
        realComment.profiles = profile || { nickname: '匿名用户' }
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

      toast.success('评论成功')
    } catch (err) {
      console.error('评论失败:', err)
      setCommentMap(prev => { const next = new Map(prev); next.delete(tempId); return next })
      setCommentIds(prev => prev.filter(id => id !== tempId))
      setNewComment(commentContent)
      toast.error('评论失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── 删除评论（级联删除子评论）
  const handleDelete = async (commentId) => {
    if (!confirm('确定要删除这条评论吗？')) return

    try {
      const { error } = await supabase.from('comments').delete().eq('id', commentId)
      if (error) throw error

      toast.success('删除成功')
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
      toast.error('删除失败，请稍后重试')
    }
  }

  // ─── 点赞（乐观更新）
  const handleLike = useCallback(async (commentId) => {
    if (!user) { toast.error('请先登录后再点赞'); return }

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
      toast.error('操作失败，请稍后重试')
    }
  }, [user, likeStates])

  // ─── 处理回复（追加 / 替换 / 删除临时条目）
  const handleReplyAdded = useCallback((newReply, tempId) => {
    if (newReply && tempId === null) {
      setCommentMap(prev => new Map(prev).set(newReply.id, newReply))
      setCommentIds(prev => [...prev, newReply.id])
      // 找到顶层评论ID并标记为活跃（自动展开）
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
      // 找到顶层评论ID并标记为活跃（自动展开）
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
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-purple-600" />
          评论区
          <span className="text-sm font-normal text-gray-500">
            ({topLevelComments.length} 条评论)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* 评论输入框 */}
        {user ? (
          <div className="mb-6">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center text-sm">
                {profile?.nickname ? (
                  <span className="text-purple-600 font-medium">{profile.nickname.charAt(0).toUpperCase()}</span>
                ) : (
                  <User className="h-5 w-5 text-purple-400" />
                )}
              </div>
              <div className="flex-1">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="写下你的评论..."
                  className="min-h-[100px] mb-3"
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting || !newComment.trim()}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                    发表评论
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg text-center">
            <p className="text-gray-600 mb-3">登录后即可参与讨论</p>
            <div className="flex justify-center gap-3">
              <Link
                to={`/login${toolId ? `?redirect=/tools/${toolId}` : ''}`}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
              >
                登录
              </Link>
              <Link
                to={`/register${toolId ? `?redirect=/tools/${toolId}` : ''}`}
                className="px-4 py-2 border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 transition-colors text-sm"
              >
                注册
              </Link>
            </div>
          </div>
        )}

        {/* 评论列表 */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
          </div>
        ) : topLevelComments.length > 0 ? (
          <div className="divide-y divide-gray-100">
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
          <div className="text-center py-8 text-gray-500">
            <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>暂无评论，快来发表第一条评论吧！</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
