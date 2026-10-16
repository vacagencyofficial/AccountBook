import { forwardRef, useImperativeHandle, useRef } from 'react'

const CameraInput = forwardRef(function CameraInput({ onCapture, disabled }, ref) {
  const inputRef = useRef(null)

  useImperativeHandle(ref, () => ({
    open() {
      inputRef.current?.click()
    },
  }))

  function handleChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) onCapture(file)
  }

  return (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      capture="environment"
      className="hidden"
      disabled={disabled}
      onChange={handleChange}
    />
  )
})

export default CameraInput
