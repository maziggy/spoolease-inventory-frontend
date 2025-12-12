/**
 * SpoolEase API Client
 * Handles encrypted communication with the ESP32 device
 */

import { deriveKey, encrypt, decrypt } from './crypto'

export interface Spool {
  id: string
  tag_id: string
  material: string
  subtype: string
  color_name: string
  rgba: string
  brand: string
  core_weight: number
  label_weight: number
  weight_new?: number
  weight_current?: number
  note: string
  slicer_filament: string
  added_time?: string
  encode_time?: string
  added_full?: boolean
  consumed_since_add: number
  consumed_since_weight: number
  ext_has_k: boolean
  data_origin: string
  tag_type: string
}

export interface SpoolsInPrinters {
  [tagId: string]: string // tag_id -> printer_serial
}

export interface KNozzleId {
  name: string
  k_value: string
  cali_idx: number
  setting_id?: string
}

export interface KNozzleDiameter {
  nozzles: Record<string, KNozzleId>  // nozzle_id (e.g., "HH00") -> KNozzleId
}

export interface KExtruder {
  diameters: Record<string, KNozzleDiameter>  // diameter (e.g., "0.4") -> KNozzleDiameter
}

export interface KPrinter {
  extruders: Record<number, KExtruder>  // extruder index -> KExtruder
}

export interface KInfo {
  printers: Record<string, KPrinter>  // printer_serial -> KPrinter
}

export interface PressureAdvanceEntry {
  extruder: number
  diameter: string
  nozzle_id: string
  name: string
  k_value: string
  cali_idx: number
  setting_id?: string
}

export interface PrinterEntry {
  name: string
  extruders: number
  pressure_advance: PressureAdvanceEntry[]
}

export interface PrintersFilamentPa {
  printers: Record<string, PrinterEntry>
}

class ApiClient {
  private key: Uint8Array | null = null

  async init(securityKey: string): Promise<void> {
    this.key = await deriveKey(securityKey)
  }

  isInitialized(): boolean {
    return this.key !== null
  }

  private async encryptPayload(data: object): Promise<string> {
    if (!this.key) throw new Error('API client not initialized')
    return await encrypt(this.key, JSON.stringify(data))
  }

  private async decryptResponse(data: string): Promise<string> {
    if (!this.key) throw new Error('API client not initialized')
    return await decrypt(this.key, data)
  }

  // ============ Unencrypted endpoints ============

  async getSpoolsCatalog(): Promise<string> {
    const res = await fetch('/spools-catalog')
    return res.text()
  }

  async getFilamentBrands(): Promise<string> {
    const res = await fetch('/filament-brands')
    return res.text()
  }

  // ============ Encrypted endpoints ============

  async getSpools(): Promise<Spool[]> {
    const res = await fetch('/api/spools')
    const encrypted = await res.text()
    const csv = await this.decryptResponse(encrypted)
    return this.parseSpoolsCsv(csv)
  }

  async getSpoolsInPrinters(): Promise<SpoolsInPrinters> {
    const res = await fetch('/api/spools-in-printers')
    const encrypted = await res.text()
    const json = await this.decryptResponse(encrypted)
    const data = JSON.parse(json)
    return data.spools || {}
  }

  async addSpool(spool: Partial<Spool>, kInfo?: KInfo): Promise<{ id: string; spools: Spool[] }> {
    const payload = await this.encryptPayload({
      id: spool.id || '',
      tag_id: spool.tag_id || '',
      rgba: spool.rgba || '',
      color_name: spool.color_name || '',
      material: spool.material || '',
      subtype: spool.subtype || '',
      brand: spool.brand || '',
      core_weight: spool.core_weight || 0,
      label_weight: spool.label_weight || 0,
      note: spool.note || '',
      slicer_filament: spool.slicer_filament || '',
      full_unused: 'y',
      k_info: kInfo || null,
    })

    const res = await fetch('/api/spools/add-edit', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: payload,
    })

