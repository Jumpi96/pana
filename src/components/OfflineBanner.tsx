import { WifiOff } from 'lucide-react'

export function OfflineBanner() {
  return (
    <div className="bg-amber-100 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
      <div className="max-w-4xl mx-auto px-4 py-2 flex items-center justify-center gap-2 text-sm text-amber-800 dark:text-amber-200">
        <WifiOff className="w-4 h-4" />
        <span>You're offline. View only mode.</span>
      </div>
    </div>
  )
}
