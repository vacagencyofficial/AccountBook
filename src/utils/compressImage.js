import { getPhotoQuality, MAX_LONG_EDGE } from './photoConfig'

function scaleDimensions(width, height, maxLongEdge) {
  const longEdge = Math.max(width, height)
  if (longEdge <= maxLongEdge) return { width, height }
  const ratio = maxLongEdge / longEdge
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  }
}

async function loadBitmap(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      try {
        return await createImageBitmap(file)
      } catch {
        // fall through to Image()
      }
    }
  }

  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('사진을 읽을 수 없습니다. 다른 사진을 골라 주세요.'))
      el.src = url
    })
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * 이미지 파일을 JPEG로 압축합니다.
 * - 장변 최대 1280px
 * - JPEG 품질 기본 0.72
 */
export async function compressImage(file, quality = getPhotoQuality()) {
  if (!file) throw new Error('사진 파일이 없습니다')

  const originalSize = file.size
  const source = await loadBitmap(file)
  const srcW = source.width || source.naturalWidth
  const srcH = source.height || source.naturalHeight

  if (!srcW || !srcH) {
    source.close?.()
    throw new Error('사진 크기를 확인할 수 없습니다')
  }

  const { width, height } = scaleDimensions(srcW, srcH, MAX_LONG_EDGE)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    source.close?.()
    throw new Error('이미지 처리에 실패했습니다')
  }

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(source, 0, 0, width, height)
  source.close?.()

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('이미지 압축에 실패했습니다'))),
      'image/jpeg',
      quality,
    )
  })

  return {
    blob,
    width,
    height,
    originalSize,
    compressedSize: blob.size,
  }
}
