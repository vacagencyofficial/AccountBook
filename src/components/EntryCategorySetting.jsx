import { useState } from 'react'
import { addCustomCategory, getCustomCategories, removeCustomCategory } from '../lib/entryCategories'
import { useToast } from './toastContext'

const TYPES = [
  ['expense', '나간 돈'],
  ['income', '들어온 돈'],
]

/** 설정: 가계부에서 직접 만든 분류 (병원비·경조사 등) 보기·더하기·지우기 */
export default function EntryCategorySetting() {
  const [custom, setCustom] = useState(getCustomCategories)
  const [type, setType] = useState('expense')
  const [name, setName] = useState('')
  const toast = useToast()

  function add() {
    const made = addCustomCategory(type, name)
    if (made) {
      setCustom(getCustomCategories())
      toast(`「${made}」 분류를 만들었어요`)
    } else {
      toast('이미 있는 분류예요')
    }
    setName('')
  }

  function remove(kind, item) {
    setCustom(removeCustomCategory(kind, item))
    toast(`「${item}」 분류를 목록에서 뺐어요. 이미 적힌 기록은 그대로예요`)
  }

  const all = TYPES.flatMap(([kind, label]) => custom[kind].map((item) => ({ kind, label, item })))

  return (
    <div className="space-y-3 p-4">
      {all.length === 0 ? (
        <p className="text-[16px] font-semibold text-ink-soft">
          식비·교통 말고 자주 쓰는 분류(병원비, 경조사 등)를 만들어 둘 수 있어요
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {all.map(({ kind, label, item }) => (
            <li key={`${kind}-${item}`}>
              <button
                type="button"
                onClick={() => remove(kind, item)}
                className="chip gap-1.5"
                aria-label={`${label} 분류 ${item} 빼기`}
              >
                {item}
                <span className="text-ink-soft" aria-hidden>
                  ✕
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="field w-[7.5rem] shrink-0 py-2"
          aria-label="어느 쪽 분류"
        >
          {TYPES.map(([kind, label]) => (
            <option key={kind} value={kind}>
              {label}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 10))}
          onKeyDown={(e) => e.key === 'Enter' && name.trim() && add()}
          placeholder="새 분류 이름"
          className="field min-w-0 flex-1"
          aria-label="새 분류 이름"
        />
        <button type="button" onClick={add} disabled={!name.trim()} className="btn btn-primary shrink-0 px-3">
          만들기
        </button>
      </div>
    </div>
  )
}
