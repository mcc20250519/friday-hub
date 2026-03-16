# Mobile UNO 游戏 UI 设计 - 设计文档

## 概述

本文档描述了为 UNO 游戏创建专门的移动端界面的详细设计。主要针对竖屏的手机用户进行优化，采用扇形手牌布局、简洁的游戏界面设计和触摸友好的交互方式。

## 架构设计

### 1. 文件结构

```
src/components/
├── uno/
│   ├── mobile/                        # 新增移动端专用组件目录
│   │   ├── MobileUnoGame.jsx         # 移动端游戏主容器
│   │   ├── MobileGameBoard.jsx       # 移动端游戏板
│   │   ├── MobileHandCards.jsx       # 扇形手牌组件
│   │   ├── MobileOpponentArea.jsx    # 移动端对手信息
│   │   ├── MobileGameStatus.jsx      # 游戏状态提示
│   │   └── mobile-styles.css         # 移动端样式库
│   └── game/
│       └── ...                        # 保持现有 PC 端组件
└── common/
    └── MobileDetect.jsx              # 移动设备检测 hook
```

### 2. 移动端检测和路由

在主游戏页面中根据设备类型路由到不同的组件：

```jsx
// src/pages/games/UnoGame.jsx
const isMobile = useIsMobile()

if (isMobile) {
  return <MobileUnoGame />
} else {
  return <UnoGame /> // PC 端原有逻辑
}
```

## 组件和接口设计

### 1. MobileUnoGame 容器组件

**职责**: 
- 管理移动端特有的状态（竖屏/横屏、移动端限制）
- 协调子组件间的通信
- 处理移动端特有的事件（屏幕旋转、虚拟键盘）

**Props 和 State**:
```typescript
interface MobileUnoGameProps {
  roomCode?: string
}

interface MobileUnoGameState {
  isMobile: boolean
  screenWidth: number
  screenHeight: number
  isPortrait: boolean
  maxPlayers: 8 // 移动端限制
}
```

**核心方法**:
- `handleOrientationChange()` - 处理屏幕旋转
- `handlePlayerLimitCheck()` - 检查玩家数量限制
- `renderGameLayout()` - 根据屏幕方向渲染布局

### 2. MobileHandCards 扇形手牌组件

**功能**:
- 将卡牌以扇形排列显示
- 支持单击选择和多选
- 提供卡牌选中的视觉反馈

**关键算法**:
```
扇形排列计算:
- 总角度: 根据卡牌数量动态调整 (60° - 120°)
- 起始角度: 180° - (总角度 / 2)
- 单张角度间隔: 总角度 / (卡牌数 - 1)
- 卡牌位置: 使用三角函数计算 (x, y)
- 旋转角度: 朝向圆心
```

**Props 和 State**:
```typescript
interface MobileHandCardsProps {
  cards: Card[]
  selectedCards: Card[]
  onSelectCard: (card: Card) => void
  onPlayCards: (cards: Card[]) => void
  disabled?: boolean
  maxSelectable?: number
}

interface MobileHandCardsState {
  fanAngle: number        // 总角度
  centerX: number         // 扇心 X 坐标
  centerY: number         // 扇心 Y 坐标
  radius: number          // 半径
}
```

**响应式设计**:
- 超小屏幕 (< 480px): radius = 120px, 卡牌宽度 = 60px
- 小屏幕 (480-640px): radius = 140px, 卡牌宽度 = 70px
- 中等屏幕 (640-768px): radius = 160px, 卡牌宽度 = 80px

### 3. MobileGameBoard 主游戏界面

**布局层级**:
```
+-----------------------------------+
| Header: 对手信息 (高度: 80-100px)  |
+-----------------------------------+
|                                   |
| Main: 出牌区和中心信息             |
| (高度: 自适应)                    |
|                                   |
+-----------------------------------+
| Footer: 操作按钮 (高度: 50-60px)  |
+-----------------------------------+
| HandCards: 手牌 (高度: 150-180px) |
+-----------------------------------+
```

