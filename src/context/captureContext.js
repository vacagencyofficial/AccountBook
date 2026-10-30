import { createContext, useContext } from 'react'

/** 상품 입력 중 찍은 사진(화면을 오가도 유지) */
export const CaptureContext = createContext(null)

export function useCapture() {
  const ctx = useContext(CaptureContext)
  if (!ctx) throw new Error('useCapture must be used within CaptureProvider')
  return ctx
}