    const encrypted = await res.text()
    const json = await this.decryptResponse(encrypted)
    const data = JSON.parse(json)
    return {
      id: data.id,
      spools: this.parseSpoolsCsv(data.csv),
    }
  }

  async editSpool(spool: Partial<Spool>, kInfo?: KInfo): Promise<{ id: string; spools: Spool[] }> {
    return this.addSpool(spool, kInfo)
  }

  async deleteSpool(id: string): Promise<Spool[]> {
    const payload = await this.encryptPayload({ id })

    const res = await fetch('/api/spools/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: payload,
    })

    const encrypted = await res.text()
    const csv = await this.decryptResponse(encrypted)
    return this.parseSpoolsCsv(csv)
  }

  async getSpoolKInfo(id: string): Promise<KInfo | null> {
    const payload = await this.encryptPayload({ id })

    const res = await fetch('/api/spool-kinfo', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: payload,
    })

    if (!res.ok) return null

    const encrypted = await res.text()
    const json = await this.decryptResponse(encrypted)
    const data = JSON.parse(json)
    return data.k_info || null
  }

  async getPrintersFilamentPa(slicerFilamentCode: string): Promise<PrintersFilamentPa> {
    const payload = await this.encryptPayload({ slicer_filament_code: slicerFilamentCode })

    const res = await fetch('/api/printers-filament-pa', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: payload,
    })

    const encrypted = await res.text()
    const json = await this.decryptResponse(encrypted)
    return JSON.parse(json)
  }

  // ============ CSV Parser ============

  // CSV column order (no header row):
  // 0: id, 1: tag_id, 2: material_type, 3: material_subtype, 4: color_name,
  // 5: color_code, 6: note, 7: brand, 8: weight_advertised, 9: weight_core,
  // 10: weight_new, 11: weight_current, 12: slicer_filament, 13: added_time,
  // 14: encode_time, 15: added_full, 16: consumed_since_add, 17: consumed_since_weight,
  // 18: ext_has_k, 19: data_origin, 20: tag_type

  private parseSpoolsCsv(csv: string): Spool[] {
    const lines = csv.trim().split('\n')
    if (lines.length === 0) return []

    const spools: Spool[] = []

    for (const line of lines) {
      if (!line.trim()) continue

      const values = this.parseCsvLine(line)

      const spool: Spool = {
        id: values[0] || '',
        tag_id: values[1] || '',
        material: values[2] || '',
        subtype: values[3] || '',
        color_name: values[4] || '',
        rgba: this.colorCodeToRgba(values[5] || ''),
        note: values[6] || '',
        brand: values[7] || '',
        label_weight: values[8] ? parseInt(values[8], 10) : 0,
        core_weight: values[9] ? parseInt(values[9], 10) : 0,
        weight_new: values[10] ? parseInt(values[10], 10) : undefined,
        weight_current: values[11] ? parseInt(values[11], 10) : undefined,
        slicer_filament: values[12] || '',
        added_time: values[13] || undefined,
        encode_time: values[14] || undefined,
        added_full: this.parseBooleanField(values[15]),
        consumed_since_add: this.decodeBase64Float(values[16]),
        consumed_since_weight: this.decodeBase64Float(values[17]),
        ext_has_k: this.parseBooleanField(values[18]),
        data_origin: values[19] || '',
        tag_type: values[20] || '',
      }

      spools.push(spool)
    }

    return spools
  }

  // Convert color code like "000000FF" or "#000000" to "#RRGGBB" format
  private colorCodeToRgba(colorCode: string): string {
    if (!colorCode || colorCode.length < 6) return '#cccccc'
    // Handle "#RRGGBB" format (already has #)
    if (colorCode.startsWith('#')) {
      return colorCode.substring(0, 7) // Return #RRGGBB
    }
    // Handle "RRGGBBAA" format (no #, possibly with alpha)
    return '#' + colorCode.substring(0, 6)
  }

  // Decode base64-encoded float (used for consumed_since_add/weight)
  private decodeBase64Float(value: string): number {
    if (!value) return 0
    try {
      const bytes = Uint8Array.from(atob(value), c => c.charCodeAt(0))
      if (bytes.length !== 4) return 0
      const view = new DataView(bytes.buffer)
      return view.getFloat32(0, true) // little-endian
    } catch {
      return 0
    }
  }

  // Parse boolean field from CSV (handles various truthy values)
  private parseBooleanField(value: string | undefined): boolean {
    if (!value) return false
    const v = value.toLowerCase().trim()
    return v === '1' || v === 'true' || v === 'y' || v === 'yes'
  }

  private parseCsvLine(line: string): string[] {
    const values: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(current)
        current = ''
      } else {
        current += char
      }
    }
    values.push(current)

    return values
  }
}

export const api = new ApiClient()
