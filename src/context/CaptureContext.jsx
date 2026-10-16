import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { compressImage } from '../utils/compressImage'

const CaptureContext = createContext(null)

export function CaptureProvider({ children }) {
  const [photos, setPhotos] = useState([])
  const [isCompressing, setIsCompressing] = useState(false)
  const [error, setError] = useState(null)

  const captureFile = useCallback(async (file) => {
    setIsCompressing(true)
    setError(null)
    try {
      const result = await compressImage(file)
      const entry = { ...result, id: crypto.randomUUID(), capturedAt: Date.now() }
      setPhotos((prev) => [...prev, entry])
      return entry
    } catch (err) {
      setError(err instanceof Error ? err.message : '사진 처리 중 오류가 발생했습니다')
      return null
    } finally {
      setIsCompressing(false)
    }
  }, [])

  const removePhoto = useCallback((id) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const clearPhotos = useCallback(() => {
    setPhotos([])
    setError(null)
  }, [])

  const value = useMemo(
    () => ({
      photos,
      isCompressing,
      error,
      captureFile,
      removePhoto,
      clearPhotos,
    }),
    [photos, isCompressing, error, captureFile, removePhoto, clearPhotos],
  )

  return <CaptureContext.Provider value={value}>{children}</CaptureContext.Provider>
}

export function useCapture() {
  const ctx = useContext(CaptureContext)
  if (!ctx) throw new Error('useCapture must be used within CaptureProvider')
  return ctx
}
