/**
 * DrawAndGuessLobby - 你说我猜游戏大厅
 * 提供创建房间和加入房间的入口
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PlusCircle, LogIn, Palette, Users } from 'lucide-react'
import CreateRoomForm from './CreateRoomForm'
import JoinRoomForm from './JoinRoomForm'

/**
 * @param {Object} props
 * @param {Function} props.onCreateRoom - 创建房间回调
 * @param {Function} props.onJoinRoom - 加入房间回调
 * @param {boolean} props.isLoading - 加载状态
 * @param {string} props.defaultNickname - 默认昵称
 */
export default function DrawAndGuessLobby({ onCreateRoom, onJoinRoom, isLoading, defaultNickname }) {
  const navigate = useNavigate()
  const [mode, setMode] = useState('select') // 'select' | 'create' | 'join'

  const handleCreateSuccess = (room) => {
    onCreateRoom?.(room)
  }

  const handleJoinSuccess = (room) => {
    onJoinRoom?.(room)
  }

  const handleBack = () => {
    setMode('select')
  }

  // 选择模式
  if (mode === 'select') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-yellow-50 to-pink-50 p-4 md:p-6">
        <div className="max-w-2xl mx-auto">
          {/* 顶部标题 */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-400 to-pink-500 rounded-2xl shadow-lg mb-4">
              <Palette className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
              你说我猜
            </h1>
            <p className="text-gray-500">画画猜词，其乐无穷！</p>
          </div>

          {/* 选择卡片 */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* 创建房间 */}
            <Card 
              className="p-6 cursor-pointer hover:shadow-lg transition-all border-2 border-transparent hover:border-orange-300 group"
              onClick={() => setMode('create')}
            >
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-xl mb-4 group-hover:bg-orange-200 transition-colors">
                  <PlusCircle className="w-8 h-8 text-orange-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">创建房间</h2>
                <p className="text-sm text-gray-500">
                  新建一个游戏房间，邀请好友一起来玩
                </p>
              </div>
            </Card>

            {/* 加入房间 */}
            <Card 
              className="p-6 cursor-pointer hover:shadow-lg transition-all border-2 border-transparent hover:border-blue-300 group"
              onClick={() => setMode('join')}
            >
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-xl mb-4 group-hover:bg-blue-200 transition-colors">
                  <LogIn className="w-8 h-8 text-blue-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">加入房间</h2>
                <p className="text-sm text-gray-500">
                  输入房间码，加入好友的游戏
                </p>
              </div>
            </Card>
          </div>

          {/* 游戏介绍 */}
          <Card className="mt-6 p-4 bg-white/80">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-500" />
              游戏玩法
            </h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-orange-500">🎨</span>
                <span>每轮一名玩家绘图描述词语，其他玩家猜测</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500">🧠</span>
                <span>猜对得 1 分，先达到目标分数的团队获胜</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-pink-500">💡</span>
                <span>可以使用提示，但每轮每队只有 2 次机会</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">👥</span>
                <span>支持 2-4 个团队，每队 1-4 人</span>
              </li>
            </ul>
          </Card>

          {/* 返回按钮 */}
          <div className="mt-6 text-center">
            <Button
              variant="ghost"
              onClick={() => navigate('/games')}
              className="text-gray-500 hover:text-gray-700"
            >
              返回游戏列表
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // 创建房间
  if (mode === 'create') {
    return (
      <CreateRoomForm
        onSubmit={handleCreateSuccess}
        onBack={handleBack}
        isLoading={isLoading}
        defaultNickname={defaultNickname}
      />
    )
  }

  // 加入房间
  if (mode === 'join') {
    return (
      <JoinRoomForm
        onSubmit={handleJoinSuccess}
        onBack={handleBack}
        isLoading={isLoading}
        defaultNickname={defaultNickname}
      />
    )
  }
}
