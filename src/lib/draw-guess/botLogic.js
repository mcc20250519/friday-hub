/**
 * 你说我猜 - 机器人 AI 逻辑
 * 实现机器人的猜测和描述策略
 */

/**
 * 机器人猜测难度配置
 * 越高的值，机器人越聪明
 */
export const BOT_DIFFICULTY = {
  EASY: 'easy',     // 30% 正确率
  NORMAL: 'normal', // 50% 正确率
  HARD: 'hard'      // 80% 正确率
}

/**
 * 机器人名称列表
 */
export const BOT_NAMES = [
  '小机灵', '小聪明', '小迷糊', '小天才',
  '小博士', '小侦探', '小达人', '小能手'
]

/**
 * 模拟机器人猜测
 * 根据难度和已揭示的提示来决定猜测结果
 * 
 * @param {string} targetWord - 目标词语
 * @param {number[]} hintsRevealed - 已揭示的字符位置
 * @param {string} difficulty - 难度
 * @param {number} guessAttempts - 当前猜测尝试次数
 * @returns {{ shouldGuess: boolean, guess?: string, isCorrect: boolean }}
 */
export function simulateBotGuess(targetWord, hintsRevealed = [], difficulty = BOT_DIFFICULTY.NORMAL, guessAttempts = 0) {
  if (!targetWord) {
    return { shouldGuess: false }
  }

  // 根据难度计算正确概率
  let correctProbability = 0.5 // 默认 50%
  switch (difficulty) {
    case BOT_DIFFICULTY.EASY:
      correctProbability = 0.3
      break
    case BOT_DIFFICULTY.NORMAL:
      correctProbability = 0.5
      break
    case BOT_DIFFICULTY.HARD:
      correctProbability = 0.8
      break
  }

  // 揭示的提示越多，正确率越高
  const hintBonus = hintsRevealed.length * 0.1
  correctProbability = Math.min(correctProbability + hintBonus, 0.95)

  // 尝试次数越多，正确率越高（因为玩家有更多时间思考）
  const attemptBonus = guessAttempts * 0.05
  correctProbability = Math.min(correctProbability + attemptBonus, 0.98)

  // 决定是否猜对
  const isCorrect = Math.random() < correctProbability

  if (isCorrect) {
    return {
      shouldGuess: true,
      guess: targetWord,
      isCorrect: true
    }
  }

  // 生成错误的猜测（可以是相关词或随机词）
  const wrongGuess = generateWrongGuess(targetWord, hintsRevealed)
  return {
    shouldGuess: true,
    guess: wrongGuess,
    isCorrect: false
  }
}

/**
 * 生成错误猜测
 * @param {string} targetWord - 目标词
 * @param {number[]} hintsRevealed - 已揭示的提示
 * @returns {string}
 */
function generateWrongGuess(targetWord, hintsRevealed) {
  // 使用提示字符构建部分匹配的错误答案
  if (hintsRevealed.length > 0) {
    const partialWord = targetWord.split('').map((char, index) => 
      hintsRevealed.includes(index) ? char : '？'
    ).join('')
    return `可能是${partialWord}`
  }

  // 常见错误猜测词库
  const wrongGuesses = [
    '苹果', '香蕉', '小猫', '小狗', '太阳', '月亮',
    '手机', '电脑', '电视', '汽车', '飞机', '蛋糕',
    '冰淇淋', '西瓜', '草莓', '篮球', '足球', '游泳',
    '医生', '老师', '警察', '厨师', '画家', '歌手'
  ]

  // 随机选择一个错误答案
  const randomIndex = Math.floor(Math.random() * wrongGuesses.length)
  return wrongGuesses[randomIndex]
}

/**
 * 计算机器人猜测延迟时间
 * @param {string} difficulty - 难度
 * @param {number} timeRemaining - 剩余时间（秒）
 * @returns {number} 延迟毫秒数
 */
export function calculateBotGuessDelay(difficulty = BOT_DIFFICULTY.NORMAL, timeRemaining = 60) {
  // 基础延迟（思考时间）
  let baseDelay = 5000 // 5秒

  switch (difficulty) {
    case BOT_DIFFICULTY.EASY:
      baseDelay = 8000 + Math.random() * 5000 // 8-13秒
      break
    case BOT_DIFFICULTY.NORMAL:
      baseDelay = 5000 + Math.random() * 5000 // 5-10秒
      break
    case BOT_DIFFICULTY.HARD:
      baseDelay = 2000 + Math.random() * 3000 // 2-5秒
      break
  }

  // 如果时间紧迫，加快响应
  if (timeRemaining < 10) {
    baseDelay = Math.min(baseDelay, timeRemaining * 500)
  }

  return Math.floor(baseDelay)
}

/**
 * 模拟机器人描述行为
 * 为描述者机器人生成绘图数据
 * 
 * @param {string} word - 要描述的词
 * @returns {Object} 绘图动作
 */
export function simulateBotDrawing(word) {
  // 机器人绘图的基本策略：
  // 1. 画简单的形状（圆、方、线）
  // 2. 分步骤绘制
  
  const actions = []
  const shapes = ['circle', 'line', 'square', 'triangle']
  
  // 生成简单的绘图动作序列
  const numActions = 5 + Math.floor(Math.random() * 10)
  
  for (let i = 0; i < numActions; i++) {
    const shape = shapes[Math.floor(Math.random() * shapes.length)]
    actions.push({
      type: 'draw',
      shape,
      x: Math.random() * 100,
      y: Math.random() * 100,
      color: ['#EF4444', '#3B82F6', '#22C55E', '#EAB308', '#8B5CF6'][Math.floor(Math.random() * 5)],
      timestamp: Date.now() + i * 500
    })
  }
  
  return actions
}

/**
 * 判断是否应该请求提示
 * @param {number} hintsUsed - 已用提示次数
 * @param {number} maxHints - 最大提示次数
 * @param {number} timeRemaining - 剩余时间
 * @returns {boolean}
 */
export function shouldRequestHint(hintsUsed, maxHints = 2, timeRemaining = 60) {
  // 已用完提示
  if (hintsUsed >= maxHints) {
    return false
  }

  // 时间紧迫时请求提示
  if (timeRemaining < 15 && hintsUsed === 0) {
    return true
  }

  // 随机决定是否请求（增加游戏趣味性）
  if (timeRemaining < 30 && Math.random() < 0.3) {
    return true
  }

  return false
}

/**
 * 创建机器人配置
 * @param {number} index - 机器人索引
 * @param {string} [difficulty] - 难度
 * @returns {Object}
 */
export function createBotConfig(index = 0, difficulty = BOT_DIFFICULTY.NORMAL) {
  return {
    id: `bot_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 8)}`,
    name: BOT_NAMES[index % BOT_NAMES.length],
    difficulty,
    isBot: true
  }
}