**各区域设计**:

#### Header - 对手信息区
- 最多显示 3 个对手（最近的）
- 每个对手卡片: 昵称 + 卡牌数量
- 高度: 80px，可横向滚动（如果对手 > 3）

#### Main - 游戏主区
- 中心显示当前出牌和花色
- 下方显示"等待出牌"或"轮到你"的提示
- 可点击查看完整对手列表
- 高度自适应，占据剩余空间

#### Footer - 操作按钮区
- 抽卡、Pass、UNO 按钮
- 按钮大小: 44px × 44px，间距 12px
- 分布方式: 集中在下方，易于单手操作

#### HandCards - 手牌区
- 竖屏下显示在最底部
- 高度约 160-180px，包含扇形手牌
- 点击选中卡牌时上升 20px 以示选中

### 4. MobileOpponentArea 对手信息

**显示方式**:
- 顶部快速视图: 显示 1-3 个主要对手
- 展开按钮: 显示完整玩家列表
- 每个对手显示: 昵称、卡牌数、是否是你的回合

**布局**:
```
[头像] 昵称 [5张]
[头像] 昵称 [8张]
[头像] 昵称 [3张]
```

## 数据模型

### Card 数据结构
```typescript
interface Card {
  id: string
  color: 'red' | 'yellow' | 'green' | 'blue'
  type: 'number' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'draw4'
  value: number | null
}
```

### GameState 数据结构
```typescript
interface GameState {
  currentPlayer: string
  currentCard: Card
  players: Player[]
  myHand: Card[]
  gameStatus: 'waiting' | 'playing' | 'finished'
  isMobileAccess: boolean
  maxPlayersLimit: 8
}
```

## 设计决策

### 1. 为什么采用扇形手牌?
- **模拟真实**: 更接近真实卡牌游戏的体验
- **易操作**: 每张卡牌都容易点击，不会重叠
- **美观**: 视觉效果比列表更吸引人

### 2. 为什么隐藏非必要信息?
- **屏幕空间有限**: 移动设备屏幕小，需要优先展示核心内容
- **减少认知负荷**: 用户在聚焦游戏而不是查看信息
- **提升性能**: 减少渲染的元素数量

### 3. 为什么限制 8 人?
- **对手卡片布局**: 8 人时对手卡片可完全显示，不出现重叠
- **性能考虑**: 减少实时更新的数据量
- **交互舒适度**: 8 人时仍保持清爽的 UI

### 4. 为什么使用竖屏为主?
- **自然持握**: 用户持握手机的自然方式是竖屏
- **单手操作**: 竖屏下更容易单手操作
- **常见场景**: 大多数用户习惯竖屏使用应用

## 响应式设计

### 屏幕断点定义

| 断点名 | 宽度范围 | 设备例子 | 布局调整 |
|--------|---------|---------|---------|
| xs | < 360px | 小屏幕老机型 | 最小化所有尺寸 |
| sm | 360-480px | iPhone SE、Samsung A10 | 标准小屏幕 |
| md | 480-640px | iPhone 12 mini、小安卓 | 标准布局 |
| lg | 640-768px | iPhone 12 Pro、iPad mini | 放大布局 |
| xl | > 768px | iPad、大屏设备 | 提示使用 PC 端 |

### 各尺寸下的调整

```css
/* xs 超小屏幕 */
.hand-cards {
  height: 140px;
  --card-width: 50px;
}

/* sm 小屏幕 */
.hand-cards {
  height: 160px;
  --card-width: 60px;
}

/* md 中等屏幕 */
.hand-cards {
  height: 180px;
  --card-width: 70px;
}

/* lg 大屏幕 */
.hand-cards {
  height: 200px;
  --card-width: 80px;
}
```

## 交互设计

### 1. 卡牌选择流程

```
用户点击卡牌
  ↓
卡牌上升 20px (transform: translateY(-20px))
卡牌高亮显示 (border/shadow)
  ↓
用户点击"出牌"按钮
  ↓
验证出牌是否合法
  ↓
发送出牌请求
  ↓
成功: 卡牌从手牌中移除，更新对手信息
失败: 显示错误提示
```

