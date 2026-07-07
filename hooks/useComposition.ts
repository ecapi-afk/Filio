import { useState, useRef } from 'react'
import type React from 'react'

type CompositionOptions<T extends HTMLElement> = {
  onCompositionStart?: (e: React.CompositionEvent<T>) => void
  onCompositionEnd?: (e: React.CompositionEvent<T>) => void
  onKeyDown?: (e: React.KeyboardEvent<T>) => void
}

type CompositionResult<T extends HTMLElement> = {
  isComposing: boolean
  ref: React.RefObject<T>
  onCompositionStart: (e: React.CompositionEvent<T>) => void
  onCompositionEnd: (e: React.CompositionEvent<T>) => void
  onKeyDown: (e: React.KeyboardEvent<T>) => void
}

export function useComposition<T extends HTMLElement>(
  options?: CompositionOptions<T>
): CompositionResult<T> {
  const [isComposing, setIsComposing] = useState(false)
  const ref = useRef<T>(null) as React.RefObject<T>

  const onCompositionStart = (e: React.CompositionEvent<T>) => {
    setIsComposing(true)
    options?.onCompositionStart?.(e)
  }

  const onCompositionEnd = (e: React.CompositionEvent<T>) => {
    setIsComposing(false)
    options?.onCompositionEnd?.(e)
  }

  const onKeyDown = (e: React.KeyboardEvent<T>) => {
    options?.onKeyDown?.(e)
  }

  return { isComposing, ref, onCompositionStart, onCompositionEnd, onKeyDown }
}
