import { formatFileSize, getPhotoQuality, MAX_LONG_EDGE } from '../utils/photoConfig'

export default function CompressionInfo({ result }) {
  if (!result) return null

  const ratio =
    result.originalSize > 0 ? Math.round((1 - result.compressedSize / result.originalSize) * 100) : 0

  return (
    <div className=" bg-slate-50 px-4 py-3 text-xs text-slate-600">
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <span>
          크기 {result.width}×{result.height}px
        </span>
        <span>장변 최대 {MAX_LONG_EDGE}px</span>
        <span>품질 {Math.round(getPhotoQuality() * 100)}%</span>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
        <span>
          {formatFileSize(result.originalSize)} → {formatFileSize(result.compressedSize)}
        </span>
        {ratio > 0 && <span className="font-medium text-emerald-600">{ratio}% 절감</span>}
      </div>
    </div>
  )
}
