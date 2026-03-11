import { Link } from 'react-router-dom'
import { Mail, MessageCircle } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export default function Footer() {
  const links = [
    { label: '工具库', href: '/tools' },
    { label: '游戏广场', href: '/games' },
    { label: '关于我们', href: '/about' },
  ]

  return (
    <footer className="bg-gray-900 text-gray-300 py-8 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          {/* 左侧：版权信息 */}
          <div className="text-sm text-gray-400">
            <p>© 2026 Friday Hub. 用AI提升每一天的效率。</p>
          </div>

          {/* 中间：友情链接 */}
          <div className="flex gap-6 md:gap-8">
            {links.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* 右侧：联系方式图标 */}
          <div className="flex gap-4">
            <TooltipProvider>
              {/* 微信图标 */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-gray-400 hover:text-white">
                    <MessageCircle className="h-5 w-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>微信：friday_hub</p>
                </TooltipContent>
              </Tooltip>

              {/* 邮箱图标 */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href="mailto:contact@fridayhub.com"
                    className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-gray-400 hover:text-white"
                  >
                    <Mail className="h-5 w-5" />
                  </a>
                </TooltipTrigger>
                <TooltipContent>
                  <p>邮箱：contact@fridayhub.com</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* 分割线 */}
        <div className="border-t border-gray-800 mt-8 pt-6">
          <p className="text-center text-xs text-gray-500">
            Made with ❤️ by Friday Hub Team
          </p>
        </div>
      </div>
    </footer>
  )
}
