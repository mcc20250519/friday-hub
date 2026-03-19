/**
 * GameCanvas - 游戏绘图画布
 * 提供绑定、绘图工具栏、触摸/鼠标支持
 */

import { useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { 
  Eraser, Pencil, RotateCcw, RotateCw, Trash2, 
  Palette, Minus, Plus 
} from 'lucide-react'

// 画笔颜色
const BRUSH_COLORS = [
  '#000000', '#FFFFFF', '#FF0000', '#FF6B00', 
  '#FFDD00', '#00FF00', '#00BFFF', '#8B00FF',
  '#FF69B4', '#8B4513', '#808080', '#00CED1'
]

// 画笔大小
const BRUSH_SIZES = [2, 4, 8, 12, 20]

/**
 * @param {Object} props
 * @param {Object} props.canvasHook - useDrawingCanvas hook 返回的对象
 * @param {boolean} props.isDescriber - 是否是描述者
 * @param {boolean} props.readOnly - 只读模式
 */
export default function GameCanvas({ 
  canvasHook, 
  isDescriber = false,
  readOnly = false 
}) {
  const canvasRef = useRef(null)

  // 初始化画布
  useEffect(() => {
    if (canvasRef.current && canvasHook?.initCanvas) {
      canvasHook.initCanvas(canvasRef.current)
    }
  }, [canvasHook])

  // 如果 canvasHook 未提供，使用简单的只读画布
  const hook = canvasHook || {
    isDrawing: false,
    brushColor: '#000000',
    brushSize: 4,
    isEraser: false,
    canUndo: false,
    canRedo: false,
    colors: BRUSH_COLORS,
    sizes: BRUSH_SIZES,
    setBrushColor: () => {},
    setBrushSize: () => {},
    toggleEraser: () => {},
    setIsEraser: () => {},
    undo: () => {},
    redo: () => {},
    clearCanvas: () => {},
    handleMouseDown: () => {},
    handleMouseMove: () => {},
    handleMouseUp: () => {},
    handleMouseLeave: () => {},
    handleTouchStart: () => {},
    handleTouchMove: () => {},
    handleTouchEnd: () => {}
  }

  const canDraw = isDescriber && !readOnly

  // 获取光标样式
  const getCursorStyle = () => {
    if (!canDraw) return 'cursor-default'
    if (hook.isEraser) return 'cursor-alias'
    return 'cursor-crosshair'
  }

  return (
    <Card className="overflow-hidden">
      {/* 工具栏 - 仅描述者可见 */}
      {canDraw && (
        <div className="p-2 bg-gray-50 border-b border-gray-200 space-y-2">
          {/* 第一行：颜色选择 */}
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-gray-500" />
            <div className="flex flex-wrap gap-1">
              {hook.colors.map(color => (
                <button
                  key={color}
                  onClick={() => hook.setBrushColor(color)}
                  disabled={readOnly}
                  className={`w-6 h-6 rounded-full border-2 transition-transform ${
                    hook.brushColor === color 
                      ? 'border-blue-500 scale-110' 
                      : 'border-gray-300 hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* 第二行：画笔大小和工具 */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* 画笔大小 */}
            <div className="flex items-center gap-1">
              <Minus 
                className="w-4 h-4 text-gray-500 cursor-pointer hover:text-gray-700"
                onClick={() => {
                  const idx = hook.sizes.indexOf(hook.brushSize)
                  if (idx > 0) hook.setBrushSize(hook.sizes[idx - 1])
                }}
              />
              <span className="text-xs text-gray-500 w-6 text-center">{hook.brushSize}</span>
              <Plus 
                className="w-4 h-4 text-gray-500 cursor-pointer hover:text-gray-700"
                onClick={() => {
                  const idx = hook.sizes.indexOf(hook.brushSize)
                  if (idx < hook.sizes.length - 1) hook.setBrushSize(hook.sizes[idx + 1])
                }}
              />
            </div>

            <div className="w-px h-4 bg-gray-300" />

            {/* 画笔/橡皮擦切换 */}
            <Button
              variant={hook.isEraser ? 'outline' : 'default'}
              size="sm"
              onClick={() => hook.setIsEraser(false)}
              className={`h-8 ${!hook.isEraser ? 'bg-blue-500 hover:bg-blue-600' : ''}`}
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              variant={hook.isEraser ? 'default' : 'outline'}
              size="sm"
              onClick={() => hook.setIsEraser(true)}
              className={`h-8 ${hook.isEraser ? 'bg-blue-500 hover:bg-blue-600' : ''}`}
            >
              <Eraser className="w-4 h-4" />
            </Button>

            {/* 撤销/重做 */}
            <Button
              variant="outline"
              size="sm"
              onClick={hook.undo}
              disabled={!hook.canUndo}
              className="h-8"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={hook.redo}
              disabled={!hook.canRedo}
              className="h-8"
            >
              <RotateCw className="w-4 h-4" />
            </Button>

            {/* 清空 */}
            <Button
              variant="outline"
              size="sm"
              onClick={hook.clearCanvas}
              className="h-8 text-red-600 border-red-200 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* 画布 */}
      <div className="relative bg-white">
        <canvas
          ref={canvasRef}
          width={800}
          height={500}
          className={`w-full touch-none ${getCursorStyle()}`}
          style={{ aspectRatio: '800 / 500' }}
          onMouseDown={canDraw ? hook.handleMouseDown : undefined}
          onMouseMove={canDraw ? hook.handleMouseMove : undefined}
          onMouseUp={canDraw ? hook.handleMouseUp : undefined}
          onMouseLeave={canDraw ? hook.handleMouseLeave : undefined}
          onTouchStart={canDraw ? hook.handleTouchStart : undefined}
          onTouchMove={canDraw ? hook.handleTouchMove : undefined}
          onTouchEnd={canDraw ? hook.handleTouchEnd : undefined}
        />
        
        {/* 只读遮罩 */}
        {!canDraw && (
          <div className="absolute inset-0 bg-transparent" />
        )}
      </div>
    </Card>
  )
}
