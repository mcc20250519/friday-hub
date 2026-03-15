# UNO 游戏开发指南

## 目录

1. [项目概述](#1-项目概述)
2. [技术栈](#2-技术栈)
3. [项目结构](#3-项目结构)
4. [数据库设计](#4-数据库设计)
5. [核心模块详解](#5-核心模块详解)
6. [游戏流程](#6-游戏流程)
7. [动画系统](#7-动画系统)
8. [实时通信](#8-实时通信)
9. [机器人 AI](#9-机器人-ai)
10. [开发指南](#10-开发指南)
11. [常见问题](#11-常见问题)

---

## 1. 项目概述

### 1.1 功能简介

本项目是一个多人在线 UNO 卡牌游戏，支持以下功能：

- **多人对战**：2-10 人在线游戏
- **游戏模式**：
  - **官方标准模式**：遵循 Mattel 官方规则，+2/+4 不可叠加，首位出完牌即获胜
  - **娱乐模式**：+2/+4 可叠加传递，所有玩家产生排名
- **计分系统**：
  - 官方模式：获胜者 +1 分
  - 娱乐基础模式：第一名 +3 分
  - 娱乐排名模式：按公式分配积分
- **机器人系统**：支持添加 AI 机器人填补空位
- **实时同步**：基于 Supabase Realtime 的实时状态同步

### 1.2 核心特性

- **断线重连**：玩家掉线后可重新加入游戏
- **开场动画**：发牌动画、比牌决定先手动画
- **UNO 喊叫系统**：出倒数第二张牌时需要喊 UNO，其他玩家可举报
- **交互锁机制**：动画播放期间自动锁定交互，防止误操作

---

## 2. 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | React 18 |
| 构建工具 | Vite 5 |
| 路由 | React Router 6 |
| 状态管理 | React Hooks + Context |
| 样式 | TailwindCSS |
| 后端服务 | Supabase (PostgreSQL + Realtime) |
| 部署 | Netlify / Vercel |

---

## 3. 项目结构

```
friday-hub/src/
├── components/                 # UI 组件
│   ├── common/                 # 通用组件
│   │   ├── Comments.jsx        # 评论组件
│   │   ├── ErrorBoundary.jsx   # 错误边界
│   │   ├── LoadingSpinner.jsx  # 加载动画
│   │   ├── PageMeta.jsx        # 页面元信息
│   │   └── ProtectedRoute.jsx  # 路由保护
│   ├── layout/                 # 布局组件
│   │   ├── Footer.jsx
│   │   ├── Layout.jsx
│   │   └── Navbar.jsx
│   ├── ui/                     # 基础 UI 组件（shadcn/ui）
│   │   ├── button.jsx
│   │   ├── card.jsx
│   │   └── ...
│   └── uno/                    # UNO 游戏组件
│       ├── game/               # 游戏进行中组件
│       │   ├── CardComponent.jsx       # 单张卡牌
│       │   ├── CenterPile.jsx          # 中央牌堆
│       │   ├── ColorPicker.jsx         # 颜色选择器
│       │   ├── FlyingCard.jsx          # 飞牌动画
│       │   ├── GameBoard.jsx           # 游戏主板（核心容器）
│       │   ├── GameOpeningOrchestrator.jsx  # 开场动画编排
│       │   ├── GameResult.jsx          # 结算界面
│       │   ├── OpponentArea.jsx        # 对手区域
│       │   ├── PlayerHand.jsx          # 玩家手牌
│       │   ├── RankNotification.jsx    # 名次通知动画
│       │   ├── ReportButton.jsx        # 举报按钮
│       │   ├── TurnIndicator.jsx       # 回合指示器
│       │   ├── UnoButton.jsx           # UNO 按钮
│       │   ├── UnoGameOverAnimation.jsx # 游戏结束动画
│       │   ├── UnoLoadingScreen.jsx    # 加载动画
│       │   └── UnoWinAnimation.jsx     # 获胜动画
│       ├── lobby/              # 大厅组件
│       │   ├── InviteLink.jsx          # 邀请链接
│       │   ├── PlayerSlot.jsx          # 玩家槽位
│       │   └── RoomLobby.jsx           # 房间大厅
│       └── shared/             # 共享组件
│           ├── ExitAnimation.jsx       # 退出动画
│           └── GameToast.jsx           # 游戏内通知
├── hooks/                      # 自定义 Hooks
│   ├── uno/
│   │   ├── useAnimationEngine.js   # 统一动画引擎
│   │   ├── useUnoActions.js        # 游戏操作（出牌/摸牌/喊UNO）
│   │   ├── useUnoBot.js            # 机器人 AI 控制
│   │   ├── useUnoGameState.js      # 游戏状态订阅
│   │   ├── useUnoInvite.js         # 邀请链接
│   │   └── useUnoRoom.js           # 房间管理
│   ├── useDownload.js          # 文件下载
│   ├── useFavorite.js          # 收藏功能
│   └── useToast.js             # 全局通知
├── lib/                        # 工具库
│   ├── aiClient.js             # AI 客户端
│   ├── supabase.js             # Supabase 客户端
│   ├── utils.js                # 通用工具函数
│   └── uno/                    # UNO 核心逻辑
│       ├── animation/          # 动画主题配置
│       │   ├── index.js
│       │   └── theme.js
│       ├── bot.js              # 机器人决策算法
│       ├── constants.js        # 常量定义
│       ├── deck.js             # 牌组生成与发牌
│       ├── rules.js            # 规则引擎（统一入口）
│       ├── rules-entertainment.js  # 娱乐规则
│       ├── rules-official.js       # 官方规则
│       └── scoring.js          # 计分系统
├── pages/                      # 页面组件
│   ├── games/
│   │   └── UnoGame.jsx         # UNO 游戏页面入口
│   └── ...
└── store/                      # 全局状态
    └── AuthContext.jsx         # 认证上下文
```

---

## 4. 数据库设计

### 4.1 表结构概览

```
┌─────────────────┐     ┌─────────────────┐
│   uno_rooms     │────<│   uno_players   │
│   (房间表)      │     │   (玩家表)      │
└────────┬────────┘     └─────────────────┘
         │
         │ 1:1
         ▼
┌─────────────────┐     ┌─────────────────┐
│ uno_game_state  │────<│   uno_actions   │
│   (状态表)      │     │   (日志表)      │
└─────────────────┘     └─────────────────┘
```

### 4.2 表详细设计

#### 4.2.1 `uno_rooms` - 游戏房间表

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID | 主键 |
| `room_code` | VARCHAR(6) | 6 位房间码（唯一） |
| `host_id` | UUID | 房主 ID（外键 → profiles.id） |
| `status` | VARCHAR(20) | 房间状态：`waiting` / `playing` / `finished` |
| `max_players` | INT | 最大玩家数（2-10） |
| `game_mode` | VARCHAR(20) | 游戏模式：`standard` / `entertainment` |
| `scoring_mode` | VARCHAR(20) | 计分模式：`basic` / `ranking` |
| `score_board` | JSONB | 累计计分板 |
| `created_at` | TIMESTAMPTZ | 创建时间 |
| `expires_at` | TIMESTAMPTZ | 过期时间（2 小时） |

#### 4.2.2 `uno_players` - 房间玩家表

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID | 主键 |
| `room_id` | UUID | 房间 ID（外键 → uno_rooms.id） |
| `user_id` | UUID/TEXT | 玩家 ID（真人 UUID 或 `bot_xxx`） |
| `seat_index` | INT | 座位号（0-9） |
| `is_ready` | BOOLEAN | 是否准备 |
| `joined_at` | TIMESTAMPTZ | 加入时间 |

#### 4.2.3 `uno_game_state` - 游戏状态表

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID | 主键 |
| `room_id` | UUID | 房间 ID（唯一，1:1） |
| `current_player_index` | INT | 当前玩家索引 |
| `direction` | INT | 出牌方向：1=顺时针，-1=逆时针 |
| `current_color` | VARCHAR(10) | 当前颜色 |
| `top_card` | JSONB | 顶牌信息 |
| `draw_pile` | JSONB | 摸牌堆 |
| `discard_pile` | JSONB | 弃牌堆 |
| `hands` | JSONB | 所有玩家手牌 `{userId: [cards]}` |
| `pending_draw_count` | INT | 待摸牌数（+2/+4 叠加） |
| `winner_id` | TEXT | 获胜者 ID |
| `game_mode` | VARCHAR(20) | 游戏模式 |
| `rank_list` | JSONB | 排名列表（娱乐模式） |
| `uno_called` | JSONB | UNO 喊叫状态 `{userId: boolean}` |
| `first_player_id` | TEXT | 先手玩家 ID |
| `needs_color_pick` | TEXT | 待选色玩家 ID |
| `opening_data` | JSONB | 开场动画数据 |
| `uno_window_open` | BOOLEAN | UNO 窗口是否开启 |
| `uno_window_owner` | TEXT | UNO 窗口归属玩家 |
| `reported_this_window` | JSONB | 本窗口已举报玩家列表 |
| `updated_at` | TIMESTAMPTZ | 更新时间 |

#### 4.2.4 `uno_actions` - 操作日志表

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID | 主键 |
| `room_id` | UUID | 房间 ID |
| `user_id` | UUID | 操作玩家 ID |
| `action_type` | VARCHAR(20) | 操作类型：`play` / `draw` / `uno` / `skip` |
| `card` | JSONB | 出牌信息 |
| `chosen_color` | VARCHAR(10) | 选择颜色 |
| `created_at` | TIMESTAMPTZ | 操作时间 |

### 4.3 数据库迁移文件

迁移文件位于 `migrations/` 目录：

| 文件 | 说明 |
|------|------|
| `001_add_opening_data_to_uno_game_state.sql` | 添加开场动画数据字段 |
| `002_add_uno_window_fields.sql` | 添加 UNO 窗口相关字段 |

### 4.4 SQL Patch 文件

补丁文件位于项目根目录：

| 文件 | 说明 |
|------|------|
| `uno_database_setup.sql` | 基础建表脚本（首次部署执行） |
| `uno_game_mode_patch.sql` | 添加游戏模式字段 |
| `uno_max_players_patch.sql` | 扩展最大玩家数到 10 人 |
| `uno_uno_called_patch.sql` | 添加 UNO 喊叫状态字段 |
| `uno_first_player_patch.sql` | 添加先手玩家字段 |
| `uno_winner_fix_patch.sql` | 修复 winner_id 类型（支持机器人） |

---

## 5. 核心模块详解

### 5.1 规则引擎 (`lib/uno/rules.js`)

规则引擎是游戏逻辑的核心，统一处理两种游戏模式：

```javascript
import { canPlayCard, getNextState, getPlayableCards } from '@/lib/uno/rules'

// 检查卡牌是否可以打出
canPlayCard(card, topCard, currentColor, pendingDrawCount, gameMode)

// 获取下一个状态（核心函数）
getNextState(currentState, action, gameMode)

// 获取可打出的卡牌
getPlayableCards(hand, topCard, currentColor, pendingDrawCount, gameMode)
```

#### 规则差异对照

| 规则 | 官方模式 | 娱乐模式 |
|------|----------|----------|
| +2 叠加 | ❌ 不可叠加 | ✅ 可叠加传递 |
| +4 叠加 | ❌ 不可叠加 | ✅ 可叠加传递 |
| 游戏结束 | 首人出完即结束 | 所有玩家产生排名 |
| Skip 效果 | 跳过下一位 | 跳过下一位 |
| Reverse 效果 | 反转方向 | 反转方向（2人=Skip） |

### 5.2 游戏状态 Hook (`hooks/uno/useUnoGameState.js`)

负责订阅游戏状态变化，提供衍生状态：

```javascript
const {
  gameState,      // 原始游戏状态
  myHand,         // 我的手牌
  opponents,      // 对手信息
  topCard,        // 当前顶牌
  currentColor,   // 当前颜色
  isMyTurn,       // 是否轮到我
  direction,      // 出牌方向
  pendingDrawCount, // 待摸牌数
  winnerId,       // 获胜者 ID
  rankList,       // 排名列表
  // ... 更多衍生状态
} = useUnoGameState(roomId, players, gameMode)
```

#### Realtime 订阅机制

```javascript
// 自动订阅数据库变化
const channel = supabase
  .channel(`uno_game_${roomId}`)
  .on('postgres_changes', { ... }, (payload) => {
    if (payload.eventType === 'UPDATE') {
      setGameState(payload.new)
    }
  })
  .subscribe()
```

#### 心跳检测与自动重连

```javascript
// 每 30 秒检查连接状态
setInterval(() => {
  if (channelState === 'closed' || channelState === 'errored') {
    // 自动重连
    subscribeToGameState()
  }
}, 30000)
```

### 5.3 游戏操作 Hook (`hooks/uno/useUnoActions.js`)

提供出牌、摸牌、喊 UNO 等操作：

```javascript
const {
  playCard,       // 出牌
  drawCard,       // 摸牌
  callUno,        // 喊 UNO
  applyPenalty,   // 应用惩罚
  reportPlayer,   // 举报玩家
} = useUnoActions(roomId, gameState, playerIds, gameMode)
```

### 5.4 机器人 AI (`lib/uno/bot.js`)

机器人决策算法：

```javascript
// 决策函数
decideBotMove(hand, topCard, currentColor, pendingDrawCount, gameMode)

// 决策优先级：
// 1. 如果有待摸牌数，优先出 +2/+4（叠加）
// 2. 优先出同色牌
// 3. 出同数字/功能牌
// 4. 出 Wild 牌
// 5. 无牌可出则摸牌
```

---

## 6. 游戏流程

### 6.1 完整流程图

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  创建/加入  │────>│   等待准备  │────>│   发牌动画  │
│    房间     │     │  (waiting)  │     │  (opening)  │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                    ┌──────────────────────────┘
                    ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  比牌决定   │────>│   游戏进行  │────>│   游戏结束  │
│    先手     │     │  (playing)  │     │  (finished) │
└─────────────┘     └─────────────┘     └─────────────┘
```

### 6.2 出牌流程

```
玩家点击卡牌
    │
    ▼
┌───────────────┐
│ 检查是否可出  │──否──> 无操作
└───────┬───────┘
        │ 是
        ▼
┌───────────────┐
│ 是 Wild 牌？  │──是──> 弹出颜色选择器
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ 计算下一个状态│
│ (getNextState)│
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ 持久化到数据库│
│ (persistState)│
└───────┬───────┘
        │
        ▼
   Realtime 通知所有客户端
```

### 6.3 UNO 喊叫机制

```
玩家打出倒数第二张牌
    │
    ▼
系统自动开启 UNO 窗口
(uno_window_open = true, uno_window_owner = playerId)
    │
    ├──玩家自己喊 UNO──> uno_called[playerId] = true
    │
    └──其他玩家举报──> 检查 uno_called[playerId]
                          │
                          ├── 未喊 UNO──> 罚摸 2 张
                          │
                          └── 已喊 UNO──> 举报无效

下一个玩家行动时，UNO 窗口关闭
```

---

## 7. 动画系统

### 7.1 动画引擎 (`hooks/uno/useAnimationEngine.js`)

统一的动画控制接口：

```javascript
const {
  playAnimation,      // 播放动画
  skipAnimation,      // 跳过动画
  isLocked,           // 交互锁定状态
  currentScene,       // 当前场景
  AnimationRenderer,  // 动画渲染组件
} = useAnimationEngine(theme)

// 播放动画
playAnimation('roomExit', { leaveAction, onDone })
playAnimation('rankNotify', { notifications })
```

### 7.2 动画场景

| 场景 | 说明 | 对应组件 |
|------|------|----------|
| `loading` | 加载动画 | `UnoLoadingScreen` |
| `win` | 获胜动画 | `UnoWinAnimation` |
| `gameOver` | 游戏结束 | `UnoGameOverAnimation` |
| `roomExit` | 退出房间 | `ExitAnimation` |
| `rankNotify` | 名次通知 | `RankNotification` |

### 7.3 主题配置

```javascript
// lib/uno/animation/theme.js
const UNO_THEME = {
  colors: {
    red: '#E5173F',
    yellow: '#F5B800',
    green: '#1A9641',
    blue: '#0057A8',
  },
  exitText: 'BYE',
  countdownColors: {
    safe: '#1A9641',
    warning: '#F5B800',
    danger: '#E5173F',
  },
  rankColors: {
    first: '#FFD700',   // 金色
    second: '#C0C0C0',  // 银色
    third: '#CD7F32',   // 铜色
    others: 'rgba(0,0,0,0.6)',
  },
}
```

---

## 8. 实时通信

### 8.1 Realtime 订阅

项目使用 Supabase Realtime 实现实时同步：

```javascript
// 订阅游戏状态
supabase
  .channel(`uno_game_${roomId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'uno_game_state',
    filter: `room_id=eq.${roomId}`,
  }, (payload) => {
    if (payload.eventType === 'UPDATE') {
      setGameState(payload.new)
    }
  })
  .subscribe()
```

### 8.2 连接状态监控

```javascript
.subscribe((status) => {
  // status: 'SUBSCRIBED' | 'CLOSED' | 'TIMED_OUT' | 'CHANNEL_ERROR'
  if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
    console.warn('[UNO] Realtime 订阅断开:', status)
  }
})
```

### 8.3 断线重连处理

1. **页面可见性变化时**：主动拉取最新状态并检查连接
2. **心跳检测**：每 30 秒检查连接状态，异常时自动重连

---

## 9. 机器人 AI

### 9.1 机器人 ID 格式

机器人 ID 使用 `bot_` 前缀 + UUID 格式：

```
bot_a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

### 9.2 决策算法

```javascript
// lib/uno/bot.js
export function decideBotMove(hand, topCard, currentColor, pendingDrawCount, gameMode) {
  // 1. 获取可打出的牌
  const playable = getPlayableCards(hand, topCard, currentColor, pendingDrawCount, gameMode)
  
  // 2. 如果有 +2/+4 待叠加，优先出
  if (pendingDrawCount > 0) {
    const stackCard = playable.find(c => c.type === 'draw2' || c.type === 'wild4')
    if (stackCard) return { card: stackCard, chosenColor: randomColor() }
  }
  
  // 3. 优先出同色牌
  const sameColor = playable.filter(c => c.color === currentColor)
  if (sameColor.length > 0) {
    return { card: randomPick(sameColor), chosenColor: null }
  }
  
  // 4. 出 Wild 牌
  const wild = playable.find(c => c.type === 'wild' || c.type === 'wild4')
  if (wild) return { card: wild, chosenColor: randomColor() }
  
  // 5. 无牌可出，返回 null（触发摸牌）
  return { card: null, chosenColor: null }
}
```

### 9.3 机器人 Hook

```javascript
// hooks/uno/useUnoBot.js
useUnoBot({
  roomId,
  gameState,
  playerIds,
  botPlayerIds,
  isHost,           // 只有房主运行机器人逻辑
  winnerId,
  gameMode,
  openingReady,     // 开场动画完成后才开始
})
```

---

## 10. 开发指南

### 10.1 环境配置

1. **克隆项目**
   ```bash
   git clone <repo-url>
   cd friday-hub
   npm install
   ```

2. **配置环境变量**
   
   创建 `.env.local` 文件：
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **初始化数据库**
   
   在 Supabase SQL Editor 中执行：
   - `uno_database_setup.sql`（首次部署）
   - 各 patch 文件（按需执行）
   - `migrations/` 目录下的迁移文件

### 10.2 开发命令

```bash
# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

### 10.3 添加新功能的步骤

1. **添加新的卡牌类型**
   - 更新 `lib/uno/constants.js` 中的 `CARD_TYPES`
   - 更新 `lib/uno/deck.js` 中的牌组生成
   - 更新 `lib/uno/rules.js` 中的规则逻辑
   - 更新 `components/uno/game/CardComponent.jsx` 中的渲染

2. **添加新的动画场景**
   - 在 `hooks/uno/useAnimationEngine.js` 中添加场景类型
   - 创建对应的动画组件
   - 在 `AnimationRenderer` 中添加渲染逻辑

3. **添加新的数据库字段**
   - 创建迁移文件或 patch 文件
   - 更新对应的 Hook 读写逻辑
   - 更新类型定义（JSDoc）

### 10.4 代码规范

- 使用 JSDoc 注释函数参数和返回值
- 组件使用 `export default`
- 工具函数使用 `export function`
- 保持函数纯函数化（无副作用）
- 使用 `useCallback` 和 `useMemo` 优化性能

---

## 11. 常见问题

### Q1: Realtime 订阅断开怎么办？

**现象**：页面状态不更新，需要刷新才能恢复。

**解决方案**：
- 已实现自动心跳检测（30 秒）
- 已实现页面切换回来时的状态同步
- 检查浏览器控制台是否有 `[UNO] Realtime 订阅断开` 警告

### Q2: 机器人不出牌？

**检查项**：
1. 确认 `isHost` 为 true（只有房主运行机器人）
2. 确认 `openingReady` 为 true（开场动画完成）
3. 检查 `botPlayerIds` 是否正确传入

### Q3: +2/+4 叠加不生效？

**检查项**：
1. 确认游戏模式为 `entertainment`
2. 检查 `pendingDrawCount` 是否正确传递
3. 确认 `canPlayCard` 使用了正确的 `gameMode` 参数

### Q4: UNO 喊叫机制异常？

**检查项**：
1. 确认数据库已执行 `002_add_uno_window_fields.sql`
2. 检查 `uno_window_open` 和 `uno_window_owner` 字段
3. 确认 `reported_this_window` 为有效的 JSON 数组

### Q5: 如何调试游戏状态？

```javascript
// 在 GameBoard.jsx 中添加
useEffect(() => {
  console.log('[DEBUG] gameState:', gameState)
}, [gameState])
```

---

## 附录：关键文件速查

| 功能 | 文件路径 |
|------|----------|
| 游戏主入口 | `pages/games/UnoGame.jsx` |
| 游戏主板 | `components/uno/game/GameBoard.jsx` |
| 规则引擎 | `lib/uno/rules.js` |
| 牌组生成 | `lib/uno/deck.js` |
| 状态订阅 | `hooks/uno/useUnoGameState.js` |
| 游戏操作 | `hooks/uno/useUnoActions.js` |
| 机器人 AI | `lib/uno/bot.js` + `hooks/uno/useUnoBot.js` |
| 动画引擎 | `hooks/uno/useAnimationEngine.js` |
| 计分系统 | `lib/uno/scoring.js` |
| 数据库建表 | `uno_database_setup.sql` |
