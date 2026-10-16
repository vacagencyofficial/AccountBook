import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import ItemRow from '../components/ItemRow'
import ShopForm, { shopToForm } from '../components/ShopForm'
import { db } from '../db'
import { deleteShop, updateShop } from '../db/mutations'
import { getItemsByShop } from '../db/queries'
import { useLiveQuery } from '../hooks/useLiveQuery'
import { formatCurrency, itemTotal, shopLocation } from '../utils/format'

export default function ShopDetailPage() {
  const { shopId } = useParams()
  const navigate = useNavigate()
  const id = Number(shopId)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState(null)

  const { data: shop, isLoading: shopLoading } = useLiveQuery(
    () => (Number.isFinite(id) ? db.shops.get(id) : undefined),
    [id],
  )

  const { data: items, isLoading: itemsLoading } = useLiveQuery(
    () => (Number.isFinite(id) ? getItemsByShop(id) : []),
    [id],
  )

  const totalAmount = useMemo(() => {
    if (!items) return 0
    return items.reduce((sum, item) => sum + itemTotal(item), 0)
  }, [items])

  async function handleUpdate(form) {
    setIsSaving(true)
    setError(null)
    try {
      await updateShop(id, form)
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : '수정에 실패했습니다')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    setIsDeleting(true)
    setError(null)
    try {
      await deleteShop(id)
      navigate('/shops', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제에 실패했습니다')
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  if (shopLoading) {
    return <PageShell title="가게 상세">불러오는 중…</PageShell>
  }

  if (!shop) {
    return (
      <PageShell title="가게 상세">
        <EmptyState title="가게를 찾을 수 없습니다" description="삭제되었거나 잘못된 주소입니다" />
        <Link to="/shops" className="mt-4 block text-center text-[13px] font-medium text-ink">
          가게 목록으로
        </Link>
      </PageShell>
    )
  }

  return (
    <PageShell
      title={shop.name}
      subtitle={[shop.building, shopLocation(shop)].filter(Boolean).join(' · ')}
      backTo="/shops"
    >
      {error && (
        <div className="mb-4 bg-red-50 px-4 py-3 text-[13px] text-red-600">{error}</div>
      )}

      <section className="mb-6 border-y border-line">
        <div className="flex items-center justify-between border-b border-line py-3">
          <h2 className="text-[14px] font-bold text-ink">가게 정보</h2>
          {!isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="text-[13px] font-medium text-ink"
            >
              수정
            </button>
          )}
        </div>

        <div className="py-4">
          {isEditing ? (
            <ShopForm
              initial={shopToForm(shop)}
              onSubmit={handleUpdate}
              onCancel={() => setIsEditing(false)}
              isSubmitting={isSaving}
            />
          ) : (
            <dl className="space-y-3 text-sm">
              <InfoRow label="상가">{shop.building || '—'}</InfoRow>
              <InfoRow label="위치">{shopLocation(shop) || '—'}</InfoRow>
              <InfoRow label="연락처">{shop.phone || '—'}</InfoRow>
              <InfoRow label="메모">{shop.memo || '—'}</InfoRow>
            </dl>
          )}
        </div>
      </section>

      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[14px] font-bold text-ink">사입 기록</h2>
          <div className="text-right text-[12px] text-ink-muted">
            <span>{items?.length ?? 0}건</span>
            <span className="mx-1">·</span>
            <span className="font-semibold text-ink">{formatCurrency(totalAmount)}</span>
          </div>
        </div>

        {itemsLoading ? (
          <div className="skeleton h-24" />
        ) : items.length === 0 ? (
          <EmptyState
            title="기록이 없습니다"
            description="빠른 등록에서 이 가게로 사입 기록을 추가하세요"
          />
        ) : (
          <ul className="divide-y divide-line border-t border-line">
            {items.map((item) => (
              <ItemRow key={item.id} item={{ ...item, shop }} showDate />
            ))}
          </ul>
        )}
      </section>

      {!isEditing && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full border border-red-200 bg-red-50 py-3 text-[13px] font-medium text-red-600"
          >
            가게 삭제
          </button>
          {items.length > 0 && (
            <p className="text-center text-[12px] text-ink-muted">
              삭제 시 이 가게의 사입 기록 {items.length}건도 함께 삭제됩니다
            </p>
          )}
        </div>
      )}

      {showDeleteConfirm && (
        <ConfirmDialog
          title="가게를 삭제할까요?"
          description={
            items.length > 0
              ? `"${shop.name}"와 사입 기록 ${items.length}건이 모두 삭제됩니다.`
              : `"${shop.name}"를 삭제합니다.`
          }
          confirmLabel={isDeleting ? '삭제 중…' : '삭제'}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          danger
          disabled={isDeleting}
        />
      )}
    </PageShell>
  )
}

function PageShell({ title, subtitle, backTo = '/shops', children }) {
  return (
    <div className="min-h-dvh bg-paper">
      <header className="sticky top-0 z-10 border-b border-line bg-paper px-4 py-4">
        <div className="mx-auto max-w-lg">
          <Link to={backTo} className="mb-2 inline-flex items-center text-[13px] text-ink-muted">
            ← 가게 목록
          </Link>
          <h1 className="text-[20px] font-bold text-ink">{title}</h1>
          {subtitle && <p className="mt-0.5 text-[13px] text-ink-muted">{subtitle}</p>}
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 py-6">{children}</main>
    </div>
  )
}

function InfoRow({ label, children }) {
  return (
    <div>
      <dt className="text-[12px] text-ink-muted">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-wrap text-[13px] text-ink">{children}</dd>
    </div>
  )
}

function ConfirmDialog({ title, description, confirmLabel, onConfirm, onCancel, danger, disabled }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-sm border border-line bg-paper p-5">
        <h3 className="text-[16px] font-bold text-ink">{title}</h3>
        <p className="mt-2 text-[13px] text-ink-muted">{description}</p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={disabled}
            className="flex-1 border border-line py-2.5 text-[13px] font-medium text-ink-muted"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={disabled}
            className={`flex-1 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50 ${
              danger ? 'bg-red-600' : 'bg-ink'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
