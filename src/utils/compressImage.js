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

/**
 * 이미지 파일을 JPEG로 압축합니다.
 * - 장변 최대 1280px
 * - JPEG 품질 기본 0.72 (설정에서 변경 가능)
 * - 원본 파일은 저장하지 않음
 *
 * @param {File|Blob} file
 * @param {number} [quality] 0~1 JPEG 품질
 * @returns {Promise<{ blob: Blob, width: number, height: number, originalSize: number, compressedSize: number }>}
 */
export async function compressImage(file, quality = getPhotoQuality()) {
  const originalSize = file.size

  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const { width, height } = scaleDimensions(bitmap.width, bitmap.height, MAX_LONG_EDGE)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close?.()

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
