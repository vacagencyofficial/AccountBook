import { useEffect, useRef, useState } from 'react'
import ShopChipSelector from './ShopChipSelector'
import { CATEGORIES, STATUSES } from '../db'

const QTY_PRESETS = ['1', '3', '5', '10']

export default function RegisterForm({
  form,
  updateField,
  selectShop,
  onSubmit,
  isSaving,
  autoFocusName = false,
}) {
  const [showMore, setShowMore] = useState(false)
  const nameRef = useRef(null)
  const priceRef = useRef(null)

  useEffect(() => {
    if (autoFocusName && nameRef.current) {
      nameRef.current.focus()
    }
  }, [autoFocusName])

  function handleSubmit(event) {
    event.preventDefault()
    onSubmit()
  }

  function handleNameKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault()
      priceRef.current?.focus()
    }
  }

  function handlePriceKeyDown(event) {
    if (event.key === 'Enter' && form.shopId && form.price !== '' && (form.name.trim() || form.memo.trim())) {
      event.preventDefault()
      onSubmit()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <section className="rounded-2xl border border-line bg-raised p-3.5">
        <p className="mb-2 text-xs font-semibold text-ink-muted">1. 가게 / 상가</p>
        <ShopChipSelector selectedShopId={form.shopId} onSelect={selectShop} compact />
      </section>

      <section className="rounded-2xl border border-line bg-raised p-3.5 space-y-3">
        <p className="text-xs font-semibold text-ink-muted">2. 품명 · 금액</p>

        <Field label="품명" required>
          <input
            ref={nameRef}
            type="text"
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            onKeyDown={handleNameKeyDown}
            placeholder="예: 오버핏 니트"
            autoComplete="off"
            enterKeyHint="next"
            className={`${inputClass} text-base`}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="단가" required>
            <input
              ref={priceRef}
              type="text"
              inputMode="numeric"
              value={form.price}
              onChange={(e) => updateField('price', e.target.value.replace(/[^\d]/g, ''))}
              onKeyDown={handlePriceKeyDown}
              placeholder="0"
              enterKeyHint="done"
              className={`${inputClass} text-base font-semibold tabular`}
            />
          </Field>
          <Field label="수량">
            <input
              type="text"
              inputMode="numeric"
              value={form.qty}
              onChange={(e) => updateField('qty', e.target.value.replace(/[^\d]/g, ''))}
              placeholder="1"
              enterKeyHint="done"
              className={`${inputClass} tabular`}
            />
          </Field>
        </div>

        <div className="flex gap-2">
          {QTY_PRESETS.map((qty) => (
            <button
              key={qty}
              type="button"
              onClick={() => updateField('qty', qty)}
              className={[
                'flex-1 rounded-xl py-2 text-sm font-medium transition',
                form.qty === qty
                  ? 'bg-brand text-white'
                  : 'bg-paper text-ink-muted ring-1 ring-line',
              ].join(' ')}
            >
              {qty}장
            </button>
          ))}
        </div>

        <Field label="메모">
          <input
            type="text"
            value={form.memo}
            onChange={(e) => updateField('memo', e.target.value)}
            placeholder="나중에 기억하기 쉬운 한 줄"
            autoComplete="off"
            className={inputClass}
          />
        </Field>
      </section>

      <section className="rounded-2xl border border-line bg-raised p-3.5 space-y-3">
        <p className="text-xs font-semibold text-ink-muted">3. 분류</p>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => updateField('category', category)}
              className={[
                'rounded-lg px-3 py-1.5 text-sm font-medium transition',
                form.category === category
                  ? 'bg-ink text-white'
                  : 'bg-paper text-ink-muted ring-1 ring-line',
              ].join(' ')}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          {STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => updateField('status', status)}
              className={[
                'flex-1 rounded-xl py-2 text-sm font-medium transition',
                form.status === status
                  ? status === '구매'
                    ? 'bg-brand text-white'
                    : status === '검토'
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-500 text-white'
                  : 'bg-paper text-ink-muted ring-1 ring-line',
              ].join(' ')}
            >
              {status}
            </button>
          ))}
        </div>
      </section>

      <button
        type="button"
        onClick={() => setShowMore((v) => !v)}
        className="text-sm font-medium text-ink-muted"
      >
        {showMore ? '추가 항목 접기' : '색상·사이즈 더 보기'}
      </button>

      {showMore && (
        <div className="grid grid-cols-2 gap-3 rounded-2xl border border-line bg-raised p-3.5">
          <Field label="색상">
            <input
              type="text"
              value={form.color}
              onChange={(e) => updateField('color', e.target.value)}
              placeholder="블랙"
              className={inputClass}
            />
          </Field>
          <Field label="사이즈">
            <input
              type="text"
              value={form.size}
              onChange={(e) => updateField('size', e.target.value)}
              placeholder="FREE"
              className={inputClass}
            />
          </Field>
        </div>
      )}

      <p className="text-center text-[11px] text-ink-muted">
        {isSaving ? '저장 중…' : '가게 → 품명·금액 → 저장 (연속 입력 시 가게 유지)'}
      </p>
    </form>
  )
}

function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ink-muted">
        {label}
        {required && <span className="ml-0.5 text-accent">*</span>}
      </span>
      {children}
    </label>
  )
}

const inputClass =
  'w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink-muted/50 focus:border-brand focus:bg-raised focus:ring-2 focus:ring-brand/15'
