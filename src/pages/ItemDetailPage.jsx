import { useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import CameraInput from '../components/CameraInput'
import ConfirmDialog from '../components/ConfirmDialog'
import EmptyState from '../components/EmptyState'
import PhotoThumbnail from '../components/PhotoThumbnail'
import RegisterForm from '../components/RegisterForm'
import StatusBadge from '../components/StatusBadge'
import { IconCamera, IconClose, IconGallery } from '../components/Icons'
import { db } from '../db'
import { addItemPhotos, deleteItem, deletePhoto, updateItem } from '../db/mutations'
import { useLiveQuery } from '../hooks/useLiveQuery'
import { useObjectUrl } from '../hooks/useObjectUrl'
import { compressImage } from '../utils/compressImage'
import { formatCurrency, formatDateLabel, itemTotal, shopLocation } from '../utils/format'

function itemToForm(item) {
  return {
    shopId: item.shopId,
    name: item.name ?? '',
    category: item.category || '기타',
    price: String(item.price ?? ''),
    qty: String(item.qty ?? 1),
    color: item.color ?? '',
    size: item.size ?? '',
    memo: item.memo ?? '',
    status: item.status || '구매',
    date: item.date,
  }
}

export default function ItemDetailPage() {
  const { itemId } = useParams()
  const id = Number(itemId)
  const navigate = useNavigate()
  const location = useLocation()
  const inputRef = useRef(null)
  const [form, setForm] = useState(null)
  const [selectedPhoto, setSelectedPhoto] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [isAddingPhoto, setIsAddingPhoto] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  const { data: item, isLoading } = useLiveQuery(async () => {
    if (!Number.isFinite(id)) return null
    const row = await db.items.get(id)
    if (!row) return null
    const shop = await db.shops.get(row.shopId)
    const photos = await db.photos.where('itemId').equals(id).toArray()
    return { ...row, shop, photos }
  }, [id])

  const isEditing = form != null
  const photos = item?.photos ?? []
  const currentPhoto = photos[Math.min(selectedPhoto, photos.length - 1)]

  function goBack() {
    // 앱 안에서 들어왔으면 이전 화면으로, 주소로 바로 열었으면 장부로
    if (location.key !== 'default') navigate(-1)
    else navigate('/history', { replace: true })
  }

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function selectShop(shopId) {
    setForm((prev) => ({ ...prev, shopId }))
  }

  const canSave =
    form && form.shopId && form.price !== '' && (form.name.trim() || form.memo.trim())

  async function handleSave() {
    if (!canSave || isSaving) return
    setIsSaving(true)
    setError(null)
    try {
      await updateItem(id, {
        ...form,
        qty: Math.max(1, parseInt(form.qty, 10) || 1),
        name: form.name || form.memo,
      })
      setForm(null)
      setMessage('고친 내용을 저장했어요')
      window.scrollTo(0, 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장하지 못했어요. 다시 눌러 주세요.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    setIsDeleting(true)
    try {
      await deleteItem(id)
      goBack()
    } catch (err) {
      setError(err instanceof Error ? err.message : '지우지 못했어요')
      setIsDeleting(false)
      setShowDelete(false)
    }
  }

  async function handleAddPhoto(file) {
    setIsAddingPhoto(true)
    setError(null)
    try {
      const result = await compressImage(file)
      await addItemPhotos(id, [result.blob])
      setSelectedPhoto(photos.length)
    } catch (err) {
      setError(err instanceof Error ? err.message : '사진을 넣지 못했어요')
    } finally {
      setIsAddingPhoto(false)
    }
  }

  async function handleRemovePhoto(photoId) {
    await deletePhoto(photoId)
    setSelectedPhoto(0)
  }

  if (isLoading) {
    return <Shell onBack={goBack}>불러오는 중…</Shell>
  }

  if (!item) {
    return (
      <Shell onBack={goBack}>
        <EmptyState title="기록을 찾을 수 없어요" description="이미 지웠거나 잘못된 주소예요." />
        <Link
          to="/history"
          className="tap-target mt-4 flex items-center justify-center border-2 border-line text-[17px] font-black text-ink"
        >
          장부로 가기
        </Link>
      </Shell>
    )
  }

  const total = itemTotal(item)

  return (
    <Shell onBack={goBack} title={isEditing ? '기록 고치기' : '기록 자세히'}>
      {message && !isEditing && (
        <div className="mb-4 border-2 border-good bg-good-soft px-4 py-3 text-[17px] font-black text-good" aria-live="polite">
          ✓ {message}
        </div>
      )}
      {error && (
        <div className="mb-4 border-2 border-red-300 bg-red-50 px-4 py-3 text-[16px] font-bold text-red-700" role="alert">
          {error}
        </div>
      )}

      <section className="mb-4 border-2 border-line bg-paper p-3">
        {currentPhoto ? (
          <BigPhoto blob={currentPhoto.blob} alt={item.name} />
        ) : (
          <p className="py-6 text-center text-[16px] font-bold text-ink-muted">사진이 없어요</p>
        )}

        {(photos.length > 1 || isEditing) && (
          <ul className="mt-3 flex gap-3 overflow-x-auto pb-1 pt-2">
            {photos.map((photo, index) => (
              <li key={photo.id} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedPhoto(index)}
                  className={['border-4', currentPhoto?.id === photo.id ? 'border-brand' : 'border-transparent'].join(' ')}
                  aria-label={`사진 ${index + 1} 크게 보기`}
                >
                  <PhotoThumbnail blob={photo.blob} alt={`사진 ${index + 1}`} size="md" />
                </button>
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(photo.id)}
                    className="absolute -right-2 -top-2 flex h-9 w-9 items-center justify-center border-2 border-white bg-red-600 text-white"
                    aria-label={`사진 ${index + 1} 빼기`}
                  >
                    <IconClose className="h-5 w-5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {isEditing && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isAddingPhoto}
              onClick={() => inputRef.current?.openCamera()}
              className="tap-target inline-flex items-center justify-center gap-2 whitespace-nowrap bg-accent text-[17px] font-black text-white disabled:opacity-50"
            >
              <IconCamera className="h-6 w-6" />
              사진 찍기
            </button>
            <button
              type="button"
              disabled={isAddingPhoto}
              onClick={() => inputRef.current?.openGallery()}
              className="tap-target inline-flex items-center justify-center gap-2 whitespace-nowrap border-2 border-brand bg-brand-soft text-[17px] font-black text-brand-dark disabled:opacity-50"
            >
              <IconGallery className="h-6 w-6" />
              사진 고르기
            </button>
          </div>
        )}
        <CameraInput ref={inputRef} onCapture={handleAddPhoto} disabled={isAddingPhoto} multiple />
      </section>

      {isEditing ? (
        <>
          <RegisterForm
            form={form}
            updateField={updateField}
            selectShop={selectShop}
            onSubmit={handleSave}
            isSaving={isSaving}
          />
          <div className="sticky bottom-0 -mx-4 mt-4 space-y-2 border-t-2 border-line bg-paper px-4 py-3 safe-bottom">
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave || isSaving}
              className="tap-target w-full bg-good text-[19px] font-black text-white disabled:opacity-40"
            >
              {isSaving ? '저장하는 중…' : '고친 내용 저장하기'}
            </button>
            <button
              type="button"
              onClick={() => setForm(null)}
              className="tap-target w-full border-2 border-line text-[17px] font-bold text-ink"
            >
              고치지 않고 돌아가기
            </button>
          </div>
        </>
      ) : (
        <>
          <section className="border-2 border-line bg-paper p-4">
            <div className="flex items-start justify-between gap-3">
              <h2 className="min-w-0 break-keep text-[22px] font-black text-ink">{item.name || '이름 없는 물건'}</h2>
              <StatusBadge status={item.status} />
            </div>
            <p className="mt-1 text-[17px] font-bold text-ink-muted">
              {item.shop?.name ?? '가게 정보 없음'}
              {shopLocation(item.shop) ? ` · ${shopLocation(item.shop)}` : ''}
            </p>

            <div className="mt-4 bg-brand-soft px-4 py-3">
              <p className="text-[16px] font-bold text-ink-muted tabular">
                {formatCurrency(item.price)} × {item.qty}개
              </p>
              <p className="text-[28px] font-black text-brand tabular">{formatCurrency(total)}</p>
              {item.status && item.status !== '구매' && (
                <p className="mt-1 text-[15px] font-bold text-warn">아직 안 산 것이라 쓴 돈 합계에는 들어가지 않아요</p>
              )}
            </div>

            <dl className="mt-4 space-y-3">
              <InfoRow label="산 날">{formatDateLabel(item.date)}</InfoRow>
              <InfoRow label="옷 종류">{item.category || '기타'}</InfoRow>
              {item.color && <InfoRow label="색">{item.color}</InfoRow>}
              {item.size && <InfoRow label="크기">{item.size}</InfoRow>}
              {item.memo && <InfoRow label="메모">{item.memo}</InfoRow>}
            </dl>
          </section>

          <div className="mt-4 space-y-3">
            <button
              type="button"
              onClick={() => {
                setMessage(null)
                setForm(itemToForm(item))
              }}
              className="tap-target w-full bg-brand text-[19px] font-black text-white"
            >
              고치기
            </button>
            <button
              type="button"
              onClick={() => setShowDelete(true)}
              className="tap-target w-full border-2 border-red-200 bg-red-50 text-[17px] font-bold text-red-700"
            >
              이 기록 지우기
            </button>
          </div>
        </>
      )}

      {showDelete && (
        <ConfirmDialog
          title="이 기록을 지울까요?"
          description={`${item.name || '이름 없는 물건'} · ${formatCurrency(total)}${
            photos.length ? ` · 사진 ${photos.length}장` : ''
          }\n지우면 되돌릴 수 없어요.`}
          confirmLabel={isDeleting ? '지우는 중…' : '지우기'}
          cancelLabel="그대로 두기"
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
          danger
          disabled={isDeleting}
        />
      )}
    </Shell>
  )
}

function Shell({ title = '기록 자세히', onBack, children }) {
  return (
    <div className="min-h-dvh bg-wash">
      <header className="sticky top-0 z-10 border-b-2 border-line bg-paper px-2 py-2">
        <div className="mx-auto flex max-w-lg items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="tap-target inline-flex items-center px-3 text-[17px] font-bold text-ink-muted"
          >
            ← 뒤로
          </button>
          <h1 className="text-[20px] font-black text-ink">{title}</h1>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 py-4 pb-10">{children}</main>
    </div>
  )
}

function BigPhoto({ blob, alt }) {
  const url = useObjectUrl(blob)
  if (!url) return <div className="skeleton aspect-square w-full" />
  return <img src={url} alt={alt} className="max-h-[60vh] w-full bg-wash object-contain" />
}

function InfoRow({ label, children }) {
  return (
    <div className="flex gap-3">
      <dt className="w-20 shrink-0 text-[16px] font-bold text-ink-muted">{label}</dt>
      <dd className="min-w-0 whitespace-pre-wrap break-keep text-[17px] font-semibold text-ink">{children}</dd>
    </div>
  )
}
