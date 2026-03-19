/**
 * 你说我猜 - 游戏阶段管理 Hook
 * 管理游戏阶段转换和倒计时
 */

import { useState, useCallback, useRef, useEffect } from 'react'

// 阶段时长配置（秒）
const PHASE_DURATIONS = {
  description: 60,  // 默认 60 秒
  guessing: 30,     // 默认 30 秒
  round_end: 10     // 轮次结束显示 10 秒
}

/**
 * 游戏阶段管理 Hook
 * @param {Object} room - 房间对象
 * @returns {Object} 阶段状态和方法
 */
export function useGamePhase(room) {
  // 状态
  const [currentPhase, setCurrentPhase] = useState('waiting')
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [isTimerActive, setIsTimerActive] = useState(false)
  
  // Refs
  const timerRef = useRef(null)
  const endTimeRef = useRef(null)
  const onTimeoutCallbackRef = useRef(null)

  // 清除计时器
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setIsTimerActive(false)
    endTimeRef.current = null
  }, [])

  // 更新剩余时间
  const updateTimeRemaining = useCallback(() => {
    if (!endTimeRef.current) return

    const remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000))
    setTimeRemaining(remaining)

    if (remaining <= 0) {
      clearTimer()
      onTimeoutCallbackRef.current?.()
    }
  }, [clearTimer])

  // 启动阶段计时器
  const startPhaseTimer = useCallback((phase, duration, onTimeout) => {
    clearTimer()

    setCurrentPhase(phase)
    onTimeoutCallbackRef.current = onTimeout

    // 计算结束时间
    const durationMs = (duration || PHASE_DURATIONS[phase] || 30) * 1000
    endTimeRef.current = Date.now() + durationMs

    // 设置初始剩余时间
    setTimeRemaining(Math.ceil(durationMs / 1000))
    setIsTimerActive(true)

    // 启动计时器（每秒更新）
    timerRef.current = setInterval(updateTimeRemaining, 1000)
  }, [clearTimer, updateTimeRemaining])

  // 停止计时器
  const stopPhaseTimer = useCallback(() => {
    clearTimer()
    onTimeoutCallbackRef.current = null
  }, [clearTimer])

  // 暂停计时器
  const pauseTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
      setIsTimerActive(false)
    }
  }, [])

  // 恢复计时器
  const resumeTimer = useCallback(() => {
    if (!endTimeRef.current || timerRef.current) return

    setIsTimerActive(true)
    timerRef.current = setInterval(updateTimeRemaining, 1000)
  }, [updateTimeRemaining])

  // 获取阶段剩余时间（从服务器时间同步）
  const getPhaseTimeRemaining = useCallback(() => {
    if (!room?.phase_started_at) return 0

    const phaseDuration = room.current_phase === 'description' 
      ? room.description_time_sec 
      : room.current_phase === 'guessing' 
        ? room.guessing_time_sec 
        : PHASE_DURATIONS[room.current_phase] || 30

    const startedAt = new Date(room.phase_started_at).getTime()
    const elapsed = (Date.now() - startedAt) / 1000
    const remaining = Math.max(0, Math.ceil(phaseDuration - elapsed))

    return remaining
  }, [room])

  // 同步服务器时间
  useEffect(() => {
    if (room?.current_phase && room?.phase_started_at) {
      const remaining = getPhaseTimeRemaining()
      
      if (remaining > 0 && room.current_phase !== 'waiting' && room.current_phase !== 'finished') {
        const duration = room.current_phase === 'description' 
          ? room.description_time_sec 
          : room.current_phase === 'guessing' 
            ? room.guessing_time_sec 
            : PHASE_DURATIONS[room.current_phase] || 30

        endTimeRef.current = Date.now() + remaining * 1000
        setTimeRemaining(remaining)
        setCurrentPhase(room.current_phase)
        setIsTimerActive(true)

        if (timerRef.current) {
          clearInterval(timerRef.current)
        }
        timerRef.current = setInterval(updateTimeRemaining, 1000)
      } else {
        clearTimer()
        setCurrentPhase(room.current_phase)
      }
    }
  }, [room?.current_phase, room?.phase_started_at, getPhaseTimeRemaining, updateTimeRemaining, clearTimer])

  // 清理
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  // 阶段超时回调设置
  const onPhaseTimeout = useCallback((callback) => {
    onTimeoutCallbackRef.current = callback
  }, [])

  // 手动切换阶段
  const transitionPhase = useCallback((nextPhase, duration) => {
    clearTimer()
    
    if (duration) {
      startPhaseTimer(nextPhase, duration, onTimeoutCallbackRef.current)
    } else {
      setCurrentPhase(nextPhase)
    }
  }, [clearTimer, startPhaseTimer])

  return {
    // 状态
    currentPhase,
    timeRemaining,
    isTimerActive,
    
    // 计时器控制
    startPhaseTimer,
    stopPhaseTimer,
    pauseTimer,
    resumeTimer,
    
    // 阶段转换
    transitionPhase,
    getPhaseTimeRemaining,
    
    // 回调
    onPhaseTimeout
  }
}
