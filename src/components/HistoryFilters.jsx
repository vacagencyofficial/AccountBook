import { CATEGORY_OPTIONS, PERIOD_OPTIONS, STATUS_OPTIONS } from '../hooks/useHistoryFilters'

export default function HistoryFilters({ filters, shops, onChange, onReset, hasActiveFilters }) {
  return (
    <div className="space-y-4 rounded-2xl border border-line bg-raised p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">필터 · 검색</h2>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="text-xs font-medium text-ink-muted hover:text-ink"
          >
            초기화
          </button>
        )}
      </div>

      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-ink-muted">검색</span>
        <input
          type="search"
          value={filters.query}
          onChange={(e) => onChange('query', e.target.value)}
          placeholder="품명, 가게, 메모…"
          className={inputClass}
        />
      </label>

      <FilterGroup label="기간">
        <div className="flex flex-wrap gap-2">
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
              <span className="mb-1 block text-xs text-ink-muted">시작일</span>
              <input
                type="date"
                value={filters.customStart}
                onChange={(e) => onChange('customStart', e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-ink-muted">종료일</span>
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
        <div className="flex flex-wrap gap-2">
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
        <div className="flex flex-wrap gap-2">
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
      <p className="mb-2 text-xs font-medium text-ink-muted">{label}</p>
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
        'rounded-lg px-3 py-1.5 text-sm font-medium transition',
        active ? 'bg-ink text-white' : 'bg-paper text-ink-muted ring-1 ring-line',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

const inputClass =
  'w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-brand focus:bg-raised focus:ring-2 focus:ring-brand/15'
