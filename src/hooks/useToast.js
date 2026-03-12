import { useState, useCallback } from 'react'

// 全局 toast 状态（简单的单例模式）
let toastListeners = []
let toasts = []

const notifyListeners = () => {
  toastListeners.forEach((listener) => listener(toasts))
}

export function toast({ title, description, variant = 'default', duration = 3000 }) {
  const id = Math.random().toString(36).substring(2, 9)
  const newToast = { id, title, description, variant, duration }
  
  toasts = [...toasts, newToast]
  notifyListeners()

  // 自动关闭
  if (duration > 0) {
    setTimeout(() => {
      dismiss(id)
    }, duration)
  }

  return id
}

export function dismiss(id) {
  toasts = toasts.filter((t) => t.id !== id)
  notifyListeners()
}

export function useToast() {
  const [, setLocalToasts] = useState(toasts)

  // 订阅全局状态
  useState(() => {
    const listener = (newToasts) => setLocalToasts(newToasts)
    toastListeners.push(listener)
    
    return () => {
      toastListeners = toastListeners.filter((l) => l !== listener)
    }
  })

  const addToast = useCallback(({ title, description, variant, duration }) => {
    return toast({ title, description, variant, duration })
  }, [])

  const removeToast = useCallback((id) => {
    dismiss(id)
  }, [])

  return {
    toasts,
    toast: addToast,
    dismiss: removeToast,
  }
}

// 便捷方法
toast.success = (title, description) => toast({ title, description, variant: 'success' })
toast.error = (title, description) => toast({ title, description, variant: 'error' })
toast.warning = (title, description) => toast({ title, description, variant: 'warning' })
toast.info = (title, description) => toast({ title, description, variant: 'info' })
