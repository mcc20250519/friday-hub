/**
 * 你说我猜 - 绘图 Canvas Hook
 * 提供画布绑定、绘图操作、撤销/重做、导出等功能
 */

import { useState, useCallback, useRef, useEffect } from 'react'

// 默认画笔颜色
const DEFAULT_COLORS = [
  '#000000', '#FFFFFF', '#FF0000', '#FF6B00', 
  '#FFDD00', '#00FF00', '#00BFFF', '#8B00FF'
]

// 默认画笔大小
const DEFAULT_SIZES = [2, 4, 8, 12, 20]

/**
 * 绘图画布 Hook
 * @param {Object} options - 配置选项
 * @param {number} options.width - 画布宽度
 * @param {number} options.height - 画布高度
 * @param {string} options.defaultColor - 默认颜色
 * @param {number} options.defaultSize - 默认大小
 * @param {Function} options.onStroke - 笔画完成回调
 * @param {Function} options.onClear - 清空回调
 * @param {boolean} options.readOnly - 只读模式（仅观看）
 * @returns {Object} 画布状态和操作方法
 */
export function useDrawingCanvas(options = {}) {
  const {
    width = 800,
    height = 600,
    defaultColor = '#000000',
    defaultSize = 4,
    onStroke,
    onClear,
    readOnly = false
  } = options

  // Refs
  const canvasRef = useRef(null)
  const ctxRef = useRef(null)
  const isDrawingRef = useRef(false)
  const lastPointRef = useRef(null)
  const currentStrokeRef = useRef([])
  const isRedrawingRef = useRef(false) // 防止重绘时触发闪烁
  const prevStrokesLengthRef = useRef(0) // 追踪笔画数量
  const skipNextRedrawRef = useRef(false) // 跳过下一次重绘
  const strokesRef = useRef([]) // 用于在重绘时获取最新的 strokes
  const redrawCanvasRef = useRef(null) // 用于在 useEffect 中调用 redrawCanvas

  // State
  const [brushColor, setBrushColor] = useState(defaultColor)
  const [brushSize, setBrushSize] = useState(defaultSize)
  const [isDrawing, setIsDrawing] = useState(false)
  const [strokes, setStrokes] = useState([]) // 所有笔画
  const [undoStack, setUndoStack] = useState([]) // 撤销栈
  const [redoStack, setRedoStack] = useState([]) // 重做栈
  const [isEraser, setIsEraser] = useState(false)

  // 保持 strokesRef 与 strokes 同步，并处理重绘逻辑
  useEffect(() => {
    // 先同步 ref（确保 redrawCanvas 能获取最新数据）
    strokesRef.current = strokes
    
    // 如果正在重绘过程中，跳过
    if (isRedrawingRef.current) {
      return
    }

    // 如果标记跳过重绘，说明刚完成一笔绘制，笔画已经在画布上了
    if (skipNextRedrawRef.current) {
      skipNextRedrawRef.current = false
      prevStrokesLengthRef.current = strokes.length
      return
    }

    // 其他情况需要重绘（撤销、重做、恢复数据等）
    // 判断 strokes 是否有变化
    if (strokes.length !== prevStrokesLengthRef.current) {
      prevStrokesLengthRef.current = strokes.length
      // 调用重绘函数
      if (redrawCanvasRef.current) {
        redrawCanvasRef.current()
      }
    }
  }, [strokes, redrawCanvasRef])
  const initCanvas = useCallback((canvas) => {
    if (!canvas) return

    canvasRef.current = canvas
    ctxRef.current = canvas.getContext('2d')

    // 设置画布大小
    canvas.width = width
    canvas.height = height

    // 设置默认样式
    const ctx = ctxRef.current
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, width, height)
  }, [width, height])

  // 绘制单个笔画到画布（使用二次贝塞尔曲线保持与实时绘制一致）
  const drawStrokeToCanvas = useCallback((stroke) => {
    const ctx = ctxRef.current
    if (!ctx || !stroke.points || stroke.points.length < 2) return

    ctx.beginPath()
    ctx.strokeStyle = stroke.color || '#000000'
    ctx.lineWidth = stroke.size || 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    const points = stroke.points
    ctx.moveTo(points[0].x, points[0].y)

    // 使用二次贝塞尔曲线绘制，与实时绘制保持一致
    for (let i = 1; i < points.length; i++) {
      const prevPoint = points[i - 1]
      const currPoint = points[i]
      const midX = (prevPoint.x + currPoint.x) / 2
      const midY = (prevPoint.y + currPoint.y) / 2
      ctx.quadraticCurveTo(prevPoint.x, prevPoint.y, midX, midY)
    }

    // 绘制到最后一个点
    const lastPoint = points[points.length - 1]
    ctx.lineTo(lastPoint.x, lastPoint.y)
    ctx.stroke()
  }, [])

  // 完全重绘所有笔画（仅在撤销/重做/恢复数据时使用）
  const fullRedrawCanvas = useCallback(() => {
    const ctx = ctxRef.current
    const canvas = canvasRef.current
    if (!ctx || !canvas) return

    isRedrawingRef.current = true

    // 清空画布
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // 使用 ref 获取最新的 strokes
    const currentStrokes = strokesRef.current
    currentStrokes.forEach(stroke => {
      if (stroke.type === 'clear') {
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      } else {
        drawStrokeToCanvas(stroke)
      }
    })

    isRedrawingRef.current = false
  }, [drawStrokeToCanvas])

  // redrawCanvas 的别名
  const redrawCanvas = fullRedrawCanvas

  // 同步 redrawCanvas 到 ref，避免 useEffect 依赖问题
  useEffect(() => {
    redrawCanvasRef.current = redrawCanvas
  }, [redrawCanvas])

  // 开始绘图
  const startDrawing = useCallback((x, y, pressure = 1) => {
    if (readOnly || !ctxRef.current) return

    isDrawingRef.current = true
    setIsDrawing(true)
    lastPointRef.current = { x, y }
    currentStrokeRef.current = [{ x, y, pressure }]

    const ctx = ctxRef.current
    ctx.beginPath()
    ctx.strokeStyle = isEraser ? '#FFFFFF' : brushColor
    ctx.lineWidth = isEraser ? brushSize * 3 : brushSize
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.moveTo(x, y)
  }, [readOnly, brushColor, brushSize, isEraser])

  // 绘图移动 - 使用二次贝塞尔曲线使线条更平滑
  const draw = useCallback((x, y, pressure = 1) => {
    if (!isDrawingRef.current || readOnly || !ctxRef.current) return

    const ctx = ctxRef.current
    const lastPoint = lastPointRef.current

    // 使用二次贝塞尔曲线连接点，使线条更平滑
    if (lastPoint) {
      const midX = (lastPoint.x + x) / 2
      const midY = (lastPoint.y + y) / 2
      ctx.quadraticCurveTo(lastPoint.x, lastPoint.y, midX, midY)
      ctx.stroke()
    }

    currentStrokeRef.current.push({ x, y, pressure })
    lastPointRef.current = { x, y }
  }, [readOnly])

  // 结束绘图
  const endDrawing = useCallback(() => {
    if (!isDrawingRef.current || readOnly) return

    isDrawingRef.current = false
    setIsDrawing(false)

    const ctx = ctxRef.current

    // 完成当前笔画的绘制
    if (ctx && currentStrokeRef.current.length > 1) {
      const lastPoint = currentStrokeRef.current[currentStrokeRef.current.length - 1]
      ctx.lineTo(lastPoint.x, lastPoint.y)
      ctx.stroke()
    }

    // 保存笔画
    if (currentStrokeRef.current.length > 0) {
      const newStroke = {
        type: 'stroke',
        points: [...currentStrokeRef.current],
        color: isEraser ? '#FFFFFF' : brushColor,
        size: isEraser ? brushSize * 3 : brushSize,
        timestamp: Date.now()
      }

      // 标记跳过下一次重绘，因为笔画已经在绘制过程中实时渲染
      skipNextRedrawRef.current = true

      setStrokes(prev => [...prev, newStroke])
      setUndoStack(prev => [...prev, newStroke])
      setRedoStack([]) // 清空重做栈

      // 触发回调
      onStroke?.(newStroke)
    }

    currentStrokeRef.current = []
    lastPointRef.current = null
  }, [readOnly, brushColor, brushSize, isEraser, onStroke])

  // 撤销
  const undo = useCallback(() => {
    if (readOnly || strokes.length === 0) return

    // 重置跳过标记，确保撤销时会触发重绘
    skipNextRedrawRef.current = false
    prevStrokesLengthRef.current = strokes.length

    const lastStroke = strokes[strokes.length - 1]
    setStrokes(prev => prev.slice(0, -1))
    setRedoStack(prev => [...prev, lastStroke])

    // 触发回调
    onStroke?.({ type: 'undo', timestamp: Date.now() })
  }, [readOnly, strokes, onStroke])

  // 重做
  const redo = useCallback(() => {
    if (readOnly || redoStack.length === 0) return

    // 重做时需要跳过重绘，因为笔画会被重新添加到 strokes 中
    // 但我们先确保标记正确
    skipNextRedrawRef.current = false
    prevStrokesLengthRef.current = strokes.length

    const strokeToRedo = redoStack[redoStack.length - 1]
    setStrokes(prev => [...prev, strokeToRedo])
    setRedoStack(prev => prev.slice(0, -1))

    // 触发回调
    onStroke?.(strokeToRedo)
  }, [readOnly, redoStack, onStroke])

  // 清空画布
  const clearCanvas = useCallback(() => {
    if (readOnly) return

    const ctx = ctxRef.current
    const canvas = canvasRef.current
    if (!ctx || !canvas) return

    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const clearEvent = { type: 'clear', timestamp: Date.now() }
    setStrokes(prev => [...prev, clearEvent])
    setUndoStack(prev => [...prev, clearEvent])
    setRedoStack([])

    // 触发回调
    onClear?.()
    onStroke?.(clearEvent)
  }, [readOnly, onClear, onStroke])

  // 切换橡皮擦
  const toggleEraser = useCallback(() => {
    setIsEraser(prev => !prev)
  }, [])

  // 获取画布数据
  const getCanvasData = useCallback(() => {
    return strokes
  }, [strokes])

  // 从数据恢复画布
  const restoreCanvasData = useCallback((data) => {
    if (!data) return

    // 重置跳过标记，确保恢复数据时会触发重绘
    skipNextRedrawRef.current = false
    prevStrokesLengthRef.current = -1 // 强制触发重绘

    setStrokes(data)
    setUndoStack(data)
    setRedoStack([])
  }, [])

  // 导出为图片
  const exportAsImage = useCallback((format = 'png') => {
    const canvas = canvasRef.current
    if (!canvas) return null
    return canvas.toDataURL(`image/${format}`)
  }, [])

  // 鼠标事件处理
  const handleMouseDown = useCallback((e) => {
    if (readOnly) return
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    startDrawing(x, y)
  }, [readOnly, startDrawing])

  const handleMouseMove = useCallback((e) => {
    if (readOnly) return
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    draw(x, y)
  }, [readOnly, draw])

  const handleMouseUp = useCallback(() => {
    endDrawing()
  }, [endDrawing])

  const handleMouseLeave = useCallback(() => {
    endDrawing()
  }, [endDrawing])

  // 触摸事件处理
  const handleTouchStart = useCallback((e) => {
    if (readOnly) return
    e.preventDefault()
    const touch = e.touches[0]
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = touch.clientX - rect.left
    const y = touch.clientY - rect.top
    const pressure = touch.force || 1
    startDrawing(x, y, pressure)
  }, [readOnly, startDrawing])

  const handleTouchMove = useCallback((e) => {
    if (readOnly) return
    e.preventDefault()
    const touch = e.touches[0]
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = touch.clientX - rect.left
    const y = touch.clientY - rect.top
    const pressure = touch.force || 1
    draw(x, y, pressure)
  }, [readOnly, draw])

  const handleTouchEnd = useCallback((e) => {
    if (readOnly) return
    e.preventDefault()
    endDrawing()
  }, [readOnly, endDrawing])

  return {
    // Refs
    canvasRef,
    
    // 状态
    isDrawing,
    brushColor,
    brushSize,
    isEraser,
    strokes,
    canUndo: strokes.length > 0,
    canRedo: redoStack.length > 0,
    colors: DEFAULT_COLORS,
    sizes: DEFAULT_SIZES,
    
    // 初始化
    initCanvas,
    
    // 绘图操作
    startDrawing,
    draw,
    endDrawing,
    
    // 工具操作
    setBrushColor,
    setBrushSize,
    toggleEraser,
    setIsEraser,
    
    // 画布操作
    undo,
    redo,
    clearCanvas,
    
    // 数据操作
    getCanvasData,
    restoreCanvasData,
    exportAsImage,
    
    // 事件处理
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    
    // 工具方法
    redrawCanvas
  }
}
