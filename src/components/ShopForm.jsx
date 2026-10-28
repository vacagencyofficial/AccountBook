import { useState } from 'react'

const emptyShop = {
  name: '',
  building: '',
  floor: '',
  unit: '',
  phone: '',
  memo: '',
}

export default function ShopForm({ initial, onSubmit, onCancel, submitLabel = '저장', isSubmitting = false }) {
  const [form, setForm] = useState(() => initial ?? emptyShop)

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (!form.name.trim()) return
    onSubmit(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="가게 이름" required>
        <input
          type="text"
          value={form.name}
          onChange={(e) => updateField('name', e.target.value)}
          placeholder="예: 미소옷장"
          className={inputClass}
          autoFocus
        />
      </Field>

      <Field label="상가 이름">
        <input
          type="text"
          value={form.building}
          onChange={(e) => updateField('building', e.target.value)}
          placeholder="예: 청평화, APM, 디오트"
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="층">
          <input
            type="text"
            value={form.floor}
            onChange={(e) => updateField('floor', e.target.value)}
            placeholder="예: 3F"
            className={inputClass}
          />
        </Field>
        <Field label="호수">
          <input
            type="text"
            value={form.unit}
            onChange={(e) => updateField('unit', e.target.value)}
            placeholder="예: A-123"
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="연락처">
        <input
          type="tel"
          value={form.phone}
          onChange={(e) => updateField('phone', e.target.value)}
          placeholder="010-0000-0000"
          className={inputClass}
        />
      </Field>

      <Field label="메모">
        <textarea
          value={form.memo}
          onChange={(e) => updateField('memo', e.target.value)}
          placeholder="예: 최소 3장부터, 현금 선결제"
          rows={3}
          className={`${inputClass} resize-none`}
        />
      </Field>

      <div className="flex gap-2 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-outline flex-1"
          >
            취소
          </button>
        )}
        <button
          type="submit"
          disabled={!form.name.trim() || isSubmitting}
          className="btn btn-primary flex-1"
        >
          {isSubmitting ? '저장 중…' : submitLabel}
        </button>
      </div>
    </form>
  )
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="label">
        {label}
        {required && <span className="ml-1.5 text-[16px] font-bold text-accent-dark">꼭 적기</span>}
      </label>
      {children}
    </div>
  )
}

const inputClass =
  'field'

export function shopToForm(shop) {
  if (!shop) return { ...emptyShop }
  return {
    name: shop.name ?? '',
    building: shop.building ?? '',
    floor: shop.floor ?? '',
    unit: shop.unit ?? '',
    phone: shop.phone ?? '',
    memo: shop.memo ?? '',
  }
}
