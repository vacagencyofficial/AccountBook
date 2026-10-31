import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import ShopChipSelector from '../components/ShopChipSelector'
import CameraInput from '../components/CameraInput'
import PhotoThumbnail from '../components/PhotoThumbnail'
import { IconCamera, IconClose, IconGallery } from '../components/Icons'
import { CATEGORIES, db } from '../db'
import { saveItemWithPhotos } from '../db/mutations'
import { useLiveQuery } from '../hooks/useLiveQuery'
import { compressImage } from '../utils/compressImage'
import { getLastShopId, setLastShopId } from '../utils/lastShop'
import { formatCurrency, formatDateLabel, getToday } from '../utils/format'

const DRAFT_KEY = 'sailp-batch-draft'
const PAYMENTS = ['현금', '카드', '계좌이체', '외상']
const MAX_PRICE = 99_999_999

let rowSeq = 0
function newRow() {
  rowSeq += 1
  return { key: `${Date.now()}-${rowSeq}`, name: '', price: '', qty: '1', category: '기타' }
}

function yesterday() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 줄마다 고른 사진 { 줄 key: [{ id, blob }] }.
// 사진은 너무 커서 초안(sessionStorage)에 못 넣으므로, 앱을 켜 둔 동안만 여기에 둠
let photoStore = {}

const rowTotal = (row) => (Number(row.price) || 0) * (Number(row.qty) || 0)
const isEmptyRow = (row, photos = {}) => !row.name.trim() && !row.price && !photos[row.key]?.length
// 이름과 가격이 다 있어야 저장 (개수는 1 이상)
const isReadyRow = (row) => row.name.trim() && Number(row.price) > 0 && Number(row.qty) > 0

function loadDraft(presetShopId) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(DRAFT_KEY))
    if (saved?.rows?.length) {
      return { ...saved, shopId: presetShopId ?? saved.shopId, date: saved.date || getToday() }
    }
  } catch {
    // 저장된 초안이 없거나 깨졌으면 새로
  }
  return {
    shopId: presetShopId ?? getLastShopId() ?? null,
    date: getToday(),
    payment: '',
    rows: [newRow(), newRow(), newRow()],
  }
}

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`chip ${active ? 'chip-on' : ''}`}
    >
      {children}
    </button>
  )
}

