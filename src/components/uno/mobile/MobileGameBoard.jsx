/**
 * MobileGameBoard - 移动端游戏主界面
 * 
 * 复用 PC 端的游戏逻辑（hooks、规则、数据流），但采用移动端优化的 UI 布局
 */

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, MoreVertical } from 'lucide-react'
import { useAuth } from '@/store/AuthContext'
import { useUnoGameState } from '@/hooks/uno/useUnoGameState'
import { useUnoActions } from '@/hooks/uno/useUnoActions'
import { CARD_TYPES, ROOM_STATUS, COLOR_NAMES, GAME_MODES } from '@/lib/uno/constants'
import { canPlayCard } from '@/lib/uno/rules'
import { getDisplayName } from '@/hooks/uno/useUnoRoom'
import { toast } from '@/hooks/useToast'
import MobileHandCards from './MobileHandCards'
import MobileOpponentArea from './MobileOpponentArea'
import MobileCard from './MobileCard'
import ColorPicker from '../game/ColorPicker'

/**
 * @param {Object} props
 * @param {Object} props.room - 房间信息
 * @param {Array} props.players - 玩家列表
 * @param {Object} props.myPlayer - 当前玩家信息
 * @param {Function} props.onLeave - 离开房间回调
 * @param {boolean} props.disabled - 是否禁用交互（用于动画播放时）
 */
export default function MobileGameBoard({
  room,
  players,
  myPlayer,
  onLeave,
  disabled = false,
}) {
  const { user } = useAuth()
  
  // 游戏状态和操作
  const playerIds = players.map(p => p.user_id)
  const { gameState, loading: stateLoading, initializeGameState } = useUnoGameState(
    room?.id,
    players,
    room?.game_mode
  )
  const { playCard, drawCard, callUno, loading: actionLoading } = useUnoActions(
    room?.id,
    gameState,
    playerIds,
    room?.game_mode
  )

  // 本地 UI 状态
  const [selectedCards, setSelectedCards] = useState([])
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  // 判断是否为房主（基于 room.host_id）
  const isHost = user && room && room.host_id === user.id

  // 初始化游戏状态（房主）
  useEffect(() => {
    if (!gameState && room?.status === ROOM_STATUS.PLAYING && isHost) {
      initializeGameState()
    }
  }, [gameState, room?.status, isHost, initializeGameState])

  // 加载中状态
  if (stateLoading || !gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载游戏中...</p>
        </div>
      </div>
    )
  }

  // 获取当前玩家手牌
  const myHand = gameState.hands[user.id] || []
  const currentPlayerIndex = gameState.currentPlayerIndex
  const currentPlayerId = playerIds[currentPlayerIndex]
  const isMyTurn = currentPlayerId === user.id

  // 获取对手列表（排除自己）
  const opponents = players
    .filter(p => p.user_id !== user.id)
    .map(p => ({
      ...p,
      card_count: (gameState.hands[p.user_id] || []).length,
    }))

  // 处理选择卡牌
  const handleSelectCard = (card) => {
    if (!isMyTurn || disabled) return
    
    // 简化选择逻辑：单选模式
    const alreadySelected = selectedCards.some(c => c.id === card.id)
    if (alreadySelected) {
      setSelectedCards([])
    } else {
      setSelectedCards([card])
    }
  }

  // 处理出牌
  const handlePlayCard = async (chosenColor = null) => {
    if (selectedCards.length === 0) {
      toast.error('请选择要出的牌')
      return
    }

    const card = selectedCards[0]
    
    // 检查是否需要选择颜色（万能牌）
    if ((card.type === CARD_TYPES.WILD || card.type === CARD_TYPES.WILD4) && !chosenColor) {
      setShowColorPicker(true)
      return
    }

    try {
      await playCard(card, chosenColor)
      setSelectedCards([])
      setShowColorPicker(false)
    } catch (err) {
      toast.error('出牌失败', err.message)
    }
  }

  // 处理抽牌
  const handleDrawCard = async () => {
    if (!isMyTurn || disabled) return
    
    try {
      await drawCard()
      setSelectedCards([])
    } catch (err) {
      toast.error('抽牌失败', err.message)
    }
  }

  // 处理喊 UNO
  const handleCallUno = async () => {
    try {
      await callUno()
      toast.success('UNO!')
    } catch (err) {
      toast.error('喊 UNO 失败', err.message)
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-purple-100 to-pink-100">
      {/* Header - 顶部栏 */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-white shadow-sm">
        <Button
          variant="ghost"
          size="sm"
          onClick={onLeave}
          className="flex items-center gap-1 h-8"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">离开</span>
        </Button>
        
        <div className="text-center flex-1">
          <div className="text-sm font-semibold text-gray-900">
            UNO 游戏
          </div>
          <div className="text-xs text-gray-500">
            {isMyTurn ? '🎯 轮到你了!' : '⏳ 等待中...'}
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowMenu(!showMenu)}
          className="h-8 w-8 p-0"
        >
          <MoreVertical className="w-4 h-4" />
        </Button>
      </header>

      {/* Opponent Area - 对手信息区（紧凑） */}
      <div className="flex-shrink-0 px-3 py-2 bg-white border-b">
        <MobileOpponentArea
          opponents={opponents}
          currentPlayerId={currentPlayerId}
          maxVisible={3}
        />
      </div>

      {/* Main Game Area - 主游戏区（弹性增长） */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-4 min-h-0">
        {/* 弃牌堆 */}
        <div className="mb-4">
          <MobileCard
            card={gameState.topCard}
            width={90}
            height={126}
          />
          {gameState.currentColor && gameState.currentColor !== gameState.topCard?.color && (
            <div className="mt-2 text-center text-sm font-semibold text-gray-700">
              当前花色: <span className="text-purple-600">{COLOR_NAMES[gameState.currentColor] || gameState.currentColor}</span>
            </div>
          )}
        </div>

        {/* 提示信息 */}
        {gameState.pendingDrawCount > 0 && (
          <div className="mb-3 bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm font-medium">
            ⚠️ 需要抽 {gameState.pendingDrawCount} 张牌
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-2">
          <Button
            onClick={handleDrawCard}
            disabled={!isMyTurn || disabled || actionLoading}
            className="px-6 py-2 h-10 text-sm"
            variant="outline"
          >
            🎴 抽牌
          </Button>
          
          <Button
            onClick={() => handlePlayCard()}
            disabled={!isMyTurn || disabled || actionLoading || selectedCards.length === 0}
            className="px-6 py-2 h-10 text-sm bg-purple-600 hover:bg-purple-700"
          >
            ▶️ 出牌
          </Button>
          
          {myHand.length === 1 && (
            <Button
              onClick={handleCallUno}
              disabled={disabled || actionLoading}
              className="px-4 py-2 h-10 text-sm bg-red-600 hover:bg-red-700 font-bold"
            >
              UNO!
            </Button>
          )}
        </div>
      </div>

      {/* Hand Cards - 手牌区（固定底部） */}
      <div className="flex-shrink-0 bg-white border-t shadow-lg">
        <MobileHandCards
          cards={myHand}
          selectedCards={selectedCards}
          topCard={gameState.topCard}
          currentColor={gameState.currentColor}
          onSelectCard={handleSelectCard}
          disabled={!isMyTurn || disabled}
        />
      </div>

      {/* Color Picker Modal */}
      {showColorPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 m-4">
            <h3 className="text-lg font-semibold mb-4 text-center">选择颜色</h3>
            <ColorPicker
              onColorPick={(color) => handlePlayCard(color)}
              onCancel={() => {
                setShowColorPicker(false)
                setSelectedCards([])
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
