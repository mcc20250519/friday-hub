import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Copy, Check, Wand2, Trash2 } from 'lucide-react'
import { toast } from '@/hooks/useToast'

/**
 * JSON 格式化工具
 */
export default function JsonFormatter() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  // 格式化 JSON
  const handleFormat = () => {
    try {
      if (!input.trim()) {
        toast.error('请输入 JSON 内容')
        return
      }

      const parsed = JSON.parse(input)
      const formatted = JSON.stringify(parsed, null, 2)
      setOutput(formatted)
      setError('')
      toast.success('格式化成功')
    } catch (err) {
      setError('JSON 格式错误: ' + err.message)
      setOutput('')
    }
  }

  // 压缩 JSON
  const handleMinify = () => {
    try {
      if (!input.trim()) {
        toast.error('请输入 JSON 内容')
        return
      }

      const parsed = JSON.parse(input)
      const minified = JSON.stringify(parsed)
      setOutput(minified)
      setError('')
      toast.success('压缩成功')
    } catch (err) {
      setError('JSON 格式错误: ' + err.message)
      setOutput('')
    }
  }

  // 复制结果
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(output)
      setCopied(true)
      toast.success('已复制到剪贴板')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('复制失败')
    }
  }

  // 清空
  const handleClear = () => {
    setInput('')
    setOutput('')
    setError('')
    toast.success('已清空')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 输入区域 */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">输入 JSON</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              清空
            </Button>
          </div>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`{"name": "example", "value": 123}`}
            className="min-h-[200px] font-mono text-sm"
          />
          <div className="flex gap-3 mt-4">
            <Button onClick={handleFormat} className="bg-purple-600 hover:bg-purple-700">
              <Wand2 className="w-4 h-4 mr-2" />
              格式化
            </Button>
            <Button onClick={handleMinify} variant="outline">
              压缩
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 错误提示 */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
          {error}
        </div>
      )}

      {/* 输出区域 */}
      {output && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">结果</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="w-4 h-4 mr-2 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4 mr-2" />
                )}
                {copied ? '已复制' : '复制'}
              </Button>
            </div>
            <pre className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-[400px] font-mono text-sm">
              {output}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
