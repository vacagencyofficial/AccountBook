import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { IconCamera } from '../components/Icons'
import ConfirmDialog from '../components/ConfirmDialog'
import EmptyState from '../components/EmptyState'
import SubPage from '../components/SubPage'
import ItemRow from '../components/ItemRow'
import ShopForm, { shopToForm } from '../components/ShopForm'
import { db } from '../db'
import { deleteShop, setShopHidden, updateShop } from '../db/mutations'
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
    return <PageShell title="가게">불러오는 중…</PageShell>
  }

  if (!shop) {
    return (
      <PageShell title="가게">
        <EmptyState title="가게를 찾을 수 없어요" description="이미 지웠거나 잘못된 주소예요." />
        <Link to="/shops" className="btn btn-outline mt-4 w-full">
          가게 목록으로
        </Link>
      </PageShell>
    )
  }

  return (
    <PageShell title={shop.name} subtitle={shopLocation(shop) || undefined}>
      {error && (
        <div className="mb-4 rounded-[10px] bg-red-50 px-4 py-3 text-[16px] font-bold text-red-700">{error}</div>
      )}

      {Boolean(shop.hidden) && (
        <div className="card mb-4 bg-warn-soft px-4 py-3">
          <p className="text-[18px] font-extrabold text-warn">숨긴 가게예요</p>
          <p className="mt-1 text-[16px] font-semibold text-ink-muted">가게 목록과 고르기에서 보이지 않아요. 기록은 그대로예요.</p>
          <button type="button" onClick={() => setShopHidden(id, false)} className="btn btn-outline mt-3 w-full">
            다시 보이게 하기
          </button>
        </div>
      )}

      {!isEditing && (
        <div className="mb-6 grid grid-cols-1 gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/capture', { state: { shopId: id } })}
            className="btn btn-accent text-[19px]"
            style={{ minHeight: '3.5rem' }}
          >
            <IconCamera className="h-6 w-6" />
            이 가게 물건 적기
          </button>
          {shop.phone && (
            <a href={`tel:${shop.phone.replace(/[^\d+]/g, '')}`} className="btn bg-good-soft text-good">
              📞 전화 걸기 ({shop.phone})
            </a>
          )}
        </div>
      )}

      <section className="card mb-6 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[19px] font-extrabold text-ink">가게 정보</h2>
          {!isEditing && (
            <button type="button" onClick={() => setIsEditing(true)} className="btn btn-soft text-[17px]">
              고치기
            </button>
          )}
        </div>

        {isEditing ? (
          <ShopForm
            initial={shopToForm(shop)}
            onSubmit={handleUpdate}
            onCancel={() => setIsEditing(false)}
            isSubmitting={isSaving}
          />
        ) : (
          <dl className="space-y-3">
            <InfoRow label="위치">{shopLocation(shop) || '—'}</InfoRow>
            <InfoRow label="연락처">{shop.phone || '—'}</InfoRow>
            <InfoRow label="메모">{shop.memo || '—'}</InfoRow>
          </dl>
        )}
      </section>

      <section className="mb-6">
        <div className="mb-3 flex items-baseline justify-between px-0.5">
          <h2 className="text-[20px] font-extrabold text-ink">이 가게 기록 {items?.length ?? 0}건</h2>
          <b className="text-[18px] font-extrabold text-brand tabular">{formatCurrency(totalAmount)}</b>
        </div>

        {itemsLoading ? (
          <div className="skeleton h-24" />
        ) : (items?.length ?? 0) === 0 ? (
          <EmptyState title="아직 기록이 없어요" description="위 「이 가게 물건 적기」로 적어 보세요." />
        ) : (
          <ul className="space-y-2.5">
            {items.map((item) => (
              <ItemRow key={item.id} item={{ ...item, shop }} showDate />
            ))}
          </ul>
        )}
      </section>

      {!isEditing && (
        <div className="space-y-3">
          {!shop.hidden && (
            <>
              <button
                type="button"
                onClick={() => {
                  setShopHidden(id, true)
                  navigate('/shops', { replace: true })
                }}
                className="btn btn-outline w-full"
              >
                가게 숨기기
              </button>
              <p className="text-center text-[16px] font-semibold text-ink-soft">
                더 안 가는 가게는 숨겨 두세요. 기록은 장부에 남아요.
              </p>
            </>
          )}
          <button type="button" onClick={() => setShowDeleteConfirm(true)} className="btn btn-text-danger w-full">
            가게와 기록 모두 지우기
          </button>
        </div>
      )}

      {showDeleteConfirm && (
        <ConfirmDialog
          title="가게와 기록을 모두 지울까요?"
          description={
            (items?.length ?? 0) > 0
              ? `"${shop.name}"와 사입 기록 ${items.length}건(${formatCurrency(totalAmount)})이 모두 지워져요.\n되돌릴 수 없어요. 기록을 남기려면 「가게 숨기기」를 쓰세요.`
              : `"${shop.name}"를 지워요.`
          }
          cancelLabel="그대로 두기"
          confirmLabel={isDeleting ? '지우는 중…' : '모두 지우기'}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          danger
          disabled={isDeleting}
        />
      )}
    </PageShell>
  )
}

function PageShell({ title, subtitle, children }) {
  return (
    <SubPage title={title} subtitle={subtitle} backTo="/shops" backLabel="가게 목록">
      {children}
    </SubPage>
  )
}

function InfoRow({ label, children }) {
  return (
    <div className="flex gap-3">
      <dt className="w-16 shrink-0 text-[16px] font-bold text-ink-soft">{label}</dt>
      <dd className="min-w-0 whitespace-pre-wrap text-[17px] font-semibold text-ink">{children}</dd>
    </div>
  )
}
