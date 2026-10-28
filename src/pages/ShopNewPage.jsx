import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ShopForm from '../components/ShopForm'
import { createShop } from '../db/mutations'

export default function ShopNewPage() {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(form) {
    setIsSubmitting(true)
    setError(null)
    try {
      const id = await createShop(form)
      navigate(`/shops/${id}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '가게 추가에 실패했습니다')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-dvh bg-paper">
      <header className="sticky top-0 z-10 border-b border-line bg-white px-4 py-4">
        <div className="mx-auto max-w-lg">
          <Link to="/shops" className="tap-target mb-1 inline-flex items-center text-[17px] font-bold text-ink-muted">
            ← 가게 목록
          </Link>
          <h1 className="text-[24px] font-black text-ink">가게 추가</h1>
          <p className="mt-0.5 text-[16px] font-semibold text-ink-muted">가게 이름만 적어도 돼요</p>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6">
        {error && (
          <div className="mb-4 bg-red-50 px-4 py-3 text-[16px] font-bold text-red-700">{error}</div>
        )}

        <div className="border-y border-line py-4">
          <ShopForm
            onSubmit={handleSubmit}
            onCancel={() => navigate('/shops')}
            submitLabel="가게 추가"
            isSubmitting={isSubmitting}
          />
        </div>
      </main>
    </div>
  )
}
