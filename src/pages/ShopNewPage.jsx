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
    <div className="min-h-dvh bg-surface">
      <header className="sticky top-0 z-10 border-b border-border bg-white px-4 py-4">
        <div className="mx-auto max-w-lg">
          <Link to="/shops" className="mb-2 inline-flex items-center text-sm text-slate-500">
            ← 가게 목록
          </Link>
          <h1 className="text-xl font-bold text-slate-900">가게 추가</h1>
          <p className="mt-0.5 text-sm text-slate-500">상가·층·호수·메모를 미리 등록해 두세요</p>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6">
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        <div className="rounded-2xl border border-border bg-white p-4">
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
