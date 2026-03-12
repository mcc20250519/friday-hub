import JsonFormatter from './JsonFormatter'
import ExtensionGenerator from './ExtensionGenerator'

/**
 * 工具组件映射表
 * key 对应 tools 表的 component 字段
 */
export const toolComponents = {
  'json-formatter': JsonFormatter,
  'extension-generator': ExtensionGenerator,
  // 后续添加更多工具：
  // 'code-diff': CodeDiff,
  // 'regex-tester': RegexTester,
}

/**
 * 根据组件名获取工具组件
 */
export const getToolComponent = (componentName) => {
  return toolComponents[componentName] || null
}
