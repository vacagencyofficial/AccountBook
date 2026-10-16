import { CATEGORY_OPTIONS, PERIOD_OPTIONS, STATUS_OPTIONS } from '../hooks/useHistoryFilters'

export default function HistoryFilters({ filters, shops, onChange, onReset, hasActiveFilters }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-bold text-ink">필터</h2>
        {hasActiveFilters && (
          <button type="button" onClick={onReset} className="text-[12px] text-ink-muted">
            초기화
          </button>
        )}
      </div>

      <label className="block">
        <span className="mb-1.5 block text-[12px] text-ink-muted">검색</span>
        <input
          type="search"
          value={filters.query}
          onChange={(e) => onChange('query', e.target.value)}
          placeholder="품명, 가게, 메모"
          className={inputClass}
        />
      </label>

      <FilterGroup label="기간">
        <div className="flex flex-wrap gap-1.5">
          {PERIOD_OPTIONS.map(({ value, label }) => (
            <FilterChip
              key={value}
              active={filters.period === value}
              onClick={() => onChange('period', value)}
            >
              {label}
            </FilterChip>
          ))}
        </div>
        {filters.period === 'custom' && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-[12px] text-ink-muted">시작</span>
              <input
                type="date"
                value={filters.customStart}
                onChange={(e) => onChange('customStart', e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] text-ink-muted">종료</span>
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

      <FilterGroup label="가게">
        <select
          value={filters.shopId}
          onChange={(e) => onChange('shopId', e.target.value)}
          className={inputClass}
        >
          <option value="all">전체 가게</option>
          {(shops ?? []).map((shop) => (
            <option key={shop.id} value={shop.id}>
              {shop.name}
              {shop.building ? ` (${shop.building})` : ''}
            </option>
          ))}
        </select>
      </FilterGroup>

      <FilterGroup label="카테고리">
        <div className="flex flex-wrap gap-1.5">
          {CATEGORY_OPTIONS.map(({ value, label }) => (
            <FilterChip
              key={value}
              active={filters.category === value}
              onClick={() => onChange('category', value)}
            >
              {label}
            </FilterChip>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup label="상태">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_OPTIONS.map(({ value, label }) => (
            <FilterChip
              key={value}
              active={filters.status === value}
              onClick={() => onChange('status', value)}
            >
              {label}
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
      <p className="mb-1.5 text-[12px] text-ink-muted">{label}</p>
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
        'border px-2.5 py-1.5 text-[12px] font-medium',
        active ? 'border-ink bg-ink text-white' : 'border-line bg-paper text-ink-muted',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

const inputClass =
  'w-full border border-line bg-paper px-3 py-2.5 text-[13px] text-ink outline-none focus:border-ink'
