import { Component } from 'react';
import { Home, RefreshCw, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * ErrorBoundary 错误边界组件
 * 捕获子组件树中的 JavaScript 错误，防止整个应用崩溃
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    // 更新 state，下次渲染时显示备用 UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // 可以在这里记录错误日志
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });
    // 可以发送到错误监控服务（如 Sentry）
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRefresh = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // 友好的错误页面
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center">
            {/* 错误图标 */}
            <div className="mb-8">
              <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-12 h-12 text-red-500" />
              </div>
              <h1 className="text-6xl font-bold text-gray-900 mb-2">出错啦</h1>
              <p className="text-xl text-gray-600">页面遇到了一些问题</p>
            </div>

            {/* 错误信息卡片 */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <p className="text-gray-600 mb-6">
                别担心，这可能是暂时的问题。你可以尝试刷新页面，或者返回首页重新开始。
              </p>

              {/* 操作按钮 */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={this.handleRefresh}
                  className="inline-flex items-center justify-center px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                >
                  <RefreshCw className="w-5 h-5 mr-2" />
                  刷新页面
                </button>

                <Link
                  to="/"
                  onClick={this.handleReset}
                  className="inline-flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  <Home className="w-5 h-5 mr-2" />
                  返回首页
                </Link>
              </div>
            </div>

            {/* 底部提示 */}
            <p className="text-sm text-gray-500">
              如果问题持续存在，请稍后再试或联系客服支持
            </p>
          </div>
        </div>
      );
    }

    // 正常情况下渲染子组件
    return this.props.children;
  }
}

export default ErrorBoundary;
