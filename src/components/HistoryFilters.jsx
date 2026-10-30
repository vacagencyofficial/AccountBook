import { CATEGORY_OPTIONS, STATUS_OPTIONS } from '../hooks/useHistoryFilters'
import { statusLabel } from '../utils/labels'

export default function HistoryFilters({
  filters,
  shops,
  entryCategories = [],
  onChange,
  onReset,
  hasActiveFilters,
}) {
  return (
    <div className="space-y-4">
      <label className="block">
        <span className="label">이름·메모·가게로 찾기</span>
        <input
          type="search"
          value={filters.query}
          onChange={(e) => onChange('query', e.target.value)}
          placeholder="예: 니트, 미소옷장"
          className="field"
        />
      </label>

      <label className="block">
        <span className="label">어느 가게인가요?</span>
        <select value={filters.shopId} onChange={(e) => onChange('shopId', e.target.value)} className="field">
          <option value="all">모든 가게</option>
          {(shops ?? []).map((shop) => (
            <option key={shop.id} value={shop.id}>
              {shop.name}
              {shop.building ? ` (${shop.building})` : ''}
              {shop.hidden ? ' · 숨김' : ''}
            </option>
          ))}
        </select>
      </label>

      <FilterGroup label="옷 종류">
        {CATEGORY_OPTIONS.map(({ value, label }) => (
          <FilterChip
            key={value}
            active={filters.category === value}
            onClick={() => onChange('category', value)}
          >
            {value === 'all' ? '전부' : label}
          </FilterChip>
        ))}
      </FilterGroup>

      <FilterGroup label="샀는지">
        {STATUS_OPTIONS.map(({ value }) => (
          <FilterChip key={value} active={filters.status === value} onClick={() => onChange('status', value)}>
            {value === 'all' ? '전부' : statusLabel(value)}
          </FilterChip>
        ))}
      </FilterGroup>

      {entryCategories.length > 0 && (
        <FilterGroup label="가계부 분류 (고르면 그 분류 기록만)">
          {['all', ...entryCategories].map((value) => (
            <FilterChip
              key={value}
              active={filters.entryCategory === value}
              onClick={() => onChange('entryCategory', value)}
            >
              {value === 'all' ? '전부' : value}
            </FilterChip>
          ))}
        </FilterGroup>
      )}

      <label className="flex min-h-[3rem] items-center gap-3 text-[17px] font-bold text-ink">
        <input
          type="checkbox"
          checked={filters.allMonths}
          onChange={(e) => onChange('allMonths', e.target.checked)}
          className="h-6 w-6 accent-[var(--color-brand)]"
        />
        모든 달에서 찾기
      </label>

      {hasActiveFilters && (
        <button type="button" onClick={onReset} className="btn btn-outline w-full">
          조건 지우기
        </button>
      )}
    </div>
  )
}

function FilterGroup({ label, children }) {
  return (
    <div>
      <p className="label">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

function FilterChip({ active, onClick, children }) {
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
