import { useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import SubPage from '../components/SubPage'
import ConfirmDialog from '../components/ConfirmDialog'
import { useToast } from '../components/toastContext'
import { db } from '../db'
import { createEntry, deleteEntry, restoreEntry, updateEntry } from '../db/mutations'
import { useLiveQuery } from '../hooks/useLiveQuery'
import { addCustomCategory, entryCategories } from '../lib/entryCategories'
import { addRecurringRule, describeRule } from '../lib/recurring'
import { formatCurrency, formatDateLabel, getToday } from '../utils/format'

const PAYMENTS = ['현금', '카드', '계좌이체']
const MAX_AMOUNT = 999_999_999

function yesterday() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`chip ${active ? 'chip-on' : ''}`}
    >
      {children}
    </button>
  )
}

/** 가계부 적기·고치기: 사입(상품) 말고 다른 지출과 수입 */
export default function EntryPage() {
  const { entryId } = useParams()
  const id = entryId ? Number(entryId) : null
  const { data: entry, isLoading } = useLiveQuery(() => (id ? db.entries.get(id) : null), [id])

  if (id && isLoading) {
    return (
      <SubPage title="가계부" backTo="/history">
        <div className="skeleton h-60" />
      </SubPage>
    )
  }
  if (id && !entry) {
    return (
      <SubPage title="가계부" backTo="/history">
        <p className="py-10 text-center text-[17px] font-bold text-ink-muted">지워졌거나 없는 기록이에요</p>
      </SubPage>
    )
  }
  return <EntryForm key={id ?? 'new'} entry={entry} />
}

