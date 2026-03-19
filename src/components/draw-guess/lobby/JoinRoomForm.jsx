/**
 * JoinRoomForm - 加入房间表单
 * 输入房间码和昵称加入游戏
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Loader2, KeyRound, User } from 'lucide-react'

/**
 * @param {Object} props
 * @param {Function} props.onSubmit - 提交回调
 * @param {Function} props.onBack - 返回回调
 * @param {boolean} props.isLoading - 加载状态
 * @param {string} props.defaultNickname - 默认昵称
 */
export default function JoinRoomForm({ onSubmit, onBack, isLoading, defaultNickname }) {
  const [roomCode, setRoomCode] = useState('')
  const [displayName, setDisplayName] = useState(defaultNickname || '')
  const [errors, setErrors] = useState({})

  // 验证表单
  const validateForm = () => {
    const newErrors = {}

    if (!roomCode.trim()) {
      newErrors.roomCode = '请输入房间码'
    } else if (!/^[A-Za-z0-9]{6}$/.test(roomCode.trim())) {
      newErrors.roomCode = '房间码应为 6 位字母或数字'
    }

    if (!displayName.trim()) {
      newErrors.displayName = '请输入你的昵称'
    } else if (displayName.length > 20) {
      newErrors.displayName = '昵称不能超过 20 个字符'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 提交表单
  const handleSubmit = () => {
    if (!validateForm()) return

    onSubmit({
      roomCode: roomCode.trim().toUpperCase(),
      displayName: displayName.trim()
    })
  }

  // 处理房间码输入（自动转大写）
  const handleRoomCodeChange = (e) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (value.length <= 6) {
      setRoomCode(value)
    }
  }

  // 键盘事件处理
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSubmit()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      <div className="max-w-md mx-auto">
        {/* 顶部 */}
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            onClick={onBack}
            className="mr-4"
            disabled={isLoading}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">加入房间</h1>
            <p className="text-sm text-gray-500">输入房间码加入游戏</p>
          </div>
        </div>

        {/* 表单 */}
        <Card className="p-6">
          <div className="space-y-4">
            {/* 房间码 */}
            <div>
              <Label className="text-gray-700 font-medium mb-2 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-blue-500" />
                房间码
              </Label>
              <Input
                value={roomCode}
                onChange={handleRoomCodeChange}
                onKeyDown={handleKeyDown}
                placeholder="输入 6 位房间码"
                className={`text-center text-xl tracking-widest font-mono ${
                  errors.roomCode ? 'border-red-300' : ''
                }`}
                disabled={isLoading}
                autoFocus
              />
              {errors.roomCode && (
                <p className="text-red-500 text-sm mt-1">{errors.roomCode}</p>
              )}
            </div>

            {/* 昵称 */}
            <div>
              <Label className="text-gray-700 font-medium mb-2 flex items-center gap-2">
                <User className="w-4 h-4 text-purple-500" />
                你的昵称
              </Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入你在游戏中的昵称"
                className={errors.displayName ? 'border-red-300' : ''}
                disabled={isLoading}
              />
              {errors.displayName && (
                <p className="text-red-500 text-sm mt-1">{errors.displayName}</p>
              )}
            </div>

            {/* 提交按钮 */}
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  加入中...
                </>
              ) : (
                '加入房间'
              )}
            </Button>
          </div>
        </Card>

        {/* 提示 */}
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-700">
            向房主索要 6 位房间码，输入后即可加入游戏
          </p>
        </div>
      </div>
    </div>
  )
}
