import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  build: {
    // 输出目录
    outDir: 'dist',
    // 生成 sourcemap 便于调试
    sourcemap: true,
    // 代码分割配置
    rollupOptions: {
      output: {
        // 入口文件输出配置
        entryFileNames: 'assets/js/[name]-[hash].js',
        // 代码分割后的 chunk 文件
        chunkFileNames: 'assets/js/[name]-[hash].js',
        // 静态资源文件
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          // 根据文件类型输出到不同目录
          if (/\.(png|jpe?g|gif|svg|webp|ico)$/i.test(assetInfo.name)) {
            return 'assets/images/[name]-[hash][extname]';
          }
          if (/\.(css|less|scss)$/i.test(assetInfo.name)) {
            return 'assets/css/[name]-[hash][extname]';
          }
          if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name)) {
            return 'assets/fonts/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
        // 手动代码分割 - 按路由分割
        manualChunks: {
          // React 核心库
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // UI 组件库
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tabs', '@radix-ui/react-tooltip'],
          // 工具库
          'utils-vendor': ['clsx', 'tailwind-merge', 'class-variance-authority'],
          // 数据获取和状态管理
          'data-vendor': ['@supabase/supabase-js'],
        },
      },
    },
    // 代码分割阈值（单位：字节）
    chunkSizeWarningLimit: 1000,
    // CSS 配置
    cssCodeSplit: true,
    cssMinify: true,
    // 压缩配置
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // 生产环境移除 console
        drop_debugger: true, // 生产环境移除 debugger
      },
    },
  },
  // 优化依赖预构建
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      'lucide-react',
    ],
    exclude: [],
  },
  // 预览配置
  preview: {
    port: 4173,
    open: true,
  },
})
