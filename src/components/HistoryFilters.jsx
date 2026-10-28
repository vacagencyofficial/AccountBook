import { CATEGORY_OPTIONS, PERIOD_OPTIONS, STATUS_OPTIONS } from '../hooks/useHistoryFilters'
import { IconSearch } from './Icons'

export default function HistoryFilters({ filters, shops, onChange, onReset, hasActiveFilters }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="inline-flex items-center gap-2 text-[18px] font-black text-ledger">
          <IconSearch className="h-5 w-5" />
          기록 찾아보기
        </h2>
        {hasActiveFilters && (
          <button type="button" onClick={onReset} className="text-[15px] font-black text-ink-muted">
            조건 지우기
          </button>
        )}
      </div>

      <label className="block">
        <span className="mb-1.5 block text-[15px] font-black text-ink">이름·메모로 찾기</span>
        <input
          type="search"
          value={filters.query}
          onChange={(e) => onChange('query', e.target.value)}
          placeholder="예: 니트, 미소옷장"
          className={inputClass}
        />
      </label>

      <FilterGroup label="언제 산 것인가요?">
        <div className="flex flex-wrap gap-2">
          {PERIOD_OPTIONS.map(({ value, label }) => (
            <FilterChip
              key={value}
              active={filters.period === value}
              onClick={() => onChange('period', value)}
            >
              {label === '전체' ? '전부' : label === '직접 선택' ? '날짜 고르기' : label}
            </FilterChip>
          ))}
        </div>
        {filters.period === 'custom' && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-[14px] font-bold text-ink-muted">시작 날</span>
              <input
                type="date"
                value={filters.customStart}
                onChange={(e) => onChange('customStart', e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[14px] font-bold text-ink-muted">끝 날</span>
              <input
                type="date"
                value={filters.customEnd}
                onChange={(e) => onChange('customEnd', e.target.value)}
                className={inputClass}
              />
            </label>
          </div>
        )}
      </FilterGroup>

      <FilterGroup label="어느 가게인가요?">
        <select
          value={filters.shopId}
          onChange={(e) => onChange('shopId', e.target.value)}
          className={inputClass}
        >
          <option value="all">모든 가게</option>
          {(shops ?? []).map((shop) => (
            <option key={shop.id} value={shop.id}>
              {shop.name}
              {shop.building ? ` (${shop.building})` : ''}
            </option>
          ))}
        </select>
      </FilterGroup>

      <FilterGroup label="옷 종류">
        <div className="flex flex-wrap gap-2">
          {CATEGORY_OPTIONS.map(({ value, label }) => (
            <FilterChip
              key={value}
              active={filters.category === value}
              onClick={() => onChange('category', value)}
            >
              {label === '전체' ? '전부' : label}
            </FilterChip>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup label="진행 상태">
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map(({ value, label }) => (
            <FilterChip
              key={value}
              active={filters.status === value}
              onClick={() => onChange('status', value)}
            >
              {label === '전체' ? '전부' : label}
            </FilterChip>
          ))}
        </div>
      </FilterGroup>
    </div>
  )
}

function FilterGroup({ label, children }) {
  return (
    <div>
      <p className="mb-1.5 text-[15px] font-black text-ink">{label}</p>
      {children}
    </div>
  )
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-xl border-2 px-3 py-2.5 text-[15px] font-black',
        active ? 'border-ledger bg-ledger text-white' : 'border-line bg-paper text-ink',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

const inputClass =
  'tap-target w-full rounded-xl border-2 border-line bg-paper px-3 text-[16px] font-semibold text-ink outline-none focus:border-ledger'
