import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, Globe, Tag, ArrowRight } from 'lucide-react'

export default function Home() {
  // Tab 列表
  const tabs = ['全部', '效率工具', '工作流', '小游戏']
  const [activeTab, setActiveTab] = useState('全部')

  // 工具数据
  const tools = [
    {
      id: 1,
      name: 'AI对话导航插件',
      desc: '解决ChatGPT长对话难定位痛点，支持快速跳转目标节点',
      category: '效率工具',
      tags: ['Chrome插件', 'ChatGPT'],
      type: 'download',
      icon: '🔗',
    },
    {
      id: 2,
      name: '智能出行工作流',
      desc: '基于n8n集成高德地图MCP，自然语言生成个性化出行方案',
      category: '工作流',
      tags: ['n8n', '高德地图', 'AI'],
      type: 'download',
      icon: '🗺️',
    },
    {
      id: 3,
      name: '健康管理工具',
      desc: '专注时长统计与站立提醒，守护你的工作健康',
      category: '效率工具',
      tags: ['健康', '番茄钟'],
      type: 'download',
      icon: '❤️',
    },
    {
      id: 4,
      name: 'AI桌游聚会游戏',
      desc: 'AI驱动的多人聚会游戏，让每次聚会都充满惊喜',
      category: '小游戏',
      tags: ['聚会', '多人', 'AI'],
      type: 'online',
      icon: '🎲',
    },
  ]

  // 过滤工具
  const filteredTools =
    activeTab === '全部'
      ? tools
      : tools.filter((tool) => tool.category === activeTab)

  return (
    <div className="min-h-screen bg-white">
      {/* Hero 区域 */}
      <section className="relative overflow-hidden bg-gradient-to-br from-purple-500 via-purple-600 to-blue-600 py-20 md:py-32">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full mix-blend-multiply filter blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-72 h-72 bg-white rounded-full mix-blend-multiply filter blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            用AI，让每件事都更简单
          </h1>
          <p className="text-lg md:text-xl text-gray-100 mb-10 max-w-3xl mx-auto">
            精选AI效率工具、工作流模板与聚会小游戏，全部由站长亲测可用
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/tools"
              className="inline-flex items-center justify-center px-8 py-3 bg-white text-purple-600 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              探索工具库
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link
              to="/games"
              className="inline-flex items-center justify-center px-8 py-3 bg-purple-700 text-white font-semibold rounded-lg hover:bg-purple-800 transition-colors border border-purple-400"
            >
              去玩游戏
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Tab 区域 */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex gap-2 md:gap-4 border-b border-gray-200 overflow-x-auto pb-4">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </section>

      {/* 工具卡片区域 */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filteredTools.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTools.map((tool) => (
              <Link
                key={tool.id}
                to={`/tools/${tool.id}`}
                className="group bg-white border border-gray-200 rounded-lg hover:border-purple-300 hover:shadow-lg transition-all duration-300 overflow-hidden"
              >
                <div className="p-6">
                  {/* 图标 */}
                  <div className="text-5xl mb-4">{tool.icon}</div>

                  {/* 标题和描述 */}
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                    {tool.name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {tool.desc}
                  </p>

                  {/* 标签 */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {tool.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700"
                      >
                        <Tag className="mr-1 h-3 w-3" />
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center gap-2 text-purple-600 font-medium text-sm">
                    {tool.type === 'download' ? (
                      <>
                        <Download className="h-4 w-4" />
                        下载
                      </>
                    ) : (
                      <>
                        <Globe className="h-4 w-4" />
                        在线玩
                      </>
                    )}
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">暂无工具数据</p>
          </div>
        )}
      </section>

      {/* 底部 Banner */}
      <section className="bg-gradient-to-r from-blue-50 to-purple-50 border-t border-gray-200 py-12 md:py-16 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
            还有更多工具正在开发中
          </h2>
          <p className="text-gray-600 mb-8">欢迎关注更新</p>
          <button className="inline-flex items-center px-8 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors">
            联系站长
            <ArrowRight className="ml-2 h-5 w-5" />
          </button>
        </div>
      </section>
    </div>
  )
}
