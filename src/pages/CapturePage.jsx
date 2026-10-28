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
import { useLiveQuery } from '../hooks/useLiveQuery'
import { clearLastShopId, setLastShopId } from '../utils/lastShop'
import { formatCurrency, formatDateLabel, getToday } from '../utils/format'

const MODE_KEY = 'sailp-capture-mode'

/** 「한 질문씩」(기본) / 「한 화면에」 중 마지막에 고른 방식 */
function loadMode() {
  try {
    return localStorage.getItem(MODE_KEY) === 'all' ? 'all' : 'steps'
  } catch {
    return 'steps'
  }
}

const STEP_SECTIONS = [['date', 'shop'], ['price'], ['name', 'more']]
const STEP_TITLES = ['어느 가게예요?', '얼마예요?', '무엇을 샀어요?']

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
  const [mode, setMode] = useState(loadMode)
  // 가게 상세의 「이 가게 물건 적기」로 들어온 경우 그 가게를 골라 두고 가격부터
  const presetShopId = location.state?.shopId
  const [step, setStep] = useState(presetShopId ? 1 : 0)
  const stepMode = mode === 'steps'

  function changeMode(next) {
    setMode(next)
    try {
      localStorage.setItem(MODE_KEY, next)
    } catch {
      // 저장 못 해도 이번에는 그대로 씀
    }
  }

  function handleSelectShop(shopId) {
    selectShop(shopId)
    // 한 질문씩 적기: 가게를 누르면 바로 다음 질문으로
    if (stepMode && step === 0) setStep(1)
  }

  function nextMoreSaved() {
    setSaved(null)
    // 같은 가게에서 이어 적는 경우가 많아 가게는 그대로, 가격부터
    setStep(form.shopId ? 1 : 0)
  }

  useEffect(() => {
    if (presetShopId) selectShop(presetShopId)
  }, [presetShopId, selectShop])

  // 지운 가게를 가리키는 초안·마지막 가게는 고른 것을 비움 (없는 가게로 저장되지 않게)
  const { data: chosenShop, isLoading: isCheckingShop } = useLiveQuery(
    () => (form.shopId ? db.shops.get(form.shopId) : null),
    [form.shopId],
  )
  useEffect(() => {
    if (form.shopId && !isCheckingShop && chosenShop === undefined) {
      updateField('shopId', null)
      clearLastShopId()
    }
  }, [form.shopId, isCheckingShop, chosenShop, updateField])

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

  const hasContent = photos.length > 0 || Boolean(form.name.trim() || form.memo.trim() || form.price !== '')

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
  const currentStep = stepMode ? step : steps.findIndex((item) => !item.done)
  const stepReady = step === 0 ? Boolean(form.shopId) : step === 1 ? form.price !== '' : isValid
  // 버튼 아래 안내: 한 질문씩이면 지금 질문에서 빠진 것만
  const hint = !stepMode
    ? missing
    : stepReady
      ? null
      : step === 0
        ? '가게를 골라 주세요'
        : step === 1
          ? '한 개 가격을 적어 주세요'
          : missing

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
            {steps.map((item, index) => (
              <li key={item.label} className="flex-1">
                <button
                  type="button"
                  onClick={() => stepMode && setStep(index)}
                  aria-current={index === currentStep ? 'step' : undefined}
                  className={[
                    'w-full border-b-4 pb-2 text-center text-[16px] font-bold',
                    index === currentStep
                      ? 'border-accent text-accent-dark'
                      : item.done
                        ? 'border-brand text-brand'
                        : 'border-line-soft text-ink-soft',
                  ].join(' ')}
                >
                  {item.done ? `✓ ${item.label}` : item.label}
                </button>
              </li>
            ))}
          </ol>
        )}
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-4 pb-44">
        {error && (
          <div
            className="mb-4 rounded-[10px] bg-red-50 px-4 py-3 text-[16px] font-bold text-red-700"
            role="alert"
          >
            {error}
          </div>
        )}

        {saved ? (
          <section className="space-y-3" aria-live="polite">
            <div className="card px-5 py-6 text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-good-soft text-[34px] font-black text-good">
                ✓
              </div>
              <p className="text-[24px] font-extrabold text-ink">
                {formatCurrency(saved.total)}을 저장했어요
              </p>
              <p className="mt-2 text-[17px] font-bold leading-snug text-ink-muted">
                {[saved.shopName, saved.name && `${saved.name} ${saved.qty}개`].filter(Boolean).join(' · ')}
              </p>
              <p className="mt-1 text-[16px] font-semibold text-ink-soft">
                {formatDateLabel(saved.date)}
                {saved.photoCount ? ` · 사진 ${saved.photoCount}장` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={nextMoreSaved}
              className="btn btn-accent w-full text-[20px]"
              style={{ minHeight: '3.75rem' }}
            >
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
            {stepMode && (
              <h2 className="mb-3 text-[23px] font-extrabold text-brand-dark">{STEP_TITLES[step]}</h2>
            )}
            {(!stepMode || step === 2) && (
              <section className="card mb-5 p-3">
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
            )}

            <RegisterForm
              form={form}
              updateField={updateField}
              selectShop={handleSelectShop}
              onSubmit={stepMode && step < 2 ? () => stepReady && setStep(step + 1) : handleSave}
              autoFocusName={focusName}
              autoFocusPrice={stepMode && step === 1}
              sections={stepMode ? STEP_SECTIONS[step] : undefined}
            />

            <button
              type="button"
              onClick={() => changeMode(stepMode ? 'all' : 'steps')}
              className="mt-5 min-h-[3rem] w-full text-center text-[16px] font-bold text-ink-soft underline underline-offset-4"
            >
              {stepMode ? '한 화면에 다 보면서 적기' : '한 질문씩 넘기며 적기'}
            </button>
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
            {stepMode && step < 2 ? (
              <div className="flex gap-2">
                {step > 0 && (
                  <button
                    type="button"
                    onClick={() => setStep(step - 1)}
                    className="btn btn-outline shrink-0"
                    style={{ minHeight: '3.75rem' }}
                  >
                    ← 이전
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  disabled={!stepReady}
                  className="btn btn-primary flex-1 text-[21px]"
                  style={{ minHeight: '3.75rem' }}
                >
                  다음
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                {stepMode && (
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="btn btn-outline shrink-0"
                    style={{ minHeight: '3.75rem' }}
                  >
                    ← 이전
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={busy || !isValid}
                  className="btn btn-accent min-w-0 flex-1 whitespace-normal py-2 text-[21px] leading-tight"
                  style={{ minHeight: '3.75rem' }}
                >
                  {isSaving ? '저장하는 중…' : isValid ? `${formatCurrency(total)} 저장하기` : '저장하기'}
                </button>
              </div>
            )}
            {hint && (
              <p className="mt-2 text-center text-[17px] font-bold leading-snug text-accent-dark">{hint}</p>
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
