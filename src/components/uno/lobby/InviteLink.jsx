/**
 * InviteLink - 邀请链接组件
 */

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Copy, Check, Share2, Link } from 'lucide-react'
import { useUnoInvite } from '@/hooks/uno/useUnoInvite'

export default function InviteLink({ roomCode }) {
  const { inviteUrl, copied, copyInviteLink, shareInviteLink, canShare } =
    useUnoInvite(roomCode)

  if (!roomCode) return null

  return (
    <Card className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
      <div className="space-y-3">
        {/* 标题 */}
        <div className="flex items-center gap-2 text-purple-700 font-medium">
          <Link className="h-4 w-4" />
          <span>邀请朋友加入</span>
        </div>

        {/* 邀请码展示 */}
        <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-purple-200">
          <div className="flex-1">
            <div className="text-xs text-gray-500 mb-1">房间邀请码</div>
            <div className="text-2xl font-bold text-purple-600 tracking-wider">
              {roomCode}
            </div>
          </div>
        </div>

        {/* 链接展示（移动端可滚动） */}
        <div className="p-3 bg-white rounded-lg border border-purple-200">
          <div className="text-xs text-gray-500 mb-1">邀请链接</div>
          <div className="text-sm text-gray-700 break-all">{inviteUrl}</div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2">
          <Button
            onClick={copyInviteLink}
            variant="outline"
            className={`flex-1 ${
              copied
                ? 'bg-green-50 border-green-300 text-green-700'
                : 'bg-white border-purple-200 text-purple-600 hover:bg-purple-50'
            }`}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                已复制
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                复制链接
              </>
            )}
          </Button>

          {canShare && (
            <Button
              onClick={shareInviteLink}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Share2 className="h-4 w-4 mr-2" />
              分享
            </Button>
          )}
        </div>

        {/* 提示文字 */}
        <p className="text-xs text-gray-500 text-center">
          发送链接给朋友，注册后即可直接加入房间
        </p>
      </div>
    </Card>
  )
}
