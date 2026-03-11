import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'

export default function Layout() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* 固定顶部导航栏 */}
      <Navbar />

      {/* 主要内容区域 */}
      <main className="flex-1 pt-16">
        <Outlet />
      </main>

      {/* 页脚 */}
      <Footer />
    </div>
  )
}
