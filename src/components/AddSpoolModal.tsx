import { useState, useEffect, useMemo } from 'preact/hooks'
import { useApp } from '../context/AppContext'
import { Modal } from './Modal'
import { Spool, KInfo, PrintersFilamentPa } from '../lib/api'
import { X, Loader2, ChevronDown, ChevronUp } from 'lucide-preact'
import { getFilamentOptions, getFilamentName, extractBrandFromFilament, extractMaterialFromFilament, COLOR_PRESETS } from '../lib/utils'

interface AddSpoolModalProps {
  isOpen: boolean
  onClose: () => void
  editSpool?: Spool | null  // If provided, we're editing
}

interface SpoolFormData {
  material: string
  subtype: string
  brand: string
  color_name: string
  rgba: string
  label_weight: number
  core_weight: number
  slicer_filament: string
  note: string
  full_when_added: 'yes' | 'no' | 'unspecified'
}

const defaultFormData: SpoolFormData = {
  material: '',
  subtype: '',
  brand: '',
  color_name: '',
  rgba: '#cccccc',
  label_weight: 1000,
  core_weight: 250,
  slicer_filament: '',
  note: '',
  full_when_added: 'unspecified',
}

const MATERIALS = ['PLA', 'PETG', 'ABS', 'TPU', 'ASA', 'PC', 'PA', 'PVA', 'HIPS']
const WEIGHTS = [250, 500, 750, 1000]

