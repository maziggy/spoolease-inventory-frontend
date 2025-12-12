import { useState, useMemo } from 'preact/hooks'
import { AppProvider, useApp } from './context/AppContext'
import { LoginScreen } from './components/LoginScreen'
import { SpoolsTable } from './components/SpoolsTable'
import { Header } from './components/Header'
import { StatsBar } from './components/StatsBar'
import { FilterBar, FilterState, defaultFilters, applyFilters } from './components/FilterBar'
import { AddSpoolModal } from './components/AddSpoolModal'
import { DeleteModal } from './components/DeleteModal'
import { ColumnConfigModal, ColumnConfig, getDefaultColumns } from './components/ColumnConfigModal'
import { Spool } from './lib/api'

const COLUMN_CONFIG_KEY = 'spoolease-column-config'

function loadColumnConfig(): ColumnConfig[] {
  const defaults = getDefaultColumns()
  const validIds = new Set(defaults.map(c => c.id))

  try {
    const stored = localStorage.getItem(COLUMN_CONFIG_KEY)
    if (stored) {
      let savedConfig: ColumnConfig[] = JSON.parse(stored)

      // Remove columns that no longer exist in defaults
      savedConfig = savedConfig.filter(c => validIds.has(c.id))

      const savedIds = new Set(savedConfig.map(c => c.id))

      // Add any new columns from defaults that aren't in saved config
      const newColumns = defaults.filter(c => !savedIds.has(c.id))

      if (newColumns.length > 0) {
        // Insert new columns before 'actions' column, or at end
        const actionsIndex = savedConfig.findIndex(c => c.id === 'actions')
        if (actionsIndex >= 0) {
          savedConfig.splice(actionsIndex, 0, ...newColumns)
        } else {
          savedConfig.push(...newColumns)
        }
      }

      return savedConfig
    }
  } catch {
    // Ignore parse errors
  }
  return defaults
}

function saveColumnConfig(config: ColumnConfig[]) {
  localStorage.setItem(COLUMN_CONFIG_KEY, JSON.stringify(config))
}

function AppContent() {
  const { isLoading, isAuthenticated, error, spools, spoolsInPrinters } = useApp()
  const [filters, setFilters] = useState<FilterState>(defaultFilters)

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingSpool, setEditingSpool] = useState<Spool | null>(null)
  const [deletingSpool, setDeletingSpool] = useState<Spool | null>(null)
  const [showColumnConfig, setShowColumnConfig] = useState(false)
  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>(loadColumnConfig)

  // Apply filters to spools
  const filteredSpools = useMemo(
    () => applyFilters(spools, filters, spoolsInPrinters),
    [spools, filters, spoolsInPrinters]
  )

  // Modal handlers
  const handleAddSpool = () => {
    setEditingSpool(null)
    setShowAddModal(true)
  }

  const handleEditSpool = (spool: Spool) => {
    setEditingSpool(spool)
    setShowAddModal(true)
  }

  const handleDeleteSpool = (spool: Spool) => {
    setDeletingSpool(spool)
  }

  const handleCloseAddModal = () => {
    setShowAddModal(false)
    setEditingSpool(null)
  }

  const handleSaveColumnConfig = (newConfig: ColumnConfig[]) => {
    setColumnConfig(newConfig)
    saveColumnConfig(newConfig)
  }

  if (isLoading) {
    return (
      <div class="min-h-screen flex items-center justify-center">
        <div class="text-center">
          <div class="w-8 h-8 border-2 border-[var(--accent-color)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p class="text-[var(--text-secondary)]">Connecting to SpoolEase...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginScreen />
  }

  return (
    <div class="min-h-screen flex flex-col">
      <Header
        onAddSpool={handleAddSpool}
        filteredSpools={filteredSpools}
      />
      {error && (
        <div class="bg-[var(--error-color)] text-white px-4 py-2 text-sm">
          {error}
        </div>
      )}
      <main class="flex-1 p-4 md:p-6">
        <StatsBar />
        <FilterBar filters={filters} onFilterChange={setFilters} />
        <SpoolsTable
          spools={filteredSpools}
          onEditSpool={handleEditSpool}
          onDeleteSpool={handleDeleteSpool}
          columnConfig={columnConfig}
          onOpenColumns={() => setShowColumnConfig(true)}
        />
      </main>

      {/* Modals */}
      <AddSpoolModal
        isOpen={showAddModal}
        onClose={handleCloseAddModal}
        editSpool={editingSpool}
      />

      <DeleteModal
        isOpen={!!deletingSpool}
        onClose={() => setDeletingSpool(null)}
        spool={deletingSpool}
      />

      <ColumnConfigModal
        isOpen={showColumnConfig}
        onClose={() => setShowColumnConfig(false)}
        columns={columnConfig}
        onSave={handleSaveColumnConfig}
      />
    </div>
  )
}

export function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}