### 2. 触摸反馈

- **点击**: 100ms 内响应，改变元素透明度或背景色
- **按下**: 元素缩放 0.95
- **释放**: 元素恢复正常

### 3. 去抖处理

所有易重复点击的按钮都应实现 300ms 去抖:

```javascript
const debouncedOnClick = debounce(handler, 300, { leading: true })
```

## 错误处理和状态提示

### 错误场景

| 场景 | 提示信息 | 类型 |
|------|--------|------|
| 出牌不合法 | "无法出牌，请选择合法卡牌" | Toast |
| 网络错误 | "网络连接失败，请重试" | 横幅 |
| 房间已满（9人以上访问） | "本房间已有太多玩家，移动端最多支持 8 人" | Modal |
| 游戏已结束 | "游戏已结束，正在返回大厅..." | 自动跳转 |

### 提示显示位置

- **Toast**: 屏幕顶部，自动消失 2s
- **横幅**: 屏幕顶部（始终显示）或底部
- **Modal**: 屏幕中心（阻挡交互）
- **内联**: 相关的输入框下方

## 性能优化策略

### 1. 代码分割

- 移动端组件单独打包
- 懒加载非关键组件
- 动态导入重度库

### 2. 渲染优化

- 使用 `React.memo` 防止不必要的重新渲染
- 虚拟化手牌列表（如卡牌 > 20 张）
- 避免在渲染函数中创建新对象

### 3. 资源优化

- 压缩卡牌图片（WebP 格式 + 降低分辨率）
- 缓存游戏资源
- 预加载常用图片

### 4. 网络优化

- 实现请求防抖
- 使用 WebSocket 实时更新
- 离线支持（local storage 备份）

## 可访问性设计

### 1. 颜色对比度

- 所有文字与背景的对比度 ≥ 4.5:1
- 不仅用颜色区分信息（加入文字标签）

### 2. 触摸目标

- 所有可交互元素最小 44×44px
- 按钮间最小间距 8px

### 3. 屏幕阅读器

- 为卡牌等视觉元素提供 `aria-label`
- 使用语义化 HTML

## Correctness Properties

Properties 是确保游戏正确性的形式化陈述。以下是移动端 UI 的关键 properties:

### Property 1: 手牌扇形排列不重叠
*For any* 卡牌数量在 5-13 之间，所有手牌以扇形排列时，任意两张卡牌的点击区域不应重叠。
**Validates: Requirements 3.3, 3.4**

### Property 2: 屏幕方向自适应
*For any* 屏幕旋转操作，游戏界面应自动调整，所有内容应完整显示无需滚动。
**Validates: Requirements 2.2, 2.4**

### Property 3: 玩家限制强制
*For any* 移动设备访问，房间人数不应超过 8 人（创建时）或显示警告（加入时）。
**Validates: Requirements 11.1, 11.2**

### Property 4: 触摸响应时间
*For any* 用户点击交互元素，系统响应时间应 < 100ms。
**Validates: Requirements 5.1**

### Property 5: 弹窗模态行为
*For any* 弹窗展示时，背景元素应不可交互。
**Validates: Requirements 7.5**

### Property 6: 设备适配完整性
*For any* 支持的浏览器（iOS Safari、Android Chrome、微信、支付宝）和屏幕尺寸，游戏应正常显示和运行。
**Validates: Requirements 1.1-1.5**

## 测试策略

### 单元测试
- 扇形计算算法的准确性
- 卡牌选择逻辑
- 玩家限制检查

### 集成测试
- 组件间的数据流
- 状态更新的正确性
- 网络请求的处理

### 视觉回归测试
- 各屏幕尺寸下的布局
- 动画和过渡效果
- 深色/浅色主题（如支持）

### 用户交互测试
- 触摸响应时间
- 去抖功能
- 长按、滑动等手势

