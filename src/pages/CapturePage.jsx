import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CameraInput from '../components/CameraInput'
import PhotoThumbnail from '../components/PhotoThumbnail'
import RegisterForm from '../components/RegisterForm'
import { IconCamera, IconClose, IconGallery, IconPlus } from '../components/Icons'
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
      setSaveMessage(null)
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

      setSaveMessage('저장되었습니다. 다음 사진을 넣어 주세요.')
      resetForNextItem(keptShopId)
      clearPhotos()
      setSelectedId(null)
      setFocusName(false)
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
  const busy = isCompressing || isSaving

  return (
    <div className="flex min-h-dvh flex-col bg-wash">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b-2 border-line bg-paper px-4 py-3">
        <button
          type="button"
          onClick={handleClose}
          className="tap-target inline-flex items-center gap-1 rounded-xl px-3 text-[16px] font-semibold text-ink-muted"
        >
          <IconClose className="h-5 w-5" />
          닫기
        </button>
        <div className="text-center">
          <h1 className="text-[18px] font-bold text-ink">사진 기록</h1>
          <p className="text-[13px] text-ink-muted">{photos.length}장 선택됨</p>
        </div>
        <span className="w-16" />
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 overflow-y-auto px-4 py-4 pb-32">
        {error && (
          <div className="mb-4 rounded-2xl border-2 border-red-300 bg-red-50 px-4 py-3 text-[16px] font-medium text-red-700">
            {error}
          </div>
        )}

        {saveMessage && (
          <div
            className={`mb-4 rounded-2xl border-2 px-4 py-3 text-[16px] font-medium ${
              saveMessage.includes('실패')
                ? 'border-red-300 bg-red-50 text-red-700'
                : 'border-good bg-good-soft text-good'
            }`}
          >
            {saveMessage}
          </div>
        )}

        {!showForm && !isCompressing && (
          <section className="space-y-4">
            <div className="rounded-2xl border-2 border-accent/30 bg-accent-soft px-4 py-4">
              <p className="text-[18px] font-bold text-accent-dark">사진을 넣어 주세요</p>
              <p className="mt-1 text-[15px] text-ink-muted">
                카메라로 찍거나, 갤러리에서 고를 수 있습니다.
              </p>
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.openCamera()}
              className="tap-target flex w-full items-center gap-4 rounded-2xl bg-accent px-5 py-5 text-left text-white shadow-sm active:bg-accent-dark disabled:opacity-50"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
                <IconCamera className="h-8 w-8" />
              </span>
              <span>
                <span className="block text-[20px] font-bold">카메라 촬영</span>
                <span className="mt-0.5 block text-[14px] text-white/85">지금 바로 찍기</span>
              </span>
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.openGallery()}
              className="tap-target flex w-full items-center gap-4 rounded-2xl border-2 border-brand bg-brand-soft px-5 py-5 text-left text-brand-dark active:bg-brand/10 disabled:opacity-50"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-white">
                <IconGallery className="h-8 w-8" />
              </span>
              <span>
                <span className="block text-[20px] font-bold">갤러리에서 선택</span>
                <span className="mt-0.5 block text-[14px] text-brand/80">저장된 사진 첨부</span>
              </span>
            </button>
          </section>
        )}

        {isCompressing && photos.length === 0 && (
          <div className="rounded-2xl border-2 border-line bg-paper py-16 text-center text-[17px] font-medium text-ink-muted">
            사진을 정리하는 중…
          </div>
        )}

        {showForm && (
          <>
            <div className="mb-4 rounded-2xl border-2 border-line bg-paper p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[15px] font-bold text-ink">선택한 사진</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => inputRef.current?.openCamera()}
                    className="inline-flex items-center gap-1 rounded-xl bg-accent px-3 py-2 text-[14px] font-bold text-white disabled:opacity-50"
                  >
                    <IconCamera className="h-4 w-4" />
                    촬영
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => inputRef.current?.openGallery()}
                    className="inline-flex items-center gap-1 rounded-xl bg-brand px-3 py-2 text-[14px] font-bold text-white disabled:opacity-50"
                  >
                    <IconPlus className="h-4 w-4" />
                    갤러리
                  </button>
                </div>
              </div>
              <ul className="flex gap-2 overflow-x-auto pb-1">
                {photos.map((photo) => (
                  <li key={photo.id} className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedId(photo.id)}
                      className={[
                        'rounded-xl border-4',
                        selectedId === photo.id ? 'border-brand' : 'border-transparent',
                      ].join(' ')}
                    >
                      <PhotoThumbnail blob={photo.blob} alt="썸네일" size="lg" />
                    </button>
                    {photos.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(photo.id)}
                        className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white"
                        aria-label="사진 삭제"
                      >
                        <IconClose className="h-4 w-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <RegisterForm
              form={form}
              updateField={updateField}
              selectShop={selectShop}
              onSubmit={handleSave}
              isSaving={isSaving}
              autoFocusName={focusName}
            />
          </>
        )}

        <CameraInput
          ref={inputRef}
          onCapture={handleCapture}
          disabled={busy}
          multiple
        />
      </main>

      {showForm && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t-2 border-line bg-paper px-4 py-3 safe-bottom">
          <div className="mx-auto max-w-lg">
            <button
              type="button"
              onClick={handleSave}
              disabled={busy || !isValid}
              className="tap-target w-full rounded-2xl bg-good py-4 text-[18px] font-bold text-white disabled:opacity-40"
            >
              {isSaving ? '저장 중…' : '저장하기'}
            </button>
            {!isValid && (
              <p className="mt-2 text-center text-[14px] text-ink-muted">
                가게 · 품명(또는 메모) · 금액을 입력해 주세요
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
