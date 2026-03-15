/**
 * useAnimationEngine - 统一动画引擎 Hook
 *
 * 提供统一的动画控制接口，管理动画播放、跳过、交互锁。
 *
 * @example
 * const { playAnimation, skipAnimation, isLocked, currentScene, AnimationRenderer } = useAnimationEngine();
 *
 * // 播放获胜动画
 * playAnimation('win', { winnerName: 'Player 1', rank: 1, totalPlayers: 4 });
 *
 * // 在 JSX 中渲染动画
 * <AnimationRenderer />
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import { UNO_THEME, mergeTheme } from '@/lib/uno/animation';
import ExitAnimation from '@/components/uno/shared/ExitAnimation';
import RankNotification from '@/components/uno/game/RankNotification';

/**
 * @typedef {'loading' | 'win' | 'gameOver' | 'roomExit' | 'rankNotify' | 'unoCall'} AnimationScene
 */

/**
 * @typedef {Object} AnimationOptions
 * @property {string} [winnerName] - 获胜者名字（win 场景）
 * @property {number} [rank] - 名次（win 场景）
 * @property {number} [totalPlayers] - 总玩家数（win 场景）
 * @property {Array} [rankings] - 排名列表（gameOver 场景）
 * @property {Array} [notifications] - 通知列表（rankNotify 场景）
 * @property {boolean} [skippable] - 是否可跳过
 * @property {Function} [onComplete] - 动画完成回调
 * @property {Function} [leaveAction] - 离开操作（roomExit 场景）
 * @property {boolean} [targetPageReady] - 目标页面是否就绪（roomExit 场景）
 * @property {boolean} [isHost] - 是否房主（gameOver 场景）
 * @property {string} [mode] - 游戏模式（gameOver 场景）
 */

/**
 * @typedef {Object} UseAnimationEngineReturn
 * @property {Function} playAnimation - 播放动画
 * @property {Function} skipAnimation - 跳过动画
 * @property {boolean} isLocked - 是否锁定交互
 * @property {AnimationScene|null} currentScene - 当前场景
 * @property {Function} AnimationRenderer - 动画渲染组件
 * @property {Function} addToQueue - 添加动画到队列
 * @property {Function} clearQueue - 清空动画队列
 */

// 最大队列长度
const MAX_QUEUE_SIZE = 10;

/**
 * useAnimationEngine Hook
 *
 * @param {Object} theme - 自定义主题配置
 * @returns {UseAnimationEngineReturn}
 */
export default function useAnimationEngine(theme = {}) {
  // 合并主题配置
  const mergedTheme = useMemo(() => mergeTheme(theme), [theme]);

  // 当前场景状态
  const [currentScene, setCurrentScene] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [options, setOptions] = useState({});

  // 动画队列（用于 rankNotify 多人场景）
  const queueRef = useRef([]);
  const processingRef = useRef(false);

  // 定时器管理
  const timersRef = useRef([]);

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const pushTimer = useCallback((fn, ms) => {
    const id = setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  }, []);

  // 处理队列中的动画
  const processQueue = useCallback(() => {
    if (processingRef.current || queueRef.current.length === 0) return;

    processingRef.current = true;
    const next = queueRef.current.shift();

    setCurrentScene(next.scene);
    setOptions(next.options);
    setIsLocked(true);
  }, []);

  // 添加动画到队列
  const addToQueue = useCallback((scene, opts = {}) => {
    if (queueRef.current.length >= MAX_QUEUE_SIZE) {
      console.warn('[AnimationEngine] Queue is full, dropping oldest animation');
      queueRef.current.shift();
    }

    queueRef.current.push({ scene, options: opts });

    // 如果当前没有动画在播放，立即开始处理队列
    if (!currentScene) {
      processQueue();
    }
  }, [currentScene, processQueue]);

  // 清空队列
  const clearQueue = useCallback(() => {
    queueRef.current = [];
    processingRef.current = false;
  }, []);

  // 播放动画
  const playAnimation = useCallback((scene, opts = {}) => {
    // 如果是 rankNotify 场景，使用队列机制
    if (scene === 'rankNotify') {
      addToQueue(scene, opts);
      return;
    }

    // 其他场景直接播放
    clearQueue();
    clearAllTimers();
    setCurrentScene(scene);
    setOptions(opts);
    setIsLocked(true);
  }, [addToQueue, clearQueue, clearAllTimers]);

  // 跳过动画
  const skipAnimation = useCallback(() => {
    // 触发当前动画的跳过逻辑
    // 具体实现在 AnimationRenderer 中处理
    if (options.onSkip) {
      options.onSkip();
    }
  }, [options]);

  // 动画完成回调
  const handleAnimationComplete = useCallback(() => {
    const wasInQueue = processingRef.current;

    setIsLocked(false);
    setCurrentScene(null);
    setOptions({});

    // 调用用户提供的完成回调
    options.onComplete?.();

    // 如果是队列中的动画，处理下一个
    if (wasInQueue) {
      processingRef.current = false;
      // 延迟处理下一个，避免动画重叠
      pushTimer(() => processQueue(), 300);
    }
  }, [options, processQueue, pushTimer]);

  // 清理通知（用于 rankNotify）
  const handleDismissNotification = useCallback((id) => {
    // RankNotification 组件内部处理
  }, []);

  // 清理所有通知（游戏结束时）
  const clearAllNotifications = useCallback(() => {
    clearQueue();
    setIsLocked(false);
    setCurrentScene(null);
    setOptions({});
    clearAllTimers();
  }, [clearQueue, clearAllTimers]);

  // 动画渲染组件
  const AnimationRenderer = useMemo(() => {
    return function AnimationRendererComponent() {
      // 没有场景时不渲染
      if (!currentScene) return null;

      switch (currentScene) {
        case 'roomExit':
          return (
            <ExitAnimation
              leaveAction={options.leaveAction}
              onDone={handleAnimationComplete}
              targetPageReady={options.targetPageReady}
              exitText={mergedTheme.exitText}
              theme={mergedTheme}
            />
          );

        case 'rankNotify':
          return (
            <RankNotification
              notifications={options.notifications || []}
              onDismiss={handleDismissNotification}
              rankColors={mergedTheme.rankColors}
              onAnimationComplete={handleAnimationComplete}
            />
          );

        // 其他场景（loading, win, gameOver, unoCall）由各自的组件处理
        // 这些场景目前不需要通过引擎渲染，保持现有调用方式
        default:
          return null;
      }
    };
  }, [
    currentScene,
    options,
    mergedTheme,
    handleAnimationComplete,
    handleDismissNotification,
  ]);

  return {
    playAnimation,
    skipAnimation,
    isLocked,
    currentScene,
    AnimationRenderer,
    addToQueue,
    clearQueue,
    clearAllNotifications,
  };
}

/**
 * 动画场景常量
 */
export const ANIMATION_SCENES = {
  LOADING: 'loading',
  WIN: 'win',
  GAME_OVER: 'gameOver',
  ROOM_EXIT: 'roomExit',
  RANK_NOTIFY: 'rankNotify',
  UNO_CALL: 'unoCall',
};
