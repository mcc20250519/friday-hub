/**
 * PhaseDisplay - 游戏阶段显示和倒计时
 */

import { Card } from '@/components/ui/card'
import { Clock, Palette, HelpCircle, Trophy, Loader2 } from 'lucide-react'

// 阶段配置
const PHASE_CONFIG = {
  waiting: {
    label: '等待开始',
    color: 'text-gray-500',
    bg: 'bg-gray-100',
    icon: Loader2,
    animation: 'animate-spin'
  },
  description: {
    label: '描述阶段',
    color: 'text-orange-500',
    bg: 'bg-orange-50',
    icon: Palette,
    animation: ''
  },
  guessing: {
    label: '猜测阶段',
    color: 'text-blue-500',
    bg: 'bg-blue-50',
    icon: HelpCircle,
    animation: ''
  },
  round_end: {
    label: '轮次结束',
    color: 'text-green-500',
    bg: 'bg-green-50',
    icon: Trophy,
    animation: ''
  },
  finished: {
    label: '游戏结束',
    color: 'text-purple-500',
    bg: 'bg-purple-50',
    icon: Trophy,
    animation: ''
  }
}

/**
 * @param {Object} props
 * @param {string} props.phase - 当前阶段
 * @param {number} props.timeRemaining - 剩余时间（秒）
 * @param {string} props.word - 当前词语（描述者可见）
 * @param {string} props.hint - 提示字符
 * @param {Array} props.hintsRevealed - 已揭示的提示位置
 * @param {boolean} props.isDescriber - 是否是描述者
 * @param {string} props.describerName - 描述者名称
 */
export default function PhaseDisplay({
  phase = 'waiting',
  timeRemaining = 0,
  word,
  hint,
  hintsRevealed = [],
  isDescriber = false,
  describerName
}) {
  const config = PHASE_CONFIG[phase] || PHASE_CONFIG.waiting
  const Icon = config.icon

  // 格式化时间
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // 生成词语显示（带提示）
  const renderWord = () => {
    if (!word) return null

    if (isDescriber) {
      // 描述者看到完整词语
      return (
        <div className="text-center">
          <div className="text-sm text-gray-500 mb-1">你要描述的词语</div>
          <div className="text-3xl font-bold text-orange-600">{word}</div>
        </div>
      )
    }

    // 其他玩家看到提示形式
    const chars = word.split('')
    return (
      <div className="text-center">
        <div className="text-sm text-gray-500 mb-1">猜猜这是什么</div>
        <div className="flex justify-center gap-1 text-2xl font-mono">
          {chars.map((char, index) => {
            const isRevealed = hintsRevealed.some(h => h.position === index)
            return (
              <span 
                key={index}
                className={`w-8 h-10 flex items-center justify-center border-b-2 ${
                  isRevealed 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-gray-300 text-transparent'
                }`}
              >
                {isRevealed ? char : '_'}
              </span>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <Card className={`p-4 ${config.bg}`}>
      <div className="flex items-center justify-between">
        {/* 阶段信息 */}
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${config.bg}`}>
            <Icon className={`w-5 h-5 ${config.color} ${config.animation}`} />
          </div>
          <div>
            <div className={`font-medium ${config.color}`}>
              {config.label}
            </div>
            {describerName && phase !== 'waiting' && phase !== 'finished' && (
              <div className="text-sm text-gray-500">
                {isDescriber ? '你是描述者' : `${describerName} 正在描述`}
              </div>
            )}
          </div>
        </div>

        {/* 倒计时 */}
        {timeRemaining > 0 && phase !== 'waiting' && phase !== 'finished' && (
          <div className="flex items-center gap-2">
            <Clock className={`w-4 h-4 ${timeRemaining <= 10 ? 'text-red-500' : 'text-gray-400'}`} />
            <span className={`text-xl font-mono font-bold ${
              timeRemaining <= 10 ? 'text-red-500 animate-pulse' : 'text-gray-800'
            }`}>
              {formatTime(timeRemaining)}
            </span>
          </div>
        )}
      </div>

      {/* 词语显示 */}
      {(phase === 'description' || phase === 'guessing') && word && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          {renderWord()}
        </div>
      )}
    </Card>
  )
}