/** 여러 상품 한 번에 적기: 가게·날짜·결제는 한 번, 상품은 줄마다 이름·가격·개수·종류 */
export default function BatchCapturePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [draft, setDraft] = useState(() => loadDraft(location.state?.shopId))
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [showErrors, setShowErrors] = useState(false)
  const [saved, setSaved] = useState(null)
  const [showLeave, setShowLeave] = useState(false)
  const [photos, setPhotosState] = useState(() => photoStore)
  const [compressing, setCompressing] = useState(null)
  const [photoError, setPhotoError] = useState(null)
  const cameraRef = useRef(null)
  const targetRowRef = useRef(null)

  function setPhotos(updater) {
    setPhotosState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      photoStore = next
      return next
    })
  }

  function openPhoto(rowKey, how) {
    targetRowRef.current = rowKey
    setPhotoError(null)
    if (how === 'camera') cameraRef.current?.openCamera()
    else cameraRef.current?.openGallery()
  }

  async function handleCapture(file) {
    const rowKey = targetRowRef.current
    if (!rowKey) return
    setCompressing(rowKey)
    try {
      const { blob } = await compressImage(file)
      setPhotos((prev) => ({
        ...prev,
        [rowKey]: [...(prev[rowKey] ?? []), { id: crypto.randomUUID(), blob }],
      }))
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : '사진을 넣지 못했어요')
    } finally {
      setCompressing(null)
    }
  }

  const removePhoto = (rowKey, id) =>
    setPhotos((prev) => ({ ...prev, [rowKey]: (prev[rowKey] ?? []).filter((photo) => photo.id !== id) }))
  const today = getToday()

  useEffect(() => {
    if (!saved) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  }, [draft, saved])

  // 지운 가게를 가리키면 고른 것을 비움
  const { data: shop, isLoading: isCheckingShop } = useLiveQuery(
    () => (draft.shopId ? db.shops.get(draft.shopId) : null),
    [draft.shopId],
  )
  const shopMissing = draft.shopId && !isCheckingShop && !shop

  const update = (key, value) => setDraft((prev) => ({ ...prev, [key]: value }))
  const updateRow = (key, field, value) =>
    setDraft((prev) => ({
      ...prev,
      rows: prev.rows.map((row) => (row.key === key ? { ...row, [field]: value } : row)),
    }))
  const addRow = () => setDraft((prev) => ({ ...prev, rows: [...prev.rows, newRow()] }))
  const removeRow = (key) => {
    setPhotos((prev) => {
      const { [key]: _removed, ...rest } = prev
      return rest
    })
    setDraft((prev) => {
      const rows = prev.rows.filter((row) => row.key !== key)
      return { ...prev, rows: rows.length ? rows : [newRow()] }
    })
  }

  const filled = draft.rows.filter((row) => !isEmptyRow(row, photos))
  const ready = filled.filter(isReadyRow)
  const unfinished = filled.length - ready.length
  const total = ready.reduce((sum, row) => sum + rowTotal(row), 0)
  const qtySum = ready.reduce((sum, row) => sum + (Number(row.qty) || 0), 0)
  const hasShop = Boolean(draft.shopId) && !shopMissing
  const canSave = hasShop && ready.length > 0 && unfinished === 0 && !isSaving && !compressing
  const otherDate = draft.date !== today && draft.date !== yesterday()

  const hint = !hasShop
    ? '가게를 골라 주세요'
    : filled.length === 0
      ? '상품 이름과 한 개 가격을 적어 주세요'
      : unfinished > 0
        ? `이름이나 가격이 빠진 줄이 ${unfinished}개 있어요`
        : null

  async function handleSave() {
    if (!canSave) {
      setShowErrors(true)
      return
    }
    setIsSaving(true)
    setSaveError(null)
    try {
      for (const row of ready) {
        await saveItemWithPhotos({
          shopId: draft.shopId,
          date: draft.date,
          name: row.name,
          category: row.category,
          price: row.price,
          qty: row.qty,
          status: '구매',
          payment: draft.payment,
          photoBlobs: (photos[row.key] ?? []).map((photo) => photo.blob),
        })
      }
      setLastShopId(draft.shopId)
      sessionStorage.removeItem(DRAFT_KEY)
      const photoCount = ready.reduce((sum, row) => sum + (photos[row.key]?.length ?? 0), 0)
      setPhotos({})
      setSaved({
        count: ready.length,
        qty: qtySum,
        total,
        photoCount,
        shopName: shop?.name ?? '',
        date: draft.date,
      })
      window.scrollTo(0, 0)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '저장하지 못했어요. 다시 눌러 주세요.')
    } finally {
      setIsSaving(false)
    }
  }

  function startAgain() {
    setDraft((prev) => ({ ...prev, rows: [newRow(), newRow(), newRow()] }))
    setSaved(null)
    setShowErrors(false)
  }

  function handleClose() {
    if (!saved && filled.length > 0) setShowLeave(true)
    else leave()
  }

  function leave(discard = false) {
    if (discard || saved) {
      sessionStorage.removeItem(DRAFT_KEY)
      setPhotos({})
    }
    if (location.key !== 'default') navigate(-1)
    else navigate('/', { replace: true })
  }

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
          <h1 className="text-[21px] font-extrabold">여러 개 한 번에 적기</h1>
          <span className="w-[5.5rem]" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-4 pb-48">
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
                {[saved.shopName, `상품 ${saved.count}가지 · ${saved.qty}개`].filter(Boolean).join(' · ')}
              </p>
              <p className="mt-1 text-[16px] font-semibold text-ink-soft">
                {formatDateLabel(saved.date)}
                {saved.photoCount ? ` · 사진 ${saved.photoCount}장` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={startAgain}
              className="btn btn-accent w-full text-[20px]"
              style={{ minHeight: '3.75rem' }}
            >
              이 가게에서 더 적기
            </button>
            <button type="button" onClick={() => navigate('/history')} className="btn btn-outline w-full">
              장부 보기
            </button>
            <button type="button" onClick={() => navigate('/')} className="btn w-full text-ink-muted">
              홈으로
            </button>
          </section>
        ) : (
          <div className="space-y-5">
            <section>
              <ShopChipSelector
                selectedShopId={shopMissing ? null : draft.shopId}
                onSelect={(shopId) => update('shopId', shopId)}
              />
              {showErrors && !hasShop && (
                <p className="mt-2 text-[16px] font-bold text-red-700">가게를 골라 주세요</p>
              )}
            </section>

            <section>
              <p className="label">언제 샀나요?</p>
              <div className="grid grid-cols-3 gap-2">
                <Chip active={draft.date === today} onClick={() => update('date', today)}>
                  오늘
                </Chip>
                <Chip active={draft.date === yesterday()} onClick={() => update('date', yesterday())}>
                  어제
                </Chip>
                <label className={`chip relative ${otherDate ? 'chip-on' : ''}`}>
                  {otherDate ? formatDateLabel(draft.date) : '날짜 고르기'}
                  <input
                    type="date"
                    value={draft.date}
                    max={today}
                    onChange={(e) => e.target.value && update('date', e.target.value)}
                    className="absolute inset-0 opacity-0"
                    aria-label="산 날짜 고르기"
                  />
                </label>
              </div>
            </section>

            <section>
              <p className="label">
                어떻게 냈나요? <span className="font-semibold text-ink-soft">(없어도 돼요)</span>
              </p>
              <div className="grid grid-cols-4 gap-2">
                {PAYMENTS.map((payment) => (
                  <Chip
                    key={payment}
                    active={draft.payment === payment}
                    onClick={() => update('payment', draft.payment === payment ? '' : payment)}
                  >
                    {payment === '계좌이체' ? '이체' : payment}
                  </Chip>
                ))}
              </div>
            </section>

            <section>
              <div className="mb-2 flex items-baseline justify-between px-0.5">
                <p className="label mb-0">무엇을 샀어요?</p>
                <p className="text-[16px] font-semibold text-ink-soft">한 줄에 상품 하나</p>
              </div>
              <ol className="space-y-3">
                {draft.rows.map((row, index) => {
                  const empty = isEmptyRow(row, photos)
                  const rowPhotos = photos[row.key] ?? []
                  const busy = compressing === row.key
                  const missingName = showErrors && !empty && !row.name.trim()
                  const missingPrice = showErrors && !empty && !(Number(row.price) > 0)
                  return (
                    <li key={row.key} className="card p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <b className="text-[17px] font-extrabold text-brand">{index + 1}번 상품</b>
                        <div className="flex items-center gap-1">
                          {rowTotal(row) > 0 && (
                            <span className="text-[17px] font-extrabold text-ink tabular">
                              {formatCurrency(rowTotal(row))}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => removeRow(row.key)}
                            className="flex h-11 w-11 items-center justify-center rounded-[10px] text-ink-soft"
                            aria-label={`${index + 1}번 상품 빼기`}
                          >
                            <IconClose className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) => updateRow(row.key, 'name', e.target.value)}
                        placeholder="옷 이름 (예: 니트)"
                        autoComplete="off"
                        className={`field ${missingName ? 'ring-2 ring-red-600' : ''}`}
                        aria-label={`${index + 1}번 상품 이름`}
                      />
                      <div className="mt-2 flex gap-2">
                        <div
                          className={`field flex min-w-0 flex-1 items-center gap-1 ${missingPrice ? 'ring-2 ring-red-600' : ''}`}
                        >
                          <input
                            inputMode="numeric"
                            value={row.price ? Number(row.price).toLocaleString('ko-KR') : ''}
                            onChange={(e) =>
                              updateRow(
                                row.key,
                                'price',
                                String(
                                  Math.min(MAX_PRICE, Number(e.target.value.replace(/\D/g, '')) || 0) || '',
                                ),
                              )
                            }
                            placeholder="한 개 가격"
                            className="min-w-0 flex-1 bg-transparent text-right text-[19px] font-bold outline-none tabular"
                            aria-label={`${index + 1}번 상품 한 개 가격`}
                          />
                          <span className="shrink-0 text-[17px] font-bold text-ink-muted">원</span>
                        </div>
                        <div className="flex shrink-0 items-center rounded-[12px] border-2 border-line bg-paper">
                          <button
                            type="button"
                            onClick={() =>
                              updateRow(row.key, 'qty', String(Math.max(1, (Number(row.qty) || 1) - 1)))
                            }
                            className="h-12 w-10 text-[24px] font-bold text-ink-muted"
                            aria-label={`${index + 1}번 상품 하나 빼기`}
                          >
                            −
                          </button>
                          <span
                            className="min-w-[2.6rem] text-center text-[18px] font-extrabold tabular"
                            aria-label={`${row.qty}개`}
                          >
                            {row.qty}개
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateRow(row.key, 'qty', String(Math.min(999, (Number(row.qty) || 0) + 1)))
                            }
                            className="h-12 w-10 text-[24px] font-bold text-ink-muted"
                            aria-label={`${index + 1}번 상품 하나 더하기`}
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label="옷 종류">
                        {CATEGORIES.map((category) => (
                          <button
                            key={category}
                            type="button"
                            role="radio"
                            aria-checked={row.category === category}
                            onClick={() => updateRow(row.key, 'category', category)}
                            className={`min-h-[2.5rem] rounded-[9px] px-3 text-[16px] font-bold ${
                              row.category === category ? 'bg-brand text-white' : 'bg-wash text-ink-soft'
                            }`}
                          >
                            {category}
                          </button>
                        ))}
                      </div>
                      {rowPhotos.length > 0 && (
                        <ul
                          className="mt-3 flex gap-3 overflow-x-auto pb-1 pt-2"
                          aria-label={`${index + 1}번 상품 사진`}
                        >
                          {rowPhotos.map((photo, photoIndex) => (
                            <li key={photo.id} className="relative shrink-0">
                              <PhotoThumbnail
                                blob={photo.blob}
                                alt={`${index + 1}번 상품 사진 ${photoIndex + 1}`}
                              />
                              <button
                                type="button"
                                onClick={() => removePhoto(row.key, photo.id)}
                                className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-red-600 text-white"
                                aria-label={`${index + 1}번 상품 사진 ${photoIndex + 1} 빼기`}
                              >
                                <IconClose className="h-4 w-4" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={Boolean(compressing)}
                          onClick={() => openPhoto(row.key, 'camera')}
                          className="btn btn-soft min-h-[2.9rem] text-[16px]"
                          aria-label={`${index + 1}번 상품 사진 찍기`}
                        >
                          <IconCamera className="h-5 w-5" />
                          {busy ? '넣는 중…' : '사진 찍기'}
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(compressing)}
                          onClick={() => openPhoto(row.key, 'gallery')}
                          className="btn btn-soft min-h-[2.9rem] text-[16px]"
                          aria-label={`${index + 1}번 상품 사진 고르기`}
                        >
                          <IconGallery className="h-5 w-5" />
                          사진 고르기
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ol>
              <button type="button" onClick={addRow} className="btn btn-soft mt-3 w-full">
                + 상품 한 줄 더하기
              </button>
              <p className="mt-2 text-[16px] font-semibold leading-snug text-ink-soft">
                사진은 줄마다 넣을 수 있어요(없어도 돼요). 색·크기·판매가는 저장한 뒤 장부에서 그 상품을 눌러
                더 적을 수 있어요. 빈 줄은 저장하지 않아요.
              </p>
            </section>
          </div>
        )}
        <CameraInput ref={cameraRef} onCapture={handleCapture} disabled={Boolean(compressing)} multiple />
      </main>

      {!saved && (
        <div className="fixed inset-x-0 bottom-0 z-20 bg-paper px-4 pt-3 shadow-[0_-4px_18px_rgb(15_23_42/0.08)] safe-bottom">
          <div className="mx-auto max-w-lg">
            {photoError && (
              <p className="mb-2 text-center text-[16px] font-bold text-red-700" role="alert">
                {photoError}
              </p>
            )}
            {saveError && (
              <p className="mb-2 text-center text-[16px] font-bold text-red-700" role="alert">
                {saveError}
              </p>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="btn btn-accent w-full whitespace-normal py-2 text-[20px] leading-tight"
              style={{ minHeight: '3.75rem' }}
            >
              {isSaving
                ? '저장하는 중…'
                : compressing
                  ? '사진 넣는 중…'
                  : ready.length
                    ? `${ready.length}가지 · ${formatCurrency(total)} 저장하기`
                    : '저장하기'}
            </button>
            {hint && (
              <p className="mt-2 text-center text-[17px] font-bold leading-snug text-ink-soft">{hint}</p>
            )}
          </div>
        </div>
      )}

      {showLeave && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="card w-full max-w-sm p-5" role="dialog" aria-modal="true">
            <h3 className="text-[20px] font-extrabold text-ink">적던 내용이 있어요</h3>
            <p className="mt-2 text-[17px] font-medium leading-relaxed text-ink-muted">
              남겨 두면 다음에 「여러 개 한 번에 적기」를 누를 때 그대로 이어서 쓸 수 있어요. (넣은 사진은
              앱을 완전히 닫으면 사라져요)
            </p>
            <div className="mt-5 space-y-2">
              <button type="button" onClick={() => setShowLeave(false)} className="btn btn-primary w-full">
                계속 적기
              </button>
              <button type="button" onClick={() => leave()} className="btn btn-outline w-full">
                남겨 두고 나가기
              </button>
              <button type="button" onClick={() => leave(true)} className="btn btn-text-danger w-full">
                지우고 나가기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
