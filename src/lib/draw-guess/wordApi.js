/**
 * 你说我猜 - 词库管理 API
 */

import { supabase } from '../supabase'

/**
 * 获取全局词库
 * @param {string} category - 分类 (可选)
 * @param {number} limit - 数量限制
 * @returns {Promise<{data, error}>}
 */
export async function getGlobalWords(category = null, limit = 100) {
  try {
    let query = supabase
      .from('draw_guess_words')
      .select('*')
      .is('room_id', null)
      .limit(limit)

    if (category) {
      query = query.eq('category', category)
    }

    const { data, error } = await query

    if (error) {
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (err) {
    console.error('获取全局词库异常:', err)
    return { data: null, error: err.message }
  }
}

/**
 * 添加自定义词语
 * @param {string} roomId - 房间ID
 * @param {string} word - 词语
 * @param {string} category - 分类 (可选)
 * @param {string} userId - 创建者ID
 * @returns {Promise<{data, error}>}
 */
export async function addCustomWord(roomId, word, category = null, userId = null) {
  try {
    // 验证词语长度
    if (!word || word.length === 0 || word.length > 50) {
      return { data: null, error: '词语长度必须在 1-50 个字符之间' }
    }

    const { data, error } = await supabase
      .from('draw_guess_words')
      .insert({
        room_id: roomId,
        word: word.trim(),
        category: category || '自定义',
        created_by: userId
      })
      .select()
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (err) {
    console.error('添加自定义词语异常:', err)
    return { data: null, error: err.message }
  }
}

/**
 * 批量添加自定义词语
 * @param {string} roomId - 房间ID
 * @param {string[]} words - 词语数组
 * @param {string} category - 分类 (可选)
 * @param {string} userId - 创建者ID
 * @returns {Promise<{data, error}>}
 */
export async function addCustomWords(roomId, words, category = null, userId = null) {
  try {
    const validWords = words
      .filter(w => w && w.trim().length > 0 && w.trim().length <= 50)
      .map(w => ({
        room_id: roomId,
        word: w.trim(),
        category: category || '自定义',
        created_by: userId
      }))

    if (validWords.length === 0) {
      return { data: null, error: '没有有效的词语' }
    }

    const { data, error } = await supabase
      .from('draw_guess_words')
      .insert(validWords)
      .select()

    if (error) {
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (err) {
    console.error('批量添加词语异常:', err)
    return { data: null, error: err.message }
  }
}

/**
 * 获取房间可用词库
 * @param {string} roomId - 房间ID
 * @param {string} wordSource - 词源类型 ('predefined' | 'custom' | 'both')
 * @returns {Promise<{data, error}>}
 */
export async function getWordsForRoom(roomId, wordSource = 'predefined') {
  try {
    let words = []

    // 获取全局词库
    if (wordSource === 'predefined' || wordSource === 'both') {
      const { data: globalWords } = await supabase
        .from('draw_guess_words')
        .select('*')
        .is('room_id', null)

      if (globalWords) {
        words = words.concat(globalWords)
      }
    }

    // 获取房间自定义词库
    if (wordSource === 'custom' || wordSource === 'both') {
      const { data: customWords } = await supabase
        .from('draw_guess_words')
        .select('*')
        .eq('room_id', roomId)

      if (customWords) {
        words = words.concat(customWords)
      }
    }

    return { data: words, error: null }
  } catch (err) {
    console.error('获取房间词库异常:', err)
    return { data: null, error: err.message }
  }
}

/**
 * 随机选择词语
 * @param {Array} words - 词语数组
 * @param {string[]} usedWords - 已使用的词语（避免重复）
 * @returns {Object|null}
 */
export function selectRandomWord(words, usedWords = []) {
  if (!words || words.length === 0) return null

  const availableWords = words.filter(w => !usedWords.includes(w.word))
  
  if (availableWords.length === 0) {
    // 所有词都用过了，重置
    return words[Math.floor(Math.random() * words.length)]
  }

  return availableWords[Math.floor(Math.random() * availableWords.length)]
}

/**
 * 获取所有词语分类
 * @returns {Promise<{data, error}>}
 */
export async function getWordCategories() {
  try {
    const { data, error } = await supabase
      .from('draw_guess_words')
      .select('category')
      .is('room_id', null)

    if (error) {
      return { data: null, error: error.message }
    }

    // 去重
    const categories = [...new Set(data.map(w => w.category).filter(Boolean))]

    return { data: categories, error: null }
  } catch (err) {
    console.error('获取分类异常:', err)
    return { data: null, error: err.message }
  }
}

/**
 * 删除自定义词语
 * @param {string} wordId - 词语ID
 * @returns {Promise<{error}>}
 */
export async function deleteCustomWord(wordId) {
  try {
    const { error } = await supabase
      .from('draw_guess_words')
      .delete()
      .eq('id', wordId)

    return { error: error?.message }
  } catch (err) {
    console.error('删除词语异常:', err)
    return { error: err.message }
  }
}
