import { Link } from 'react-router-dom';
import { Home, Search, ArrowLeft } from 'lucide-react';
import BackButton from '@/components/common/BackButton';

/**
 * NotFound 404 页面
 * 当用户访问不存在的路由时显示
 */
export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full text-center">
        {/* 404 大数字 */}
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
            404
          </h1>
        </div>

        {/* 错误图标和文字 */}
        <div className="mb-8">
          <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-10 h-10 text-purple-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            页面不见了
          </h2>
          <p className="text-gray-600 max-w-sm mx-auto">
            抱歉，你访问的页面可能已被删除、移动或从未存在过。请检查网址是否正确。
          </p>
        </div>

        {/* 操作建议 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
          <p className="text-sm text-gray-500 mb-4">
            你可以尝试以下操作：
          </p>
          <ul className="text-left text-sm text-gray-600 space-y-2 mb-0">
            <li className="flex items-center">
              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full mr-2" />
              检查网址是否拼写正确
            </li>
            <li className="flex items-center">
              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full mr-2" />
              返回上一页重新查找
            </li>
            <li className="flex items-center">
              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full mr-2" />
              前往首页浏览全部内容
            </li>
          </ul>
        </div>

        {/* 操作按钮 */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 min-h-[48px]"
          >
            <Home className="w-5 h-5 mr-2" />
            返回首页
          </Link>

          <BackButton
            variant="secondary"
            className="px-6 py-3 font-medium rounded-lg min-h-[48px]"
          >
            返回上一页
          </BackButton>
        </div>

        {/* 底部装饰 */}
        <div className="mt-12 flex justify-center gap-2">
          <div className="w-2 h-2 bg-purple-200 rounded-full" />
          <div className="w-2 h-2 bg-purple-300 rounded-full" />
          <div className="w-2 h-2 bg-purple-400 rounded-full" />
          <div className="w-2 h-2 bg-purple-300 rounded-full" />
          <div className="w-2 h-2 bg-purple-200 rounded-full" />
        </div>
      </div>
    </div>
  );
}
