import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 全屏 Loading 组件
 * 用于页面加载时显示
 */
export function FullScreenLoading({ 
  message = '加载中...', 
  className 
}) {
  return (
    <div className={cn(
      "min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-center p-4",
      className
    )}>
      <div className="text-center">
        {/* 旋转的 Logo/图标 */}
        <div className="relative mb-6">
          <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          </div>
          {/* 脉冲效果 */}
          <div className="absolute inset-0 w-16 h-16 bg-purple-200 rounded-2xl mx-auto animate-ping opacity-20" />
        </div>
        
        {/* 加载文字 */}
        <p className="text-gray-600 text-lg font-medium">{message}</p>
        <p className="text-gray-400 text-sm mt-2">请稍候</p>
      </div>
    </div>
  );
}

/**
 * 小型内联 Loading 组件
 * 用于按钮内部或小区域加载状态
 */
export function InlineLoading({ 
  size = 'md', 
  className,
  text = null 
}) {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Loader2 className={cn("animate-spin text-current", sizeClasses[size])} />
      {text && <span className="text-sm">{text}</span>}
    </span>
  );
}

/**
 * 按钮 Loading 组件
 * 专门用于按钮内的加载状态
 */
export function ButtonLoading({ 
  text = '处理中...',
  className 
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Loader2 className="w-4 h-4 animate-spin" />
      {text}
    </span>
  );
}

/**
 * 骨架屏卡片组件
 * 用于工具卡片加载占位
 */
export function SkeletonCard({ className }) {
  return (
    <div className={cn(
      "bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse",
      className
    )}>
      {/* 图标区域 */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 bg-gray-200 rounded-xl" />
          <div className="w-8 h-8 bg-gray-200 rounded-full" />
        </div>
      </div>
      
      {/* 内容区域 */}
      <div className="px-6 pb-6">
        {/* 标题 */}
        <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
        {/* 描述 */}
        <div className="h-4 bg-gray-200 rounded w-full mb-1" />
        <div className="h-4 bg-gray-200 rounded w-2/3 mb-4" />
        {/* 标签 */}
        <div className="flex gap-2">
          <div className="h-6 bg-gray-200 rounded-full w-16" />
          <div className="h-6 bg-gray-200 rounded-full w-12" />
        </div>
      </div>
      
      {/* 底部操作区 */}
      <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
        <div className="flex items-center justify-between">
          <div className="h-4 bg-gray-200 rounded w-20" />
          <div className="h-8 bg-gray-200 rounded-lg w-24" />
        </div>
      </div>
    </div>
  );
}

/**
 * 骨架屏列表组件
 * 用于批量加载多个卡片
 */
export function SkeletonCardList({ count = 6, className }) {
  return (
    <div className={cn(
      "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6",
      className
    )}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  );
}

/**
 * 文本骨架屏组件
 * 用于段落或标题加载
 */
export function SkeletonText({ 
  lines = 3, 
  className,
  lastLineWidth = '60%'
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className="h-4 bg-gray-200 rounded animate-pulse"
          style={{
            width: index === lines - 1 ? lastLineWidth : '100%'
          }}
        />
      ))}
    </div>
  );
}

/**
 * 图片骨架屏组件
 * 用于图片加载占位
 */
export function SkeletonImage({ 
  aspectRatio = '16/9', 
  className 
}) {
  return (
    <div
      className={cn(
        "bg-gray-200 rounded-lg animate-pulse flex items-center justify-center",
        className
      )}
      style={{ aspectRatio }}
    >
      <svg
        className="w-10 h-10 text-gray-300"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  );
}

// 默认导出全屏加载
export default FullScreenLoading;
