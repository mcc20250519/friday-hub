/**
 * CreateRoomForm - 创建房间表单
 * 配置游戏参数并创建房间
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Loader2, Users, Clock, Trophy, BookOpen } from 'lucide-react'

// 团队颜色配置
const TEAM_COLORS = [
  { bg: 'bg-red-100', text: 'text-red-600', border: 'border-red-300', name: '红队' },
  { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-300', name: '蓝队' },
  { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-300', name: '绿队' },
  { bg: 'bg-yellow-100', text: 'text-yellow-600', border: 'border-yellow-300', name: '黄队' }
]

// 目标轮数配置
const TARGET_ROUNDS_OPTIONS = [
  { value: 3, label: 'BO3（先得 2 分）', desc: '快速局' },
  { value: 5, label: 'BO5（先得 3 分）', desc: '标准局' },
  { value: 7, label: 'BO7（先得 4 分）', desc: '持久战' }
]

// 词源配置
const WORD_SOURCE_OPTIONS = [
  { value: 'predefined', label: '系统词库', desc: '使用预定义的词语', icon: '📚' },
  { value: 'custom', label: '自定义词库', desc: '输入自己的词语', icon: '✏️' },
  { value: 'both', label: '混合模式', desc: '系统词库 + 自定义', icon: '🎲' }
]

/**
 * @param {Object} props
 * @param {Function} props.onSubmit - 提交回调
 * @param {Function} props.onBack - 返回回调
 * @param {boolean} props.isLoading - 加载状态
 * @param {string} props.defaultNickname - 默认昵称
 */
