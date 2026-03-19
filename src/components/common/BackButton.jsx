import React from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

const NB = {
  border: '#1A1A1A',
  shadowSm: '3px 3px 0px #1A1A1A',
  text: '#1A1A1A',
  sub: '#5A5350',
  tagBd: 'rgba(26,26,26,0.2)',
}

export default function BackButton({ 
  to, 
  onClick, 
  children = '返回', 
  variant = 'default', // 'default', 'outline', 'ghost', 'link'
  className = '',
  style = {},
  icon = true
}) {
  const navigate = useNavigate()

  const handleClick = (e) => {
    if (onClick) {
      onClick(e)
    } else if (!to) {
      e.preventDefault()
      navigate(-1)
    }
  }

  // 样式变体
  if (variant === 'outline') {
    const baseStyle = {
      border: `2px solid ${NB.border}`,
      boxShadow: NB.shadowSm,
      borderRadius: '8px',
      color: NB.text,
      ...style
    }

    if (to) {
      return (
        <Link to={to} className={`inline-flex items-center justify-center font-bold ${className}`} style={baseStyle} onClick={handleClick}>
          {icon && <ArrowLeft className="h-4 w-4 mr-2" />}
          {children}
        </Link>
      )
    }

    return (
      <Button variant="outline" onClick={handleClick} className={`font-bold ${className}`} style={baseStyle}>
        {icon && <ArrowLeft className="h-4 w-4 mr-2" />}
        {children}
      </Button>
    )
  }

  if (variant === 'ghost') {
    const baseStyle = {
      display: 'inline-flex', 
      alignItems: 'center', 
      gap: '6px',
      border: `2px solid ${NB.tagBd}`, 
      background: 'transparent',
      padding: '8px 14px', 
      borderRadius: '8px', 
      cursor: 'pointer',
      fontWeight: '600', 
      fontSize: '13px', 
      color: NB.sub,
      ...style
    }

    if (to) {
      return (
        <Link to={to} className={className} style={baseStyle} onClick={handleClick}>
          {icon && <ArrowLeft style={{ width: '16px', height: '16px' }} />}
          {children}
        </Link>
      )
    }

    return (
      <button onClick={handleClick} className={className} style={baseStyle}>
        {icon && <ArrowLeft style={{ width: '16px', height: '16px' }} />}
        {children}
      </button>
    )
  }

  if (variant === 'link') {
    const baseStyle = {
      color: NB.sub,
      ...style
    }

    if (to) {
      return (
        <Link to={to} className={`flex items-center justify-center gap-2 text-sm font-bold transition-colors ${className}`} style={baseStyle} onClick={handleClick}>
          {icon && <ArrowLeft className="h-4 w-4" />}
          {children}
        </Link>
      )
    }

    return (
      <button onClick={handleClick} className={`flex items-center justify-center gap-2 text-sm font-bold transition-colors ${className}`} style={baseStyle}>
        {icon && <ArrowLeft className="h-4 w-4" />}
        {children}
      </button>
    )
  }

  // 默认样式
  return (
    <Button variant={variant} onClick={handleClick} className={className} style={style}>
      {icon && <ArrowLeft className="h-4 w-4 mr-2" />}
      {children}
    </Button>
  )
}
