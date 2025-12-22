import { WifiOff } from 'lucide-react'

export function OfflineBanner() {
  return (
    <div className="bg-amber-400 border-b-4 border-black">
      <div className="max-w-4xl mx-auto px-4 py-2 flex items-center justify-center gap-3 text-xs font-[900] uppercase tracking-widest text-black">
        <WifiOff className="w-5 h-5 stroke-[3]" />
        <span>Warning: Offline Mode! ✨ View Only ✨</span>
      </div>
    </div>
  )
}
