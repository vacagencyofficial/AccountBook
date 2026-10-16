export const MAX_LONG_EDGE = 1280
export const DEFAULT_JPEG_QUALITY = 0.72
export const PHOTO_QUALITY_KEY = 'sailp-photo-quality'

export function getPhotoQuality() {
  const stored = localStorage.getItem(PHOTO_QUALITY_KEY)
  if (stored == null) return DEFAULT_JPEG_QUALITY
  const value = parseFloat(stored)
  return Number.isFinite(value) ? value : DEFAULT_JPEG_QUALITY
}

export function setPhotoQuality(quality) {
  localStorage.setItem(PHOTO_QUALITY_KEY, String(quality))
}

export function formatFileSize(bytes) {
  if (bytes == null || bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
