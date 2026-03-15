/**
 * AnimationTheme - 动画主题配置
 *
 * 用于定制动画引擎的颜色、文字等视觉元素。
 * 所有配置项都有默认值，可以部分覆盖。
 *
 * @example
 * const customTheme = {
 *   ...UNO_THEME,
 *   exitText: '再见',
 *   rankColors: {
 *     ...UNO_THEME.rankColors,
 *     first: '#FFD700',
 *   },
 * };
 */

/**
 * @typedef {Object} AnimationColors
 * @property {string} red - 红色，默认 '#E5173F'
 * @property {string} yellow - 黄色，默认 '#F5B800'
 * @property {string} green - 绿色，默认 '#1A9641'
 * @property {string} blue - 蓝色，默认 '#0057A8'
 */

/**
 * @typedef {Object} CountdownColors
 * @property {string} safe - 安全时间颜色，默认 '#1A9641'（绿色）
 * @property {string} warning - 警告时间颜色，默认 '#F5B800'（黄色）
 * @property {string} danger - 危险时间颜色，默认 '#E5173F'（红色）
 */

/**
 * @typedef {Object} RankColors
 * @property {string} first - 第1名颜色，默认 '#FFD700'（金色）
 * @property {string} second - 第2名颜色，默认 '#C0C0C0'（银色）
 * @property {string} third - 第3名颜色，默认 '#CD7F32'（铜色）
 * @property {string} others - 其他名次颜色，默认 'rgba(0,0,0,0.6)'
 */

/**
 * @typedef {Object} AnimationTheme
 * @property {AnimationColors} colors - 基础颜色配置
 * @property {string} exitText - 退出时显示的文字，默认 'BYE'
 * @property {CountdownColors} countdownColors - 倒计时颜色配置
 * @property {RankColors} rankColors - 名次颜色配置
 */

/**
 * UNO 默认动画主题
 *
 * @type {AnimationTheme}
 */
export const UNO_THEME = {
  colors: {
    red: '#E5173F',
    yellow: '#F5B800',
    green: '#1A9641',
    blue: '#0057A8',
  },

  exitText: 'BYE',

  countdownColors: {
    safe: '#1A9641',
    warning: '#F5B800',
    danger: '#E5173F',
  },

  rankColors: {
    first: '#FFD700',
    second: '#C0C0C0',
    third: '#CD7F32',
    others: 'rgba(0,0,0,0.6)',
  },
};

/**
 * 合并主题配置（深度合并）
 *
 * @param {Partial<AnimationTheme>} customTheme - 自定义主题配置
 * @returns {AnimationTheme} 合并后的完整主题
 */
export function mergeTheme(customTheme = {}) {
  return {
    colors: {
      ...UNO_THEME.colors,
      ...(customTheme.colors || {}),
    },
    exitText: customTheme.exitText || UNO_THEME.exitText,
    countdownColors: {
      ...UNO_THEME.countdownColors,
      ...(customTheme.countdownColors || {}),
    },
    rankColors: {
      ...UNO_THEME.rankColors,
      ...(customTheme.rankColors || {}),
    },
  };
}

/**
 * 根据名次获取颜色
 *
 * @param {number} rank - 名次
 * @param {RankColors} rankColors - 名次颜色配置
 * @returns {string} 对应的颜色值
 */
export function getRankColor(rank, rankColors = UNO_THEME.rankColors) {
  switch (rank) {
    case 1:
      return rankColors.first;
    case 2:
      return rankColors.second;
    case 3:
      return rankColors.third;
    default:
      return rankColors.others;
  }
}

/**
 * 根据名次获取背景渐变
 *
 * @param {number} rank - 名次
 * @param {RankColors} rankColors - 名次颜色配置
 * @returns {string} CSS 渐变值
 */
export function getRankGradient(rank, rankColors = UNO_THEME.rankColors) {
  const color = getRankColor(rank, rankColors);
  // 金银铜使用原生渐变，其他使用纯色
  if (rank === 1) {
    return `linear-gradient(135deg, ${rankColors.first} 0%, #FFA500 100%)`;
  }
  if (rank === 2) {
    return `linear-gradient(135deg, ${rankColors.second} 0%, #A0A0A0 100%)`;
  }
  if (rank === 3) {
    return `linear-gradient(135deg, ${rankColors.third} 0%, #A0522D 100%)`;
  }
  return `linear-gradient(135deg, rgba(30,30,30,0.85) 0%, rgba(50,50,50,0.85) 100%)`;
}
