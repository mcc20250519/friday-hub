# Mobile UNO 游戏 UI 设计 - 实现计划

## 概述

本实现计划将分解设计文档中的需求，转化为具体的编码任务。按照从基础到集成的顺序，逐步构建移动端 UI。

## 任务列表

### 📋 1. 项目初始化和基础设施

- [ ] 1.1 创建移动端组件目录结构
  - 创建 `src/components/uno/mobile/` 目录
  - 创建 `src/hooks/mobile/` 目录
  - 创建 `src/styles/mobile/` 目录
  - _Requirements: 1.1_

- [ ] 1.2 实现移动设备检测 Hook
  - 创建 `src/hooks/mobile/useIsMobile.js`
  - 检测用户代理（User-Agent）
  - 检测触摸事件支持
  - 检测视口宽度
  - _Requirements: 1.5_

- [ ] 1.3 创建响应式断点系统
  - 定义 CSS 变量（xs, sm, md, lg, xl）
  - 创建 Tailwind 配置扩展
  - 创建 `src/styles/mobile/breakpoints.css`
  - _Requirements: 9.1-9.5_

- [ ] 1.4 创建触摸交互工具库
  - 实现点击去抖函数 `debounce.js`
  - 实现节流函数 `throttle.js`
  - 实现触摸事件监听工具
  - _Requirements: 5.2, 5.3_

### 📋 2. 扇形手牌组件

- [ ] 2.1 创建手牌数据结构和算法
  - 在 `src/utils/mobile/handCardLayout.js` 中实现扇形计算
  - 计算扇形总角度（基于卡牌数）
  - 计算每张卡牌的位置和旋转角度
  - 添加单元测试验证计算准确性
  - _Requirements: 3.1, 3.2, 3.4_

- [ ]* 2.2 编写扇形布局算法单元测试
  - **Property 1: 手牌扇形排列不重叠**
  - **Validates: Requirements 3.3, 3.4**

- [ ] 2.3 创建单张卡牌组件 `MobileCard.jsx`
  - 渲染卡牌视觉（颜色、数字、图标）
  - 实现选中状态样式
  - 添加点击处理
  - 支持 aria-label 无障碍标签
  - _Requirements: 3.4, 5.4_

- [ ] 2.4 实现 MobileHandCards 组件
  - 在 `src/components/uno/mobile/MobileHandCards.jsx` 中实现
  - 根据卡牌数量计算扇形布局
  - 渲染所有卡牌并应用扇形变换
  - 实现点击选择逻辑
  - 实现多选功能（如需要）
  - _Requirements: 3.1-3.4_

- [ ]* 2.5 创建手牌组件的响应式样式
  - 为 xs, sm, md, lg 断点创建不同的卡牌大小
  - 创建 `src/styles/mobile/hand-cards.css`
  - 测试各断点下的布局效果
  - _Requirements: 9.1-9.5_

- [ ]* 2.6 编写手牌组件交互测试
  - 测试单击选择卡牌
  - 测试取消选择
  - 测试多选逻辑
  - 测试快速点击去抖
  - _Requirements: 5.1, 5.3_

### 📋 3. 游戏主界面布局

- [ ] 3.1 创建 MobileGameBoard 主容器
  - 在 `src/components/uno/mobile/MobileGameBoard.jsx` 中实现
  - 实现三层布局（Header / Main / Footer / HandCards）
  - 添加屏幕旋转监听
  - 处理虚拟键盘显示/隐藏
  - _Requirements: 2.2, 2.4_

- [ ]* 3.2 编写屏幕自适应单元测试
  - **Property 2: 屏幕方向自适应**
  - **Validates: Requirements 2.2, 2.4**

- [ ] 3.3 实现 Header - 对手信息区组件
  - 在 `src/components/uno/mobile/MobileOpponentArea.jsx` 中实现
  - 显示最多 3 个对手的快速视图
  - 实现对手卡片（昵称 + 卡牌数量）
  - 支持横向滚动查看更多对手
  - 添加"展开"按钮查看完整列表
  - _Requirements: 6.1-6.4_

