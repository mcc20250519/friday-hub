/**
 * 你说我猜 - 绘图数据管理工具
 */

import { supabase } from '../supabase'

/**
 * 压缩绘图事件数据
 * @param {Array} events - 原始绘图事件数组
 * @returns {Array} 压缩后的事件数组
 */
export function compressDrawingEvents(events) {
  if (!events || events.length === 0) return []

  const compressed = []
  let currentStroke = null

  for (const event of events) {
    if (event.type === 'stroke') {
      // 合并相同颜色的连续笔画
      if (!currentStroke || 
          currentStroke.color !== event.color || 
          currentStroke.size !== event.size) {
        if (currentStroke) {
          compressed.push(currentStroke)
        }
        currentStroke = {
          type: 'stroke',
          points: [...event.points],
          color: event.color,
          size: event.size,
          timestamp: event.timestamp
        }
      } else {
        // 合并点
        currentStroke.points = [...currentStroke.points, ...event.points]
      }
    } else if (event.type === 'clear' || event.type === 'undo' || event.type === 'redo') {
      // 先保存当前笔画
      if (currentStroke) {
        compressed.push(currentStroke)
        currentStroke = null
      }
      compressed.push(event)
    }
  }

  // 保存最后一个笔画
  if (currentStroke) {
    compressed.push(currentStroke)
  }

  return compressed
}

/**
 * 解压绘图事件数据（还原为可播放格式）
 * @param {Array} compressedEvents - 压缩的事件数组
 * @returns {Array} 原始事件数组
 */
export function decompressDrawingEvents(compressedEvents) {
  if (!compressedEvents || compressedEvents.length === 0) return []

  const events = []
  for (const event of compressedEvents) {
    if (event.type === 'stroke' && event.points) {
      // 将长笔画分段，便于播放动画
      const chunkSize = 10
      for (let i = 0; i < event.points.length; i += chunkSize) {
        const chunk = event.points.slice(i, i + chunkSize)
        events.push({
          type: 'stroke',
          points: chunk,
          color: event.color,
          size: event.size,
          timestamp: event.timestamp + i
        })
      }
    } else {
      events.push(event)
    }
  }

  return events
}

/**
 * 在 Canvas 上回放绘图事件
 * @param {HTMLCanvasElement} canvas - 目标画布
 * @param {Array} events - 绘图事件数组
 * @param {Object} options - 选项
 * @param {number} options.speed - 播放速度 (1 = 正常)
 * @param {Function} options.onProgress - 进度回调
 * @param {Function} options.onComplete - 完成回调
 * @returns {Function} 取消播放函数
 */
export function replayDrawingEvents(canvas, events, options = {}) {
  const { speed = 1, onProgress, onComplete } = options
  const ctx = canvas.getContext('2d')
  
  if (!ctx || !events || events.length === 0) {
    onComplete?.()
    return () => {}
  }

  let animationId = null
  let currentIndex = 0
  let isPlaying = true

  const play = () => {
    if (!isPlaying || currentIndex >= events.length) {
      onComplete?.()
      return
    }

    const event = events[currentIndex]
    
    if (event.type === 'stroke') {
      drawStroke(ctx, event)
    } else if (event.type === 'clear') {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }

    currentIndex++
    onProgress?.(currentIndex / events.length)

    // 继续下一帧
    animationId = requestAnimationFrame(play)
  }

  // 延迟开始，给画布准备时间
  setTimeout(play, 100)

  // 返回取消函数
  return () => {
    isPlaying = false
    if (animationId) {
      cancelAnimationFrame(animationId)
    }
  }
}

/**
 * 绘制单个笔画
 * @param {CanvasRenderingContext2D} ctx - 画布上下文
 * @param {Object} stroke - 笔画数据
 */
function drawStroke(ctx, stroke) {
  if (!stroke.points || stroke.points.length < 2) return

  ctx.beginPath()
  ctx.strokeStyle = stroke.color || '#000000'
  ctx.lineWidth = stroke.size || 2
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  ctx.moveTo(stroke.points[0].x, stroke.points[0].y)

  for (let i = 1; i < stroke.points.length; i++) {
    const point = stroke.points[i]
    ctx.lineTo(point.x, point.y)
  }

  ctx.stroke()
}

