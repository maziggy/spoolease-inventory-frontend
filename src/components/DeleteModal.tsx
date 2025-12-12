import { useState } from 'preact/hooks'
import { useApp } from '../context/AppContext'
import { Modal } from './Modal'
import { Spool } from '../lib/api'
import { getNetWeight, formatWeight, formatDateTime } from '../lib/utils'

interface DeleteModalProps {
  isOpen: boolean
  onClose: () => void
  spool: Spool | null
}

export function DeleteModal({ isOpen, onClose, spool }: DeleteModalProps) {
  const { deleteSpool } = useApp()
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!spool) return null

  const netWeight = getNetWeight(spool)

  const handleDelete = async () => {
    setIsDeleting(true)
    setError(null)

    try {
      await deleteSpool(spool.id)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete spool')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Spool"
      size="md"
      footer={
        <>
          <button class="btn" onClick={onClose} disabled={isDeleting}>
            NOOO !!!
          </button>
          <button class="btn btn-danger" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Yes, Delete'}
          </button>
        </>
      }
    >
      <p class="text-[var(--text-secondary)] mb-4">
        Are you sure you want to delete spool
      </p>

      {error && (
        <div class="mb-4 p-3 bg-[var(--error-color)]/10 border border-[var(--error-color)]/30 rounded-lg text-[var(--error-color)] text-sm">
          {error}
        </div>
      )}

      {/* Spool Info Card */}
      <div class="bg-[var(--bg-tertiary)] rounded-lg p-4">
        {/* Header */}
        <div class="text-lg font-semibold text-[var(--text-primary)] mb-3 pb-2 border-b border-[var(--border-color)]">
          {spool.id}. {spool.material} {spool.color_name} {formatWeight(netWeight)} / {formatWeight(spool.label_weight)}
        </div>

        {/* Details Grid */}
        <div class="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div>
            <span class="text-[var(--text-muted)]">Brand:</span>
            <span class="ml-2 text-[var(--text-primary)]">{spool.brand || '-'}</span>
          </div>
          <div>
            <span class="text-[var(--text-muted)]">Subtype:</span>
            <span class="ml-2 text-[var(--text-primary)]">{spool.subtype || '-'}</span>
          </div>

          <div>
            <span class="text-[var(--text-muted)]">RGB:</span>
            <span class="ml-2 text-[var(--text-primary)] font-mono">{spool.rgba?.replace('#', '') || '-'}</span>
          </div>
          <div>
            <span class="text-[var(--text-muted)]">Tag ID:</span>
            <span class="ml-2 text-[var(--text-primary)] font-mono">{spool.tag_id || '-'}</span>
          </div>

          <div>
            <span class="text-[var(--text-muted)]">Added:</span>
            <span class="ml-2 text-[var(--text-primary)]">{formatDateTime(spool.added_time)}</span>
          </div>
          <div>
            <span class="text-[var(--text-muted)]">Encoded:</span>
            <span class="ml-2 text-[var(--text-primary)]">{formatDateTime(spool.encode_time)}</span>
          </div>

          <div>
            <span class="text-[var(--text-muted)]">Full Weight:</span>
            <span class="ml-2 text-[var(--text-primary)]">{formatWeight(spool.label_weight)}</span>
          </div>
          <div>
            <span class="text-[var(--text-muted)]">Scale Weight:</span>
            <span class="ml-2 text-[var(--text-primary)]">{spool.weight_current ? formatWeight(spool.weight_current) : '-'}</span>
          </div>

          <div>
            <span class="text-[var(--text-muted)]">Printed Since Added:</span>
            <span class="ml-2 text-[var(--text-primary)]">{formatWeight(spool.consumed_since_add)}</span>
          </div>
          <div>
            <span class="text-[var(--text-muted)]">Printed Since Weighted:</span>
            <span class="ml-2 text-[var(--text-primary)]">{formatWeight(spool.consumed_since_weight)}</span>
          </div>

          <div>
            <span class="text-[var(--text-muted)]">Used:</span>
            <span class="ml-2 text-[var(--text-primary)]">{formatWeight(spool.consumed_since_add)}</span>
          </div>
          <div>
            <span class="text-[var(--text-muted)]">Empty Weight:</span>
            <span class="ml-2 text-[var(--text-primary)]">{formatWeight(spool.core_weight)}</span>
          </div>

          <div>
            <span class="text-[var(--text-muted)]">Pressure Advance(K):</span>
            <span class="ml-2 text-[var(--text-primary)]">{spool.ext_has_k ? 'Configured' : '-'}</span>
          </div>
          <div>
            <span class="text-[var(--text-muted)]">Data Origin:</span>
            <span class="ml-2 text-[var(--text-primary)]">{spool.data_origin || '-'}</span>
          </div>

          {spool.tag_type && (
            <div class="col-span-2">
              <span class="text-[var(--text-muted)]">Linked Tag Type:</span>
              <span class="ml-2 text-[var(--text-primary)]">{spool.tag_type}</span>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