- [ ]* 3.4 创建对手区域的样式和动画
  - 对手卡片样式
  - 横向滚动样式
  - 过渡动画
  - _Requirements: 6.1_

- [ ] 3.5 实现 Main - 游戏主区
  - 在 `MobileGameBoard.jsx` 中实现中心区域
  - 显示当前出牌卡牌
  - 显示当前花色或 +2/+4 信息
  - 显示"等待出牌"或"轮到你"提示
  - 可展开查看完整玩家列表
  - _Requirements: 2.3, 4.1, 4.2_

- [ ] 3.6 实现 Footer - 操作按钮区
  - 实现"抽牌"、"Pass"、"UNO"按钮
  - 按钮大小和间距符合移动端标准
  - 实现按钮的启用/禁用状态
  - 添加点击去抖处理
  - _Requirements: 5.2, 5.4_

- [ ]* 3.7 编写游戏主界面集成测试
  - 测试各区域的渲染
  - 测试屏幕旋转后的重新布局
  - 测试按钮响应
  - _Requirements: 2.2, 3.1, 5.1_

### 📋 4. 移动端特定逻辑

- [ ] 4.1 实现玩家限制检查
  - 创建 `src/hooks/mobile/usePlayerLimitCheck.js`
  - 检测当前游戏参加人数
  - 在创建房间时限制最多 8 人
  - 在加入房间时检查人数限制
  - _Requirements: 11.1, 11.2_

- [ ]* 4.2 编写玩家限制单元测试
  - **Property 3: 玩家限制强制**
  - **Validates: Requirements 11.1, 11.2**

- [ ] 4.3 实现设备旋转监听
  - 创建 `src/hooks/mobile/useOrientationChange.js`
  - 监听 orientationchange 事件
  - 在方向改变时重新计算布局
  - 保存用户的方向偏好
  - _Requirements: 2.4_

- [ ] 4.4 创建移动端路由入口
  - 在 `src/pages/games/UnoGame.jsx` 中添加移动端检测
  - 根据设备类型路由到不同的游戏组件
  - 保持 PC 端逻辑不变
  - _Requirements: 1.1_

### 📋 5. 提示和反馈系统

- [ ] 5.1 创建 MobileGameStatus 提示组件
  - 在 `src/components/uno/mobile/MobileGameStatus.jsx` 中实现
  - 实现 Toast 提示（自动消失）
  - 实现横幅提示（持久显示）
  - 实现弹窗确认（模态）
  - _Requirements: 7.1-7.5_

- [ ] 5.2 实现错误和成功提示
  - 出牌不合法提示
  - 网络错误提示
  - 玩家人数超限提示
  - 游戏结束提示
  - _Requirements: 7.1_

- [ ]* 5.3 编写提示组件交互测试
  - 测试 Toast 自动消失
  - 测试弹窗模态行为
  - 测试关闭按钮功能
  - _Requirements: 7.2, 7.5_

### 📋 6. 响应式设计测试和优化

- [ ] 6.1 创建响应式测试套件
  - 测试 xs 屏幕 (< 360px)
  - 测试 sm 屏幕 (360-480px)
  - 测试 md 屏幕 (480-640px)
  - 测试 lg 屏幕 (640-768px)
  - 测试文字可读性
  - 测试按钮可点击性
  - _Requirements: 9.1-9.5_

- [ ]* 6.2 编写响应式视觉回归测试
  - 各断点下的页面截图对比
  - 深色/浅色主题测试（如支持）
  - 横屏方向测试
  - _Requirements: 2.4_

- [ ] 6.3 优化各断点的样式细节
  - 调整 xs 屏幕的按钮大小
  - 调整 sm 屏幕的间距
  - 优化 lg 屏幕的布局
  - _Requirements: 9.1_

### 📋 7. 浏览器兼容性测试