export default function CreateRoomForm({ onSubmit, onBack, isLoading, defaultNickname }) {
  // 表单状态
  const [displayName, setDisplayName] = useState(defaultNickname || '')
  const [numTeams, setNumTeams] = useState(2)
  const [playersPerTeam, setPlayersPerTeam] = useState(2)
  const [descriptionTime, setDescriptionTime] = useState(60)
  const [guessingTime, setGuessingTime] = useState(30)
  const [targetRounds, setTargetRounds] = useState(3)
  const [wordSource, setWordSource] = useState('predefined')
  const [customWords, setCustomWords] = useState('')
  const [errors, setErrors] = useState({})

  // 计算总人数
  const totalPlayers = numTeams * playersPerTeam

  // 验证表单
  const validateForm = () => {
    const newErrors = {}
    
    if (!displayName.trim()) {
      newErrors.displayName = '请输入你的昵称'
    } else if (displayName.length > 20) {
      newErrors.displayName = '昵称不能超过 20 个字符'
    }

    if (wordSource === 'custom' || wordSource === 'both') {
      const words = customWords.split('\n').filter(w => w.trim())
      if (words.length < 5) {
        newErrors.customWords = '自定义词库至少需要 5 个词语'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 提交表单
  const handleSubmit = () => {
    if (!validateForm()) return

    const config = {
      displayName: displayName.trim(),
      numTeams,
      playersPerTeam,
      descriptionTime,
      guessingTime,
      targetRounds,
      wordSource,
      customWords: wordSource !== 'predefined' 
        ? customWords.split('\n').filter(w => w.trim())
        : []
    }

    onSubmit(config)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-yellow-50 to-pink-50 p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
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
            <h1 className="text-2xl font-bold text-gray-800">创建房间</h1>
            <p className="text-sm text-gray-500">配置游戏参数</p>
          </div>
        </div>

        {/* 表单 */}
        <div className="space-y-4">
          {/* 玩家昵称 */}
          <Card className="p-4">
            <Label className="text-gray-700 font-medium mb-2 block">
              你的昵称
            </Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="输入你在游戏中的昵称"
              className={errors.displayName ? 'border-red-300' : ''}
              disabled={isLoading}
            />
            {errors.displayName && (
              <p className="text-red-500 text-sm mt-1">{errors.displayName}</p>
            )}
          </Card>

          {/* 团队设置 */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-purple-500" />
              <Label className="text-gray-700 font-medium">团队设置</Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* 团队数量 */}
              <div>
                <Label className="text-sm text-gray-500 mb-2 block">团队数量</Label>
                <div className="flex gap-2">
                  {[2, 3, 4].map(num => (
                    <button
                      key={num}
                      onClick={() => setNumTeams(num)}
                      disabled={isLoading}
                      className={`flex-1 py-2 rounded-lg border-2 transition-all ${
                        numTeams === num
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {num} 队
                    </button>
                  ))}
                </div>
              </div>

              {/* 每队人数 */}
              <div>
                <Label className="text-sm text-gray-500 mb-2 block">每队人数</Label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map(num => (
                    <button
                      key={num}
                      onClick={() => setPlayersPerTeam(num)}
                      disabled={isLoading}
                      className={`flex-1 py-2 rounded-lg border-2 transition-all ${
                        playersPerTeam === num
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {num} 人
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 团队预览 */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="text-sm text-gray-500 mb-2">团队预览</div>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: numTeams }).map((_, i) => (
                  <div
                    key={i}
                    className={`px-3 py-1.5 rounded-lg text-sm ${TEAM_COLORS[i].bg} ${TEAM_COLORS.text} border ${TEAM_COLORS[i].border}`}
                  >
                    {TEAM_COLORS[i].name} × {playersPerTeam}
                  </div>
                ))}
              </div>
              <div className="text-sm text-gray-500 mt-2">
                总人数：{totalPlayers} 人
              </div>
            </div>
          </Card>

          {/* 时间设置 */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-blue-500" />
              <Label className="text-gray-700 font-medium">时间设置</Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* 描述时间 */}
              <div>
                <Label className="text-sm text-gray-500 mb-2 block">
                  描述时间：{descriptionTime} 秒
                </Label>
                <input
                  type="range"
                  min={30}
                  max={120}
                  step={10}
                  value={descriptionTime}
                  onChange={(e) => setDescriptionTime(Number(e.target.value))}
                  disabled={isLoading}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>30秒</span>
                  <span>120秒</span>
                </div>
              </div>

              {/* 猜测时间 */}
              <div>
                <Label className="text-sm text-gray-500 mb-2 block">
                  猜测时间：{guessingTime} 秒
                </Label>
                <input
                  type="range"
                  min={15}
                  max={90}
                  step={5}
                  value={guessingTime}
                  onChange={(e) => setGuessingTime(Number(e.target.value))}
                  disabled={isLoading}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>15秒</span>
                  <span>90秒</span>
                </div>
              </div>
            </div>
          </Card>

          {/* 胜利条件 */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <Label className="text-gray-700 font-medium">胜利条件</Label>
            </div>

            <div className="space-y-2">
              {TARGET_ROUNDS_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => setTargetRounds(option.value)}
                  disabled={isLoading}
                  className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                    targetRounds === option.value
                      ? 'border-yellow-500 bg-yellow-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-800">{option.label}</div>
                  <div className="text-sm text-gray-500">{option.desc}</div>
                </button>
              ))}
            </div>
          </Card>

          {/* 词源设置 */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-5 h-5 text-green-500" />
              <Label className="text-gray-700 font-medium">词库设置</Label>
            </div>

            <div className="space-y-2">
              {WORD_SOURCE_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => setWordSource(option.value)}
                  disabled={isLoading}
                  className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                    wordSource === option.value
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{option.icon}</span>
                    <div>
                      <div className="font-medium text-gray-800">{option.label}</div>
                      <div className="text-sm text-gray-500">{option.desc}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* 自定义词语输入 */}
            {(wordSource === 'custom' || wordSource === 'both') && (
              <div className="mt-4">
                <Label className="text-sm text-gray-500 mb-2 block">
                  自定义词语（每行一个）
                </Label>
                <textarea
                  value={customWords}
                  onChange={(e) => setCustomWords(e.target.value)}
                  placeholder="苹果&#10;香蕉&#10;太阳&#10;月亮&#10;跳舞..."
                  disabled={isLoading}
                  className={`w-full h-32 p-3 rounded-lg border-2 resize-none ${
                    errors.customWords ? 'border-red-300' : 'border-gray-200'
                  } focus:border-green-500 focus:outline-none`}
                />
                {errors.customWords && (
                  <p className="text-red-500 text-sm mt-1">{errors.customWords}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  当前已输入 {customWords.split('\n').filter(w => w.trim()).length} 个词语
                </p>
              </div>
            )}
          </Card>

          {/* 提交按钮 */}
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full h-12 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-semibold"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                创建中...
              </>
            ) : (
              '创建房间'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
