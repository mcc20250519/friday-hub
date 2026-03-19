import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { generateWords } from '@/lib/aiClient'
import { toast } from '@/hooks/useToast'
import { 
  Gamepad2, 
  Eye, 
  EyeOff, 
  Shield, 
  Users, 
  Clock, 
  Sparkles,
  Check,
  AlertCircle,
  Settings2,
  Play,
  Trophy,
  RotateCcw,
  SkipForward,
  EyeIcon,
  EyeOffIcon,
  Share2
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

// 智能服务商选项
const AI_PROVIDERS = [
  { value: 'openai', label: 'OpenAI (gpt-3.5-turbo)', model: 'gpt-3.5-turbo' },
  { value: 'claude', label: 'Claude (claude-3-haiku)', model: 'claude-3-haiku' },
  { value: 'qwen', label: '通义千问 (qwen-turbo) ⭐ 推荐', model: 'qwen-turbo' },
  { value: 'gemini', label: 'Gemini (gemini-pro)', model: 'gemini-pro' },
]

// 题目主题选项
const TOPICS = [
  { id: 'food', label: '美食', emoji: '🍕' },
  { id: 'movie', label: '影视', emoji: '🎬' },
  { id: 'animal', label: '动物', emoji: '🐾' },
  { id: 'sports', label: '运动', emoji: '🏆' },
  { id: 'tech', label: '科技', emoji: '💻' },
  { id: 'music', label: '音乐', emoji: '🎵' },
  { id: 'geography', label: '地理', emoji: '🌍' },
  { id: 'funny', label: '搞笑', emoji: '😂' },
]

// 步骤指示器组件
function StepIndicator({ currentStep }) {
  const steps = [
    { id: 'setup', label: '设置', icon: Settings2 },
    { id: 'playing', label: '游戏中', icon: Play },
    { id: 'result', label: '结算', icon: Trophy },
  ]

  const currentIndex = steps.findIndex(s => s.id === currentStep)

  return (
    <div className="flex items-center justify-center mb-4 sm:mb-8">
      <div className="flex items-center gap-1 sm:gap-2">
        {steps.map((step, index) => {
          const Icon = step.icon
          const isActive = index === currentIndex
          const isCompleted = index < currentIndex

          return (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-full transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg'
                    : isCompleted
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                <div
                  className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold ${
                    isActive
                      ? 'bg-white/20'
                      : isCompleted
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-300'
                  }`}
                >
                  {isCompleted ? <Check className="h-3 w-3 sm:h-4 sm:w-4" /> : index + 1}
                </div>
                <span className="text-xs sm:text-sm font-medium hidden sm:inline">{step.label}</span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-4 sm:w-8 h-0.5 mx-1 sm:mx-2 ${
                    index < currentIndex ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Toast 提示组件
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div
      className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg transition-all ${
        type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
      }`}
    >
      <div className="flex items-center gap-2">
        <span>{message}</span>
        <button onClick={onClose} className="ml-2 hover:opacity-70">
          ×
        </button>
      </div>
    </div>
  )
}

// Setup 步骤组件
function SetupStep({ onStartGame }) {
  // API 配置
  const [provider, setProvider] = useState('qwen')
  const [apiKey, setApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [rememberKey, setRememberKey] = useState(false)

  // 游戏设置
  const [selectedTopics, setSelectedTopics] = useState([])
  const [playerCount, setPlayerCount] = useState(4)
  const [questionsPerRound, setQuestionsPerRound] = useState(10)
  const [timePerQuestion, setTimePerQuestion] = useState(60)

  // Toast
  const [toast, setToast] = useState(null)
  const showToast = (message, type = 'success') => {
    setToast({ message, type })
  }

  // 从 localStorage 读取保存的 API Key
  useEffect(() => {
    const savedKey = localStorage.getItem('friday_hub_api_key')
    if (savedKey) {
      try {
        setApiKey(atob(savedKey))
        setRememberKey(true)
      } catch (e) {
        console.error('读取保存的 API Key 失败')
      }
    }
  }, [])

  // 切换主题选择
  const toggleTopic = (topicId) => {
    setSelectedTopics((prev) => {
      if (prev.includes(topicId)) {
        return prev.filter((id) => id !== topicId)
      }
      if (prev.length >= 3) {
        showToast('最多选择3个主题', 'error')
        return prev
      }
      return [...prev, topicId]
    })
  }

  // 开始游戏
  const handleStartGame = () => {
    // 验证 API Key
    if (!apiKey.trim()) {
      showToast('请填写 API Key', 'error')
      return
    }

    // 验证主题
    if (selectedTopics.length === 0) {
      showToast('请至少选择一个主题', 'error')
      return
    }

    // 保存 API Key
    if (rememberKey) {
      localStorage.setItem('friday_hub_api_key', btoa(apiKey))
    } else {
      localStorage.removeItem('friday_hub_api_key')
    }

    // 传递游戏配置
    const gameConfig = {
      provider: AI_PROVIDERS.find((p) => p.value === provider),
      apiKey,
      topics: selectedTopics.map((id) => TOPICS.find((t) => t.id === id)),
      playerCount,
      questionsPerRound,
      timePerQuestion,
    }

    onStartGame(gameConfig)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* API 配置卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            配置智能引擎
          </CardTitle>
          <CardDescription>选择智能服务商并配置 API Key</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 智能服务商选择 */}
          <div className="space-y-2">
            <Label>智能服务商</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger>
                <SelectValue placeholder="选择智能服务商" />
              </SelectTrigger>
              <SelectContent>
                {AI_PROVIDERS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {provider === 'qwen' && (
              <p className="text-xs text-orange-600">⭐ 推荐：国内用户访问更稳定</p>
            )}
          </div>

          {/* API Key 输入 */}
          <div className="space-y-2">
            <Label>API Key</Label>
            <div className="relative">
              <Input
                type={showApiKey ? 'text' : 'password'}
                placeholder="请输入您的 API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* 记住 Key */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="remember"
              checked={rememberKey}
              onCheckedChange={(checked) => setRememberKey(checked)}
            />
            <Label htmlFor="remember" className="text-sm cursor-pointer">
              记住 Key（仅保存在本地浏览器）
            </Label>
          </div>

          {/* 安全提示 */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">
            <Shield className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>您的 API Key 仅保存在本地浏览器，不会上传到任何服务器</p>
          </div>
        </CardContent>
      </Card>

      {/* 游戏设置卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gamepad2 className="h-5 w-5 text-orange-500" />
            游戏设置
          </CardTitle>
          <CardDescription>配置游戏规则和玩法</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 游戏模式 */}
          <div className="space-y-2">
            <Label>游戏模式</Label>
            <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <Check className="h-5 w-5 text-orange-500" />
              <span className="font-medium">你说我猜</span>
              <span className="text-sm text-gray-500 ml-2">（经典玩法，智能实时出题）</span>
            </div>
          </div>

          {/* 题目主题 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>题目主题（至少选 1 个，最多 3 个）</Label>
              <span className="text-sm text-gray-500">
                已选 {selectedTopics.length}/3
              </span>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {TOPICS.map((topic) => (
                  <button
                  key={topic.id}
                  onClick={() => toggleTopic(topic.id)}
                  className={`relative flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${
                    selectedTopics.includes(topic.id)
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-2xl">{topic.emoji}</span>
                  <span className="text-xs">{topic.label}</span>
                  {selectedTopics.includes(topic.id) && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
            {selectedTopics.length === 0 && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                请至少选择一个主题
              </p>
            )}
          </div>

          {/* 玩家人数 */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              玩家人数
            </Label>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPlayerCount(Math.max(2, playerCount - 1))}
                disabled={playerCount <= 2}
              >
                -
              </Button>
              <span className="text-xl font-bold w-8 text-center">{playerCount}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPlayerCount(Math.min(10, playerCount + 1))}
                disabled={playerCount >= 10}
              >
                +
              </Button>
              <span className="text-sm text-gray-500">人</span>
            </div>
          </div>

          {/* 每轮题目数 */}
          <div className="space-y-2">
            <Label>每轮题目数</Label>
            <div className="flex gap-2">
              {[5, 10, 15].map((num) => (
                <Button
                  key={num}
                  variant={questionsPerRound === num ? 'default' : 'outline'}
                  onClick={() => setQuestionsPerRound(num)}
                  className={questionsPerRound === num ? 'bg-orange-500 hover:bg-orange-600' : ''}
                >
                  {num} 题
                </Button>
              ))}
            </div>
          </div>

          {/* 每题时间 */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              每题时间
            </Label>
            <div className="flex gap-2">
              {[30, 60, 90].map((time) => (
                <Button
                  key={time}
                  variant={timePerQuestion === time ? 'default' : 'outline'}
                  onClick={() => setTimePerQuestion(time)}
                  className={timePerQuestion === time ? 'bg-orange-500 hover:bg-orange-600' : ''}
                >
                  {time} 秒
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 开始游戏按钮 */}
      <Button
        size="lg"
        className="w-full h-14 text-lg font-bold bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 hover:from-orange-600 hover:via-pink-600 hover:to-purple-700 shadow-lg"
        onClick={handleStartGame}
      >
        <Play className="h-5 w-5 mr-2" />
        开始游戏
      </Button>
    </div>
  )
}

// 倒计时圆形进度条组件
function CountdownCircle({ seconds, totalSeconds, size = 120 }) {
  const progress = seconds / totalSeconds
  const circumference = 2 * Math.PI * ((size - 8) / 2)
  const strokeDashoffset = circumference * (1 - progress)

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* 背景圆 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={(size - 8) / 2}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="6"
        />
        {/* 进度圆 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={(size - 8) / 2}
          fill="none"
          stroke="url(#gradient)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl sm:text-3xl font-bold text-gray-900">{seconds}</span>
      </div>
    </div>
  )
}

// 得分板组件
function ScoreBoard({ scores, currentPlayer }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-4">
      <h3 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-1">
        <Trophy className="h-4 w-4" />
        得分榜
      </h3>
      <div className="space-y-2">
        {scores.map((score, index) => (
          <div
            key={index}
            className={`flex items-center justify-between p-2 rounded-lg ${
              index === currentPlayer
                ? 'bg-orange-100 border border-orange-200'
                : 'bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  index === currentPlayer
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}
              >
                {index + 1}
              </span>
              <span className="text-sm font-medium">玩家{index + 1}</span>
              {index === currentPlayer && (
                <span className="text-xs text-orange-600 font-medium">当前</span>
              )}
            </div>
            <span className="text-lg font-bold text-gray-900">{score}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Playing 步骤组件
function PlayingStep({ config, onGameEnd }) {
  // 游戏状态
  const [words, setWords] = useState([])
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [currentPlayer, setCurrentPlayer] = useState(0)
  const [scores, setScores] = useState(() => Array(config.playerCount).fill(0))
  const [timeLeft, setTimeLeft] = useState(config.timePerQuestion)
  const [showWord, setShowWord] = useState(false)
  const [gameStatus, setGameStatus] = useState('loading') // loading, ready, playing, finished
  const [error, setError] = useState(null)

  // 总计时
  const [totalTime, setTotalTime] = useState(0)

  // 生成题目
  useEffect(() => {
    const generate = async () => {
      const result = await generateWords(
        {
          provider: config.provider.value,
          apiKey: config.apiKey,
          model: config.provider.model,
        },
        {
          count: config.questionsPerRound,
          topics: config.topics.map((t) => t.label),
        }
      )

      if (result.success) {
        setWords(result.data)
        setGameStatus('ready')
      } else {
        setError(result.error)
        setGameStatus('error')
      }
    }

    generate()
  }, [config])

  // 倒计时
  useEffect(() => {
    if (gameStatus !== 'playing' || timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // 时间到，自动跳过
          handleSkip()
          return config.timePerQuestion
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [gameStatus, timeLeft, config.timePerQuestion])

  // 总计时
  useEffect(() => {
    if (gameStatus !== 'playing') return

    const timer = setInterval(() => {
      setTotalTime((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [gameStatus])

  // 下一题
  const nextQuestion = useCallback(() => {
    if (currentWordIndex >= words.length - 1) {
      // 游戏结束
      setGameStatus('finished')
      onGameEnd?.({ scores, totalTime, words })
    } else {
      setCurrentWordIndex((prev) => prev + 1)
      setCurrentPlayer((prev) => (prev + 1) % config.playerCount)
      setTimeLeft(config.timePerQuestion)
      setShowWord(false)
    }
  }, [currentWordIndex, words.length, config.playerCount, config.timePerQuestion, scores, totalTime, onGameEnd])

  // 猜对了
  const handleCorrect = () => {
    setScores((prev) => {
      const newScores = [...prev]
      newScores[currentPlayer] += 1
      return newScores
    })
    nextQuestion()
  }

  // 跳过
  const handleSkip = () => {
    nextQuestion()
  }

  // 开始游戏
  const handleStart = () => {
    setGameStatus('playing')
    setShowWord(true)
  }

  // 重新开始
  const handleRestart = () => {
    window.location.reload()
  }

  // 格式化时间
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Loading 状态
  if (gameStatus === 'loading') {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto mb-6"></div>
        <h2 className="text-2xl font-bold mb-2">智能引擎正在出题中...</h2>
        <p className="text-gray-500">根据您选择的主题生成题目</p>
      </div>
    )
  }

  // Error 状态
  if (gameStatus === 'error') {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold mb-2">出题失败</h2>
        <p className="text-gray-500 mb-6">{error}</p>
        <Button onClick={handleRestart}>
          <RotateCcw className="h-4 w-4 mr-2" />
          返回设置
        </Button>
      </div>
    )
  }

  // 准备开始
  if (gameStatus === 'ready') {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="text-center py-16">
          <CardContent>
            <div className="w-20 h-20 bg-gradient-to-r from-orange-400 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Play className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2">准备就绪！</h2>
            <p className="text-gray-500 mb-2">已生成 {words.length} 道题目</p>
            <p className="text-gray-500 mb-8">
              主题：{config.topics.map((t) => t.emoji + t.label).join(' ')}
            </p>
            <Button
              size="lg"
              className="h-14 px-8 text-lg bg-gradient-to-r from-orange-500 to-pink-500"
              onClick={handleStart}
            >
              <Play className="h-5 w-5 mr-2" />
              开始游戏
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 游戏结束
  if (gameStatus === 'finished') {
    const winnerIndex = scores.indexOf(Math.max(...scores))
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="text-center py-12">
          <CardContent>
            <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-2">游戏结束！</h2>
            <p className="text-gray-500 mb-8">总用时：{formatTime(totalTime)}</p>

            <div className="max-w-sm mx-auto mb-8">
              <h3 className="text-sm font-semibold text-gray-500 mb-4">最终得分</h3>
              <div className="space-y-2">
                {scores
                  .map((score, index) => ({ score, index }))
                  .sort((a, b) => b.score - a.score)
                  .map((item, rank) => (
                    <div
                      key={item.index}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        item.index === winnerIndex
                          ? 'bg-yellow-100 border border-yellow-200'
                          : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-gray-400">#{rank + 1}</span>
                        <span className="font-medium">玩家{item.index + 1}</span>
                        {item.index === winnerIndex && (
                          <span className="text-xs bg-yellow-500 text-white px-2 py-0.5 rounded-full">
                            冠军
                          </span>
                        )}
                      </div>
                      <span className="text-xl font-bold">{item.score}</span>
                    </div>
                  ))}
              </div>
            </div>

            <Button onClick={handleRestart}>
              <RotateCcw className="h-4 w-4 mr-2" />
              再玩一局
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 游戏进行中
  return (
    <div className="max-w-4xl mx-auto">
      {/* 顶部状态栏 - 移动端优化 */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="bg-white rounded-lg px-3 sm:px-4 py-2 shadow-sm border">
            <span className="text-xs sm:text-sm text-gray-500">题目</span>
            <span className="text-base sm:text-lg font-bold ml-1 sm:ml-2">
              {currentWordIndex + 1} / {words.length}
            </span>
          </div>
          <div className="bg-white rounded-lg px-3 sm:px-4 py-2 shadow-sm border">
            <span className="text-xs sm:text-sm text-gray-500">回合</span>
            <span className="text-base sm:text-lg font-bold ml-1 sm:ml-2 text-orange-600">
              玩家{currentPlayer + 1}
            </span>
          </div>
        </div>
        <div className="bg-white rounded-lg px-3 sm:px-4 py-2 shadow-sm border flex items-center gap-1 sm:gap-2">
          <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
          <span className="text-xs sm:text-sm text-gray-500">总用时</span>
          <span className="text-base sm:text-lg font-bold">{formatTime(totalTime)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* 左侧：题目展示区 */}
        <div className="lg:col-span-2 order-2 lg:order-1">
          <Card className="h-full">
            <CardContent className="p-4 sm:p-8">
              {!showWord ? (
                // 等待状态
                <div className="text-center py-8 sm:py-12">
                  <div className="text-6xl sm:text-8xl mb-4 sm:mb-6">🙈</div>
                  <h3 className="text-lg sm:text-xl font-bold mb-2">猜题者先别看！</h3>
                  <p className="text-gray-500 mb-6 sm:mb-8 text-sm sm:text-base">请把手机/电脑交给描述者</p>
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-orange-500 to-pink-500 h-12 sm:h-14 px-4 sm:px-6 text-sm sm:text-base"
                    onClick={() => setShowWord(true)}
                  >
                    <EyeIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                    <span className="whitespace-nowrap">我是描述者，点击看题</span>
                  </Button>
                </div>
              ) : (
                // 题目显示状态
                <div className="text-center">
                  <div className="mb-4 sm:mb-8">
                    <CountdownCircle
                      seconds={timeLeft}
                      totalSeconds={config.timePerQuestion}
                      size={140}
                    />
                  </div>

                  <div className="mb-6 sm:mb-8">
                    <span className="text-xs sm:text-sm text-gray-500 mb-1 sm:mb-2 block">请描述这个词语</span>
                    <h2 className="text-3xl sm:text-5xl font-bold text-gray-900 py-4 sm:py-8 break-words">
                      {words[currentWordIndex]}
                    </h2>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-2 sm:px-0">
                    <Button
                      size="lg"
                      className="h-12 sm:h-14 px-4 sm:px-8 bg-green-500 hover:bg-green-600 text-sm sm:text-base"
                      onClick={handleCorrect}
                    >
                      <Check className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                      猜对了！+1分
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="h-12 sm:h-14 px-4 sm:px-8 text-sm sm:text-base"
                      onClick={handleSkip}
                    >
                      <SkipForward className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                      跳过
                    </Button>
                  </div>

                  <button
                    onClick={() => setShowWord(false)}
                    className="mt-4 sm:mt-6 text-xs sm:text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1 mx-auto"
                  >
                    <EyeOffIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                    隐藏题目
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 右侧：得分板 - 移动端显示在上方 */}
        <div className="lg:col-span-1 order-1 lg:order-2">
          <ScoreBoard scores={scores} currentPlayer={currentPlayer} />

          {/* 当前设置信息 */}
          <Card className="mt-4 hidden sm:block">
            <CardContent className="p-4">
              <h4 className="text-sm font-semibold text-gray-500 mb-2">当前设置</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">主题</span>
                  <span>{config.topics.map((t) => t.emoji).join(' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">每题时间</span>
                  <span>{config.timePerQuestion}秒</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// 彩带动画组件
function Confetti() {
  const colors = ['#f97316', '#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b']
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {Array.from({ length: 50 }).map((_, i) => {
        const left = Math.random() * 100
        const delay = Math.random() * 3
        const duration = 2 + Math.random() * 2
        const color = colors[Math.floor(Math.random() * colors.length)]
        
        return (
          <div
            key={i}
            className="absolute w-2 h-3 rounded-sm"
            style={{
              left: `${left}%`,
              top: '-20px',
              backgroundColor: color,
              animation: `confetti-fall ${duration}s ${delay}s linear infinite`,
            }}
          />
        )
      })}
      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(-20px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}

// 烟花动画组件
function Fireworks() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-40">
      {Array.from({ length: 5 }).map((_, i) => {
        const left = 20 + Math.random() * 60
        const top = 10 + Math.random() * 30
        const delay = i * 0.5
        
        return (
          <div
            key={i}
            className="absolute"
            style={{ left: `${left}%`, top: `${top}%` }}
          >
            {Array.from({ length: 12 }).map((_, j) => {
              const angle = (j * 30) * (Math.PI / 180)
              const distance = 60 + Math.random() * 40
              
              return (
                <div
                  key={j}
                  className="absolute w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: ['#f97316', '#ec4899', '#8b5cf6', '#3b82f6'][j % 4],
                    animation: `firework-explode 1s ${delay}s ease-out forwards`,
                    '--angle': `${angle}rad`,
                    '--distance': `${distance}px`,
                  }}
                />
              )
            })}
          </div>
        )
      })}
      <style>{`
        @keyframes firework-explode {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(calc(cos(var(--angle)) * var(--distance)), calc(sin(var(--angle)) * var(--distance))) scale(0);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}

// Result 步骤组件
function ResultStep({ result, config, onPlayAgain, onChangeGame }) {
  const { scores, totalTime, words } = result
  const [showCopied, setShowCopied] = useState(false)

  // 计算统计数据
  const totalQuestions = words.length
  const correctAnswers = scores.reduce((a, b) => a + b, 0)
  const accuracy = Math.round((correctAnswers / totalQuestions) * 100)

  // 排序后的排名
  const rankings = scores
    .map((score, index) => ({ score, index }))
    .sort((a, b) => b.score - a.score)

  // 奖牌图标和颜色
  const medals = [
    { icon: '🏆', color: 'from-yellow-400 to-yellow-600', label: '冠军' },
    { icon: '🥈', color: 'from-gray-300 to-gray-500', label: '亚军' },
    { icon: '🥉', color: 'from-orange-400 to-orange-600', label: '季军' },
  ]

  // 格式化时间
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}分${secs}秒`
  }

  // 生成分享文案
  const generateShareText = () => {
    const top3 = rankings.slice(0, 3)
    const medals = ['🏆', '🥈', '🥉']
    
    const scoreLines = top3
      .map((item, i) => `${medals[i]} 玩家${item.index + 1}: ${item.score}分`)
      .join('\n')
    
    return `我们刚刚玩了智能你说我猜！

${scoreLines}

答对率：${accuracy}%

快来 Friday Hub 试试 → ${window.location.origin}`
  }

  // 分享结果
  const handleShare = async () => {
    const text = generateShareText()
    try {
      await navigator.clipboard.writeText(text)
      toast.success('已复制到剪贴板')
    } catch (err) {
      toast.error('复制失败，请手动复制')
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Confetti />
      <Fireworks />
      
      {showCopied && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-green-500 text-white rounded-lg shadow-lg">
          已复制到剪贴板！
        </div>
      )}

      <Card className="overflow-hidden">
        {/* 顶部庆祝区域 */}
        <div className="bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600 text-white text-center py-6 sm:py-10 relative px-4">
          <div className="text-4xl sm:text-6xl mb-2 sm:mb-4">🎉</div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">游戏结束！</h2>
          <p className="text-white/80 text-sm sm:text-base">太棒了！你们完成了所有挑战</p>
        </div>

        <CardContent className="p-4 sm:p-8">
          {/* 排名展示 */}
          <div className="mb-6 sm:mb-8">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4 sm:mb-6 text-center">最终排名</h3>
            
            {/* 前三名特殊展示 */}
            <div className="flex justify-center items-end gap-2 sm:gap-4 mb-6 sm:mb-8">
              {rankings.slice(0, 3).map((item, rank) => {
                const medal = medals[rank]
                const isFirst = rank === 0
                
                return (
                  <div
                    key={item.index}
                    className={`text-center ${isFirst ? 'order-2' : rank === 1 ? 'order-1' : 'order-3'}`}
                  >
                    <div
                      className={`mx-auto mb-2 sm:mb-3 rounded-full bg-gradient-to-br ${medal.color} flex items-center justify-center shadow-lg ${
                        isFirst ? 'animate-pulse' : ''
                      }`}
                      style={{ 
                        width: isFirst ? '70px' : '50px', 
                        height: isFirst ? '70px' : '50px',
                        marginTop: isFirst ? '0' : '15px'
                      }}
                    >
                      <span className="text-2xl sm:text-4xl">{medal.icon}</span>
                    </div>
                    <div className={`font-bold text-sm sm:text-lg`}>
                      玩家{item.index + 1}
                    </div>
                    <div className={`font-bold ${isFirst ? 'text-xl sm:text-3xl text-orange-500' : 'text-lg sm:text-2xl text-gray-700'}`}>
                      {item.score}分
                    </div>
                    <div className="text-xs sm:text-sm text-gray-500">{medal.label}</div>
                  </div>
                )
              })}
            </div>

            {/* 其他玩家 */}
            {rankings.length > 3 && (
              <div className="space-y-2 max-w-sm mx-auto">
                {rankings.slice(3).map((item, idx) => (
                  <div
                    key={item.index}
                    className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className="text-gray-400 font-bold text-sm">#{idx + 4}</span>
                      <span className="font-medium text-sm">玩家{item.index + 1}</span>
                    </div>
                    <span className="font-bold text-gray-700 text-sm">{item.score}分</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 游戏统计 */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 sm:mb-8">
            <div className="text-center p-3 sm:p-4 bg-orange-50 rounded-xl">
              <div className="text-xl sm:text-3xl font-bold text-orange-600">{totalQuestions}</div>
              <div className="text-xs sm:text-sm text-gray-600">总题目</div>
            </div>
            <div className="text-center p-3 sm:p-4 bg-green-50 rounded-xl">
              <div className="text-xl sm:text-3xl font-bold text-green-600">{correctAnswers}</div>
              <div className="text-xs sm:text-sm text-gray-600">答对题数</div>
            </div>
            <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-xl">
              <div className="text-xl sm:text-3xl font-bold text-blue-600">{accuracy}%</div>
              <div className="text-xs sm:text-sm text-gray-600">答对率</div>
            </div>
          </div>

          {/* 总时长 */}
          <div className="text-center mb-6 sm:mb-8 p-3 sm:p-4 bg-gray-50 rounded-xl">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 mx-auto mb-1" />
            <div className="text-xs sm:text-sm text-gray-500">游戏总时长</div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900">{formatTime(totalTime)}</div>
          </div>

          {/* 底部按钮 */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
            <Button
              size="lg"
              className="h-11 sm:h-12 px-6 sm:px-8 bg-gradient-to-r from-orange-500 to-pink-500 text-sm sm:text-base"
              onClick={onPlayAgain}
            >
              <RotateCcw className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              再来一局
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-11 sm:h-12 px-6 sm:px-8 text-sm sm:text-base"
              onClick={onChangeGame}
            >
              <Gamepad2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              换个游戏
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-11 sm:h-12 px-6 sm:px-8 text-sm sm:text-base"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              分享结果
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// 主组件
export default function PartyGame() {
  const navigate = useNavigate()
  const [step, setStep] = useState('setup')
  const [gameConfig, setGameConfig] = useState(null)
  const [gameResult, setGameResult] = useState(null)

  const handleStartGame = (config) => {
    setGameConfig(config)
    setStep('playing')
  }

  const handleGameEnd = (result) => {
    setGameResult(result)
    setStep('result')
  }

  // 再来一局 - 保留配置，重新开始
  const handlePlayAgain = () => {
    setGameResult(null)
    setStep('playing')
  }

  // 换个游戏 - 跳转到游戏广场
  const handleChangeGame = () => {
    navigate('/games')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8 px-3 sm:px-4">
      <div className="max-w-4xl mx-auto">
        {/* 页面标题 */}
        <div className="text-center mb-4 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">欢乐桌游聚会游戏</h1>
          <p className="text-sm sm:text-base text-gray-500">你说我猜 · 智能实时出题</p>
        </div>

        {/* 步骤指示器 */}
        <StepIndicator currentStep={step} />

        {/* 步骤内容 */}
        {step === 'setup' && <SetupStep onStartGame={handleStartGame} />}
        {step === 'playing' && <PlayingStep config={gameConfig} onGameEnd={handleGameEnd} />}
        {step === 'result' && (
          <ResultStep 
            result={gameResult} 
            config={gameConfig}
            onPlayAgain={handlePlayAgain}
            onChangeGame={handleChangeGame}
          />
        )}
      </div>
    </div>
  )
}