/**
 * 保存轮次绘图数据
 * @param {string} roundId - 轮次ID
 * @param {Array} drawingData - 绘图数据
 * @returns {Promise<{error}>}
 */
export async function saveRoundDrawing(roundId, drawingData) {
  try {
    const compressed = compressDrawingEvents(drawingData)

    const { error } = await supabase
      .from('draw_guess_rounds')
      .update({ canvas_data: compressed })
      .eq('id', roundId)

    return { error: error?.message }
  } catch (err) {
    console.error('保存绘图数据异常:', err)
    return { error: err.message }
  }
}

/**
 * 获取轮次绘图数据
 * @param {string} roundId - 轮次ID
 * @returns {Promise<{data, error}>}
 */
export async function getRoundDrawing(roundId) {
  try {
    const { data, error } = await supabase
      .from('draw_guess_rounds')
      .select('canvas_data, target_word')
      .eq('id', roundId)
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    return {
      data: {
        events: decompressDrawingEvents(data.canvas_data),
        targetWord: data.target_word
      },
      error: null
    }
  } catch (err) {
    console.error('获取绘图数据异常:', err)
    return { data: null, error: err.message }
  }
}

/**
 * 广播绘图事件（保存到数据库）
 * @param {string} roomId - 房间ID
 * @param {string} roundId - 轮次ID
 * @param {string} userId - 用户ID
 * @param {Object} drawingEvent - 绘图事件
 * @returns {Promise<{error}>}
 */
export async function broadcastDrawingEvent(roomId, roundId, userId, drawingEvent) {
  try {
    // 记录操作
    await supabase
      .from('draw_guess_actions')
      .insert({
        room_id: roomId,
        round_id: roundId,
        user_id: userId,
        action_type: drawingEvent.type === 'stroke' ? 'draw_stroke' : 
                     drawingEvent.type === 'clear' ? 'draw_clear' : 'draw_undo',
        action_data: drawingEvent
      })

    // 获取当前绘图数据并追加
    const { data: round } = await supabase
      .from('draw_guess_rounds')
      .select('canvas_data')
      .eq('id', roundId)
      .single()

    const currentData = round?.canvas_data || []
    
    // 根据事件类型处理
    let newData
    if (drawingEvent.type === 'undo') {
      // 撤销最后一个笔画
      newData = currentData.filter(e => e.type !== 'stroke').concat(
        currentData.filter(e => e.type === 'stroke').slice(0, -1)
      )
    } else if (drawingEvent.type === 'clear') {
      newData = [...currentData, { type: 'clear', timestamp: Date.now() }]
    } else {
      newData = [...currentData, drawingEvent]
    }

    // 更新绘图数据
    const { error } = await supabase
      .from('draw_guess_rounds')
      .update({ canvas_data: newData })
      .eq('id', roundId)

    return { error: error?.message }
  } catch (err) {
    console.error('广播绘图事件异常:', err)
    return { error: err.message }
  }
}

/**
 * 计算绘图数据大小（字节）
 * @param {Array} events - 绘图事件数组
 * @returns {number} 字节数
 */
export function calculateDrawingSize(events) {
  if (!events) return 0
  return new Blob([JSON.stringify(events)]).size
}

/**
 * 导出绘图为图片
 * @param {HTMLCanvasElement} canvas - 画布元素
 * @param {string} format - 图片格式 ('png' | 'jpeg')
 * @returns {string} Base64 图片数据
 */
export function exportDrawingAsImage(canvas, format = 'png') {
  return canvas.toDataURL(`image/${format}`)
}

/**
 * 从图片恢复绘图（仅作为背景）
 * @param {HTMLCanvasElement} canvas - 目标画布
 * @param {string} imageData - Base64 图片数据
 * @returns {Promise<void>}
 */
export function restoreDrawingFromImage(canvas, imageData) {
  return new Promise((resolve, reject) => {
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
      resolve()
    }
    
    img.onerror = reject
    img.src = imageData
  })
}
