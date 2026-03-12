/**
 * AI 客户端 - 支持多服务商 API 调用
 */

/**
 * 生成题目词语
 * @param {Object} config - 配置对象
 * @param {string} config.provider - 服务商 (openai/qwen/gemini)
 * @param {string} config.apiKey - API Key
 * @param {string} config.model - 模型名称
 * @param {Object} options - 生成选项
 * @param {number} options.count - 生成数量
 * @param {string[]} options.topics - 主题列表
 * @returns {Promise<{success: boolean, data: string[], error: string}>}
 */
export async function generateWords(config, options) {
  const { provider, apiKey, model } = config
  const { count, topics } = options

  const prompt = `请根据以下主题生成${count}个适合"你说我猜"游戏的词语或短语，主题包括：${topics.join('、')}

要求：
1. 难度适中，不要太生僻
2. 每个词语独占一行
3. 只输出词语，不要编号和解释
4. 中文输出`

  try {
    let result
    switch (provider) {
      case 'openai':
        result = await callOpenAI(apiKey, model, prompt)
        break
      case 'qwen':
        result = await callQwen(apiKey, model, prompt)
        break
      case 'gemini':
        result = await callGemini(apiKey, model, prompt)
        break
      case 'claude':
        result = await callClaude(apiKey, model, prompt)
        break
      default:
        throw new Error(`不支持的服务商: ${provider}`)
    }

    // 解析返回的词语列表
    const words = parseWords(result)
    return { success: true, data: words, error: null }
  } catch (error) {
    console.error('生成词语失败:', error)
    return { success: false, data: null, error: error.message }
  }
}

/**
 * 调用 OpenAI API
 */
async function callOpenAI(apiKey, model, prompt) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error?.message || `OpenAI API 错误: ${response.status}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || ''
}

/**
 * 调用通义千问 API (DashScope)
 */
async function callQwen(apiKey, model, prompt) {
  const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'qwen-turbo',
      input: { messages: [{ role: 'user', content: prompt }] },
      parameters: { temperature: 0.8 },
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || `通义千问 API 错误: ${response.status}`)
  }

  const data = await response.json()
  return data.output?.text || ''
}

/**
 * 调用 Gemini API
 */
async function callGemini(apiKey, model, prompt) {
  const modelName = model || 'gemini-pro'
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.8 },
      }),
    }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error?.message || `Gemini API 错误: ${response.status}`)
  }

  const data = await response.json()
  return data.candidates[0]?.content?.parts[0]?.text || ''
}

/**
 * 调用 Claude API
 */
async function callClaude(apiKey, model, prompt) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model || 'claude-3-haiku-20240307',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error?.message || `Claude API 错误: ${response.status}`)
  }

  const data = await response.json()
  return data.content[0]?.text || ''
}

/**
 * 解析 AI 返回的文本为词语列表
 */
function parseWords(text) {
  if (!text) return []
  
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.match(/^\d+[\.、]/)) // 过滤空行和序号
    .map(line => line.replace(/^\d+[\.、]\s*/, '')) // 去除序号前缀
    .slice(0, 20) // 最多返回20个
}
