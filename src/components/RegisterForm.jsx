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
    if (
      event.key === 'Enter' &&
      form.shopId &&
      form.price !== '' &&
      (form.name.trim() || form.memo.trim())
    ) {
      event.preventDefault()
      onSubmit()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <section className="rounded-2xl border-2 border-good/30 bg-paper p-4">
        <p className="mb-2 text-[15px] font-black text-good">1. 가게 고르기</p>
        <ShopChipSelector selectedShopId={form.shopId} onSelect={selectShop} compact />
      </section>

      <section className="space-y-3 rounded-2xl border-2 border-brand/30 bg-paper p-4">
        <p className="text-[15px] font-black text-brand">2. 품명 · 금액</p>

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
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="단가(원)" required>
            <input
              ref={priceRef}
              type="text"
              inputMode="numeric"
              value={form.price}
              onChange={(e) => updateField('price', e.target.value.replace(/[^\d]/g, ''))}
              onKeyDown={handlePriceKeyDown}
              placeholder="0"
              enterKeyHint="done"
              className={`${inputClass} text-[20px] font-black tabular`}
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
              className={`${inputClass} text-[20px] font-black tabular`}
            />
          </Field>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {QTY_PRESETS.map((qty) => (
            <button
              key={qty}
              type="button"
              onClick={() => updateField('qty', qty)}
              className={[
                'tap-target rounded-xl border-2 text-[15px] font-bold',
                form.qty === qty
                  ? 'border-brand bg-brand text-white'
                  : 'border-line bg-wash text-ink',
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
            placeholder="기억할 내용"
            autoComplete="off"
            className={inputClass}
          />
        </Field>
      </section>

      <section className="space-y-3 rounded-2xl border-2 border-ledger/30 bg-paper p-4">
        <p className="text-[15px] font-black text-ledger">3. 분류</p>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => updateField('category', category)}
              className={[
                'rounded-xl border-2 px-3 py-2 text-[15px] font-bold',
                form.category === category
                  ? 'border-ledger bg-ledger text-white'
                  : 'border-line bg-wash text-ink',
              ].join(' ')}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => updateField('status', status)}
              className={[
                'tap-target rounded-xl border-2 text-[15px] font-bold',
                form.status === status
                  ? status === '구매'
                    ? 'border-good bg-good text-white'
                    : status === '검토'
                      ? 'border-warn bg-warn text-white'
                      : 'border-ink bg-ink text-white'
                  : 'border-line bg-wash text-ink',
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
        className="text-[15px] font-bold text-ink-muted"
      >
        {showMore ? '색상·사이즈 접기' : '색상·사이즈 더 입력'}
      </button>

      {showMore && (
        <div className="grid grid-cols-2 gap-3 rounded-2xl border-2 border-line bg-paper p-4">
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

      {isSaving && <p className="text-center text-[15px] font-medium text-ink-muted">저장 중…</p>}
    </form>
  )
}

function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[14px] font-bold text-ink-muted">
        {label}
        {required && <span className="ml-0.5 text-accent">*</span>}
      </span>
      {children}
    </label>
  )
}

const inputClass =
  'tap-target w-full rounded-xl border-2 border-line bg-wash px-3 py-3 text-[17px] text-ink outline-none placeholder:text-ink-muted/60 focus:border-brand focus:bg-paper'