- [ ] 7.1 在 iOS Safari 上测试
  - 功能完整性
  - 触摸交互响应
  - 虚拟键盘行为
  - _Requirements: 1.1_

- [ ] 7.2 在 Android Chrome 上测试
  - 功能完整性
  - 屏幕旋转处理
  - 性能表现
  - _Requirements: 1.2_

- [ ] 7.3 在微信内置浏览器上测试
  - 功能完整性
  - 微信特定 API（如分享）
  - 页面生命周期
  - _Requirements: 1.3_

- [ ] 7.4 在支付宝内置浏览器上测试
  - 功能完整性
  - 支付宝特定 API
  - 页面生命周期
  - _Requirements: 1.4_

### 📋 8. 性能优化

- [ ] 8.1 实现代码分割
  - 分离移动端和 PC 端的组件
  - 配置 webpack 动态导入
  - 创建 `src/components/uno/mobile/index.js` 入口
  - _Requirements: 10.1_

- [ ] 8.2 优化卡牌图片资源
  - 生成 WebP 格式卡牌图片
  - 降低移动端分辨率（适配最大屏幕）
  - 添加懒加载
  - _Requirements: 10.3_

- [ ] 8.3 实现渲染优化
  - 对所有移动端组件使用 `React.memo`
  - 避免在渲染中创建新对象
  - 实现虚拟化手牌列表（如需要）
  - _Requirements: 10.2_

- [ ]* 8.4 编写性能测试
  - 首屏加载时间 < 3s
  - 运行时帧率 > 50fps
  - 内存占用 < 100MB
  - _Requirements: 10.1-10.4_

### 📋 9. 集成和最终测试

- [ ] 9.1 集成移动端路由
  - 更新 `UnoGame.jsx` 路由
  - 测试移动端/PC 端的正确路由
  - 验证现有 PC 端功能不受影响
  - _Requirements: 1.1_

- [ ] 9.2 端到端测试
  - 创建房间 → 加入游戏 → 出牌 → 结束游戏
  - 测试所有关键用户流程
  - 验证实时同步功能
  - _Requirements: 2.1, 8.1_

- [ ] 9.3 修复集成发现的 Bug
  - 修复布局问题
  - 修复性能瓶颈
  - 修复兼容性问题
  - _Requirements: 1.1-11.2_

- [ ] 9.4 Checkpoint - 确保所有测试通过
  - 运行完整的测试套件
  - 检查代码覆盖率
  - 验证所有需求都已实现
  - 如有问题，询问用户

### 📋 10. 文档和交付

- [ ] 10.1 编写移动端开发文档
  - 创建 `docs/MOBILE_UNO_GUIDE.md`
  - 记录新组件的使用方法
  - 记录响应式设计断点
  - 记录性能指标
  - _Requirements: 所有_

- [ ]* 10.2 创建移动端设计系统文档
  - 组件库说明
  - 样式指南
  - 最佳实践
  - _Requirements: 9.1_

- [ ] 10.3 最终代码审查
  - 检查代码风格
  - 检查注释完整性
  - 检查性能指标
  - 检查浏览器兼容性

- [ ] 10.4 提交到 Git
  - 提交所有代码
  - 包含清晰的提交信息
  - 验证 CI/CD 通过

## 注意事项

- 所有任务标记 `*` 是可选的（主要是文档和高级测试）
- 如果时间充足，应优先完成这些可选任务以确保质量
- 每个主任务完成后应进行代码审查
- 性能测试应在实际设备上进行，不仅是浏览器模拟器

## 估时

- 基础设施: 1-2 天
- 扇形手牌: 2-3 天
- 游戏主界面: 2-3 天
- 移动特定逻辑: 1-2 天
- 提示系统: 1 天
- 响应式设计测试: 1-2 天
- 浏览器兼容性: 2-3 天
- 性能优化: 1-2 天
- 集成测试: 1-2 天
- 文档和交付: 1 天

**总计**: 14-22 天（取决于测试深度和优化程度）
