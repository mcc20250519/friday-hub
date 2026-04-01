/**
 * MobileGameStatus - 移动端游戏状态提示组件
 *
 * 支持三种提示形式：
 * 1. Toast   - 屏幕顶部弹出，自动消失（2s）
 * 2. Banner  - 顶部持久横幅，需手动关闭
 * 3. Modal   - 全屏遮罩弹窗，阻止背景交互
 *
 * 使用方法（配合 useMobileGameStatus hook）：
 *   const { showToast, showBanner, showModal, closeModal } = useMobileGameStatus()
 *   showToast('出牌成功', 'success')
 *   showBanner('网络不稳定，请注意', 'warning')
 *   showModal({ title: '游戏结束', message: '...' })
 */

import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react'
import { X, CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react'

// ─── 类型颜色配置 ─────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  success: {
    bg: 'bg-green-500',
    text: 'text-white',
    icon: CheckCircle,
    border: 'border-green-600',
    light: 'bg-green-50 border-green-300 text-green-800',
  },
  error: {
    bg: 'bg-red-500',
    text: 'text-white',
    icon: XCircle,
    border: 'border-red-600',
    light: 'bg-red-50 border-red-300 text-red-800',
  },
  warning: {
    bg: 'bg-amber-500',
    text: 'text-white',
    icon: AlertTriangle,
    border: 'border-amber-600',
    light: 'bg-amber-50 border-amber-300 text-amber-800',
  },
  info: {
    bg: 'bg-blue-500',
    text: 'text-white',
    icon: Info,
    border: 'border-blue-600',
    light: 'bg-blue-50 border-blue-300 text-blue-800',
  },
}

// ─── Toast 提示（自动消失）────────────────────────────────────────────────
function ToastItem({ id, message, type = 'info', onDismiss }) {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.info
  const Icon = cfg.icon
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // 进入动画
    const showTimer = requestAnimationFrame(() => setVisible(true))
    // 自动消失
    const dismissTimer = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onDismiss(id), 300)
    }, 2200)
    return () => {
      cancelAnimationFrame(showTimer)
      clearTimeout(dismissTimer)
    }
  }, [id, onDismiss])

  return (
    <div
      className={`
        flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-lg
        ${cfg.bg} ${cfg.text}
        transition-all duration-300 pointer-events-auto
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3'}
      `}
      style={{ maxWidth: 320, minWidth: 200 }}
      onClick={() => { setVisible(false); setTimeout(() => onDismiss(id), 300) }}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="text-sm font-semibold leading-tight flex-1">{message}</span>
    </div>
  )
}

// ─── Toast 容器 ───────────────────────────────────────────────────────────
function ToastContainer({ toasts, onDismiss }) {
  if (toasts.length === 0) return null
  return (
    <div
      className="fixed top-14 left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center gap-2 pointer-events-none"
      style={{ width: '90vw', maxWidth: 360 }}
    >
      {toasts.map(t => (
        <ToastItem key={t.id} {...t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

// ─── 横幅（持久，手动关闭）───────────────────────────────────────────────
function Banner({ message, type = 'warning', onClose }) {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.warning

  return (
    <div
      className={`
        fixed top-11 left-0 right-0 z-[150]
        flex items-center gap-3 px-4 py-2.5
        border-b-2 ${cfg.light}
        transition-all duration-300 animate-in slide-in-from-top-2
      `}
    >
      {(() => {
        const Icon = cfg.icon
        return <Icon className="w-4 h-4 flex-shrink-0" />
      })()}
      <span className="flex-1 text-xs font-semibold leading-snug">{message}</span>
      <button
        onClick={onClose}
        className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity p-0.5"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

// ─── 弹窗（Modal）────────────────────────────────────────────────────────
function Modal({ title, message, confirmText = '确定', cancelText, onConfirm, onCancel, type = 'info' }) {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.info
  const Icon = cfg.icon

  // 阻止背景点击传播
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && onCancel) onCancel()
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[300] p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
        style={{ animation: 'modal-in 0.25s cubic-bezier(0.34,1.56,0.64,1)' }}
      >
        {/* 头部色块 */}
        <div className={`${cfg.bg} px-6 pt-6 pb-4 flex flex-col items-center gap-2`}>
          <Icon className="w-10 h-10 text-white" />
          <h3 className="text-lg font-black text-white text-center leading-tight">{title}</h3>
        </div>

        {/* 内容 */}
        {message && (
          <div className="px-6 py-4">
            <p className="text-sm text-gray-600 text-center leading-relaxed">{message}</p>
          </div>
        )}

        {/* 按钮 */}
        <div className="px-6 pb-6 flex gap-3">
          {cancelText && onCancel && (
            <button
              onClick={onCancel}
              className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-sm active:scale-95 transition-transform"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={onConfirm}
            className={`flex-1 py-3 rounded-xl ${cfg.bg} text-white font-black text-sm shadow-lg active:scale-95 transition-transform`}
          >
            {confirmText}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes modal-in {
          from { transform: scale(0.8); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// ─── Context ──────────────────────────────────────────────────────────────
const GameStatusContext = createContext(null)

export function MobileGameStatusProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [banner, setBanner] = useState(null)   // { message, type }
  const [modal, setModal]   = useState(null)   // { title, message, ... }
  const idRef = useRef(0)

  const showToast = useCallback((message, type = 'info') => {
    const id = ++idRef.current
    setToasts(prev => [...prev, { id, message, type }])
  }, [])

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const showBanner = useCallback((message, type = 'warning') => {
    setBanner({ message, type })
  }, [])

  const closeBanner = useCallback(() => setBanner(null), [])

  const showModal = useCallback((options) => {
    setModal(options)
  }, [])

  const closeModal = useCallback(() => setModal(null), [])

  return (
    <GameStatusContext.Provider value={{ showToast, showBanner, closeBanner, showModal, closeModal }}>
      {children}

      {/* Toast 层 */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* 横幅层 */}
      {banner && (
        <Banner
          message={banner.message}
          type={banner.type}
          onClose={closeBanner}
        />
      )}

      {/* 弹窗层 */}
      {modal && (
        <Modal
          {...modal}
          onConfirm={() => { modal.onConfirm?.(); closeModal() }}
          onCancel={modal.onCancel ? () => { modal.onCancel(); closeModal() } : undefined}
        />
      )}
    </GameStatusContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────
export function useMobileGameStatus() {
  const ctx = useContext(GameStatusContext)
  if (!ctx) throw new Error('useMobileGameStatus must be used within MobileGameStatusProvider')
  return ctx
}

export default MobileGameStatusProvider
