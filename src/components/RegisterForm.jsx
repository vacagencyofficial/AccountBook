import { useEffect, useRef, useState } from 'react'
import ShopChipSelector from './ShopChipSelector'
import { useToday } from '../hooks/useToday'
import { CATEGORIES, STATUSES } from '../db'
import { formatCurrency, formatDateLabel } from '../utils/format'
import { formatDateString } from '../utils/dateRange'
import { statusLabel } from '../utils/labels'

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

// 한 개 가격은 1억 원 미만, 수량은 9,999개까지 (화면이 넘치거나 클라우드 숫자 범위를 넘지 않게)
const MAX_PRICE = 99_999_999
const MAX_QTY = 9999
const onlyDigits = (value, maxLength) => value.replace(/[^\d]/g, '').replace(/^0+(?=\d)/, '').slice(0, maxLength)

const PRICE_STEPS = [
  { value: 1000, label: '+1천' },
  { value: 5000, label: '+5천' },
  { value: 10000, label: '+1만' },
]

export default function RegisterForm({
  form,
  updateField,
  selectShop,
  onSubmit,
  autoFocusName = false,
  defaultMoreOpen = false,
  // 보여 줄 묶음 (한 질문씩 적기에서 일부만 보여 줄 때)
  sections = ['date', 'shop', 'price', 'name', 'more'],
  autoFocusPrice = false,
}) {
  const show = (key) => sections.includes(key)
  const [customColor, setCustomColor] = useState(() =>
    form.color && !COLOR_OPTIONS.includes(form.color) ? form.color : '',
  )
  const [customSize, setCustomSize] = useState(() =>
    form.size && !SIZE_OPTIONS.includes(form.size) ? form.size : '',
  )
  const [colorCustom, setColorCustom] = useState(() =>
    Boolean(form.color && !COLOR_OPTIONS.includes(form.color)),
  )
  const [sizeCustom, setSizeCustom] = useState(() => Boolean(form.size && !SIZE_OPTIONS.includes(form.size)))
  const [moreOpen, setMoreOpen] = useState(defaultMoreOpen)
  const nameRef = useRef(null)
  const priceRef = useRef(null)

  useEffect(() => {
    if (autoFocusPrice && priceRef.current) priceRef.current.focus()
  }, [autoFocusPrice])

  useEffect(() => {
    if (autoFocusName && nameRef.current) {
      nameRef.current.focus()
    }
  }, [autoFocusName])

  function handleSubmit(event) {
    event.preventDefault()
    onSubmit()
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

  const today = useToday()
  const yesterday = getYesterday()
  const date = form.date || today
  const isOtherDate = date !== today && date !== yesterday
  const qtyNumber = Math.max(1, parseInt(form.qty, 10) || 1)
  const priceNumber = parseInt(form.price, 10) || 0

  function changeQty(diff) {
    updateField('qty', String(Math.min(MAX_QTY, Math.max(1, qtyNumber + diff))))
  }

  function addPrice(amount) {
    updateField('price', String(Math.min(MAX_PRICE, priceNumber + amount)))
  }

  const moreSummary = [
    date === today ? '오늘' : formatDateLabel(date),
    statusLabel(form.status),
    form.category !== '기타' ? form.category : null,
    form.color,
    form.size,
    form.memo ? '메모 있음' : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {show('date') && (
        <section>
          <p className="label">언제 샀나요?</p>
          <div className="grid grid-cols-3 gap-2">
            <Chip active={date === today} onClick={() => updateField('date', today)}>
              오늘
            </Chip>
            <Chip active={date === yesterday} onClick={() => updateField('date', yesterday)}>
              어제
            </Chip>
            <label className={`chip relative ${isOtherDate ? 'chip-on' : ''}`}>
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
      )}

      {show('shop') && (
        <section>
          <ShopChipSelector selectedShopId={form.shopId} onSelect={selectShop} />
        </section>
      )}

      {show('price') && (
        <>
          <section>
            <label className="label" htmlFor="register-price">
              한 개 가격
            </label>
            <div
              className="card flex items-baseline gap-2 border-b-[3px] border-brand px-4"
              style={{ borderRadius: '10px 10px 0 0' }}
            >
              <input
                id="register-price"
                ref={priceRef}
                type="text"
                inputMode="numeric"
                value={form.price === '' ? '' : priceNumber.toLocaleString('ko-KR')}
                onChange={(e) => updateField('price', onlyDigits(e.target.value, 8))}
                placeholder="0"
                enterKeyHint="done"
                className="min-h-[4rem] w-full min-w-0 bg-transparent text-right text-[32px] font-extrabold tracking-[-0.02em] outline-none tabular placeholder:text-line"
              />
              <span className="text-[20px] font-bold text-ink-soft">원</span>
            </div>
            <div className="mt-2.5 grid grid-cols-3 gap-2">
              {PRICE_STEPS.map((step) => (
                <button
                  key={step.value}
                  type="button"
                  onClick={() => addPrice(step.value)}
                  className="btn btn-soft"
                >
                  {step.label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <p className="label">몇 개 샀어요?</p>
            <div className="card flex items-center justify-between gap-2 p-1.5">
              <button
                type="button"
                onClick={() => changeQty(-1)}
                disabled={qtyNumber <= 1}
                aria-label="하나 빼기"
                className="btn btn-soft h-14 w-16 text-[30px]"
              >
                −
              </button>
              <label className="flex flex-1 items-baseline justify-center gap-1">
                <span className="sr-only">산 개수</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.qty}
                  onChange={(e) => updateField('qty', onlyDigits(e.target.value, 4))}
                  onBlur={() => updateField('qty', String(qtyNumber))}
                  className="w-20 bg-transparent text-right text-[28px] font-extrabold outline-none tabular"
                />
                <span className="text-[20px] font-bold text-ink-soft">개</span>
              </label>
              <button
                type="button"
                onClick={() => changeQty(1)}
                aria-label="하나 더하기"
                className="btn btn-soft h-14 w-16 text-[30px]"
              >
                +
              </button>
            </div>

            {form.price !== '' && (
              <div
                className="receipt mt-4 flex items-center justify-between rounded-t-[16px] bg-accent-soft px-4 py-3"
                style={{ '--receipt-color': 'var(--color-accent-soft)' }}
              >
                <div>
                  <p className="text-[16px] font-semibold text-ink-muted">합계</p>
                  <p className="text-[16px] font-semibold text-ink-muted tabular">
                    {formatCurrency(priceNumber)} × {qtyNumber}개
                  </p>
                </div>
                <b className="min-w-0 text-right text-[28px] font-extrabold text-accent-dark tabular [overflow-wrap:anywhere]">
                  {formatCurrency(priceNumber * qtyNumber)}
                </b>
              </div>
            )}
          </section>
        </>
      )}

      {show('name') && (
        <section>
          <label className="label" htmlFor="register-name">
            옷 이름
          </label>
          <input
            id="register-name"
            ref={nameRef}
            type="text"
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="예: 니트, 청바지"
            autoComplete="off"
            enterKeyHint="done"
            className="field"
          />
        </section>
      )}

      {show('more') && (
        <section className="card overflow-hidden">
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            className="flex min-h-[3.5rem] w-full items-center justify-between gap-3 px-4 text-left"
            aria-expanded={moreOpen}
          >
            <b className="shrink-0 text-[18px] font-extrabold">더 적기 {moreOpen ? '▴' : '▾'}</b>
            <span className="truncate text-[16px] font-semibold text-ink-soft">{moreSummary}</span>
          </button>

          {moreOpen && (
            <div className="space-y-5 border-t border-line-soft px-4 pb-4 pt-4">
              <div>
                <p className="label">샀나요?</p>
                <div className="grid grid-cols-3 gap-2">
                  {STATUSES.map((status) => (
                    <Chip
                      key={status}
                      active={form.status === status}
                      onClick={() => updateField('status', status)}
                    >
                      {statusLabel(status)}
                    </Chip>
                  ))}
                </div>
                {form.status !== '구매' && (
                  <p className="mt-2 text-[16px] font-semibold text-warn">
                    아직 안 산 것은 쓴 돈 합계에 들어가지 않아요
                  </p>
                )}
              </div>

              <div>
                <p className="label">옷 종류</p>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((category) => (
                    <Chip
                      key={category}
                      active={form.category === category}
                      onClick={() => updateField('category', category)}
                    >
                      {category}
                    </Chip>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="label">색</span>
                  <select
                    value={colorSelectValue}
                    onChange={(e) => handleColorSelect(e.target.value)}
                    className="field"
                  >
                    <option value="">고르기</option>
                    {COLOR_OPTIONS.map((color) => (
                      <option key={color} value={color}>
                        {color}
                      </option>
                    ))}
                    <option value="__custom__">직접 쓰기</option>
                  </select>
                </label>
                <label className="block">
                  <span className="label">크기</span>
                  <select
                    value={sizeSelectValue}
                    onChange={(e) => handleSizeSelect(e.target.value)}
                    className="field"
                  >
                    <option value="">고르기</option>
                    {SIZE_OPTIONS.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                    <option value="__custom__">직접 쓰기</option>
                  </select>
                </label>
              </div>
              {colorCustom && (
                <input
                  type="text"
                  value={customColor}
                  onChange={(e) => {
                    setCustomColor(e.target.value)
                    updateField('color', e.target.value)
                  }}
                  placeholder="색 이름 적기"
                  className="field"
                  aria-label="색 직접 쓰기"
                />
              )}
              {sizeCustom && (
                <input
                  type="text"
                  value={customSize}
                  onChange={(e) => {
                    setCustomSize(e.target.value)
                    updateField('size', e.target.value)
                  }}
                  placeholder="크기 적기"
                  className="field"
                  aria-label="크기 직접 쓰기"
                />
              )}

              <label className="block">
                <span className="label">메모</span>
                <input
                  type="text"
                  value={form.memo}
                  onChange={(e) => updateField('memo', e.target.value)}
                  placeholder="예: 봄에 팔 것, 단골 할인"
                  autoComplete="off"
                  className="field"
                />
              </label>
            </div>
          )}
        </section>
      )}
    </form>
  )
}

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`chip ${active ? 'chip-on' : ''}`}
      aria-pressed={active}
    >
      {children}
    </button>
  )
}
