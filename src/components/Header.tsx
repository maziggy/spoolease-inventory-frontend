import { useApp } from '../context/AppContext'
import { useTheme } from '../hooks/useTheme'
import { RefreshCw, Plus, Download, Moon, Sun, FileJson, FileSpreadsheet } from 'lucide-preact'
import { useState, useRef, useEffect } from 'preact/hooks'
import { Spool } from '../lib/api'

interface HeaderProps {
  onAddSpool?: () => void
  filteredSpools?: Spool[]
}

export function Header({ onAddSpool, filteredSpools }: HeaderProps) {
  const { spools, refreshSpools } = useApp()
  const { isDark, toggleTheme } = useTheme()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refreshSpools()
    setIsRefreshing(false)
  }

  const exportCSV = (filtered: boolean = false) => {
    const dataToExport = filtered && filteredSpools ? filteredSpools : spools
    const headers = [
      'ID', 'Tag ID', 'Material', 'Subtype', 'Color', 'RGBA', 'Brand',
      'Label Weight', 'Core Weight', 'Slicer Filament', 'Note', 'Added', 'Encoded'
    ]
    const rows = dataToExport.map(s => [
      s.id,
      s.tag_id,
      s.material,
      s.subtype,
      s.color_name,
      s.rgba,
      s.brand,
      s.label_weight,
      s.core_weight,
      s.slicer_filament,
      `"${(s.note || '').replace(/"/g, '""')}"`,
      s.added_time || '',
      s.encode_time || ''
    ])

    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
    downloadFile(csv, `spoolease-inventory-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv')
    setShowExportMenu(false)
  }

  const exportJSON = () => {
    const data = {
      exported_at: new Date().toISOString(),
      spools: spools
    }
    const json = JSON.stringify(data, null, 2)
    downloadFile(json, `spoolease-backup-${new Date().toISOString().split('T')[0]}.json`, 'application/json')
    setShowExportMenu(false)
  }

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header class="bg-[var(--bg-primary)] border-b border-[var(--border-color)] px-4 md:px-6 py-4 sticky top-0 z-50">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div>
            <h1 class="text-xl font-bold text-[var(--accent-color)]">
              SpoolEase
            </h1>
          </div>
          <span class="text-sm text-[var(--text-secondary)] bg-[var(--bg-tertiary)] px-3 py-1 rounded-full">
            {spools.length} spool{spools.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div class="flex items-center gap-2">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            class="btn btn-icon"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? (
              <Sun class="w-5 h-5 text-[var(--text-secondary)]" />
            ) : (
              <Moon class="w-5 h-5 text-[var(--text-secondary)]" />
            )}
          </button>

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            class="btn btn-icon"
            title="Refresh"
          >
            <RefreshCw
              class={`w-5 h-5 text-[var(--text-secondary)] ${isRefreshing ? 'animate-spin' : ''}`}
            />
          </button>

          {/* Export Dropdown */}
          <div class="dropdown" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              class="btn"
            >
              <Download class="w-4 h-4" />
              <span class="hidden sm:inline">Export</span>
              <span class="text-xs">▾</span>
            </button>
            <div class={`dropdown-menu ${showExportMenu ? 'show' : ''}`}>
              <button onClick={() => exportCSV(false)} class="dropdown-item flex items-center gap-2 w-full text-left">
                <FileSpreadsheet class="w-4 h-4" />
                CSV (All)
              </button>
              <button onClick={() => exportCSV(true)} class="dropdown-item flex items-center gap-2 w-full text-left">
                <FileSpreadsheet class="w-4 h-4" />
                CSV (Filtered)
              </button>
              <button onClick={exportJSON} class="dropdown-item flex items-center gap-2 w-full text-left">
                <FileJson class="w-4 h-4" />
                JSON (Backup)
              </button>
            </div>
          </div>

          {/* Add Spool */}
          <button
            onClick={onAddSpool}
            class="btn btn-primary"
          >
            <Plus class="w-5 h-5" />
            <span class="hidden sm:inline">Add Spool</span>
          </button>
        </div>
      </div>
    </header>
  )
}
