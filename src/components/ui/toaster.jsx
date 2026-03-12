import { useToast } from '@/hooks/useToast'

export function Toaster() {
  const { toasts } = useToast()

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} />
      ))}
    </div>
  )
}

function Toast({ id, title, description, variant = 'default', onDismiss }) {
  const { dismiss } = useToast()

  const variants = {
    default: 'bg-white border-gray-200 text-gray-900',
    success: 'bg-green-50 border-green-200 text-green-900',
    error: 'bg-red-50 border-red-200 text-red-900',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-900',
    info: 'bg-blue-50 border-blue-200 text-blue-900',
  }

  const icons = {
    default: '🔔',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
  }

  return (
    <div
      className={`pointer-events-auto w-80 p-4 rounded-lg border shadow-lg transform transition-all duration-300 animate-in slide-in-from-right ${variants[variant]}`}
      onClick={() => dismiss(id)}
    >
      <div className="flex items-start gap-3">
        <span className="text-lg">{icons[variant]}</span>
        <div className="flex-1 min-w-0">
          {title && <div className="font-semibold text-sm">{title}</div>}
          {description && (
            <div className="text-sm opacity-90 mt-1">{description}</div>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            dismiss(id)
          }}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
        >
          ×
        </button>
      </div>
    </div>
  )
}
