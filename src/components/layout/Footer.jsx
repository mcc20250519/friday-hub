import { Link } from 'react-router-dom'
import { Mail, MessageCircle, Heart } from 'lucide-react'
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

  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-white border-t mt-16" style={{ borderColor: '#E8E3DB' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 主内容区 */}
        <div className="py-10 sm:py-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            {/* 左侧：Logo 和描述 */}
            <div className="flex-1">
              <h3 className="text-base font-bold mb-1.5" style={{ color: '#1A1814' }}>
                Friday Hub
              </h3>
              <p className="text-sm text-stone-500 leading-relaxed max-w-xs">
                精选好用的工具和趣味游戏，让每一天都过得舒服一点。
              </p>
            </div>

            {/* 中间：快速导航 */}
            <div>
              <p className="text-xs font-semibold text-stone-700 mb-3 uppercase tracking-wide">快速导航</p>
              <div className="flex flex-col gap-2">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className="text-sm text-stone-500 hover:text-stone-800 transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* 右侧：联系方式 */}
            <div>
              <p className="text-xs font-semibold text-stone-700 mb-3 uppercase tracking-wide">保持联系</p>
              <div className="flex gap-2">
                <TooltipProvider>
                  {/* 微信图标 */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className="p-2.5 rounded-lg transition-all duration-200"
                        style={{ background: '#F0EDE7' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#E8E3DB'}
                        onMouseLeave={e => e.currentTarget.style.background = '#F0EDE7'}
                      >
                        <MessageCircle className="h-4 w-4" style={{ color: '#1A1814' }} />
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
                        className="p-2.5 rounded-lg transition-all duration-200"
                        style={{ background: '#F0EDE7' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#E8E3DB'}
                        onMouseLeave={e => e.currentTarget.style.background = '#F0EDE7'}
                      >
                        <Mail className="h-4 w-4" style={{ color: '#1A1814' }} />
                      </a>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>邮箱：contact@fridayhub.com</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
        </div>

        {/* 底部分割线 */}
        <div className="border-t" style={{ borderColor: '#E8E3DB' }}></div>

        {/* 底部版权区 */}
        <div className="py-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-stone-400">
            © {currentYear} Friday Hub. All rights reserved.
          </p>
          <p className="text-xs text-stone-400 flex items-center gap-1">
            Made with <Heart className="h-3 w-3 text-red-400 fill-red-400" /> by the team
          </p>
        </div>
      </div>
    </footer>
  )
}