function EntryForm({ entry }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const toast = useToast()
  const editing = Boolean(entry)
  const today = getToday()
  const [form, setForm] = useState(() => ({
    type: entry?.type ?? (searchParams.get('type') === 'income' ? 'income' : 'expense'),
    amount: entry ? String(entry.amount) : '',
    category: entry?.category ?? '',
    date: entry?.date ?? today,
    payment: entry?.payment ?? '',
    memo: entry?.memo ?? '',
  }))
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  // 반복: '' / 'week' / 'month' (새로 적을 때만)
  const [repeat, setRepeat] = useState('')
  const [newCategory, setNewCategory] = useState(null)
  const { data: allEntries } = useLiveQuery(() => db.entries.toArray(), [])

  const isIncome = form.type === 'income'
  const categories = entryCategories(form.type, allEntries ?? [])
  if (form.category && !categories.includes(form.category)) categories.unshift(form.category)
  const [y, m, d] = form.date.split('-').map(Number)
  const pickedDay = new Date(y, m - 1, d)
  const repeatLabel =
    repeat === 'week'
      ? describeRule({ every: 'week', weekday: pickedDay.getDay() })
      : describeRule({ every: 'month', day: Math.min(28, d) })
  const amount = Number(form.amount) || 0
  const ready = amount > 0 && form.category
  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  function goBack() {
    if (location.key !== 'default') navigate(-1)
    else navigate('/history', { replace: true })
  }

  async function save() {
    if (!ready || busy) return
    setBusy(true)
    if (editing) {
      await updateEntry(entry.id, form)
      toast('고친 내용을 저장했어요')
    } else {
      const memo = form.memo.trim() || form.category
      await createEntry(repeat ? { ...form, memo: `${memo} (${repeat === 'week' ? '매주' : '매달'})` } : form)
      if (repeat) addRecurringRule({ ...form, memo, every: repeat }, form.date)
      toast(
        `${isIncome ? '들어온' : '나간'} 돈 ${formatCurrency(amount)}을 적었어요${
          repeat ? `. ${repeatLabel}에 저절로 적어요` : ''
        }`,
      )
    }
    goBack()
  }

  function makeCategory() {
    const name = addCustomCategory(form.type, newCategory ?? '')
    // 새로 만들었거나 이미 있는 이름이면 그 분류를 고름 (목록은 다시 그릴 때 저장된 것을 읽음)
    if (name || newCategory?.trim()) update('category', name ?? newCategory.trim())
    setNewCategory(null)
  }

  async function remove() {
    const removed = await deleteEntry(entry.id)
    toast('기록을 지웠어요', { actionLabel: '되돌리기', onAction: () => restoreEntry(removed) })
    goBack()
  }

  const otherDate = form.date !== today && form.date !== yesterday()

  return (
    <SubPage title={editing ? '가계부 고치기' : '가계부 적기'} onBack={goBack}>
      <div className="space-y-5 pb-28">
        <div
          className="grid grid-cols-2 gap-1 rounded-[12px] bg-line-soft p-1"
          role="radiogroup"
          aria-label="나간 돈·들어온 돈"
        >
          {[
            ['expense', '나간 돈'],
            ['income', '들어온 돈'],
          ].map(([type, label]) => (
            <button
              key={type}
              type="button"
              role="radio"
              aria-checked={form.type === type}
              onClick={() => setForm((prev) => ({ ...prev, type, category: '', payment: '' }))}
              className={`min-h-[3.25rem] rounded-[9px] text-[19px] font-extrabold ${
                form.type === type
                  ? `bg-paper shadow-[var(--shadow-card)] ${type === 'income' ? 'text-good' : 'text-accent-dark'}`
                  : 'text-ink-soft'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <section>
          <label className="label" htmlFor="entry-amount">
            얼마예요?
          </label>
          <div className="card flex items-baseline gap-2 border-b-[3px] border-brand px-4">
            <input
              id="entry-amount"
              inputMode="numeric"
              autoFocus={!editing}
              value={form.amount ? Number(form.amount).toLocaleString('ko-KR') : ''}
              onChange={(e) =>
                update(
                  'amount',
                  String(Math.min(MAX_AMOUNT, Number(e.target.value.replace(/\D/g, '')) || 0) || ''),
                )
              }
              placeholder="0"
              className="min-w-0 flex-1 bg-transparent py-3 text-right text-[32px] font-extrabold outline-none tabular"
            />
            <span className="text-[22px] font-bold text-ink-muted">원</span>
          </div>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {[1000, 5000, 10000, 50000].map((step) => (
              <button
                key={step}
                type="button"
                onClick={() => update('amount', String(Math.min(MAX_AMOUNT, amount + step)))}
                className="btn btn-outline min-h-[2.75rem] px-1 text-[16px]"
              >
                +{step >= 10000 ? `${step / 10000}만` : `${step / 1000}천`}
              </button>
            ))}
          </div>
        </section>

        <section>
          <p className="label">어디에 {isIncome ? '들어온' : '쓴'} 돈이에요?</p>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Chip
                key={category}
                active={form.category === category}
                onClick={() => update('category', category)}
              >
                {category}
              </Chip>
            ))}
            {newCategory == null && (
              <button
                type="button"
                onClick={() => setNewCategory('')}
                className="chip border-dashed text-brand"
              >
                + 분류 만들기
              </button>
            )}
          </div>
          {newCategory != null && (
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value.slice(0, 10))}
                onKeyDown={(e) => e.key === 'Enter' && makeCategory()}
                placeholder="예: 병원비, 경조사"
                autoFocus
                className="field min-w-0 flex-1"
                aria-label="새 분류 이름"
              />
              <button
                type="button"
                onClick={makeCategory}
                disabled={!newCategory.trim()}
                className="btn btn-primary shrink-0 px-4"
              >
                만들기
              </button>
              <button
                type="button"
                onClick={() => setNewCategory(null)}
                className="btn shrink-0 px-2 text-ink-muted"
              >
                취소
              </button>
            </div>
          )}
          {!isIncome && (
            <p className="mt-2 text-[16px] font-semibold text-ink-soft">
              옷을 사 온 것은 「상품 입력」으로 적어 주세요. 가계부에 「사입」으로 함께 보여요
            </p>
          )}
        </section>

        <section>
          <p className="label">언제예요?</p>
          <div className="grid grid-cols-3 gap-2">
            <Chip active={form.date === today} onClick={() => update('date', today)}>
              오늘
            </Chip>
            <Chip active={form.date === yesterday()} onClick={() => update('date', yesterday())}>
              어제
            </Chip>
            <label className={`chip relative ${otherDate ? 'chip-on' : ''}`}>
              {otherDate ? formatDateLabel(form.date) : '날짜 고르기'}
              <input
                type="date"
                value={form.date}
                max={today}
                onChange={(e) => e.target.value && update('date', e.target.value)}
                className="absolute inset-0 opacity-0"
                aria-label="날짜 고르기"
              />
            </label>
          </div>
        </section>

        {!isIncome && (
          <section>
            <p className="label">
              어떻게 냈나요? <span className="font-semibold text-ink-soft">(없어도 돼요)</span>
            </p>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENTS.map((payment) => (
                <Chip
                  key={payment}
                  active={form.payment === payment}
                  onClick={() => update('payment', form.payment === payment ? '' : payment)}
                >
                  {payment === '계좌이체' ? '이체' : payment}
                </Chip>
              ))}
            </div>
          </section>
        )}

        {!editing && (
          <section>
            <p className="label">
              반복되는 돈이에요? <span className="font-semibold text-ink-soft">(월세·통신비 등)</span>
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                ['', '한 번만'],
                ['week', '매주'],
                ['month', '매달'],
              ].map(([key, label]) => (
                <Chip key={key || 'once'} active={repeat === key} onClick={() => setRepeat(key)}>
                  {label}
                </Chip>
              ))}
            </div>
            {repeat && (
              <p className="mt-2 text-[16px] font-semibold text-brand">
                앞으로 {repeatLabel}에 저절로 적어요
                {repeat === 'month' && d > 28 ? ' (29~31일은 28일로)' : ''}. 설정에서 멈출 수 있어요
              </p>
            )}
          </section>
        )}

        <label className="block">
          <span className="label">메모</span>
          <input
            type="text"
            value={form.memo}
            onChange={(e) => update('memo', e.target.value)}
            placeholder={isIncome ? '예: 10월 판매 대금' : '예: 점심, 택시비'}
            autoComplete="off"
            className="field"
          />
        </label>

        {editing && (
          <button type="button" onClick={() => setConfirmDelete(true)} className="btn btn-text-danger w-full">
            이 기록 지우기
          </button>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line-soft bg-paper px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto max-w-lg">
          <button
            type="button"
            onClick={save}
            disabled={!ready || busy}
            className={`btn w-full text-[20px] ${isIncome ? 'bg-good text-white' : 'btn-accent'}`}
            style={{ minHeight: '3.75rem' }}
          >
            {amount ? `${formatCurrency(amount)} 저장하기` : '저장하기'}
          </button>
          {!ready && (
            <p className="mt-2 text-center text-[16px] font-bold text-ink-soft">
              {!amount ? '금액을 적어 주세요' : '어디에 쓴 돈인지 골라 주세요'}
            </p>
          )}
        </div>
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title="이 기록을 지울까요?"
          description={`${entry.category} · ${formatCurrency(entry.amount)}${entry.memo ? ` · ${entry.memo}` : ''}`}
          confirmLabel="지우기"
          cancelLabel="그대로 두기"
          onConfirm={remove}
          onCancel={() => setConfirmDelete(false)}
          danger
        />
      )}
    </SubPage>
  )
}
