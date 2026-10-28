import { useEffect, useRef, useState } from 'react'
import ShopChipSelector from './ShopChipSelector'
import { CATEGORIES, STATUSES } from '../db'
import { formatCurrency, formatDateLabel, getToday } from '../utils/format'
import { formatDateString } from '../utils/dateRange'

function getYesterday() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return formatDateString(d)
}

const COLOR_OPTIONS = [
  '블랙',
  '화이트',
  '베이지',
  '아이보리',
  '그레이',
  '차콜',
  '네이비',
  '블루',
  '브라운',
  '핑크',
  '레드',
  '그린',
  '퍼플',
  '옐로우',
]

const SIZE_OPTIONS = ['FREE', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '26', '27', '28', '29', '30', '32']

const STATUS_HELP = {
  구매: '사기로 정함',
  검토: '조금 더 생각해 볼 것',
  보류: '지금은 보류',
}

export default function RegisterForm({
  form,
  updateField,
  selectShop,
  onSubmit,
  isSaving,
  autoFocusName = false,
}) {
  const [customColor, setCustomColor] = useState(
    () => (form.color && !COLOR_OPTIONS.includes(form.color) ? form.color : ''),
  )
  const [customSize, setCustomSize] = useState(
    () => (form.size && !SIZE_OPTIONS.includes(form.size) ? form.size : ''),
  )
  const [colorCustom, setColorCustom] = useState(
    () => Boolean(form.color && !COLOR_OPTIONS.includes(form.color)),
  )
  const [sizeCustom, setSizeCustom] = useState(
    () => Boolean(form.size && !SIZE_OPTIONS.includes(form.size)),
  )
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

  function handleColorSelect(value) {
    if (value === '__custom__') {
      setColorCustom(true)
      updateField('color', customColor || '')
      return
    }
    setColorCustom(false)
    updateField('color', value)
  }

  function handleSizeSelect(value) {
    if (value === '__custom__') {
      setSizeCustom(true)
      updateField('size', customSize || '')
      return
    }
    setSizeCustom(false)
    updateField('size', value)
  }

  const colorSelectValue = colorCustom ? '__custom__' : form.color || ''
  const sizeSelectValue = sizeCustom ? '__custom__' : form.size || ''

  const today = getToday()
  const yesterday = getYesterday()
  const date = form.date || today
  const isOtherDate = date !== today && date !== yesterday
  const qtyNumber = Math.max(1, parseInt(form.qty, 10) || 1)

  function changeQty(diff) {
    updateField('qty', String(Math.max(1, qtyNumber + diff)))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <section className="border-2 border-line bg-paper p-4">
        <p className="mb-2 text-[16px] font-black text-ink">언제 샀나요?</p>
        <div className="grid grid-cols-3 gap-2">
          <DateChip active={date === today} onClick={() => updateField('date', today)}>
            오늘
          </DateChip>
          <DateChip active={date === yesterday} onClick={() => updateField('date', yesterday)}>
            어제
          </DateChip>
          <label
            className={[
              'tap-target relative flex items-center justify-center border-2 text-[16px] font-black',
              isOtherDate ? 'border-brand bg-brand text-white' : 'border-line bg-wash text-ink',
            ].join(' ')}
          >
            {isOtherDate ? formatDateLabel(date) : '날짜 고르기'}
            <input
              type="date"
              value={date}
              max={today}
              onChange={(e) => e.target.value && updateField('date', e.target.value)}
              className="absolute inset-0 opacity-0"
              aria-label="산 날짜 고르기"
            />
          </label>
        </div>
      </section>

      <section className=" border-2 border-good/40 bg-paper p-4 tone-rail-good">
        <p className="mb-1 text-[16px] font-black text-good">1. 어느 가게인가요?</p>
        <p className="mb-3 text-[14px] font-semibold text-ink-muted">아래에서 가게 이름을 눌러 고르세요</p>
        <ShopChipSelector selectedShopId={form.shopId} onSelect={selectShop} />
      </section>

      <section className="space-y-3 border-2 border-brand/40 bg-paper p-4 tone-rail-brand">
        <p className="text-[16px] font-black text-brand">2. 이름 · 가격 · 몇 개</p>

        <Field label="옷 이름" required>
          <input
            ref={nameRef}
            type="text"
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            onKeyDown={handleNameKeyDown}
            placeholder="예: 니트, 청바지"
            autoComplete="off"
            enterKeyHint="next"
            className={inputClass}
          />
        </Field>

        <Field label="한 개 가격 (원)" required>
          <input
            ref={priceRef}
            type="text"
            inputMode="numeric"
            value={form.price}
            onChange={(e) => updateField('price', e.target.value.replace(/[^\d]/g, ''))}
            onKeyDown={handlePriceKeyDown}
            placeholder="예: 15000"
            enterKeyHint="done"
            className={`${inputClass} text-[22px] font-black tabular`}
          />
        </Field>

        <div>
          <p className="mb-1.5 text-[15px] font-black text-ink">몇 개 샀나요?</p>
          <div className="grid grid-cols-[4rem_1fr_4rem] gap-2">
            <button
              type="button"
              onClick={() => changeQty(-1)}
              disabled={qtyNumber <= 1}
              aria-label="하나 빼기"
              className="tap-target border-2 border-line bg-wash text-[26px] font-black text-ink disabled:opacity-40"
            >
              −
            </button>
            <label className="relative block">
              <span className="sr-only">산 개수</span>
              <input
                type="text"
                inputMode="numeric"
                value={form.qty}
                onChange={(e) => updateField('qty', e.target.value.replace(/[^\d]/g, ''))}
                onBlur={() => updateField('qty', String(qtyNumber))}
                className={`${inputClass} pr-10 text-center text-[22px] font-black tabular`}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[17px] font-bold text-ink-muted">
                개
              </span>
            </label>
            <button
              type="button"
              onClick={() => changeQty(1)}
              aria-label="하나 더하기"
              className="tap-target border-2 border-line bg-wash text-[26px] font-black text-ink"
            >
              +
            </button>
          </div>
          {form.price !== '' && (
            <div className="mt-3 flex items-center justify-between bg-brand-soft px-3 py-2.5">
              <span className="text-[15px] font-bold text-ink-muted tabular">
                {formatCurrency(form.price)} × {qtyNumber}개
              </span>
              <span className="text-[20px] font-black text-brand tabular">
                {formatCurrency((parseInt(form.price, 10) || 0) * qtyNumber)}
              </span>
            </div>
          )}
        </div>

        <Field label="메모 (기억할 말)">
          <input
            type="text"
            value={form.memo}
            onChange={(e) => updateField('memo', e.target.value)}
            placeholder="예: 봄에 팔 것, 단골 할인"
            autoComplete="off"
            className={inputClass}
          />
        </Field>
      </section>

      <section className="space-y-3 border-2 border-ledger/40 bg-paper p-4 tone-rail-ledger">
        <p className="text-[16px] font-black text-ledger">3. 옷 종류 · 상태</p>

        <Field label="옷 종류">
          <select
            value={form.category}
            onChange={(e) => updateField('category', e.target.value)}
            className={selectClass}
          >
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </Field>

        <Field label="지금 상태는?">
          <select
            value={form.status}
            onChange={(e) => updateField('status', e.target.value)}
            className={selectClass}
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status} — {STATUS_HELP[status]}
              </option>
            ))}
          </select>
        </Field>
      </section>

      <section className="space-y-3 border-2 border-line bg-paper p-4">
        <p className="text-[16px] font-black text-ink">4. 색 · 크기 (선택)</p>
        <p className="text-[13px] font-semibold text-ink-muted">모르면 비워 두셔도 됩니다</p>

        <Field label="색">
          <select
            value={colorSelectValue}
            onChange={(e) => handleColorSelect(e.target.value)}
            className={selectClass}
          >
            <option value="">색 고르기</option>
            {COLOR_OPTIONS.map((color) => (
              <option key={color} value={color}>
                {color}
              </option>
            ))}
            <option value="__custom__">목록에 없음 · 직접 쓰기</option>
          </select>
          {colorCustom && (
            <input
              type="text"
              value={customColor}
              onChange={(e) => {
                setCustomColor(e.target.value)
                updateField('color', e.target.value)
              }}
              placeholder="색 이름 적기"
              className={`${inputClass} mt-2`}
            />
          )}
        </Field>

        <Field label="크기">
          <select
            value={sizeSelectValue}
            onChange={(e) => handleSizeSelect(e.target.value)}
            className={selectClass}
          >
            <option value="">크기 고르기</option>
            {SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
            <option value="__custom__">목록에 없음 · 직접 쓰기</option>
          </select>
          {sizeCustom && (
            <input
              type="text"
              value={customSize}
              onChange={(e) => {
                setCustomSize(e.target.value)
                updateField('size', e.target.value)
              }}
              placeholder="크기 적기"
              className={`${inputClass} mt-2`}
            />
          )}
        </Field>
      </section>

      {isSaving && <p className="text-center text-[16px] font-bold text-ink-muted">저장하는 중…</p>}
    </form>
  )
}

function DateChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'tap-target border-2 text-[16px] font-black',
        active ? 'border-brand bg-brand text-white' : 'border-line bg-wash text-ink',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[15px] font-black text-ink">
        {label}
        {required && <span className="ml-1 text-accent">필수</span>}
      </span>
      {children}
    </label>
  )
}

const inputClass =
  'tap-target w-full border-2 border-line bg-paper px-3 py-3 text-[17px] font-semibold text-ink outline-none placeholder:text-ink-muted/70 focus:border-brand'

const selectClass =
  'tap-target w-full appearance-none border-2 border-line bg-paper px-3 py-3 text-[17px] font-bold text-ink outline-none focus:border-brand'
