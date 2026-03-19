/**
 * 你说我猜 - 模块导出
 */

// 房间管理 API
export {
  generateRoomCode,
  createRoom,
  joinRoom,
  leaveRoom,
  getRoom,
  getRoomByCode,
  updatePlayerStatus,
  generateBotId,
  addBotToRoom,
  removeBotFromRoom,
  fillBotsToRoom
} from './roomApi'

// 词库管理 API
export {
  getGlobalWords,
  addCustomWord,
  addCustomWords,
  getWordsForRoom,
  selectRandomWord,
  getWordCategories,
  deleteCustomWord
} from './wordApi'

// 游戏逻辑 API
export {
  startGame,
  assignNextDescriber,
  validateGuess,
  submitGuess,
  endRound,
  requestHint,
  transitionPhase,
  restartGame
} from './gameLogic'

// 绘图数据 API
export {
  compressDrawingEvents,
  decompressDrawingEvents,
  replayDrawingEvents,
  saveRoundDrawing,
  getRoundDrawing,
  broadcastDrawingEvent,
  calculateDrawingSize,
  exportDrawingAsImage,
  restoreDrawingFromImage
} from './drawingApi'

// 机器人逻辑
export {
  simulateBotGuess,
  calculateBotGuessDelay,
  shouldRequestHint,
  createBotConfig,
  BOT_DIFFICULTY,
  BOT_NAMES
} from './botLogic'
