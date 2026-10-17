import { forwardRef, useImperativeHandle, useRef } from 'react'

/**
 * 카메라 / 갤러리 입력을 분리합니다.
 * - openCamera(): 후면 카메라 우선 (capture=environment)
 * - openGallery(): 앨범에서 선택 (capture 없음)
 * 자동 click은 하지 않습니다. 반드시 사용자 버튼 클릭으로 호출해야 합니다.
 */
const CameraInput = forwardRef(function CameraInput({ onCapture, disabled, multiple = false }, ref) {
  const cameraRef = useRef(null)
  const galleryRef = useRef(null)

  useImperativeHandle(ref, () => ({
    openCamera() {
      cameraRef.current?.click()
    },
    openGallery() {
      galleryRef.current?.click()
    },
    /** @deprecated 호환용 — 카메라 우선 */
    open() {
      cameraRef.current?.click()
    },
  }))

  function handleChange(event) {
    const files = [...(event.target.files || [])]
    event.target.value = ''
    for (const file of files) {
      if (file) onCapture(file)
    }
  }

  return (
    <>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        disabled={disabled}
        onChange={handleChange}
        aria-hidden
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*,.heic,.heif"
        multiple={multiple}
        className="sr-only"
        tabIndex={-1}
        disabled={disabled}
        onChange={handleChange}
        aria-hidden
      />
    </>
  )
})

export default CameraInput
