import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CameraInput from '../components/CameraInput'
import PhotoThumbnail from '../components/PhotoThumbnail'
import RegisterForm from '../components/RegisterForm'
import { useCapture } from '../context/CaptureContext'
import { saveItemWithPhotos } from '../db/mutations'
import { useRegisterForm } from '../hooks/useRegisterForm'
import { setLastShopId } from '../utils/lastShop'
import { getToday } from '../utils/format'

export default function CapturePage() {
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const { photos, isCompressing, error, captureFile, removePhoto, clearPhotos } = useCapture()
  const { form, updateField, selectShop, resetForNextItem, clearDraft, isValid } = useRegisterForm()
  const [selectedId, setSelectedId] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState(null)
  const [focusName, setFocusName] = useState(false)

  useEffect(() => {
    if (photos.length === 0 && !isCompressing && !isSaving) {
      inputRef.current?.open()
    }
  }, [photos.length, isCompressing, isSaving])

  useEffect(() => {
    if (photos.length > 0 && !selectedId) {
      setSelectedId(photos[photos.length - 1].id)
    }
  }, [photos, selectedId])

  function handleRemovePhoto(id) {
    removePhoto(id)
    if (selectedId === id) {
      const remaining = photos.filter((p) => p.id !== id)
      setSelectedId(remaining[remaining.length - 1]?.id ?? null)
    }
  }

  async function handleCapture(file) {
    const entry = await captureFile(file)
    if (entry) {
      setSelectedId(entry.id)
      setFocusName(true)
    }
  }

  async function handleSave() {
    if (!isValid || isSaving) return

    setIsSaving(true)
    setSaveMessage(null)

    try {
      const keptShopId = form.shopId
      setLastShopId(keptShopId)

      await saveItemWithPhotos({
        shopId: form.shopId,
        date: getToday(),
        name: form.name || form.memo || '무제 상품',
        category: form.category,
        color: form.color,
        size: form.size,
        price: form.price,
        qty: form.qty,
        memo: form.memo,
        status: form.status,
        photoBlobs: photos.map((p) => p.blob),
      })

      setSaveMessage('저장됨 — 다음 상품을 촬영하세요')
      resetForNextItem(keptShopId)
      clearPhotos()
      setSelectedId(null)
      setFocusName(false)

      setTimeout(() => {
        inputRef.current?.open()
      }, 200)
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : '저장에 실패했습니다')
    } finally {
      setIsSaving(false)
    }
  }

  function handleClose() {
    clearPhotos()
    clearDraft()
    navigate('/')
  }

  const showForm = photos.length > 0

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-raised/95 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={handleClose}
          className="rounded-lg px-2 py-1 text-sm font-medium text-ink-muted"
        >
          닫기
        </button>
        <div className="text-center">
          <h1 className="text-base font-semibold text-ink">빠른 등록</h1>
          <p className="text-[11px] text-ink-muted">사진 · 가게 · 금액 · 메모</p>
        </div>
        <span className="w-12 text-right text-xs font-medium text-ink-muted">{photos.length}장</span>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 overflow-y-auto px-4 py-4 pb-32">
        {error && (
          <div className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
        )}

        {saveMessage && (
          <div
            className={`mb-3 rounded-xl px-3 py-2 text-sm ${
              saveMessage.includes('실패')
                ? 'bg-red-50 text-red-600'
                : 'bg-brand-soft text-brand'
            }`}
          >
            {saveMessage}
          </div>
        )}

        {isCompressing && photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand border-t-transparent" />
            <p className="text-sm text-ink-muted">사진 정리 중…</p>
          </div>
        ) : (
          <>
            {photos.length > 0 && (
              <div className="mb-4 flex items-center gap-2">
                <ul className="flex flex-1 gap-2 overflow-x-auto pb-1">
                  {photos.map((photo) => (
                    <li key={photo.id} className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelectedId(photo.id)}
                        className={[
                          'rounded-xl ring-2 ring-offset-2',
                          selectedId === photo.id ? 'ring-brand' : 'ring-transparent',
                        ].join(' ')}
                      >
                        <PhotoThumbnail blob={photo.blob} alt="썸네일" />
                      </button>
                      {photos.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(photo.id)}
                          className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[11px] text-white"
                          aria-label="삭제"
                        >
                          ×
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={isCompressing}
                  onClick={() => inputRef.current?.open()}
                  className="shrink-0 rounded-xl bg-brand-soft px-3 py-2 text-xs font-semibold text-brand"
                >
                  + 추가
                </button>
              </div>
            )}

            {showForm && (
              <RegisterForm
                form={form}
                updateField={updateField}
                selectShop={selectShop}
                onSubmit={handleSave}
                isSaving={isSaving}
                autoFocusName={focusName}
              />
            )}
          </>
        )}

        <CameraInput ref={inputRef} onCapture={handleCapture} disabled={isCompressing || isSaving} />
      </main>

      {showForm && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-raised/95 px-4 py-3 backdrop-blur safe-bottom">
          <div className="mx-auto max-w-lg">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !isValid}
              className="w-full rounded-2xl bg-accent py-4 text-base font-bold text-white shadow-lg shadow-accent/25 active:bg-accent-dark disabled:opacity-40"
            >
              {isSaving ? '저장 중…' : '저장하고 다음 촬영'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
