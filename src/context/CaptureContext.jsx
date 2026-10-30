import { useCallback, useMemo, useState } from 'react'
import { CaptureContext } from './captureContext'
import { compressImage } from '../utils/compressImage'

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
