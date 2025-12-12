import { useMemo } from 'preact/hooks'
import { useApp } from '../context/AppContext'
import { getUniqueValues } from '../lib/utils'
import { X } from 'lucide-preact'

export interface FilterState {
  material: string
  brand: string
  color: string
  location: 'all' | 'in_printer' | 'in_storage'
  paStatus: 'all' | 'has_k' | 'no_k'
  dataOrigin: string
  minWeight: string
  maxWeight: string
  addedAfter: string
  addedBefore: string
  encoded: 'all' | 'encoded' | 'not_encoded'
}

export const defaultFilters: FilterState = {
  material: '',
  brand: '',
  color: '',
  location: 'all',
  paStatus: 'all',
  dataOrigin: '',
  minWeight: '',
  maxWeight: '',
  addedAfter: '',
  addedBefore: '',
  encoded: 'all',
}

interface FilterBarProps {
  filters: FilterState
  onFilterChange: (filters: FilterState) => void
}

export function FilterBar({ filters, onFilterChange }: FilterBarProps) {
  const { spools } = useApp()

  const { materials, brands } = useMemo(() => getUniqueValues(spools), [spools])

  const dataOrigins = useMemo(() => {
    const origins = new Set<string>()
    spools.forEach(s => {
      if (s.data_origin) origins.add(s.data_origin)
    })
    return Array.from(origins).sort()
  }, [spools])

  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    onFilterChange({ ...filters, [key]: value })
  }

  const clearFilters = () => {
    onFilterChange(defaultFilters)
  }

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    const defaultValue = defaultFilters[key as keyof FilterState]
    return value !== defaultValue
  })

  return (
    <div class="card p-4 mb-4">
      {/* Row 1: Main filters */}
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
        {/* Material */}
        <div>
          <label class="label">Material</label>
          <select
            class="select"
            value={filters.material}
            onChange={(e) => updateFilter('material', (e.target as HTMLSelectElement).value)}
          >
            <option value="">All Materials</option>
            {materials.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* Brand */}
        <div>
          <label class="label">Brand</label>
          <select
            class="select"
            value={filters.brand}
            onChange={(e) => updateFilter('brand', (e.target as HTMLSelectElement).value)}
          >
            <option value="">All Brands</option>
            {brands.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        {/* Color */}
        <div>
          <label class="label">Color</label>
          <input
            type="text"
            class="input"
            placeholder="Search color..."
            value={filters.color}
            onInput={(e) => updateFilter('color', (e.target as HTMLInputElement).value)}
          />
        </div>

        {/* Location */}
        <div>
          <label class="label">Location</label>
          <select
            class="select"
            value={filters.location}
            onChange={(e) => updateFilter('location', (e.target as HTMLSelectElement).value as FilterState['location'])}
          >
            <option value="all">All</option>
            <option value="in_printer">In Printer</option>
            <option value="in_storage">In Storage</option>
          </select>
        </div>

        {/* PA Status */}
        <div>
          <label class="label">PA Status</label>
          <select
            class="select"
            value={filters.paStatus}
            onChange={(e) => updateFilter('paStatus', (e.target as HTMLSelectElement).value as FilterState['paStatus'])}
          >
            <option value="all">All</option>
            <option value="has_k">Has K</option>
            <option value="no_k">No K</option>
          </select>
        </div>

        {/* Data Origin */}
        <div>
          <label class="label">Data Origin</label>
          <select
            class="select"
            value={filters.dataOrigin}
            onChange={(e) => updateFilter('dataOrigin', (e.target as HTMLSelectElement).value)}
          >
            <option value="">All</option>
            {dataOrigins.map(o => (
              <option key={o} value={o}>{o || 'Manual'}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 2: Secondary filters */}
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
        {/* Added After */}
        <div>
          <label class="label">Added After</label>
          <input
            type="date"
            class="input"
            value={filters.addedAfter}
            onChange={(e) => updateFilter('addedAfter', (e.target as HTMLInputElement).value)}
          />
        </div>

        {/* Added Before */}
        <div>
          <label class="label">Added Before</label>
          <input
            type="date"
            class="input"
            value={filters.addedBefore}
            onChange={(e) => updateFilter('addedBefore', (e.target as HTMLInputElement).value)}
          />
        </div>

        {/* Min Weight */}
        <div>
          <label class="label">Min (g)</label>
          <input
            type="number"
            class="input"
            placeholder="0"
            value={filters.minWeight}
            onInput={(e) => updateFilter('minWeight', (e.target as HTMLInputElement).value)}
          />
        </div>

        {/* Max Weight */}
        <div>
          <label class="label">Max (g)</label>
          <input
            type="number"
            class="input"
            placeholder="1000"
            value={filters.maxWeight}
            onInput={(e) => updateFilter('maxWeight', (e.target as HTMLInputElement).value)}
          />
        </div>

        {/* NFC Encoded */}
        <div>
          <label class="label">NFC Encoded</label>
          <select
            class="select"
            value={filters.encoded}
            onChange={(e) => updateFilter('encoded', (e.target as HTMLSelectElement).value as FilterState['encoded'])}
          >
            <option value="all">All</option>
            <option value="encoded">Encoded</option>
            <option value="not_encoded">Not Encoded</option>
          </select>
        </div>

        {/* Clear Filters */}
        <div class="flex items-end">
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              class="flex items-center gap-1 text-sm text-[var(--error-color)] hover:underline"
            >
              <X class="w-4 h-4" />
              Clear All Filters
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Apply filters to spools array
 */
export function applyFilters(
  spools: import('../lib/api').Spool[],
  filters: FilterState,
  spoolsInPrinters: import('../lib/api').SpoolsInPrinters
): import('../lib/api').Spool[] {
  return spools.filter(spool => {
    // Material filter
    if (filters.material && spool.material !== filters.material) return false

    // Brand filter
    if (filters.brand && spool.brand !== filters.brand) return false

    // Color filter (search in color_name)
    if (filters.color && !spool.color_name.toLowerCase().includes(filters.color.toLowerCase())) return false

    // Location filter
    if (filters.location === 'in_printer' && !(spool.id in spoolsInPrinters)) return false
    if (filters.location === 'in_storage' && spool.id in spoolsInPrinters) return false

    // PA Status filter
    if (filters.paStatus === 'has_k' && !spool.ext_has_k) return false
    if (filters.paStatus === 'no_k' && spool.ext_has_k) return false

    // Data Origin filter
    if (filters.dataOrigin && spool.data_origin !== filters.dataOrigin) return false

    // Weight range filter (remaining weight)
    const netWeight = spool.label_weight - spool.consumed_since_add
    if (filters.minWeight && netWeight < parseInt(filters.minWeight)) return false
    if (filters.maxWeight && netWeight > parseInt(filters.maxWeight)) return false

    // Date filters
    if (filters.addedAfter && spool.added_time) {
      const addedDate = new Date(parseInt(spool.added_time) * 1000)
      const filterDate = new Date(filters.addedAfter)
      if (addedDate < filterDate) return false
    }
    if (filters.addedBefore && spool.added_time) {
      const addedDate = new Date(parseInt(spool.added_time) * 1000)
      const filterDate = new Date(filters.addedBefore)
      if (addedDate > filterDate) return false
    }

    // Encoded filter
    if (filters.encoded === 'encoded' && !spool.encode_time) return false
    if (filters.encoded === 'not_encoded' && spool.encode_time) return false

    return true
  })
}
