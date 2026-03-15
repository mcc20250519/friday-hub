/**
 * UNO 游戏常量定义
 */

/** 四种颜色 */
export const COLORS = ['red', 'yellow', 'green', 'blue']

/** 牌型枚举 */
export const CARD_TYPES = {
  NUMBER: 'number',
  SKIP: 'skip',
  REVERSE: 'reverse',
  DRAW2: 'draw2',
  WILD: 'wild',
  WILD4: 'wild4',
}

/** 牌背标识符 */
export const CARD_BACK = { type: 'back', color: 'black' }

/** 游戏房间状态 */
export const ROOM_STATUS = {
  WAITING: 'waiting',
  PLAYING: 'playing',
  FINISHED: 'finished',
}

/** 游戏动作类型 */
export const ACTION_TYPES = {
  PLAY: 'play',
  DRAW: 'draw',
  UNO: 'uno',
  SKIP: 'skip',
}

/** 颜色显示映射（Tailwind 类名） */
export const COLOR_CLASSES = {
  red: {
    bg: 'bg-red-500',
    bgHover: 'hover:bg-red-600',
    border: 'border-red-600',
    text: 'text-red-500',
    light: 'bg-red-100',
    ring: 'ring-red-400',
  },
  yellow: {
    bg: 'bg-yellow-400',
    bgHover: 'hover:bg-yellow-500',
    border: 'border-yellow-500',
    text: 'text-yellow-500',
    light: 'bg-yellow-100',
    ring: 'ring-yellow-400',
  },
  green: {
    bg: 'bg-green-500',
    bgHover: 'hover:bg-green-600',
    border: 'border-green-600',
    text: 'text-green-500',
    light: 'bg-green-100',
    ring: 'ring-green-400',
  },
  blue: {
    bg: 'bg-blue-500',
    bgHover: 'hover:bg-blue-600',
    border: 'border-blue-600',
    text: 'text-blue-500',
    light: 'bg-blue-100',
    ring: 'ring-blue-400',
  },
  black: {
    bg: 'bg-gray-900',
    bgHover: 'hover:bg-gray-800',
    border: 'border-gray-700',
    text: 'text-gray-900',
    light: 'bg-gray-100',
    ring: 'ring-gray-400',
  },
}

/** 颜色中文名 */
export const COLOR_NAMES = {
  red: '红色',
  yellow: '黄色',
  green: '绿色',
  blue: '蓝色',
}

/** 功能牌符号映射 */
export const CARD_SYMBOLS = {
  [CARD_TYPES.SKIP]: '🚫',
  [CARD_TYPES.REVERSE]: '🔄',
  [CARD_TYPES.DRAW2]: '+2',
  [CARD_TYPES.WILD]: '🌈',
  [CARD_TYPES.WILD4]: '+4',
}

/** 每局游戏每人初始手牌数 */
export const INITIAL_HAND_SIZE = 7

/** 最小游戏人数 */
export const MIN_PLAYERS = 2

/** 最大游戏人数 */
export const MAX_PLAYERS = 10

/**
 * 使用双倍牌组的人数阈值
 * 7 人及以上使用 2 副牌（216 张），6 人及以下使用 1 副牌（108 张）
 */
export const DOUBLE_DECK_THRESHOLD = 7

/**
 * 游戏模式枚举
 *   standard      官方 Mattel 规则：+2/+4 不可叠加，首人出完牌即获胜
 *   entertainment 娱乐版规则：+2/+4 可叠加，所有玩家依次出完牌形成排名
 */
export const GAME_MODES = {
  STANDARD: 'standard',
  ENTERTAINMENT: 'entertainment',
}

/** 娱乐模式显示名称与说明 */
export const GAME_MODE_INFO = {
  [GAME_MODES.STANDARD]: {
    label: '官方标准',
    emoji: '🏆',
    description: '+2/+4 不可叠加，首位出完牌即获胜',
  },
  [GAME_MODES.ENTERTAINMENT]: {
    label: '娱乐版',
    emoji: '🎉',
    description: '+2/+4 可叠加传递，所有玩家产生排名',
  },
}

/**
 * 计分模式枚举（娱乐规则专用）
 *   basic    基础模式：第一名 +3 分，其余 0 分
 *   ranking  排名模式：继续游戏直到决出最后一名，按公式分配积分
 */
export const SCORING_MODES = {
  BASIC: 'basic',
  RANKING: 'ranking',
}

/** 官方模式：获胜者每局得 1 分 */
export const STANDARD_WIN_SCORE = 1

/** 娱乐基础模式：获胜者每局得分 */
export const ENTERTAINMENT_WIN_SCORE = 3
