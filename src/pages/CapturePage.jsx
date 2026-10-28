import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import CameraInput from '../components/CameraInput'
import PhotoThumbnail from '../components/PhotoThumbnail'
import RegisterForm from '../components/RegisterForm'
import { IconCamera, IconClose, IconGallery } from '../components/Icons'
import { useCapture } from '../context/CaptureContext'
import { db } from '../db'
import { saveItemWithPhotos } from '../db/mutations'
import { useRegisterForm } from '../hooks/useRegisterForm'
import { setLastShopId } from '../utils/lastShop'
import { formatCurrency, formatDateLabel, getToday } from '../utils/format'

/** 저장 버튼 아래에 보여 줄, 가장 먼저 채워야 할 칸 */
function firstMissing(form) {
  if (!form.shopId) return '가게를 골라 주세요'
  if (form.price === '') return '한 개 가격을 적어 주세요'
  if (!form.name.trim() && !form.memo.trim()) return '옷 이름을 적어 주세요'
  return null
}

export default function CapturePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const inputRef = useRef(null)
  const { photos, isCompressing, error, captureFile, removePhoto, clearPhotos } = useCapture()
  const { form, updateField, selectShop, resetForNextItem, clearDraft, isValid } = useRegisterForm()
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [saved, setSaved] = useState(null)
  const [focusName, setFocusName] = useState(false)
  const [showLeave, setShowLeave] = useState(false)

  // 가게 상세의 「이 가게 물건 적기」로 들어온 경우 그 가게를 골라 둠
  const presetShopId = location.state?.shopId
  useEffect(() => {
    if (presetShopId) selectShop(presetShopId)
  }, [presetShopId, selectShop])

  async function handleCapture(file) {
    const entry = await captureFile(file)
    if (entry) {
      setFocusName(true)
      setSaveError(null)
    }
  }

  async function handleSave() {
    if (!isValid || isSaving) return

    setIsSaving(true)
    setSaveError(null)

    try {
      const keptShopId = form.shopId
      setLastShopId(keptShopId)
      const qty = Math.max(1, parseInt(form.qty, 10) || 1)
      const date = form.date || getToday()

      await saveItemWithPhotos({
        shopId: form.shopId,
        date,
        name: form.name || form.memo || '이름 없는 물건',
        category: form.category,
        color: form.color,
        size: form.size,
        price: form.price,
        qty,
        memo: form.memo,
        status: form.status,
        photoBlobs: photos.map((p) => p.blob),
      })

      const shop = await db.shops.get(keptShopId)
      setSaved({
        total: (parseInt(form.price, 10) || 0) * qty,
        name: form.name || form.memo,
        shopName: shop?.name ?? '',
        qty,
        date,
        photoCount: photos.length,
      })
      resetForNextItem(keptShopId)
      clearPhotos()
      setFocusName(false)
      window.scrollTo(0, 0)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '저장하지 못했어요. 다시 눌러 주세요.')
    } finally {
      setIsSaving(false)
    }
  }

  const hasContent =
    photos.length > 0 || Boolean(form.name.trim() || form.memo.trim() || form.price !== '')

  function handleClose() {
    if (hasContent) {
      setShowLeave(true)
      return
    }
    navigate('/')
  }

  function leaveAndDiscard() {
    clearPhotos()
    clearDraft()
    navigate('/')
  }

  const busy = isCompressing || isSaving
  const qtyNumber = Math.max(1, parseInt(form.qty, 10) || 1)
  const total = (parseInt(form.price, 10) || 0) * qtyNumber
  const missing = firstMissing(form)

  const steps = [
    { label: '가게', done: Boolean(form.shopId) },
    { label: '가격', done: form.price !== '' },
    { label: '이름', done: Boolean(form.name.trim() || form.memo.trim()) },
  ]
  const currentStep = steps.findIndex((step) => !step.done)

  return (
    <div className="flex min-h-dvh flex-col bg-wash">
      <header className="sticky top-0 z-10 bg-paper shadow-[0_1px_0_var(--color-line-soft)]">
        <div className="mx-auto flex max-w-lg items-center justify-between px-2 py-2">
          <button
            type="button"
            onClick={handleClose}
            className="tap-target inline-flex items-center gap-1 px-3 text-[18px] font-bold text-ink-muted"
          >
            <IconClose className="h-6 w-6" />
            닫기
          </button>
          <h1 className="text-[21px] font-extrabold">물건 적기</h1>
          <span className="w-[5.5rem]" />
        </div>
        {!saved && (
          <ol className="mx-auto flex max-w-lg gap-1.5 px-4 pb-0" aria-label="채울 칸">
            {steps.map((step, index) => (
              <li
                key={step.label}
                className={[
                  'flex-1 border-b-4 pb-2 text-center text-[16px] font-bold',
                  step.done
                    ? 'border-brand text-brand'
                    : index === currentStep
                      ? 'border-accent text-accent-dark'
                      : 'border-line-soft text-ink-soft',
                ].join(' ')}
              >
                {step.done ? `✓ ${step.label}` : step.label}
              </li>
            ))}
          </ol>
        )}
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-4 pb-44">
        {error && (
          <div className="mb-4 rounded-[10px] bg-red-50 px-4 py-3 text-[16px] font-bold text-red-700" role="alert">
            {error}
          </div>
        )}

        {saved ? (
          <section className="space-y-3" aria-live="polite">
            <div className="card px-5 py-6 text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-good-soft text-[34px] font-black text-good">
                ✓
              </div>
              <p className="text-[24px] font-extrabold text-ink">{formatCurrency(saved.total)}을 저장했어요</p>
              <p className="mt-2 text-[17px] font-bold leading-snug text-ink-muted">
                {[saved.shopName, saved.name && `${saved.name} ${saved.qty}개`].filter(Boolean).join(' · ')}
              </p>
              <p className="mt-1 text-[16px] font-semibold text-ink-soft">
                {formatDateLabel(saved.date)}
                {saved.photoCount ? ` · 사진 ${saved.photoCount}장` : ''}
              </p>
            </div>
            <button type="button" onClick={() => setSaved(null)} className="btn btn-accent w-full text-[20px]" style={{ minHeight: '3.75rem' }}>
              다음 물건 적기
            </button>
            <button type="button" onClick={() => navigate('/history')} className="btn btn-outline w-full">
              장부 보기
            </button>
            <button type="button" onClick={() => navigate('/')} className="btn w-full text-ink-muted">
              홈으로
            </button>
          </section>
        ) : (
          <>
            <section className="card mb-6 p-3">
              <div className="flex items-center gap-3">
                {photos.length === 0 ? (
                  <p className="flex-1 pl-1 text-[17px] font-bold text-ink-muted">
                    사진 <span className="font-semibold text-ink-soft">(없어도 돼요)</span>
                  </p>
                ) : (
                  <ul className="flex flex-1 gap-3 overflow-x-auto pb-1 pt-2">
                    {photos.map((photo, index) => (
                      <li key={photo.id} className="relative shrink-0">
                        <PhotoThumbnail blob={photo.blob} alt={`사진 ${index + 1}`} size="lg" />
                        <button
                          type="button"
                          onClick={() => removePhoto(photo.id)}
                          className="absolute -right-2 -top-2 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-red-600 text-white"
                          aria-label={`사진 ${index + 1} 빼기`}
                        >
                          <IconClose className="h-5 w-5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => inputRef.current?.openCamera()}
                  className="btn btn-soft"
                >
                  <IconCamera className="h-6 w-6" />
                  사진 찍기
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => inputRef.current?.openGallery()}
                  className="btn btn-soft"
                >
                  <IconGallery className="h-6 w-6" />
                  사진 고르기
                </button>
              </div>
              {isCompressing && (
                <p className="mt-3 text-center text-[16px] font-bold text-ink-muted">사진 넣는 중이에요…</p>
              )}
            </section>

            <RegisterForm
              form={form}
              updateField={updateField}
              selectShop={selectShop}
              onSubmit={handleSave}
              autoFocusName={focusName}
            />
          </>
        )}

        <CameraInput ref={inputRef} onCapture={handleCapture} disabled={busy} multiple />
      </main>

      {!saved && (
        <div className="fixed inset-x-0 bottom-0 z-20 bg-paper px-4 pt-3 shadow-[0_-4px_18px_rgb(15_23_42/0.08)] safe-bottom">
          <div className="mx-auto max-w-lg">
            {saveError && (
              <p className="mb-2 text-center text-[16px] font-bold text-red-700" role="alert">
                {saveError}
              </p>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={busy || !isValid}
              className="btn btn-accent w-full text-[21px]"
              style={{ minHeight: '3.75rem' }}
            >
              {isSaving ? '저장하는 중…' : isValid ? `${formatCurrency(total)} 저장하기` : '저장하기'}
            </button>
            {missing && (
              <p className="mt-2 text-center text-[17px] font-bold leading-snug text-accent-dark">{missing}</p>
            )}
          </div>
        </div>
      )}

      {showLeave && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="card w-full max-w-sm p-5" role="dialog" aria-modal="true">
            <h3 className="text-[20px] font-extrabold text-ink">적던 내용이 있어요</h3>
            <p className="mt-2 text-[17px] font-medium leading-relaxed text-ink-muted">
              남겨 두면 다음에 「물건 적기」를 누를 때 그대로 이어서 쓸 수 있어요.
            </p>
            <div className="mt-5 space-y-2">
              <button type="button" onClick={() => setShowLeave(false)} className="btn btn-primary w-full">
                계속 적기
              </button>
              <button type="button" onClick={() => navigate('/')} className="btn btn-outline w-full">
                남겨 두고 나가기
              </button>
              <button type="button" onClick={leaveAndDiscard} className="btn btn-text-danger w-full">
                지우고 나가기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
