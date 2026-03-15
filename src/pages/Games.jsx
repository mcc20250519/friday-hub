import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Clock, Gauge, Gamepad2, Sparkles } from 'lucide-react'

/**
 * 游戏数据
 */
const games = [
  {
    id: 'uno',
    name: 'UNO 在线游戏',
    desc: '经典 UNO 纸牌游戏在线版，支持 2-4 人实时对战，邀请朋友一起玩',
    tags: ['纸牌', '策略', '多人', '实时对战'],
    players: '2-4人',
    duration: '10-30分钟',
    difficulty: '简单',
    emoji: '🃏',
    gradient: 'from-purple-400 via-pink-500 to-red-600',
    available: true,
  },
  {
    id: 'party',
    name: 'AI桌游聚会游戏',
    desc: '你说我猜 + AI出题，支持多人同时游玩，AI实时生成题目，保证每次都不重样',
    tags: ['多人', '聚会', '你说我猜', 'AI出题'],
    players: '2-10人',
    duration: '15-60分钟',
    difficulty: '简单',
    emoji: '🎮',
    gradient: 'from-orange-400 via-pink-500 to-purple-600',
    available: true,
  },
  {
    id: 'coming-soon-1',
    name: 'AI剧本杀',
    desc: 'AI生成剧本，扮演角色推理破案，每次剧情都不一样',
    tags: ['推理', '角色扮演', 'AI剧本'],
    players: '4-8人',
    duration: '30-90分钟',
    difficulty: '中等',
    emoji: '🕵️',
    gradient: 'from-blue-400 via-cyan-500 to-teal-600',
    available: false,
  },
  {
    id: 'coming-soon-2',
    name: 'AI知识竞答',
    desc: 'AI生成趣味题目，涵盖各领域知识，支持实时对战',
    tags: ['知识', '竞答', '对战'],
    players: '2-20人',
    duration: '10-30分钟',
    difficulty: '可调',
    emoji: '🧠',
    gradient: 'from-green-400 via-emerald-500 to-teal-600',
    available: false,
  },
]

/**
 * 游戏卡片组件
 */
function GameCard({ game }) {
  const navigate = useNavigate()

  return (
    <Card className={`overflow-hidden transition-all duration-300 ${
      game.available ? 'hover:shadow-2xl hover:-translate-y-1' : 'opacity-75'
    }`}>
      {/* 游戏封面 */}
      <div className={`h-48 bg-gradient-to-br ${game.gradient} flex items-center justify-center relative`}>
        <span className="text-7xl">{game.emoji}</span>
        
        {/* 即将上线标签 */}
        {!game.available && (
          <div className="absolute inset-0 bg-gray-900/60 flex items-center justify-center">
            <span className="px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-full border border-gray-600">
              即将上线
            </span>
          </div>
        )}

        {/* 特色标签 */}
        {game.available && (
          <div className="absolute top-4 right-4 flex items-center gap-1 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-xs font-medium">
            <Sparkles className="h-3 w-3" />
            AI 驱动
          </div>
        )}
      </div>

      <CardContent className="p-6">
        {/* 游戏名称 */}
        <h3 className="text-xl font-bold text-gray-900 mb-2">{game.name}</h3>

        {/* 游戏描述 */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{game.desc}</p>

        {/* 标签 */}
        <div className="flex flex-wrap gap-2 mb-4">
          {game.tags.map((tag, index) => (
            <span 
              key={index}
              className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* 游戏信息 */}
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-6">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{game.players}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{game.duration}</span>
          </div>
          <div className="flex items-center gap-1">
            <Gauge className="h-4 w-4" />
            <span>{game.difficulty}</span>
          </div>
        </div>

        {/* 操作按钮 */}
        {game.available ? (
          <Button 
            className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-semibold"
            onClick={() => navigate(`/games/${game.id}`)}
          >
            <Gamepad2 className="h-4 w-4 mr-2" />
            立即游玩
          </Button>
        ) : (
          <Button 
            className="w-full" 
            variant="outline" 
            disabled
          >
            敬请期待
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * 游戏广场页面
 */
export default function Games() {
  const [isEntering, setIsEntering] = useState(true)

  // 淡入效果：组件挂载后触发淡入动画
  useEffect(() => {
    // 下一帧开始淡入
    const timer = requestAnimationFrame(() => {
      setIsEntering(false)
    })
    return () => cancelAnimationFrame(timer)
  }, [])

  return (
    <div 
      className="min-h-screen bg-gray-50 transition-opacity duration-500 ease-out"
      style={{ opacity: isEntering ? 0 : 1 }}
    >
      {/* 顶部 Banner */}
      <div className="bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600 text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 sm:py-20">
          <div className="text-center">
            {/* 图标 */}
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl mb-6">
              <Gamepad2 className="h-8 w-8" />
            </div>

            {/* 标题 */}
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              游戏广场
            </h1>

            {/* 副标题 */}
            <p className="text-lg sm:text-xl text-white/90 max-w-2xl mx-auto">
              AI驱动的聚会小游戏，让每次聚会都不一样
            </p>

            {/* 特性标签 */}
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              <span className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium">
                🤖 AI 实时生成
              </span>
              <span className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium">
                👥 多人同乐
              </span>
              <span className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium">
                🎲 永不重样
              </span>
            </div>
          </div>
        </div>

        {/* 波浪底部装饰 */}
        <div className="h-8 bg-gray-50" style={{
          clipPath: 'ellipse(75% 100% at 50% 100%)'
        }} />
      </div>

      {/* 游戏列表 */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* 区块标题 */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-orange-500" />
            热门游戏
          </h2>
          <p className="text-gray-500 mt-1">选择一款游戏开始你的 AI 聚会体验</p>
        </div>

        {/* 游戏卡片网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>

        {/* 底部提示 */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-orange-50 text-orange-700 rounded-full">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">更多游戏正在开发中，敬请期待...</span>
          </div>
        </div>
      </div>
    </div>
  )
}