### 性能测试
- 首屏加载时间 < 3s
- 帧率 > 50fps（运行时）
- 内存占用 < 100MB

## 浏览器兼容性

| 浏览器 | 最低版本 | 支持状态 |
|--------|---------|---------|
| iOS Safari | 12 | ✅ 完全支持 |
| Chrome Android | 80 | ✅ 完全支持 |
| 微信内置浏览器 | 6.7 | ✅ 完全支持 |
| 支付宝内置浏览器 | 10 | ✅ 完全支持 |
| Firefox Android | 68 | ✅ 完全支持 |

## 与现有系统的集成

### 共享的组件和状态
- 游戏逻辑使用现有的 Supabase 连接
- 认证系统保持不变
- API 接口保持不变

### 代码复用策略

#### 直接复用 PC 端逻辑的部分
以下逻辑可以直接复用，**不需要重新实现**:

1. **游戏规则引擎** (`src/lib/uno/`)
   - 卡牌合法性检查
   - 花色/数字匹配逻辑
   - 特殊卡牌效果处理
   - 轮次更新逻辑

2. **Hooks** (`src/hooks/uno/`)
   - `useUnoRoom()` - 房间管理
   - `useGameState()` - 游戏状态管理
   - `usePlayer()` - 玩家信息
   - `useRealtime()` - 实时同步

3. **Utilities** (`src/lib/uno/`)
   - 卡牌排序函数
   - 颜色映射表
   - 常量定义

4. **API/Supabase 调用**
   - 房间创建/加入/离开
   - 游戏状态更新
   - 出牌操作

#### 移动端特有实现
仅以下部分需要新实现:

1. **UI 组件** (`src/components/uno/mobile/`)
   - MobileHandCards（扇形排列）
   - MobileGameBoard（布局）
   - MobileOpponentArea（对手卡片）

2. **样式系统**
   - 响应式断点
   - 触摸友好的 CSS

3. **移动端特定逻辑**
   - 屏幕旋转检测
   - 玩家限制检查
   - 虚拟键盘处理

### 推荐的文件结构和复用方式

```jsx
// src/components/uno/mobile/MobileUnoGame.jsx
import { useUnoRoom } from '@/hooks/uno'           // ✅ 复用
import { useGameState } from '@/hooks/uno'         // ✅ 复用
import { playCard } from '@/lib/uno/actions'       // ✅ 复用
import { isValidMove } from '@/lib/uno/rules'      // ✅ 复用
import { UNO_COLORS } from '@/lib/uno/constants'   // ✅ 复用

// 新实现的移动端组件
import MobileGameBoard from './MobileGameBoard'
import MobileHandCards from './MobileHandCards'
import MobileOpponentArea from './MobileOpponentArea'

export default function MobileUnoGame() {
  const { room, players } = useUnoRoom()           // ✅ 使用现有 hook
  const { gameState, updateState } = useGameState() // ✅ 使用现有 hook
  
  const handlePlayCard = async (cards) => {
    if (!isValidMove(cards, gameState.current)) {  // ✅ 复用规则检查
      showError('无法出牌')
      return
    }
    await playCard(cards)                          // ✅ 复用出牌逻辑
  }
  
  return (
    <div>
      <MobileOpponentArea players={players} />     // 新组件
      <MobileGameBoard gameState={gameState} />    // 新组件
      <MobileHandCards onPlayCard={handlePlayCard} /> // 新组件
    </div>
  )
}
```

### 不同的部分
- UI 组件完全独立（mobile/ 目录）
- 样式系统独立（Tailwind + 自定义 CSS）
- 设备检测独立实现

## 已知限制和未来改进

### 当前限制
1. 移动端最多 8 人游戏（性能和 UI 考虑）
2. 竖屏为主，横屏支持有限
3. 不支持全屏 API

### 未来改进方向
1. 支持 PWA 离线模式
2. 语音提示（文字转语音）
3. 触觉反馈（vibration API）
4. AR 体验增强
