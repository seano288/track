import { Show, createSignal } from 'solid-js'
import { dismiss, isDismissed } from './storage-warning/dismissal.ts'

export function StorageWarningBanner() {
  const [dismissed, setDismissed] = createSignal(isDismissed(window.sessionStorage))

  function handleDismiss() {
    dismiss(window.sessionStorage)
    setDismissed(true)
  }

  return (
    <Show when={!dismissed()}>
      <div class="storage-warning" role="status">
        <p>
          Your data lives only in this browser. Clearing site data, switching browsers, or using a different device
          will permanently delete it — there is currently no backup or recovery.
        </p>
        <button type="button" onClick={handleDismiss}>
          Dismiss
        </button>
      </div>
    </Show>
  )
}
