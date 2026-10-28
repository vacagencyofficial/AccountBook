import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ShopForm from '../components/ShopForm'
import SubPage from '../components/SubPage'
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
    <SubPage title="가게 추가" subtitle="가게 이름만 적어도 돼요" backTo="/shops" backLabel="가게 목록">
      {error && (
        <div className="mb-4 rounded-[10px] bg-red-50 px-4 py-3 text-[16px] font-bold text-red-700">{error}</div>
      )}
      <div className="card p-4">
        <ShopForm
          onSubmit={handleSubmit}
          onCancel={() => navigate('/shops')}
          submitLabel="가게 추가"
          isSubmitting={isSubmitting}
        />
      </div>
    </SubPage>
  )
}
