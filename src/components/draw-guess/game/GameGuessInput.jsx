/**
 * GameGuessInput - 猜测输入框
 * 在猜测阶段显示，支持实时输入和反馈
 */

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Send, Check, X, Loader2 } from 'lucide-react'

/**
 * @param {Object} props
 * @param {Array} props.guesses - 猜测记录列表
 * @param {Function} props.onSubmitGuess - 提交猜测回调
 * @param {boolean} props.disabled - 是否禁用
 * @param {string} props.currentUserId - 当前用户ID
 */
export default function GameGuessInput({ 
  guesses = [], 
  onSubmitGuess, 
  disabled = false,
  currentUserId 
}) {
  const [inputValue, setInputValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  // 自动聚焦
  useEffect(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus()
    }
  }, [disabled])

  // 自动滚动到底部
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [guesses])

  // 提交猜测
  const handleSubmit = async () => {
    if (!inputValue.trim() || disabled || isSubmitting) return

    setIsSubmitting(true)
    try {
      await onSubmitGuess?.(inputValue.trim())
      setInputValue('')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 键盘事件
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // 格式化时间
  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  return (
    <Card className="p-4">
      <div className="space-y-3">
        {/* 标题 */}
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-800">猜测记录</span>
          <span className="text-sm text-gray-500">{guesses.length} 次</span>
        </div>

        {/* 猜测列表 */}
        <div 
          ref={listRef}
          className="h-40 overflow-y-auto space-y-1 bg-gray-50 rounded-lg p-2"
        >
          {guesses.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-4">
              还没有人猜测...
            </div>
          ) : (
            guesses.map((guess, index) => {
              const isCurrentUser = guess.userId === currentUserId || guess.user_id === currentUserId
              
              return (
                <div 
                  key={index}
                  className={`flex items-center gap-2 px-2 py-1 rounded ${
                    guess.is_correct ? 'bg-green-50' : isCurrentUser ? 'bg-blue-50' : ''
                  }`}
                >
                  {/* 结果图标 */}
                  {guess.is_correct ? (
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <X className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  )}
                  
                  {/* 玩家名称 */}
                  <span className="text-sm text-gray-500 flex-shrink-0">
                    {guess.playerName || guess.player_name || '玩家'}:
                  </span>
                  
                  {/* 猜测内容 */}
                  <span className={`text-sm ${
                    guess.is_correct ? 'text-green-600 font-medium' : 'text-gray-800'
                  }`}>
                    {guess.guess}
                  </span>
                  
                  {/* 时间 */}
                  {guess.timestamp && (
                    <span className="text-xs text-gray-400 ml-auto">
                      {formatTime(guess.timestamp)}
                    </span>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* 输入区域 */}
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入你的猜测..."
            disabled={disabled || isSubmitting}
            className="flex-1"
          />
          <Button
            onClick={handleSubmit}
            disabled={!inputValue.trim() || disabled || isSubmitting}
            className="px-4"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* 禁用提示 */}
        {disabled && (
          <div className="text-center text-sm text-gray-400">
            等待下一轮...
          </div>
        )}
      </div>
    </Card>
  )
}
