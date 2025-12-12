import { useState } from 'preact/hooks'
import { useApp } from '../context/AppContext'
import { KeyRound, Loader2 } from 'lucide-preact'

export function LoginScreen() {
  const { authenticate, error } = useApp()
  const [key, setKey] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    if (!key.trim()) return

    setIsLoading(true)
    await authenticate(key.trim())
    setIsLoading(false)
  }

  return (
    <div class="min-h-screen flex items-center justify-center p-4">
      <div class="w-full max-w-md">
        <div class="text-center mb-8">
          <div class="w-16 h-16 bg-[var(--accent-color)] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <KeyRound class="w-8 h-8 text-white" />
          </div>
          <h1 class="text-2xl font-bold text-[var(--text-primary)] mb-2">
            SpoolEase Inventory
          </h1>
          <p class="text-[var(--text-secondary)]">
            Enter your security key to access the inventory
          </p>
        </div>

        <form onSubmit={handleSubmit} class="space-y-4">
          <div>
            <label
              for="security-key"
              class="block text-sm font-medium text-[var(--text-secondary)] mb-2"
            >
              Security Key
            </label>
            <input
              id="security-key"
              type="password"
              value={key}
              onInput={(e) => setKey((e.target as HTMLInputElement).value)}
              placeholder="Enter your security key"
              class="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent transition-all"
              disabled={isLoading}
              autoFocus
            />
          </div>

          {error && (
            <p class="text-[var(--error-color)] text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading || !key.trim()}
            class="w-full py-3 px-4 bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 class="w-5 h-5 animate-spin" />
                Connecting...
              </>
            ) : (
              'Connect'
            )}
          </button>
        </form>

        <p class="mt-6 text-center text-sm text-[var(--text-muted)]">
          The security key is configured in your SpoolEase device settings.
        </p>
      </div>
    </div>
  )
}