export function AddSpoolModal({ isOpen, onClose, editSpool }: AddSpoolModalProps) {
  const { addSpool, editSpool: updateSpool, filamentBrands, spoolsCatalog, getSpoolKInfo, getPrintersFilamentPa } = useApp()
  const [activeTab, setActiveTab] = useState<'info' | 'pa'>('info')
  const [formData, setFormData] = useState<SpoolFormData>(defaultFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [kInfo, setKInfo] = useState<KInfo | null>(null)
  const [, setIsLoadingKInfo] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [printersPA, setPrintersPA] = useState<PrintersFilamentPa | null>(null)
  const [isLoadingPA, setIsLoadingPA] = useState(false)
  const [expandedPrinters, setExpandedPrinters] = useState<Set<string>>(new Set())
  const [selectedProfiles, setSelectedProfiles] = useState<Set<string>>(new Set())

  const isEditing = !!editSpool

  // Reset form when modal opens/closes or editSpool changes
  useEffect(() => {
    if (isOpen) {
      if (editSpool) {
        setFormData({
          material: editSpool.material || '',
          subtype: editSpool.subtype || '',
          brand: editSpool.brand || '',
          color_name: editSpool.color_name || '',
          rgba: editSpool.rgba || '#cccccc',
          label_weight: editSpool.label_weight || 1000,
          core_weight: editSpool.core_weight || 250,
          slicer_filament: editSpool.slicer_filament || '',
          note: editSpool.note || '',
          full_when_added: 'unspecified',
        })
        // Load K info for editing
        setIsLoadingKInfo(true)
        getSpoolKInfo(editSpool.id).then(info => {
          setKInfo(info)
          setIsLoadingKInfo(false)
        })
      } else {
        setFormData(defaultFormData)
        setKInfo(null)
      }
      setActiveTab('info')
      setError(null)
      setSuccessMessage(null)
      setPrintersPA(null)
      setExpandedPrinters(new Set())
      setSelectedProfiles(new Set())
    }
  }, [isOpen, editSpool, getSpoolKInfo])

  // Auto-fetch PA profiles and auto-select brand/material when slicer_filament changes
  useEffect(() => {
    if (formData.slicer_filament) {
      // Auto-select brand if it matches (only when adding new spool)
      if (!isEditing) {
        const extractedBrand = extractBrandFromFilament(formData.slicer_filament)
        if (extractedBrand && filamentBrands.includes(extractedBrand) && !formData.brand) {
          updateField('brand', extractedBrand)
        }

        // Auto-select material if it matches
        const extractedMaterial = extractMaterialFromFilament(formData.slicer_filament)
        if (extractedMaterial && !formData.material) {
          updateField('material', extractedMaterial)
        }
      }

      // Fetch PA profiles
      setIsLoadingPA(true)
      getPrintersFilamentPa(formData.slicer_filament).then(data => {
        setPrintersPA(data)
        // Expand all printers by default
        if (data?.printers) {
          setExpandedPrinters(new Set(Object.keys(data.printers)))
        }
        setIsLoadingPA(false)
      })
    } else {
      setPrintersPA(null)
    }
  }, [formData.slicer_filament, getPrintersFilamentPa, filamentBrands, isEditing])

  // Convert loaded kInfo to selected profiles (for edit mode)
  useEffect(() => {
    if (kInfo && printersPA) {
      const profiles = new Set<string>()

      // Iterate through kInfo and build profile keys
      for (const [printerSerial, printer] of Object.entries(kInfo.printers)) {
        for (const [extruderStr, extruder] of Object.entries(printer.extruders)) {
          for (const [diameter, diameterData] of Object.entries(extruder.diameters)) {
            for (const [nozzleId, nozzle] of Object.entries(diameterData.nozzles)) {
              // Build profile key
              const profileKey = `${printerSerial}:${extruderStr}:${diameter}:${nozzleId}:${nozzle.cali_idx}`
              profiles.add(profileKey)
            }
          }
        }
      }

      if (profiles.size > 0) {
        setSelectedProfiles(profiles)
      }
    }
  }, [kInfo, printersPA])

  const togglePrinter = (printerSerial: string) => {
    setExpandedPrinters(prev => {
      const next = new Set(prev)
      if (next.has(printerSerial)) {
        next.delete(printerSerial)
      } else {
        next.add(printerSerial)
      }
      return next
    })
  }

  const toggleProfile = (profileKey: string) => {
    setSelectedProfiles(prev => {
      const next = new Set(prev)
      if (next.has(profileKey)) {
        next.delete(profileKey)
      } else {
        next.add(profileKey)
      }
      return next
    })
  }

  const updateField = <K extends keyof SpoolFormData>(key: K, value: SpoolFormData[K]) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  const buildSpoolData = (): Partial<Spool> => ({
    material: formData.material,
    subtype: formData.subtype,
    brand: formData.brand,
    color_name: formData.color_name,
    // Backend expects color WITHOUT # prefix (e.g., "FF0000" not "#FF0000")
    rgba: formData.rgba.replace('#', ''),
    label_weight: formData.label_weight,
    core_weight: formData.core_weight,
    slicer_filament: formData.slicer_filament,
    note: formData.note,
  })

  // Build KInfo from selected profiles
  const buildKInfoFromSelection = (): KInfo | null => {
    if (selectedProfiles.size === 0 || !printersPA) return kInfo // Return existing kInfo if no selections

    const newKInfo: KInfo = { printers: {} }

    for (const profileKey of selectedProfiles) {
      // profileKey format: "printerSerial:extruder:diameter:nozzle_id:cali_idx"
      const [printerSerial, extruderStr, diameter, nozzleId, caliIdxStr] = profileKey.split(':')
      const extruder = parseInt(extruderStr)
      const caliIdx = parseInt(caliIdxStr)

      // Find the matching profile data
      const printer = printersPA.printers[printerSerial]
      if (!printer) continue

      const paEntry = printer.pressure_advance.find(
        pa => pa.extruder === extruder && pa.diameter === diameter && pa.nozzle_id === nozzleId && pa.cali_idx === caliIdx
      )
      if (!paEntry) continue

      // Build the nested KInfo structure
      if (!newKInfo.printers[printerSerial]) {
        newKInfo.printers[printerSerial] = { extruders: {} }
      }
      if (!newKInfo.printers[printerSerial].extruders[extruder]) {
        newKInfo.printers[printerSerial].extruders[extruder] = { diameters: {} }
      }
      if (!newKInfo.printers[printerSerial].extruders[extruder].diameters[diameter]) {
        newKInfo.printers[printerSerial].extruders[extruder].diameters[diameter] = { nozzles: {} }
      }

      newKInfo.printers[printerSerial].extruders[extruder].diameters[diameter].nozzles[nozzleId] = {
        name: paEntry.name,
        k_value: paEntry.k_value,
        cali_idx: paEntry.cali_idx,
        setting_id: paEntry.setting_id,
      }
    }

    return Object.keys(newKInfo.printers).length > 0 ? newKInfo : kInfo
  }

  const handleSubmit = async () => {
    if (!formData.material) {
      setError('Material is required')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const spoolData = buildSpoolData()
      const kInfoToSave = buildKInfoFromSelection()

      if (isEditing && editSpool) {
        spoolData.id = editSpool.id
        spoolData.tag_id = editSpool.tag_id
        await updateSpool(spoolData, kInfoToSave || undefined)
      } else {
        await addSpool(spoolData, kInfoToSave || undefined)
      }

      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save spool')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddSimilar = async () => {
    if (!formData.material) {
      setError('Material is required')
      return
    }

    setIsSubmitting(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const spoolData = buildSpoolData()
      const kInfoToSave = buildKInfoFromSelection()
      await addSpool(spoolData, kInfoToSave || undefined)
      // Don't close modal - keep form data for adding another similar spool
      setSuccessMessage('Spool added! Modify and add another, or click "Add Spool" to finish.')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save spool')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Get filament options for dropdown
  const filamentOptions = useMemo(() => getFilamentOptions(), [])

  // Parse core weights from catalog
  const coreWeightOptions = spoolsCatalog
    .map(line => {
      const match = line.match(/(\d+)$/)
      return match ? parseInt(match[1]) : null
    })
    .filter((w): w is number => w !== null)
    .filter((w, i, arr) => arr.indexOf(w) === i)
    .sort((a, b) => a - b)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Spool Information' : 'Add New Spool'}
      size="lg"
      footer={
        <>
          <button class="btn" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          {!isEditing && (
            <button class="btn" onClick={handleAddSimilar} disabled={isSubmitting}>
              Add Similar
            </button>
          )}
          <button class="btn btn-primary" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Spool'}
          </button>
        </>
      }
    >
      {/* Tabs */}
      <div class="tabs mb-6 -mx-6 -mt-6 px-6">
        <button
          class={`tab ${activeTab === 'info' ? 'active' : ''}`}
          onClick={() => setActiveTab('info')}
        >
          Filament Info
        </button>
        <button
          class={`tab ${activeTab === 'pa' ? 'active' : ''}`}
          onClick={() => setActiveTab('pa')}
        >
          PA Profile (K)
        </button>
      </div>

      {error && (
        <div class="mb-4 p-3 bg-[var(--error-color)]/10 border border-[var(--error-color)]/30 rounded-lg text-[var(--error-color)] text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X class="w-4 h-4" /></button>
        </div>
      )}

      {successMessage && (
        <div class="mb-4 p-3 bg-[var(--success-color)]/10 border border-[var(--success-color)]/30 rounded-lg text-[var(--success-color)] text-sm flex items-center justify-between">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)}><X class="w-4 h-4" /></button>
        </div>
      )}

      {activeTab === 'info' ? (
        <div class="space-y-4">
          {/* ID and Tag ID (edit mode only) */}
          {isEditing && editSpool && (
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="label">ID</label>
                <input
                  type="text"
                  class="input bg-[var(--bg-tertiary)]"
                  value={editSpool.id}
                  disabled
                />
              </div>
              <div>
                <label class="label">Tag ID</label>
                <input
                  type="text"
                  class="input bg-[var(--bg-tertiary)] font-mono text-sm"
                  value={editSpool.tag_id}
                  disabled
                />
              </div>
            </div>
          )}

          {/* Slicer Filament */}
          <div>
            <label class="label">Slicer Filament</label>
            <select
              class="select"
              value={formData.slicer_filament}
              onChange={(e) => updateField('slicer_filament', (e.target as HTMLSelectElement).value)}
            >
              <option value="">Select filament...</option>
              {filamentOptions.map(({ code, name }) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
            {formData.slicer_filament && (
              <p class="text-xs text-[var(--text-muted)] mt-1">Code: {formData.slicer_filament}</p>
            )}
          </div>

          {/* Brand and Label Weight */}
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="label">Filament Brand</label>
              <select
                class="select"
                value={formData.brand}
                onChange={(e) => updateField('brand', (e.target as HTMLSelectElement).value)}
              >
                <option value="">Select brand...</option>
                {filamentBrands.map(brand => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>
            </div>
            <div>
              <label class="label">Label Weight *</label>
              <select
                class="select"
                value={formData.label_weight}
                onChange={(e) => updateField('label_weight', parseInt((e.target as HTMLSelectElement).value))}
              >
                {WEIGHTS.map(w => (
                  <option key={w} value={w}>{w >= 1000 ? `${w/1000}kg` : `${w}g`}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Material and Subtype */}
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="label">Material *</label>
              <select
                class="select"
                value={formData.material}
                onChange={(e) => updateField('material', (e.target as HTMLSelectElement).value)}
              >
                <option value="">Select material...</option>
                {MATERIALS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label class="label">Subtype</label>
              <input
                type="text"
                class="input"
                placeholder="e.g., Silk+, Matte, HF"
                value={formData.subtype}
                onInput={(e) => updateField('subtype', (e.target as HTMLInputElement).value)}
              />
            </div>
          </div>

          {/* Color Preview */}
          <div>
            <label class="label">Color</label>
            <div
              class="h-20 rounded-lg flex items-center justify-center mb-3"
              style={{ backgroundColor: formData.rgba }}
            >
              <span class="bg-white/90 text-gray-800 px-3 py-1 rounded-full text-sm font-medium">
                {formData.color_name || 'Color Preview'}
              </span>
            </div>
          </div>

          {/* RGBA, Color Name, and Presets */}
          <div class="grid grid-cols-3 gap-4">
            <div>
              <label class="label">RGBA Color</label>
              <div class="flex gap-2">
                <input
                  type="text"
                  class="input flex-1 font-mono"
                  placeholder="RRGGBB"
                  value={formData.rgba.replace('#', '')}
                  onInput={(e) => {
                    let val = (e.target as HTMLInputElement).value.replace('#', '')
                    if (val.length <= 8) {
                      updateField('rgba', `#${val}`)
                    }
                  }}
                />
                <input
                  type="color"
                  class="w-10 h-10 rounded cursor-pointer border border-[var(--border-color)] shrink-0"
                  value={formData.rgba.substring(0, 7)}
                  onInput={(e) => updateField('rgba', (e.target as HTMLInputElement).value)}
                />
              </div>
            </div>
            <div>
              <label class="label">Color Name</label>
              <input
                type="text"
                class="input"
                placeholder="e.g., Titan Gray"
                value={formData.color_name}
                onInput={(e) => updateField('color_name', (e.target as HTMLInputElement).value)}
              />
            </div>
            <div>
              <label class="label">Preset</label>
              <select
                class="select"
                value=""
                onChange={(e) => {
                  const preset = COLOR_PRESETS.find(c => c.name === (e.target as HTMLSelectElement).value)
                  if (preset) {
                    updateField('color_name', preset.name)
                    updateField('rgba', `#${preset.hex}`)
                  }
                  (e.target as HTMLSelectElement).value = '' // Reset select
                }}
              >
                <option value="">Select...</option>
                {COLOR_PRESETS.map(color => (
                  <option key={color.name} value={color.name}>{color.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Full When Added and Core Weight */}
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="label">Full When Added</label>
              <select
                class="select"
                value={formData.full_when_added}
                onChange={(e) => updateField('full_when_added', (e.target as HTMLSelectElement).value as 'yes' | 'no' | 'unspecified')}
              >
                <option value="unspecified">Unspecified</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div>
              <label class="label">Empty Spool Weight (g)</label>
              <select
                class="select"
                value={formData.core_weight}
                onChange={(e) => updateField('core_weight', parseInt((e.target as HTMLSelectElement).value))}
              >
                {(coreWeightOptions.length > 0 ? coreWeightOptions : [200, 220, 245, 250, 280]).map(w => (
                  <option key={w} value={w}>{w}g</option>
                ))}
              </select>
            </div>
          </div>

          {/* Note */}
          <div>
            <label class="label">Note</label>
            <input
              type="text"
              class="input"
              placeholder="Enter any additional notes..."
              value={formData.note}
              onInput={(e) => updateField('note', (e.target as HTMLInputElement).value)}
            />
          </div>
        </div>
      ) : (
        <div class="space-y-4">
          {!formData.slicer_filament ? (
            <div class="text-center py-8 bg-[var(--bg-tertiary)] rounded-lg">
              <p class="text-[var(--text-muted)]">Select a slicer filament first</p>
              <p class="text-xs text-[var(--text-muted)] mt-2">
                PA profiles will be loaded based on the selected filament
              </p>
            </div>
          ) : isLoadingPA ? (
            <div class="flex items-center justify-center py-8">
              <Loader2 class="w-6 h-6 animate-spin text-[var(--accent-color)]" />
              <span class="ml-2 text-[var(--text-muted)]">Loading PA profiles...</span>
            </div>
          ) : printersPA && Object.keys(printersPA.printers).length > 0 ? (
            <div class="space-y-3">
              {Object.entries(printersPA.printers).map(([printerSerial, printer]) => (
                <div key={printerSerial} class="border border-[var(--border-color)] rounded-lg overflow-hidden">
                  {/* Printer Header - Collapsible */}
                  <button
                    class="w-full flex items-center gap-2 px-4 py-3 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] transition-colors text-left"
                    onClick={() => togglePrinter(printerSerial)}
                  >
                    {expandedPrinters.has(printerSerial) ? (
                      <ChevronUp class="w-4 h-4 text-[var(--text-muted)]" />
                    ) : (
                      <ChevronDown class="w-4 h-4 text-[var(--text-muted)]" />
                    )}
                    <span class="font-medium text-[var(--text-primary)]">
                      {printer.name} ({printerSerial})
                    </span>
                  </button>

                  {/* Printer Content */}
                  {expandedPrinters.has(printerSerial) && (
                    <div class="p-4 space-y-4">
                      {printer.pressure_advance.length === 0 ? (
                        <p class="text-sm text-[var(--text-muted)] italic">
                          No pressure advance profiles available in printer(s) for selected slicer filament.
                        </p>
                      ) : (
                        /* Group by extruder */
                        [...new Set(printer.pressure_advance.map(pa => pa.extruder))].map(extruderIdx => (
                          <div key={extruderIdx} class="space-y-3">
                            <h4 class="font-medium text-[var(--text-primary)]">
                              {extruderIdx === 0 ? 'Right' : 'Left'} Extruder ({extruderIdx})
                            </h4>
                            {/* Group by diameter */}
                            {[...new Set(printer.pressure_advance.filter(pa => pa.extruder === extruderIdx).map(pa => pa.diameter))].map(diameter => (
                              <div key={diameter} class="ml-4 space-y-2">
                                <div class="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                                  <ChevronDown class="w-3 h-3" />
                                  Nozzle Diameter: {diameter}mm
                                </div>
                                {/* Group by nozzle_id */}
                                {[...new Set(printer.pressure_advance.filter(pa => pa.extruder === extruderIdx && pa.diameter === diameter).map(pa => pa.nozzle_id))].map(nozzleId => (
                                  <div key={nozzleId} class="ml-6 space-y-1">
                                    <div class="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                                      <ChevronDown class="w-3 h-3" />
                                      Nozzle Type: {nozzleId.includes('HH') ? 'High Flow' : 'Standard'} ({nozzleId})
                                    </div>
                                    <div class="ml-6 space-y-1">
                                      {printer.pressure_advance
                                        .filter(pa => pa.extruder === extruderIdx && pa.diameter === diameter && pa.nozzle_id === nozzleId)
                                        .map(pa => {
                                          const profileKey = `${printerSerial}:${pa.extruder}:${pa.diameter}:${pa.nozzle_id}:${pa.cali_idx}`
                                          return (
                                            <label key={profileKey} class="flex items-center gap-2 cursor-pointer hover:bg-[var(--bg-tertiary)] p-1 rounded">
                                              <input
                                                type="checkbox"
                                                checked={selectedProfiles.has(profileKey)}
                                                onChange={() => toggleProfile(profileKey)}
                                                class="w-4 h-4 rounded border-[var(--border-color)]"
                                              />
                                              <span class="text-sm text-[var(--text-primary)]">
                                                {pa.name} (K={pa.k_value})
                                              </span>
                                            </label>
                                          )
                                        })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div class="text-center py-8 bg-[var(--bg-tertiary)] rounded-lg">
              <p class="text-[var(--text-muted)]">No PA profiles found for "{getFilamentName(formData.slicer_filament)}"</p>
              <p class="text-xs text-[var(--text-muted)] mt-2">
                PA profiles are created when calibrating from the printer
              </p>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
