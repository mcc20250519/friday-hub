/**
 * ColorPicker - Wild 牌选色弹窗
 */

import { COLORS, COLOR_CLASSES, COLOR_NAMES } from '@/lib/uno/constants'

/**
 * @param {Object} props
 * @param {boolean} props.visible - 是否显示
 * @param {Function} props.onSelect - 选色回调 (color) => void
 */
export default function ColorPicker({ visible, onSelect }) {
  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4 transform animate-in zoom-in-90 duration-200">
        <h3 className="text-lg font-bold text-gray-800 text-center mb-6">
          选择颜色
        </h3>

        {/* 颜色选择格子 */}
        <div className="grid grid-cols-2 gap-4">
          {COLORS.map((color) => {
            const cls = COLOR_CLASSES[color]
            return (
              <button
                key={color}
                onClick={() => onSelect(color)}
                className={`
                  h-20 rounded-xl ${cls.bg} ${cls.bgHover}
                  text-white font-bold text-lg
                  transform transition-all duration-150
                  hover:scale-105 active:scale-95
                  shadow-md hover:shadow-xl
                  flex items-center justify-center gap-2
                `}
              >
                <span className="text-2xl">
                  {color === 'red'
                    ? '🔴'
                    : color === 'yellow'
                    ? '🟡'
                    : color === 'green'
                    ? '🟢'
                    : '🔵'}
                </span>
                <span>{COLOR_NAMES[color]}</span>
              </button>
            )
          })}
        </div>

        <p className="text-center text-gray-400 text-sm mt-4">
          点击选择你想要的颜色
        </p>
      </div>
    </div>
  )
}
